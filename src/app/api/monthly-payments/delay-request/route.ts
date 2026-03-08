import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { DONATION_MONTHS, getDhakaToday, isAfterDeadline, DEFAULT_DEADLINE_DAY, MONTH_NAMES } from '@/lib/monthlyPayment';
import { z } from 'zod';
import { createAuditLog } from '@/lib/prisma-audit';
import { publishNotification } from '@/lib/ably';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
  reason: z.string().min(10, 'Please provide a reason (min 10 characters)').max(500),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });

    if (!user || user.status !== 'OFFICIAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { month, year, reason } = parsed.data;

    if (!DONATION_MONTHS.includes(month)) {
      return NextResponse.json({ error: 'Not a donation month' }, { status: 400 });
    }

    // Must be past the deadline to request a delay
    const config = await prisma.monthlyPaymentConfig.findUnique({
      where: { month_year: { month, year } },
    });
    const deadlineDay = config?.deadline ?? DEFAULT_DEADLINE_DAY;
    if (!isAfterDeadline(month, year, deadlineDay)) {
      return NextResponse.json({ error: 'Deadline has not passed yet — no delay needed' }, { status: 400 });
    }

    // Cannot request delay if already approved for that month
    const approved = await prisma.monthlyPayment.findFirst({
      where: { userId: user.id, month, year, status: 'APPROVED' },
    });
    if (approved) {
      return NextResponse.json({ error: 'Monthly payment already approved' }, { status: 409 });
    }

    // Upsert delay request
    const delayReq = await prisma.monthlyPaymentDelayRequest.upsert({
      where: { userId_month_year: { userId: user.id, month, year } },
      update: { reason, status: 'PENDING', reviewedById: null, reviewedAt: null, adminNote: null },
      create: { userId: user.id, month, year, reason },
    });

    await createAuditLog(user.id, 'MONTHLY_PAYMENT_DELAY_REQUESTED', { month, year, reason }).catch(() => {});

    // Notify HR/ADMIN/MASTER about the new delay request
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;
    const requesterUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, volunteerId: true },
    });
    const senderName = requesterUser?.fullName || requesterUser?.volunteerId || user.id;

    const hrAdmins = await prisma.user.findMany({
      where: { role: { in: ['HR', 'MASTER', 'ADMIN'] }, status: 'OFFICIAL' },
      select: { id: true },
    });

    await Promise.all(
      hrAdmins.map(async (admin) => {
        try {
          const notif = await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'MONTHLY_PAYMENT_DUE',
              title: `Delay request — ${monthLabel}`,
              message: `${senderName} requested a payment delay for ${monthLabel}.${reason ? ` Reason: ${reason.slice(0, 100)}${reason.length > 100 ? '…' : ''}` : ''}`,
              link: '/dashboard/admin/monthly-payments',
            },
          });
          await publishNotification(admin.id, {
            id: notif.id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            link: notif.link,
            createdAt: notif.createdAt,
          });
        } catch {
          // non-critical
        }
      })
    );

    return NextResponse.json({ success: true, delayRequest: delayReq });
  } catch (error) {
    console.error('[monthly-payments/delay-request]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

