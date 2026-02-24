import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotification } from '@/lib/ably';

/** GET /api/admin/credits/payouts — List all payout requests */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER', 'ADMIN'].includes(String(requester.role).toUpperCase()))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const payouts = await prisma.creditWithdrawal.findMany({
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
            credits: true,
          },
        },
        processedBy: { select: { fullName: true, username: true } },
      },
    });

    // Summary stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allCompleted = payouts.filter((p) => p.status === 'COMPLETED');
    const thisMonthCompleted = allCompleted.filter((p) => p.processedAt && p.processedAt >= monthStart);

    const summary = {
      totalCreditsIssued: payouts.reduce((s, p) => s + (p.status === 'COMPLETED' ? (p.credits ?? 0) : 0), 0),
      totalBDTPaid: allCompleted.reduce((s, p) => s + (p.bdtAmount ?? 0), 0),
      totalPending: payouts.filter((p) => p.status === 'PENDING').length,
      totalCompleted: allCompleted.length,
      totalRejected: payouts.filter((p) => p.status === 'REJECTED').length,
      monthlyBDT: thisMonthCompleted.reduce((s, p) => s + (p.bdtAmount ?? 0), 0),
      monthlyApproved: thisMonthCompleted.length,
    };

    return NextResponse.json({ payouts, summary });
  } catch (err: any) {
    console.error('GET /api/admin/credits/payouts error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

/** PATCH /api/admin/credits/payouts — Mark a payout as COMPLETED or REJECTED */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER', 'ADMIN'].includes(String(requester.role).toUpperCase()))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { payoutId, status, notes, confirmedBkash, confirmedBDT } = body;

    if (!payoutId || !status)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    if (!['COMPLETED', 'REJECTED'].includes(status))
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const payout = await prisma.creditWithdrawal.findUnique({
      where: { id: payoutId },
      include: { user: true },
    });

    if (!payout) return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    if (payout.status !== 'PENDING')
      return NextResponse.json({ error: 'Payout already processed' }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'COMPLETED') {
        // Deduct credits only on completion
        const currentUser = await tx.user.findUnique({ where: { id: payout.userId } });
        const currentCredits = currentUser?.credits ?? 0;
        if (currentCredits < (payout.credits ?? 0)) {
          throw new Error(`User only has ${currentCredits} credits; cannot deduct ${payout.credits}`);
        }
        await tx.user.update({
          where: { id: payout.userId },
          data: { credits: { decrement: payout.credits ?? 0 } },
        });
      }

      return await tx.creditWithdrawal.update({
        where: { id: payoutId },
        data: {
          status,
          processedById: requester.id,
          processedAt: new Date(),
          notes: notes || null,
          // Persist confirmed values if provided by admin
          ...(status === 'COMPLETED' && confirmedBkash ? { bkashNumber: confirmedBkash } : {}),
          ...(status === 'COMPLETED' && confirmedBDT ? { bdtAmount: Number(confirmedBDT) } : {}),
        },
      });
    });

    // Notify user
    try {
      const notif = await prisma.notification.create({
        data: {
          userId: payout.userId,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: status === 'COMPLETED' ? 'APC Payout Completed' : 'APC Payout Rejected',
          message:
            status === 'COMPLETED'
              ? `Your payout request of ৳${payout.bdtAmount?.toFixed(2)} has been approved and sent to your bKash.${notes ? ` Note: ${notes}` : ''}`
              : `Your payout request has been rejected.${notes ? ` Reason: ${notes}` : ''}`,
          link: '/dashboard',
        },
      });

      await publishNotification(payout.userId, {
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message ?? null,
        link: notif.link ?? null,
        createdAt: notif.createdAt,
      });
    } catch (notifErr) {
      console.error('Notification error', notifErr);
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: requester.id,
          action: 'APC_PAYOUT_PROCESSED',
          meta: JSON.stringify({
            payoutId,
            userId: payout.userId,
            volunteerId: payout.user?.volunteerId,
            credits: payout.credits,
            bdtAmount: payout.bdtAmount,
            confirmedBDT: confirmedBDT ?? payout.bdtAmount,
            status,
            notes,
          }),
          affectedVolunteerId: payout.user?.volunteerId ?? undefined,
        },
      });
    } catch (_e) { /* non-critical */ }

    return NextResponse.json({ ok: true, payout: updated });
  } catch (err: any) {
    console.error('PATCH /api/admin/credits/payouts error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
