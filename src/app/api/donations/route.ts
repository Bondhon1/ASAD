import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncCampaignStatus } from '@/lib/donationCampaign';

// Active donation campaigns are public and change infrequently.
// Cache at CDN edge for 60 s; stale content served for up to 5 min
// while a background revalidation runs.
export const revalidate = 60;

export async function GET(_: Request) {
  try {
    const campaigns = await prisma.donationCampaign.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const enriched = await Promise.all(
      campaigns.map(async (campaign) => {
        const progress = await syncCampaignStatus(campaign);
        const pendingCount = await prisma.donation.count({ where: { campaignId: campaign.id, status: 'PENDING' } });
        const approvedCount = await prisma.donation.count({ where: { campaignId: campaign.id, status: 'APPROVED' } });
        return {
          ...campaign,
          status: progress.status,
          approvedAmount: progress.approvedAmount,
          remainingAmount: progress.remainingAmount,
          canAcceptSubmission: progress.canAcceptSubmission,
          pendingCount,
          approvedCount,
        };
      })
    );

    return NextResponse.json(
      { donations: enriched },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    console.error('GET /api/donations error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

