/**
 * Process Expired Tasks API
 * 
 * POST /api/tasks/process-expired
 * 
 * This endpoint should be called periodically (via cron job) to:
 * 1. Find all mandatory tasks that have passed their deadline
 * 2. Find all target users who haven't submitted
 * 3. Deduct points (only once) for non-submission
 * 4. Handle rank downgrades if points reach 0
 * 
 * To prevent duplicate deductions, we track processed task-user pairs
 * by creating a TaskSubmission with status 'REJECTED' and a special marker.
 * 
 * Can be triggered by:
 * - Vercel Cron: Uses CRON_SECRET header for authentication
 * - Manual trigger by MASTER/ADMIN via authenticated session
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { applyPointsChange } from '@/lib/rankUtils';
import { NotificationType } from '@prisma/client';

// Special marker for auto-created deduction submissions
const DEDUCTION_MARKER = '__DEADLINE_MISSED_DEDUCTION__';

// Helper: create an audit log entry if we can determine an actor user id
async function createAuditLog(actorUserId: string | null | undefined, action: string, meta?: any) {
  try {
    if (!actorUserId) {
      console.warn('AuditLog skipped: no actorUserId for', action);
      return;
    }

    await prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        meta: meta ? JSON.stringify(meta) : undefined,
      },
    });
  } catch (e: any) {
    console.error('Failed to write AuditLog:', e?.message || e);
  }
}

export async function POST(req: Request) {
  try {
    // Check for Vercel Cron authentication header
    const authHeader = req.headers.get('authorization');
    const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    let actorUserId: string | null | undefined = null;

    if (!isValidCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const requester = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true },
      });

      if (!requester || !['MASTER', 'ADMIN'].includes(requester.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      actorUserId = requester.id;
    }

    // If this is a cron trigger, try to resolve a system actor id
    if (isValidCron) {
      actorUserId = process.env.SYSTEM_BOT_USER_ID || process.env.SYSTEM_USER_ID || null;
      if (!actorUserId) {
        const sys = await prisma.user.findFirst({ where: { role: 'MASTER' } });
        actorUserId = sys?.id || null;
      }
    }

    const now = new Date();

    // Log cron/manual start
    await createAuditLog(actorUserId, isValidCron ? 'CRON_PROCESS_EXPIRED_START' : 'MANUAL_PROCESS_EXPIRED_START', {
      route: '/api/tasks/process-expired',
      timestamp: now.toISOString(),
      isCron: !!isValidCron,
    });
    
    // Find all mandatory tasks that have expired
    const expiredMandatoryTasks = await prisma.task.findMany({
      where: {
        mandatory: true,
        endDate: { lt: now },
        pointsNegative: { gt: 0 },
      },
      select: {
        id: true,
        title: true,
        targetUserIds: true,
        pointsNegative: true,
        endDate: true,
      },
    });

    const results = {
      tasksProcessed: 0,
      usersDeducted: 0,
      usersDowngraded: 0,
      errors: [] as string[],
    };

    for (const task of expiredMandatoryTasks) {
      results.tasksProcessed++;

      // Get all existing submissions for this task
      const existingSubmissions = await prisma.taskSubmission.findMany({
        where: { taskId: task.id },
        select: { userId: true, submissionData: true },
      });

      const submittedUserIds = new Set(existingSubmissions.map((s: { userId: string }) => s.userId));

      // Find users who should have submitted but didn't
      for (const targetUserId of task.targetUserIds) {
        // Skip if already submitted (including deduction marker)
        if (submittedUserIds.has(targetUserId)) {
          continue;
        }

        // Check if user is still OFFICIAL (don't deduct from inactive/banned users)
        const user = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { 
            id: true, 
            status: true,
            volunteerProfile: {
              select: { points: true, rankId: true },
            },
          },
        });

        if (!user || user.status !== 'OFFICIAL') {
          continue;
        }

        try {
          // Create a deduction submission record to prevent duplicate deductions
          await prisma.taskSubmission.create({
            data: {
              taskId: task.id,
              userId: targetUserId,
              submissionData: DEDUCTION_MARKER,
              status: 'REJECTED',
            },
          });

          // Deduct points
          const deductionResult = await applyPointsChange(
            targetUserId,
            -task.pointsNegative,
            `Missed deadline: ${task.title}`,
            task.id
          );

          results.usersDeducted++;

          if (deductionResult.rankChanged) {
            results.usersDowngraded++;
          }

          // Notify user about the deduction
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              type: NotificationType.TASK_REJECTED,
              title: '⚠️ Points Deducted',
              message: `You missed the deadline for "${task.title}". ${task.pointsNegative} points have been deducted.${deductionResult.rankChanged ? ` Your rank has changed to ${deductionResult.newRankName}.` : ''}`,
              link: '/dashboard/tasks',
            },
          });
        } catch (err: any) {
          // If unique constraint violation, user was already processed
          if (err?.code === 'P2002') {
            continue; // Already processed, skip
          }
          results.errors.push(`User ${targetUserId} on task ${task.id}: ${err?.message}`);
        }
      }
    }

    // Log cron/manual success with results
    await createAuditLog(actorUserId, isValidCron ? 'CRON_PROCESS_EXPIRED_END' : 'MANUAL_PROCESS_EXPIRED_END', {
      route: '/api/tasks/process-expired',
      timestamp: new Date().toISOString(),
      results,
      isCron: !!isValidCron,
    });

    return NextResponse.json({
      ok: true,
      message: 'Expired tasks processed',
      results,
    });
  } catch (err: any) {
    console.error('POST /api/tasks/process-expired error:', err);
    // attempt to write audit log for error
    try {
      const actor = process.env.SYSTEM_BOT_USER_ID || process.env.SYSTEM_USER_ID || null;
      const sys = !actor ? await prisma.user.findFirst({ where: { role: 'MASTER' } }) : null;
      await createAuditLog(actor || sys?.id || null, 'PROCESS_EXPIRED_ERROR', { message: err?.message, stack: err?.stack });
    } catch (e) {
      console.error('Failed to write audit log for error:', e);
    }

    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/tasks/process-expired
 * 
 * Vercel Cron jobs call GET endpoints. This will process expired tasks.
 * Also serves as preview for authenticated admins without the cron header.
 */
export async function GET(req: Request) {
  try {
    // Check for Vercel Cron authentication header
    const authHeader = req.headers.get('authorization');
    const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // If valid cron, process the tasks (same as POST)
    if (isValidCron) {
      let actorUserId: string | null | undefined = null;
      // resolve actor for cron
      actorUserId = process.env.SYSTEM_BOT_USER_ID || process.env.SYSTEM_USER_ID || null;
      if (!actorUserId) {
        const sys = await prisma.user.findFirst({ where: { role: 'MASTER' } });
        actorUserId = sys?.id || null;
      }

      // Log cron start
      await createAuditLog(actorUserId, 'CRON_PROCESS_EXPIRED_START', {
        route: '/api/tasks/process-expired',
        timestamp: new Date().toISOString(),
      });

      const now = new Date();
      
      // Find all mandatory tasks that have expired
      const expiredMandatoryTasks = await prisma.task.findMany({
        where: {
          mandatory: true,
          endDate: { lt: now },
          pointsNegative: { gt: 0 },
        },
        select: {
          id: true,
          title: true,
          targetUserIds: true,
          pointsNegative: true,
          endDate: true,
        },
      });

      const results = {
        tasksProcessed: 0,
        usersDeducted: 0,
        usersDowngraded: 0,
        errors: [] as string[],
      };

      for (const task of expiredMandatoryTasks) {
        results.tasksProcessed++;

        const existingSubmissions = await prisma.taskSubmission.findMany({
          where: { taskId: task.id },
          select: { userId: true, submissionData: true },
        });

        const submittedUserIds = new Set(existingSubmissions.map((s: { userId: string }) => s.userId));

        for (const targetUserId of task.targetUserIds) {
          if (submittedUserIds.has(targetUserId)) {
            continue;
          }

          const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { 
              id: true, 
              status: true,
              volunteerProfile: {
                select: { points: true, rankId: true },
              },
            },
          });

          if (!user || user.status !== 'OFFICIAL') {
            continue;
          }

          try {
            await prisma.taskSubmission.create({
              data: {
                taskId: task.id,
                userId: targetUserId,
                submissionData: DEDUCTION_MARKER,
                status: 'REJECTED',
              },
            });

            const deductionResult = await applyPointsChange(
              targetUserId,
              -task.pointsNegative,
              `Missed deadline: ${task.title}`,
              task.id
            );

            results.usersDeducted++;

            if (deductionResult.rankChanged) {
              results.usersDowngraded++;
            }

            await prisma.notification.create({
              data: {
                userId: targetUserId,
                type: NotificationType.TASK_REJECTED,
                title: '⚠️ Points Deducted',
                message: `You missed the deadline for "${task.title}". ${task.pointsNegative} points have been deducted.${deductionResult.rankChanged ? ` Your rank has changed to ${deductionResult.newRankName}.` : ''}`,
                link: '/dashboard/tasks',
              },
            });
          } catch (err: any) {
            if (err?.code === 'P2002') {
              continue;
            }
            results.errors.push(`User ${targetUserId} on task ${task.id}: ${err?.message}`);
          }
        }
      }

      // log end
      await createAuditLog(actorUserId, 'CRON_PROCESS_EXPIRED_END', {
        route: '/api/tasks/process-expired',
        timestamp: new Date().toISOString(),
        results,
      });

      return NextResponse.json({
        ok: true,
        message: 'Expired tasks processed via cron',
        results,
      });
    }

    // For non-cron requests, require authentication and show preview
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!requester || !['MASTER', 'ADMIN'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    // Find all mandatory tasks that have expired with deduction points
    const expiredMandatoryTasks = await prisma.task.findMany({
      where: {
        mandatory: true,
        endDate: { lt: now },
        pointsNegative: { gt: 0 },
      },
      select: {
        id: true,
        title: true,
        targetUserIds: true,
        pointsNegative: true,
        endDate: true,
      },
    });

    const preview = [];

    for (const task of expiredMandatoryTasks) {
      const existingSubmissions = await prisma.taskSubmission.findMany({
        where: { taskId: task.id },
        select: { userId: true },
      });

      const submittedUserIds = new Set(existingSubmissions.map((s: { userId: string }) => s.userId));
      const missedUsers = task.targetUserIds.filter((id: string) => !submittedUserIds.has(id));

      if (missedUsers.length > 0) {
        // Get user details for preview
        const users = await prisma.user.findMany({
          where: { 
            id: { in: missedUsers },
            status: 'OFFICIAL',
          },
          select: {
            id: true,
            fullName: true,
            volunteerId: true,
          },
        });

        preview.push({
          taskId: task.id,
          taskTitle: task.title,
          deadline: task.endDate,
          deductionPoints: task.pointsNegative,
          usersToDeduct: users,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      preview,
      totalTasks: preview.length,
      totalUsersAffected: preview.reduce((sum, p) => sum + p.usersToDeduct.length, 0),
    });
  } catch (err: any) {
    console.error('GET /api/tasks/process-expired error:', err);
    try {
      const actor = process.env.SYSTEM_BOT_USER_ID || process.env.SYSTEM_USER_ID || null;
      const sys = !actor ? await prisma.user.findFirst({ where: { role: 'MASTER' } }) : null;
      await createAuditLog(actor || sys?.id || null, 'PROCESS_EXPIRED_ERROR', { message: err?.message, stack: err?.stack });
    } catch (e) {
      console.error('Failed to write audit log for GET error:', e);
    }
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
