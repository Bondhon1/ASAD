import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotification } from '@/lib/ably';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER', 'ADMIN'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const withdrawals = await prisma.coinWithdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            phone: true,
            volunteerId: true,
            coins: true,
          },
        },
        processedBy: {
          select: {
            fullName: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ withdrawals });
  } catch (err: any) {
    console.error('GET /api/admin/coins/withdrawals error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER', 'ADMIN'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { withdrawalId, status, notes } = body;

    if (!withdrawalId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['COMPLETED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const withdrawal = await prisma.coinWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (withdrawal.status !== 'PENDING') {
      return NextResponse.json({ error: 'Withdrawal already processed' }, { status: 400 });
    }

    // Update withdrawal status
    const updatedWithdrawal = await prisma.$transaction(async (tx) => {
      // If completing, deduct coins from user
      if (status === 'COMPLETED') {
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { coins: { decrement: withdrawal.coins } },
        });
      }

      // Update withdrawal
      return await tx.coinWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status,
          processedById: requester.id,
          processedAt: new Date(),
          notes,
        },
      });
    });

    // Create notification for user
    try {
      const notif = await prisma.notification.create({
        data: {
          userId: withdrawal.userId,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: status === 'COMPLETED' ? 'Withdrawal Completed' : 'Withdrawal Rejected',
          message: status === 'COMPLETED' 
            ? `Your withdrawal request of ${withdrawal.coins} coins has been completed.${notes ? ` Note: ${notes}` : ''}`
            : `Your withdrawal request has been rejected.${notes ? ` Reason: ${notes}` : ''}`,
          link: '/dashboard',
        },
      });

      // Publish real-time notification
      try {
        await publishNotification(withdrawal.userId, {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message || null,
          link: notif.link || null,
          createdAt: notif.createdAt,
        });
      } catch (pubErr) {
        console.error('Failed to publish notification', pubErr);
      }
    } catch (notifErr) {
      console.error('Failed to create notification', notifErr);
    }

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: requester.id,
          action: 'COIN_WITHDRAWAL_PROCESSED',
          meta: JSON.stringify({
            withdrawalId,
            userId: withdrawal.userId,
            volunteerId: withdrawal.user.volunteerId,
            coins: withdrawal.coins,
            takaAmount: withdrawal.takaAmount,
            status,
            notes,
          }),
        },
      });
    } catch (e) {
      console.error('Failed to create audit log', e);
    }

    return NextResponse.json({ ok: true, withdrawal: updatedWithdrawal });
  } catch (err: any) {
    console.error('PATCH /api/admin/coins/withdrawals error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
