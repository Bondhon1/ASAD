import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const campaigns = await prisma.donationCampaign.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ donations: campaigns });
  } catch (err: any) {
    console.error('GET /api/donations error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
