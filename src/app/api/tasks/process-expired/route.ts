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
    
    // First, let's see all mandatory tasks for debugging
    const allMandatoryTasks = await prisma.task.findMany({
      where: {
        mandatory: true,
      },
      select: {
        id: true,
        title: true,
        targetUserIds: true,
        pointsNegative: true,
        endDate: true,
        mandatory: true,
      },
    });
    
    console.log('[ProcessExpired] Current time:', now.toISOString());
    console.log('[ProcessExpired] Total mandatory tasks found:', allMandatoryTasks.length);
    for (const t of allMandatoryTasks) {
      const isExpired = t.endDate < now;
      console.log(`[ProcessExpired] Task: "${t.title}" | endDate: ${t.endDate.toISOString()} | expired: ${isExpired} | pointsNegative: ${t.pointsNegative} | targetUsers: ${t.targetUserIds.length}`);
    }
    
    // Find all mandatory tasks that have expired
    // Note: We check for mandatory tasks with either:
    // 1. pointsNegative > 0 (will deduct points), OR
    // 2. Any expired mandatory task (to mark as missed even without deduction)
    const expiredMandatoryTasks = await prisma.task.findMany({
      where: {
        mandatory: true,
        endDate: { lt: now },
      },
      select: {
        id: true,
        title: true,
        targetUserIds: true,
        pointsNegative: true,
        endDate: true,
      },
    });
    
    console.log('[ProcessExpired] Expired mandatory tasks to process:', expiredMandatoryTasks.length);
    for (const t of expiredMandatoryTasks) {
      console.log(`[ProcessExpired] Processing: "${t.title}" | pointsNegative: ${t.pointsNegative}`);
    }

    const results = {
      tasksProcessed: 0,
      usersDeducted: 0,
      usersDowngraded: 0,
      errors: [] as string[],
    };

    for (const task of expiredMandatoryTasks) {
      results.tasksProcessed++;
      
      console.log(`[ProcessExpired] Processing task: "${task.title}" (${task.id})`);
      console.log(`[ProcessExpired] Target users count: ${task.targetUserIds.length}`);

      // Get all existing submissions for this task
      const existingSubmissions = await prisma.taskSubmission.findMany({
        where: { taskId: task.id },
        select: { userId: true, submissionData: true },
      });

      const submittedUserIds = new Set(existingSubmissions.map((s: { userId: string }) => s.userId));
      console.log(`[ProcessExpired] Already submitted/processed count: ${submittedUserIds.size}`);

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
            fullName: true,
            volunteerProfile: {
              select: { points: true, rankId: true },
            },
          },
        });

        if (!user || user.status !== 'OFFICIAL') {
          console.log(`[ProcessExpired] Skipping user ${targetUserId} - status: ${user?.status || 'not found'}`);
          continue;
        }

        console.log(`[ProcessExpired] Processing user: ${user.fullName} (${targetUserId}) | Current points: ${user.volunteerProfile?.points || 0}`);

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

          // Only deduct points if pointsNegative > 0
          let deductionResult = null;
          if (task.pointsNegative > 0) {
            deductionResult = await applyPointsChange(
              targetUserId,
              -task.pointsNegative,
              `Missed deadline: ${task.title}`,
              task.id
            );

            results.usersDeducted++;

            if (deductionResult.rankChanged) {
              results.usersDowngraded++;
            }
            
            console.log(`[ProcessExpired] Deducted ${task.pointsNegative} points from ${user.fullName}. New points: ${deductionResult.newPoints}, Rank changed: ${deductionResult.rankChanged}`);
          } else {
            console.log(`[ProcessExpired] No points to deduct for ${user.fullName} (pointsNegative=0)`);
          }

          // Notify user about missing the deadline
          const notificationMessage = task.pointsNegative > 0
            ? `You missed the deadline for "${task.title}". ${task.pointsNegative} points have been deducted.${deductionResult?.rankChanged ? ` Your rank has changed to ${deductionResult.newRankName}.` : ''}`
            : `You missed the deadline for "${task.title}".`;
          
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              type: NotificationType.TASK_REJECTED,
              title: task.pointsNegative > 0 ? '⚠️ Points Deducted' : '⚠️ Deadline Missed',
              message: notificationMessage,
              link: '/dashboard/tasks',
            },
          });
        } catch (err: any) {
          // If unique constraint violation, user was already processed
          if (err?.code === 'P2002') {
            console.log(`[ProcessExpired] User ${targetUserId} already processed (unique constraint)`);
            continue; // Already processed, skip
          }
          console.error(`[ProcessExpired] Error processing user ${targetUserId}:`, err);
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
      
      // First, let's see all mandatory tasks for debugging
      const allMandatoryTasks = await prisma.task.findMany({
        where: {
          mandatory: true,
        },
        select: {
          id: true,
          title: true,
          targetUserIds: true,
          pointsNegative: true,
          endDate: true,
          mandatory: true,
        },
      });
      
      console.log('[GET/ProcessExpired] Current time:', now.toISOString());
      console.log('[GET/ProcessExpired] Total mandatory tasks found:', allMandatoryTasks.length);
      for (const t of allMandatoryTasks) {
        const isExpired = t.endDate < now;
        console.log(`[GET/ProcessExpired] Task: "${t.title}" | endDate: ${t.endDate.toISOString()} | expired: ${isExpired} | pointsNegative: ${t.pointsNegative} | targetUsers: ${t.targetUserIds.length}`);
      }
      
      // Find all mandatory tasks that have expired
      const expiredMandatoryTasks = await prisma.task.findMany({
        where: {
          mandatory: true,
          endDate: { lt: now },
        },
        select: {
          id: true,
          title: true,
          targetUserIds: true,
          pointsNegative: true,
          endDate: true,
        },
      });
      
      console.log('[GET/ProcessExpired] Expired mandatory tasks to process:', expiredMandatoryTasks.length);

      const results = {
        tasksProcessed: 0,
        usersDeducted: 0,
        usersDowngraded: 0,
        errors: [] as string[],
      };

      for (const task of expiredMandatoryTasks) {
        results.tasksProcessed++;
        
        console.log(`[GET/ProcessExpired] Processing task: "${task.title}" (${task.id})`);

        const existingSubmissions = await prisma.taskSubmission.findMany({
          where: { taskId: task.id },
          select: { userId: true, submissionData: true },
        });

        const submittedUserIds = new Set(existingSubmissions.map((s: { userId: string }) => s.userId));
        console.log(`[GET/ProcessExpired] Target users: ${task.targetUserIds.length}, Already submitted: ${submittedUserIds.size}`);

        for (const targetUserId of task.targetUserIds) {
          if (submittedUserIds.has(targetUserId)) {
            continue;
          }

          const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { 
              id: true, 
              status: true,
              fullName: true,
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

            // Only deduct points if pointsNegative > 0
            let deductionResult = null;
            if (task.pointsNegative > 0) {
              deductionResult = await applyPointsChange(
                targetUserId,
                -task.pointsNegative,
                `Missed deadline: ${task.title}`,
                task.id
              );

              results.usersDeducted++;

              if (deductionResult.rankChanged) {
                results.usersDowngraded++;
              }
              
              console.log(`[GET/ProcessExpired] Deducted ${task.pointsNegative} points from ${user.fullName}`);
            }

            const notificationMessage = task.pointsNegative > 0
              ? `You missed the deadline for "${task.title}". ${task.pointsNegative} points have been deducted.${deductionResult?.rankChanged ? ` Your rank has changed to ${deductionResult.newRankName}.` : ''}`
              : `You missed the deadline for "${task.title}".`;

            await prisma.notification.create({
              data: {
                userId: targetUserId,
                type: NotificationType.TASK_REJECTED,
                title: task.pointsNegative > 0 ? '⚠️ Points Deducted' : '⚠️ Deadline Missed',
                message: notificationMessage,
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

    // Find all mandatory tasks that have expired (with or without deduction points)
    const expiredMandatoryTasks = await prisma.task.findMany({
      where: {
        mandatory: true,
        endDate: { lt: now },
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
