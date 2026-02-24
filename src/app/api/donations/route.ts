import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Active donation campaigns are public and change infrequently.
// Cache at CDN edge for 60 s; stale content served for up to 5 min
// while a background revalidation runs.
export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const campaigns = await prisma.donationCampaign.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(
      { donations: campaigns },
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

