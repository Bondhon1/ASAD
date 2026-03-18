import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { syncCampaignStatus } from '@/lib/donationCampaign';
import { createAuditLog } from '@/lib/prisma-audit';

const STAFF_ROLES = ['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT', 'SECRETARIES'];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, status: true },
    });
    if (!requester || requester.status === 'BANNED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isOfficialOrStaff = requester.status === 'OFFICIAL' || STAFF_ROLES.includes(requester.role);
    if (!isOfficialOrStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const campaign = await prisma.donationCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        purpose: true,
        amountTarget: true,
        bkashNumber: true,
        nagadNumber: true,
        expiryDate: true,
        status: true,
        pointsPerDonation: true,
        mandatory: true,
        pointsToDeduct: true,
        createdAt: true,
      },
    });

    if (!campaign) return NextResponse.json({ error: 'Donation campaign not found' }, { status: 404 });

    const progress = await syncCampaignStatus(campaign);

    const [pendingCount, approvedCount, recentApproved, mySubmission] = await Promise.all([
      prisma.donation.count({ where: { campaignId: id, status: 'PENDING' } }),
      prisma.donation.count({ where: { campaignId: id, status: 'APPROVED' } }),
      prisma.donation.findMany({
        where: { campaignId: id, status: 'APPROVED' },
        orderBy: { approvedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          donatedAt: true,
          approvedAt: true,
          user: { select: { id: true, fullName: true, volunteerId: true } },
        },
      }),
      prisma.donation.findFirst({
        where: { campaignId: id, userId: requester!.id },
        orderBy: { donatedAt: 'desc' },
        select: {
          id: true,
          amount: true,
          trxId: true,
          paymentMethod: true,
          status: true,
          donatedAt: true,
          approvedAt: true,
        },
      }),
    ]);

    await createAuditLog(requester!.id, 'DONATION_DETAILS_VIEWED', {
      route: '/api/donations/[id]',
      campaignId: id,
      status: progress.status,
      canAcceptSubmission: progress.canAcceptSubmission,
    });

    return NextResponse.json({
      campaign: {
        ...campaign,
        status: progress.status,
        approvedAmount: progress.approvedAmount,
        remainingAmount: progress.remainingAmount,
        canAcceptSubmission: progress.canAcceptSubmission,
      },
      stats: {
        pendingCount,
        approvedCount,
      },
      recentApproved,
      mySubmission,
      permissions: {
        isAdmin: ['MASTER', 'ADMIN'].includes(requester!.role),
      },
    });
  } catch (err: any) {
    console.error('GET /api/donations/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
