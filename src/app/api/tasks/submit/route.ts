/**
 * Task Submission API
 * 
 * POST /api/tasks/submit
 * 
 * Handles task submission for volunteers (OFFICIAL status only).
 * - Validates submission based on task type (YESNO, COMMENT, IMAGE, DONATION)
 * - Awards points if submitted on time
 * - Updates rank based on points
 * 
 * Body:
 * - taskId: string (required)
 * - submissionData: string (JSON for COMMENT type, "YES"/"NO" for YESNO)
 * - submissionFiles: string[] (URLs for IMAGE type)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { applyPointsChange } from '@/lib/rankUtils';
import { NotificationType } from '@prisma/client';

type SubmissionBody = {
  taskId: string;
  submissionData?: string;
  submissionFiles?: string[];
  // Optional structured donation payload for DONATION task type
  donation?: {
    amount?: number;
    trxId?: string;
    paymentMethod?: string;
    senderNumber?: string;
    donatedAt?: string; // ISO datetime
    proofUrl?: string;
  };
};

export async function POST(req: Request) {
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
          select: { points: true, rankId: true },
        },
      },
    });

    if (!requester) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OFFICIAL volunteers can submit tasks (not other roles doing their own tasks)
    if (requester.status !== 'OFFICIAL') {
      return NextResponse.json({ 
        error: 'Only OFFICIAL volunteers can submit tasks' 
      }, { status: 403 });
    }

    const body = (await req.json()) as SubmissionBody;

    if (!body.taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Get the task
    const task = await prisma.task.findUnique({
      where: { id: body.taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user is in target audience
    if (!task.targetUserIds.includes(requester.id)) {
      return NextResponse.json({ 
        error: 'You are not in the target audience for this task' 
      }, { status: 403 });
    }

    // Check if already submitted
    const existingSubmission = await prisma.taskSubmission.findUnique({
      where: {
        taskId_userId: {
          taskId: body.taskId,
          userId: requester.id,
        },
      },
    });

    if (existingSubmission) {
      return NextResponse.json({ 
        error: 'You have already submitted this task',
        submission: existingSubmission,
      }, { status: 400 });
    }

    const now = new Date();
    const isOnTime = now <= task.endDate;

    // Validate submission data based on task type
    let validationError = validateSubmission(task.taskType, body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // For DONATION type, if donation details provided, create a Donation record
    let createdDonation: any = null;
    if (task.taskType === 'DONATION') {
      const donationPayload = body.donation || (body.submissionData ? tryParseJSON(body.submissionData) : null);
      if (donationPayload) {
        try {
          const donatedAt = donationPayload.donatedAt ? new Date(donationPayload.donatedAt) : new Date();
          createdDonation = await prisma.donation.create({
            data: {
              userId: requester.id,
              amount: typeof donationPayload.amount === 'number' ? donationPayload.amount : 0,
              trxId: donationPayload.trxId || (donationPayload.trxID || '') || 'unknown',
              paymentMethod: donationPayload.paymentMethod || 'bkash',
              proofUrl: donationPayload.proofUrl || undefined,
              donatedAt: isNaN(donatedAt.getTime()) ? new Date() : donatedAt,
              status: 'PENDING',
            },
          });
        } catch (e) {
          console.error('Failed to create Donation record from task submission', e);
        }
      }
    }

    // Create the submission (include donation details and donationId if present)
    let submission = await prisma.taskSubmission.create({
      data: {
        taskId: body.taskId,
        userId: requester.id,
        submissionData: (() => {
          try {
            const base = body.submissionData ? tryParseJSON(body.submissionData) : null;
            const merged = {
              ...(base || {}),
              ...(body.donation || {}),
              donationId: createdDonation?.id || undefined,
            } as any;
            return Object.keys(merged).length ? JSON.stringify(merged) : null;
          } catch (e) {
            return body.submissionData || null;
          }
        })(),
        submissionFiles: body.submissionFiles || [],
        status: 'PENDING', // Start as pending
      },
    });

    let pointsAwarded = 0;
    let rankResult = null;

    // For YESNO type, auto-approve if answered YES
    if (task.taskType === 'YESNO' && body.submissionData === 'YES') {
      submission = await prisma.taskSubmission.update({
        where: { id: submission.id },
        data: { 
          status: 'APPROVED',
          approvedAt: now,
        },
      });

      // Award points if submitted on time
      if (isOnTime && task.pointsPositive > 0) {
        pointsAwarded = task.pointsPositive;
        rankResult = await applyPointsChange(
          requester.id,
          pointsAwarded,
          `Task completed: ${task.title}`,
          task.id
        );
      }
    }

    // Create notification for task creator
    try {
      await prisma.notification.create({
        data: {
          userId: task.createdByUserId,
          type: NotificationType.NEW_TASK,
          title: 'Task Submission Received',
          message: `A volunteer has submitted "${task.title}". Review required.`,
          link: `/dashboard/secretaries?taskId=${task.id}`,
        },
      });
    } catch (e) {
      console.error('Failed to create submission notification:', e);
    }

    return NextResponse.json({
      ok: true,
      submission,
      isOnTime,
      pointsAwarded,
      rankUpdate: rankResult ? {
        newPoints: rankResult.newPoints,
        newRank: rankResult.newRankName,
        oldRank: rankResult.oldRankName,
        rankChanged: rankResult.rankChanged,
      } : null,
    });
  } catch (err: any) {
    console.error('POST /api/tasks/submit error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

function validateSubmission(taskType: string, body: SubmissionBody): string | null {
  switch (taskType) {
    case 'YESNO':
      if (!body.submissionData || !['YES', 'NO'].includes(body.submissionData)) {
        return 'For Yes/No tasks, submission must be "YES" or "NO"';
      }
      break;
    case 'COMMENT':
      if (!body.submissionData || body.submissionData.trim().length === 0) {
        return 'Comment is required for this task type';
      }
      break;
    case 'IMAGE':
      if (!body.submissionFiles || body.submissionFiles.length === 0) {
        return 'At least one image is required for this task type';
      }
      break;
    case 'DONATION':
        // Donation tasks may have structured donation payload either in `donation` or
        // inside `submissionData` (JSON). Require at least a trxId or amount.
        if (!body.donation && !body.submissionData) {
          return 'Donation details are required';
        }
        if (body.donation) {
          const d = body.donation;
          if ((!d.trxId || d.trxId.trim() === '') && (typeof d.amount !== 'number' || d.amount <= 0)) {
            return 'Please provide a valid transaction ID or amount for the donation';
          }
        } else if (body.submissionData) {
          const parsed = tryParseJSON(body.submissionData);
          if (!parsed || ((!parsed.trxId || parsed.trxId.trim() === '') && (typeof parsed.amount !== 'number' || parsed.amount <= 0))) {
            return 'Please provide valid donation details (amount or trxId)';
          }
        }
      break;
  }
  return null;
}

  function tryParseJSON(input: any) {
    if (!input) return null;
    if (typeof input === 'object') return input;
    try {
      return JSON.parse(input as string);
    } catch (e) {
      return null;
    }
  }
