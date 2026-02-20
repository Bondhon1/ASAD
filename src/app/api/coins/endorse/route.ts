import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET  – list current user's endorsement requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const endorsements = await prisma.coinEndorsement.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        processedBy: { select: { fullName: true, username: true } },
      },
    });

    return NextResponse.json({ endorsements });
  } catch (err: any) {
    console.error('GET /api/coins/endorse error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

// POST – submit a new endorsement request
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { amount, method, accountNumber, transactionId, datetime } = body;

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    if (!method)
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    if (!accountNumber)
      return NextResponse.json({ error: 'Account / sender number is required' }, { status: 400 });
    if (!datetime)
      return NextResponse.json({ error: 'Transfer datetime is required' }, { status: 400 });

    // Check for pending endorsement
    const pending = await prisma.coinEndorsement.findFirst({
      where: { userId: user.id, status: 'PENDING' },
    });
    if (pending) {
      return NextResponse.json(
        { error: 'You already have a pending endorsement request.' },
        { status: 400 }
      );
    }

    const endorsement = await prisma.coinEndorsement.create({
      data: {
        userId: user.id,
        amount: Number(amount),
        method,
        accountNumber,
        transactionId: transactionId || null,
        datetime: new Date(datetime),
        status: 'PENDING',
      },
    });

    // Notify admins / masters
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MASTER'] } },
      select: { id: true },
    });
    for (const admin of admins) {
      try {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'COIN_ENDORSED',
            title: 'New Coin Endorsement Request',
            message: `${user.fullName || user.username} submitted a coin endorsement of ৳${Number(amount).toFixed(2)} via ${method}.`,
            link: '/dashboard/admin/coin-management',
          },
        });
      } catch (e) {
        console.error('Failed to create admin notification', e);
      }
    }

    return NextResponse.json({ ok: true, endorsement });
  } catch (err: any) {
    console.error('POST /api/coins/endorse error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
