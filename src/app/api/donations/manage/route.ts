import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { syncCampaignStatus } from '@/lib/donationCampaign';
import { createAuditLog } from '@/lib/prisma-audit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, status: true },
    });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['MASTER', 'ADMIN'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const campaigns = await prisma.donationCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        purpose: true,
        amountTarget: true,
        status: true,
        expiryDate: true,
        createdAt: true,
      },
    });

    const enriched = await Promise.all(
      campaigns.map(async (campaign) => {
        const progress = await syncCampaignStatus({
          ...campaign,
        });

        const pendingCount = await prisma.donation.count({ where: { campaignId: campaign.id, status: 'PENDING' } });

        const pendingSubmissions = await prisma.donation.findMany({
          where: { campaignId: campaign.id, status: 'PENDING' },
          orderBy: { donatedAt: 'asc' },
          take: 20,
          select: {
            id: true,
            amount: true,
            trxId: true,
            donatedAt: true,
            user: { select: { id: true, fullName: true, volunteerId: true } },
          },
        });

        return {
          ...campaign,
          status: progress.status,
          approvedAmount: progress.approvedAmount,
          remainingAmount: progress.remainingAmount,
          pendingCount,
          pendingSubmissions,
        };
      })
    );

    await createAuditLog(requester.id, 'DONATION_MANAGE_VIEWED', {
      route: '/api/donations/manage',
      campaigns: enriched.length,
      pendingTotal: enriched.reduce((sum, c) => sum + Number(c.pendingCount || 0), 0),
    });

    return NextResponse.json({ campaigns: enriched });
  } catch (err: any) {
    console.error('GET /api/donations/manage error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
