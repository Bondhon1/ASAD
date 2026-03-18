import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { syncCampaignStatus } from '@/lib/donationCampaign';
import { createAuditLog } from '@/lib/prisma-audit';
import { NotificationType } from '@prisma/client';
import { publishNotification } from '@/lib/ably';

const STAFF_ROLES = ['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT', 'SECRETARIES'];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, status: true },
    });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isOfficialOrStaff = requester.status === 'OFFICIAL' || STAFF_ROLES.includes(requester.role);
    if (!isOfficialOrStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    const trxId = String(body?.trxId || '').trim();
    const amount = Number(body?.amount);
    const donatedAtRaw = body?.donatedAt;

    if (!trxId) return NextResponse.json({ error: 'TRXID is required' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    if (!donatedAtRaw) return NextResponse.json({ error: 'Date & time is required' }, { status: 400 });

    const donatedAt = new Date(donatedAtRaw);
    if (Number.isNaN(donatedAt.getTime())) return NextResponse.json({ error: 'Invalid date & time' }, { status: 400 });

    const campaign = await prisma.donationCampaign.findUnique({
      where: { id },
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

    if (!campaign) return NextResponse.json({ error: 'Donation campaign not found' }, { status: 404 });

    const progress = await syncCampaignStatus(campaign);
    if (!progress.canAcceptSubmission) {
      return NextResponse.json({ error: 'This campaign is closed and no longer accepting submissions' }, { status: 400 });
    }

    if (progress.remainingAmount !== null && amount > progress.remainingAmount) {
      return NextResponse.json({ error: `Only ৳${progress.remainingAmount.toFixed(2)} is still needed` }, { status: 400 });
    }

    const duplicateTrx = await prisma.donation.findFirst({
      where: {
        campaignId: id,
        trxId: { equals: trxId, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (duplicateTrx) {
      return NextResponse.json({ error: 'This TRXID is already submitted for this campaign' }, { status: 400 });
    }

    const created = await prisma.donation.create({
      data: {
        campaignId: id,
        userId: requester.id,
        amount,
        trxId,
        paymentMethod: 'bkash',
        donatedAt,
        status: 'PENDING',
      },
      select: {
        id: true,
        amount: true,
        trxId: true,
        status: true,
        donatedAt: true,
      },
    });

    await createAuditLog(requester.id, 'DONATION_SUBMISSION_CREATED', {
      route: '/api/donations/[id]/submit',
      campaignId: id,
      submissionId: created.id,
      amount,
      donatedAt: donatedAt.toISOString(),
    }, requester.id);

    try {
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['MASTER', 'ADMIN'] },
          status: { not: 'BANNED' },
        },
        select: { id: true },
      });

      for (const admin of admins) {
        const notif = await prisma.notification.create({
          data: {
            userId: admin.id,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Donation Submission Pending',
            message: `A new donation submission needs verification (TRXID: ${created.trxId}).`,
            link: '/dashboard/donations',
          },
        });

        await publishNotification(admin.id, {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
          createdAt: notif.createdAt,
        });
      }
    } catch (notifErr) {
      console.error('Donation submit notification failed', notifErr);
    }

    return NextResponse.json({ ok: true, submission: created });
  } catch (err: any) {
    console.error('POST /api/donations/[id]/submit error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
