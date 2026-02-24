/**
 * Get Task Details API
 * 
 * GET /api/tasks/[id]
 * 
 * Returns task details with the current user's submission status
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { parseAudience, isUserInAudience, resolveAudienceUserIds } from '@/lib/taskAudience';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        status: true,
        role: true,
        volunteerProfile: {
          select: {
            serviceId: true,
            service: { select: { name: true } },
            sectors: true,
            clubs: true,
          },
        },
      },
    });

    if (!requester) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id: taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const audienceSpec = parseAudience(task.assignedGroup);
    const computedAudience = await resolveAudienceUserIds(audienceSpec, { fallbackTargetIds: task.targetUserIds });
    // Check if user is in target audience or is admin/creator
    const isTargetUser = isUserInAudience(audienceSpec, { id: requester.id, status: requester.status, volunteerProfile: requester.volunteerProfile as any }, task.targetUserIds);
    const isCreator = task.createdByUserId === requester.id;
    const isAdmin = ['MASTER', 'ADMIN', 'SECRETARIES', 'HR', 'DIRECTOR'].includes(requester.role);

    if (!isTargetUser && !isCreator && !isAdmin) {
      return NextResponse.json({ error: 'You do not have access to this task' }, { status: 403 });
    }

    // Get user's submission if exists
    const userSubmission = await prisma.taskSubmission.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: requester.id,
        },
      },
      include: {
        approvedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Calculate time-related info
    const now = new Date();
    const isExpired = now > task.endDate;
    const isActive = now >= task.startDate && now <= task.endDate;
    const timeRemaining = isActive ? task.endDate.getTime() - now.getTime() : null;

    // Get submission stats if admin
    let submissionStats = null;
    if (isAdmin || isCreator) {
      const totalTarget = computedAudience.length;
      const deductionFilter = { NOT: { submissionData: '__DEADLINE_MISSED_DEDUCTION__' } };
      const submissionCount = await prisma.taskSubmission.count({
        where: { taskId, ...deductionFilter },
      });
      const approvedCount = await prisma.taskSubmission.count({
        where: { taskId, status: 'APPROVED', ...deductionFilter },
      });
      const pendingCount = await prisma.taskSubmission.count({
        where: { taskId, status: 'PENDING', ...deductionFilter },
      });

      submissionStats = {
        totalTarget,
        submitted: submissionCount,
        approved: approvedCount,
        pending: pendingCount,
        notSubmitted: totalTarget - submissionCount,
      };
    }

    return NextResponse.json({
      task: {
        ...task,
        isExpired,
        isActive,
        timeRemaining,
      },
      userSubmission,
      submissionStats,
      canSubmit: isTargetUser && !userSubmission && isActive,
    });
  } catch (err: any) {
    console.error('GET /api/tasks/[id] error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
