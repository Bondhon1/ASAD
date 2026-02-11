/**
 * Task Submission Approval API
 * 
 * POST /api/tasks/[id]/approve
 * 
 * Allows SECRETARIES, HR, MASTER, ADMIN, DIRECTOR to approve/reject task submissions.
 * On approval, awards points to the volunteer.
 * 
 * Body:
 * - submissionId: string (required)
 * - action: 'APPROVE' | 'REJECT' (required)
 * - reason?: string (optional, for rejection)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { applyPointsChange } from '@/lib/rankUtils';
import { NotificationType } from '@prisma/client';

type ApprovalBody = {
  submissionId: string;
  action: 'APPROVE' | 'REJECT';
  reason?: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, status: true },
    });

    if (!requester || requester.status === 'BANNED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only specific roles can approve submissions
    if (!['SECRETARIES', 'HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: taskId } = await params;
    const body = (await req.json()) as ApprovalBody;

    if (!body.submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    if (!body.action || !['APPROVE', 'REJECT'].includes(body.action)) {
      return NextResponse.json({ error: 'Action must be APPROVE or REJECT' }, { status: 400 });
    }

    // Get the submission with task details
    const submission = await prisma.taskSubmission.findUnique({
      where: { id: body.submissionId },
      include: { 
        task: true,
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.taskId !== taskId) {
      return NextResponse.json({ error: 'Submission does not belong to this task' }, { status: 400 });
    }

    if (submission.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Submission has already been processed',
        currentStatus: submission.status,
      }, { status: 400 });
    }

    const now = new Date();
    const isOnTime = submission.submittedAt <= submission.task.endDate;

    // Update submission status
    const updatedSubmission = await prisma.taskSubmission.update({
      where: { id: body.submissionId },
      data: {
        status: body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approvedByUserId: requester.id,
        approvedAt: now,
      },
    });

    // Re-fetch submission with related user/task/approvedBy for frontend use
    const fullSubmission = await prisma.taskSubmission.findUnique({
      where: { id: updatedSubmission.id },
      include: {
        user: { select: { id: true, fullName: true, email: true, volunteerId: true, profilePicUrl: true } },
        approvedBy: { select: { id: true, fullName: true } },
        task: { select: { id: true, title: true } },
      },
    });

    let pointsAwarded = 0;
    let rankResult = null;

    // Award points on approval if submitted on time
    if (body.action === 'APPROVE' && isOnTime && submission.task.pointsPositive > 0) {
      pointsAwarded = submission.task.pointsPositive;
      rankResult = await applyPointsChange(
        submission.userId,
        pointsAwarded,
        `Task approved: ${submission.task.title}`,
        submission.taskId
      );
    }

    // Notify the volunteer (not broadcast)
    const notificationType = body.action === 'APPROVE' 
      ? NotificationType.TASK_APPROVED 
      : NotificationType.TASK_REJECTED;

    await prisma.notification.create({
      data: {
        userId: submission.userId,
        broadcast: false,
        type: notificationType,
        title: body.action === 'APPROVE' 
          ? '✅ Task Approved!' 
          : '❌ Task Submission Rejected',
        message: body.action === 'APPROVE'
          ? `Your submission for "${submission.task.title}" has been approved.${pointsAwarded > 0 ? ` You earned ${pointsAwarded} points!` : ''}`
          : `Your submission for "${submission.task.title}" was rejected.${body.reason ? ` Reason: ${body.reason}` : ''}`,
        link: '/dashboard/tasks',
      },
    });

    return NextResponse.json({
      ok: true,
      submission: fullSubmission || updatedSubmission,
      pointsAwarded,
      rankUpdate: rankResult ? {
        newPoints: rankResult.newPoints,
        newRank: rankResult.newRankName,
        oldRank: rankResult.oldRankName,
        rankChanged: rankResult.rankChanged,
      } : null,
    });
  } catch (err: any) {
    console.error('POST /api/tasks/[id]/approve error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/tasks/[id]/approve
 * 
 * Get all submissions for a task (for approval review)
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, status: true },
    });

    if (!requester || requester.status === 'BANNED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SECRETARIES', 'HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: taskId } = await params;

    const submissions = await prisma.taskSubmission.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            volunteerId: true,
            profilePicUrl: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({ submissions });
  } catch (err: any) {
    console.error('GET /api/tasks/[id]/approve error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
