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
    if (!['MASTER', 'ADMIN'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { purpose, amountTarget, bkashNumber, nagadNumber, expiryDate } = body as { purpose?: string; amountTarget?: number; bkashNumber?: string; nagadNumber?: string; expiryDate?: string };

    if (!purpose || !expiryDate) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 });

    const created = await prisma.donationCampaign.create({ data: {
      title: purpose.substring(0, 80),
      purpose,
      amountTarget: typeof amountTarget === 'number' ? amountTarget : undefined,
      bkashNumber: bkashNumber || undefined,
      nagadNumber: nagadNumber || undefined,
      expiryDate: expiry,
      isPublic: false,
    } });

    return NextResponse.json({ ok: true, id: created.id, campaign: created });
  } catch (err: any) {
    console.error('POST /api/donations/create error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
