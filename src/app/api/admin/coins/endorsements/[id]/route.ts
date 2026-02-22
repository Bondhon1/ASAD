// @ts-nocheck — COIN MANAGEMENT DISABLED file, TypeScript checking suppressed// ═════════════════════════════════════════════════════════
// COIN MANAGEMENT DISABLED — DO NOT DELETE
// Remove the early return in the handler below to re-enable.
// ═════════════════════════════════════════════════════════
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotification } from '@/lib/ably';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // COIN MANAGEMENT DISABLED — remove this line to re-enable
  return NextResponse.json({ error: 'Feature temporarily disabled' }, { status: 503 });
  // eslint-disable-next-line no-unreachable
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const role = String(requester.role || '').toUpperCase();
    if (role !== 'MASTER' && role !== 'ADMIN')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const endorsement = await (prisma as any).coinEndorsement.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!endorsement) return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 });
    if (endorsement.status !== 'PENDING')
      return NextResponse.json({ error: 'Request is already processed' }, { status: 400 });

    const body = await req.json();
    const { status, notes, coinsToAdd } = body; // status: APPROVED | REJECTED

    if (status !== 'APPROVED' && status !== 'REJECTED')
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    // Determine how many coins to grant (admin can override, default 1 coin per 1 BDT)
    const coinsGranted = status === 'APPROVED' ? (coinsToAdd ?? Math.round(endorsement.amount)) : 0;

    const notif = await prisma.$transaction(async (tx) => {
      await (tx as any).coinEndorsement.update({
        where: { id },
        data: {
          status,
          notes: notes || null,
          processedById: requester.id,
          processedAt: new Date(),
        },
      });

      if (status === 'APPROVED') {
        await tx.user.update({
          where: { id: endorsement.userId },
          data: { coins: { increment: coinsGranted } },
        });

        return tx.notification.create({
          data: {
            userId: endorsement.userId,
            type: 'COIN_ENDORSED' as any,
            title: 'Coin Endorsement Approved',
            message: `Your endorsement of ৳${endorsement.amount.toFixed(2)} has been approved. ${coinsGranted} coins have been added to your account.`,
            link: '/dashboard',
          },
        });
      } else {
        return tx.notification.create({
          data: {
            userId: endorsement.userId,
            type: 'COIN_ENDORSEMENT_REJECTED' as any,
            title: 'Coin Endorsement Rejected',
            message: `Your endorsement request was rejected.${notes ? ` Reason: ${notes}` : ''}`,
            link: '/dashboard',
          },
        });
      }
    });

    // Push real-time notification
    try {
      const n = notif as any;
      await publishNotification(endorsement.userId, {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        createdAt: n.createdAt,
      });
    } catch (e) {
      // ignore real-time errors
    }

    return NextResponse.json({ ok: true, coinsGranted });
  } catch (err: any) {
    console.error(`PATCH /api/admin/coins/endorsements/${id} error:`, err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
