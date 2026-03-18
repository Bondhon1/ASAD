import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { applyPointsChange } from '@/lib/rankUtils';
import { syncCampaignStatus } from '@/lib/donationCampaign';
import { createAuditLog } from '@/lib/prisma-audit';
import { NotificationType } from '@prisma/client';
import { publishNotification } from '@/lib/ably';

export async function PATCH(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, status: true },
    });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['MASTER', 'ADMIN'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { submissionId } = await params;
    const body = await req.json();
    const action = String(body?.action || '').toUpperCase();

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const submission = await prisma.donation.findUnique({
      where: { id: submissionId },
      include: {
        campaign: {
          select: {
            id: true,
            amountTarget: true,
            expiryDate: true,
            status: true,
            pointsPerDonation: true,
            mandatory: true,
            pointsToDeduct: true,
          },
        },
      },
    });

    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    if (submission.status !== 'PENDING') {
      return NextResponse.json({ error: `Submission already ${submission.status.toLowerCase()}` }, { status: 400 });
    }
    if (!submission.campaignId || !submission.campaign) {
      return NextResponse.json({ error: 'Submission is not linked to a campaign' }, { status: 400 });
    }

    const progress = await syncCampaignStatus(submission.campaign);
    if (!progress.canAcceptSubmission && action === 'APPROVE') {
      return NextResponse.json({ error: 'Campaign is closed; cannot approve new submissions' }, { status: 400 });
    }

    if (action === 'APPROVE' && progress.remainingAmount !== null && submission.amount > progress.remainingAmount) {
      return NextResponse.json({ error: `Only ৳${progress.remainingAmount.toFixed(2)} is still needed` }, { status: 400 });
    }

    const updated = await prisma.donation.update({
      where: { id: submissionId },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approvedByUserId: requester.id,
        approvedAt: new Date(),
      },
      select: {
        id: true,
        campaignId: true,
        userId: true,
        amount: true,
        trxId: true,
        status: true,
      },
    });

    let rankResult: any = null;
    if (action === 'APPROVE' && updated.userId && submission.campaign.pointsPerDonation > 0) {
      rankResult = await applyPointsChange(
        updated.userId,
        submission.campaign.pointsPerDonation,
        `Donation approved: ${submission.campaignId}`,
        undefined,
        updated.id
      );
    }

    const campaignProgressAfter = await syncCampaignStatus(submission.campaign);

    if (updated.userId) {
      try {
        const pointsAwarded = action === 'APPROVE' ? Math.max(0, submission.campaign.pointsPerDonation || 0) : 0;
        const rankChangeMessage =
          action === 'APPROVE' && rankResult?.rankChanged
            ? ` Your rank changed from ${rankResult.oldRankName || 'Unranked'} to ${rankResult.newRankName || 'a new rank'}!`
            : '';

        const notif = await prisma.notification.create({
          data: {
            userId: updated.userId,
            type: NotificationType.DONATION_REQUIRED,
            title: action === 'APPROVE' ? '✅ Donation Approved!' : '❌ Donation Rejected',
            message: action === 'APPROVE'
              ? `Your donation submission (TRXID: ${updated.trxId}) has been approved.${pointsAwarded > 0 ? ` You earned ${pointsAwarded} points!` : ''}${rankChangeMessage}`
              : `Your donation submission (TRXID: ${updated.trxId}) has been rejected.`,
            link: `/dashboard/donations/${updated.campaignId}`,
          },
        });

        await publishNotification(updated.userId, {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
          createdAt: notif.createdAt,
        });
      } catch (notifErr) {
        console.error('Donation verification notification failed', notifErr);
      }
    }

    await createAuditLog(
      requester.id,
      action === 'APPROVE' ? 'DONATION_SUBMISSION_APPROVED' : 'DONATION_SUBMISSION_REJECTED',
      {
        route: '/api/donations/submissions/[submissionId]',
        submissionId,
        campaignId: updated.campaignId,
        amount: updated.amount,
        statusAfter: updated.status,
        campaignStatusAfter: campaignProgressAfter.status,
      },
      updated.userId || null,
      action === 'APPROVE' ? submission.campaign.pointsPerDonation || 0 : null
    );

    return NextResponse.json({ ok: true, submission: updated, rankResult });
  } catch (err: any) {
    console.error('PATCH /api/donations/submissions/[submissionId] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
