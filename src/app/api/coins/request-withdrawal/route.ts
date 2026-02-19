import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const MINIMUM_COINS = 15000; // minimum coins to request withdrawal
const COINS_TO_TAKA_RATIO = 30; // 30 coins = 1 taka

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.coins < MINIMUM_COINS) {
      return NextResponse.json({ 
        error: `Insufficient coins. Minimum ${MINIMUM_COINS} coins required.` 
      }, { status: 400 });
    }

    const body = await req.json();
    const { coins, paymentMethod, accountNumber } = body;

    if (!coins || coins <= 0) {
      return NextResponse.json({ error: 'Invalid coin amount' }, { status: 400 });
    }

    if (coins > user.coins) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
    }

    if (!paymentMethod || !accountNumber) {
      return NextResponse.json({ 
        error: 'Payment method and account number are required' 
      }, { status: 400 });
    }

    // Check if user has pending withdrawal
    const pendingWithdrawal = await prisma.coinWithdrawal.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    if (pendingWithdrawal) {
      return NextResponse.json({ 
        error: 'You already have a pending withdrawal request' 
      }, { status: 400 });
    }

    const takaAmount = coins / COINS_TO_TAKA_RATIO;

    // Create withdrawal request (don't deduct coins yet)
    const withdrawal = await prisma.coinWithdrawal.create({
      data: {
        userId: user.id,
        coins,
        takaAmount,
        paymentMethod,
        accountNumber,
        status: 'PENDING',
      },
    });

    // Create notification for admin/master (broadcast to admins)
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MASTER'] },
      },
      select: { id: true },
    });

    for (const admin of admins) {
      try {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'New Coin Withdrawal Request',
            message: `${user.fullName || user.username} requested withdrawal of ${coins} coins (৳${takaAmount.toFixed(2)})`,            link: '/dashboard/admin/coin-management',
          },
        });
      } catch (e) {
        console.error('Failed to create admin notification', e);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      withdrawal,
      message: 'Withdrawal request submitted successfully' 
    });
  } catch (err: any) {
    console.error('POST /api/coins/request-withdrawal error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const withdrawals = await prisma.coinWithdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        processedBy: {
          select: {
            fullName: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ withdrawals, coins: user.coins });
  } catch (err: any) {
    console.error('GET /api/coins/request-withdrawal error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
