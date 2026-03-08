import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog } from '@/lib/prisma-audit';
import { publishNotification } from '@/lib/ably';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['MASTER', 'ADMIN', 'HR'];

const ActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNote: z.string().optional(),
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

    const { action, adminNote } = parsed.data;

    const delayReq = await prisma.monthlyPaymentDelayRequest.findUnique({
      where: { id: id },
    });

    if (!delayReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (delayReq.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already reviewed' }, { status: 409 });
    }

    const updated = await prisma.monthlyPaymentDelayRequest.update({
      where: { id: id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedById: admin.id,
        reviewedAt: new Date(),
        adminNote: adminNote ?? null,
      },
    });

    // Notify user
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthLabel = `${monthNames[delayReq.month]} ${delayReq.year}`;
    const notifType = action === 'approve' ? 'MONTHLY_PAYMENT_DELAY_APPROVED' : 'MONTHLY_PAYMENT_DELAY_REJECTED';

    const notification = await prisma.notification.create({
      data: {
        userId: delayReq.userId,
        type: notifType,
        title: action === 'approve'
          ? `Delay request approved — ${monthLabel}`
          : `Delay request rejected — ${monthLabel}`,
        message: action === 'approve'
          ? `Your delay request for ${monthLabel} monthly donation has been approved. You may now submit without a fine.`
          : `Your delay request for ${monthLabel} was rejected.${adminNote ? ` Note: ${adminNote}` : ''}`,
        link: '/dashboard',
      },
    });

    await publishNotification(delayReq.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
    });

    await createAuditLog(admin.id, action === 'approve' ? 'MONTHLY_PAYMENT_DELAY_APPROVED' : 'MONTHLY_PAYMENT_DELAY_REJECTED', {
      requestId: id,
      userId: delayReq.userId,
      month: delayReq.month,
      year: delayReq.year,
      adminNote: adminNote ?? null,
    }).catch(() => {});

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error('[admin/monthly-payments/delay-requests/[id] POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
