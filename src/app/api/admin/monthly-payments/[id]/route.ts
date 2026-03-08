import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { publishNotification } from '@/lib/ably';
import { createAuditLog } from '@/lib/prisma-audit';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['MASTER', 'ADMIN', 'HR'];

const ActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().nullish(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (!admin || !ADMIN_ROLES.includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { action, rejectionReason } = parsed.data;

    const payment = await prisma.monthlyPayment.findUnique({
      where: { id },
    });

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only PENDING payments can be reviewed' }, { status: 409 });
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const updated = await prisma.monthlyPayment.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        approvedById: admin.id,
        approvedAt: new Date(),
        rejectionReason: action === 'reject' ? rejectionReason : null,
      },
    });

    // Auto-approve any linked payments submitted with the same TrxID (covered overdue months)
    if (action === 'approve') {
      await prisma.monthlyPayment.updateMany({
        where: {
          userId: payment.userId,
          trxId: payment.trxId,
          id: { not: id },
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          approvedById: admin.id,
          approvedAt: new Date(),
        },
      });
    }

    // Send notification to user
    const notifType = action === 'approve' ? 'MONTHLY_PAYMENT_APPROVED' : 'MONTHLY_PAYMENT_REJECTED';
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = `${monthNames[payment.month]} ${payment.year}`;

    const notification = await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: notifType,
        title: action === 'approve'
          ? `Monthly payment approved — ${monthLabel}`
          : `Monthly payment rejected — ${monthLabel}`,
        message: action === 'approve'
          ? `Your monthly donation for ${monthLabel} has been approved.`
          : `Your monthly donation for ${monthLabel} was rejected. Reason: ${rejectionReason}`,
        link: '/dashboard',
      },
    });

    await publishNotification(payment.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
    });

    await createAuditLog(admin.id, action === 'approve' ? 'MONTHLY_PAYMENT_APPROVED' : 'MONTHLY_PAYMENT_REJECTED', {
      paymentId: id,
      userId: payment.userId,
      month: payment.month,
      year: payment.year,
      trxId: payment.trxId,
      totalAmount: payment.totalAmount,
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
    }).catch(() => {});

    return NextResponse.json({ success: true, payment: updated });
  } catch (error) {
    console.error('[admin/monthly-payments/[id] POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
