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
 * - Vercel Cron: Add to vercel.json with schedule
 * - Manual trigger by MASTER/ADMIN
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { applyPointsChange } from '@/lib/rankUtils';
import { NotificationType } from '@prisma/client';

// Special marker for auto-created deduction submissions
const DEDUCTION_MARKER = '__DEADLINE_MISSED_DEDUCTION__';

export async function POST(req: Request) {
  try {
    // Allow cron jobs (with secret) or authenticated admins
    const cronSecret = req.headers.get('x-cron-secret');
    const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

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
    }

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

    return NextResponse.json({
      ok: true,
      message: 'Expired tasks processed',
      results,
    });
  } catch (err: any) {
    console.error('POST /api/tasks/process-expired error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/tasks/process-expired
 * 
 * Preview what would be processed (dry run)
 */
export async function GET(req: Request) {
  try {
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
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
