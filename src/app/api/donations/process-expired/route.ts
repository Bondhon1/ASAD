import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { applyPointsChange } from '@/lib/rankUtils';
import { syncCampaignStatus } from '@/lib/donationCampaign';
import { createAuditLog } from '@/lib/prisma-audit';
import { NotificationType } from '@prisma/client';
import { publishNotification } from '@/lib/ably';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    let actorUserId: string | null = null;

    if (!isValidCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const requester = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true, status: true },
      });

      if (!requester || !['MASTER', 'ADMIN'].includes(requester.role) || requester.status === 'BANNED') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      actorUserId = requester.id;
    }

    if (isValidCron) {
      actorUserId = process.env.SYSTEM_BOT_USER_ID || process.env.SYSTEM_USER_ID || null;
      if (!actorUserId) {
        const sys = await prisma.user.findFirst({ where: { role: 'MASTER' }, select: { id: true } });
        actorUserId = sys?.id || null;
      }
    }

    await createAuditLog(actorUserId, isValidCron ? 'CRON_DONATION_PROCESS_START' : 'MANUAL_DONATION_PROCESS_START', {
      route: '/api/donations/process-expired',
      isCron: isValidCron,
      timestamp: new Date().toISOString(),
    });

    const campaigns = await prisma.donationCampaign.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        amountTarget: true,
        expiryDate: true,
        status: true,
        pointsPerDonation: true,
        mandatory: true,
        pointsToDeduct: true,
      },
    });

    const result = {
      campaignsChecked: campaigns.length,
      campaignsClosed: 0,
      deductionsApplied: 0,
      errors: [] as string[],
    };

    for (const campaign of campaigns) {
      const beforeStatus = campaign.status;
      const progress = await syncCampaignStatus(campaign);

      if (beforeStatus === 'ACTIVE' && progress.status !== 'ACTIVE') {
        result.campaignsClosed++;
        await createAuditLog(actorUserId, 'DONATION_CAMPAIGN_AUTO_CLOSED', {
          route: '/api/donations/process-expired',
          campaignId: campaign.id,
          fromStatus: beforeStatus,
          toStatus: progress.status,
          approvedAmount: progress.approvedAmount,
          remainingAmount: progress.remainingAmount,
        });
      }

      const shouldDeduct = campaign.mandatory && (campaign.pointsToDeduct || 0) > 0 && progress.status !== 'ACTIVE';
      if (!shouldDeduct) continue;

      const reason = `Missed mandatory donation: ${campaign.id}`;

      const officialUsers = await prisma.user.findMany({
        where: { status: 'OFFICIAL' },
        select: { id: true },
      });

      for (const user of officialUsers) {
        const [approvedDonation, existingDeduction] = await Promise.all([
          prisma.donation.findFirst({
            where: {
              campaignId: campaign.id,
              userId: user.id,
              status: 'APPROVED',
            },
            select: { id: true },
          }),
          prisma.pointsHistory.findFirst({
            where: {
              userId: user.id,
              reason,
            },
            select: { id: true },
          }),
        ]);

        if (approvedDonation || existingDeduction) continue;

        const deduction = await applyPointsChange(
          user.id,
          -Math.abs(campaign.pointsToDeduct || 0),
          reason,
          undefined,
          undefined
        );

        if (deduction.success) {
          result.deductionsApplied++;
          await createAuditLog(
            actorUserId,
            'DONATION_MANDATORY_DEDUCTION_APPLIED',
            {
              route: '/api/donations/process-expired',
              campaignId: campaign.id,
              deduction: -Math.abs(campaign.pointsToDeduct || 0),
              reason,
            },
            user.id,
            -Math.abs(campaign.pointsToDeduct || 0)
          );

          try {
            const notif = await prisma.notification.create({
              data: {
                userId: user.id,
                type: NotificationType.SYSTEM_ANNOUNCEMENT,
                title: 'Mandatory Donation Missed',
                message: `Points were deducted because a mandatory donation campaign ended without an approved submission.`,
                link: `/dashboard/donations/${campaign.id}`,
              },
            });

            await publishNotification(user.id, {
              id: notif.id,
              type: notif.type,
              title: notif.title,
              message: notif.message,
              link: notif.link,
              createdAt: notif.createdAt,
            });
          } catch (notifErr) {
            console.error('Failed to notify mandatory donation deduction', notifErr);
          }
        } else {
          result.errors.push(`Failed deduction for user ${user.id}: ${deduction.error || 'Unknown error'}`);
        }
      }
    }

    await createAuditLog(actorUserId, isValidCron ? 'CRON_DONATION_PROCESS_COMPLETE' : 'MANUAL_DONATION_PROCESS_COMPLETE', {
      route: '/api/donations/process-expired',
      isCron: isValidCron,
      ...result,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('POST /api/donations/process-expired error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
