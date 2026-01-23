import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['SECRETARIES', 'HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { title, purpose, amount, expireAt, points, isPublic } = body as { title?: string; purpose?: string; amount?: number; expireAt?: string; points?: number; isPublic?: boolean };
    if (!title || !expireAt) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const expiryDate = new Date(expireAt);
    const created = await prisma.donationCampaign.create({ data: {
      title,
      purpose: purpose || undefined,
      amountTarget: typeof amount === 'number' ? amount : undefined,
      expiryDate,
      pointsPerDonation: typeof points === 'number' ? Math.max(0, Math.floor(points)) : 0,
      isPublic: !!isPublic,
    } });

    return NextResponse.json({ ok: true, campaign: created });
  } catch (err: any) {
    console.error('POST /api/secretaries/donationCampaigns error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
