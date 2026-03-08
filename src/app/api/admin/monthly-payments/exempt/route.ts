import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/prisma-audit';
import { publishNotification } from '@/lib/ably';
import { NotificationType } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['MASTER', 'ADMIN'];

const ExemptSchema = z.object({
  volunteerIds: z.array(z.string().regex(/^\d+$/, 'Volunteer IDs must be numeric')).min(1),
  exempt: z.boolean(),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    if (!admin || !ADMIN_ROLES.includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const exemptUsers = await prisma.user.findMany({
      where: { monthlyPaymentExempt: true },
      select: {
        id: true,
        fullName: true,
        volunteerId: true,
        email: true,
        monthlyPaymentExemptReason: true,
        monthlyPaymentExemptAt: true,
        monthlyPaymentExemptBy: {
          select: { fullName: true, volunteerId: true },
        },
        institute: { select: { name: true } },
      },
      orderBy: { monthlyPaymentExemptAt: 'desc' },
    });

    return NextResponse.json({ exemptUsers });
  } catch (error) {
    console.error('[admin/monthly-payments/exempt GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    const parsed = ExemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { volunteerIds, exempt, reason } = parsed.data;

    const results: { volunteerId: string; ok: boolean; error?: string; fullName?: string | null }[] = [];

    for (const vid of volunteerIds) {
      const user = await prisma.user.findUnique({
        where: { volunteerId: vid },
        select: { id: true, fullName: true, volunteerId: true },
      });

      if (!user) {
        results.push({ volunteerId: vid, ok: false, error: 'Volunteer not found' });
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          monthlyPaymentExempt: exempt,
          monthlyPaymentExemptReason: exempt ? (reason ?? null) : null,
          monthlyPaymentExemptAt: exempt ? new Date() : null,
          monthlyPaymentExemptById: exempt ? admin.id : null,
        },
      });

      await createAuditLog(admin.id, exempt ? 'MONTHLY_PAYMENT_EXEMPT_GRANTED' : 'MONTHLY_PAYMENT_EXEMPT_REVOKED', {
        targetUserId: user.id,
        volunteerId: vid,
        reason: reason ?? null,
      }).catch(() => {});

      // Notify the user in real-time
      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          type: exempt ? NotificationType.MONTHLY_PAYMENT_EXEMPT_GRANTED : NotificationType.MONTHLY_PAYMENT_EXEMPT_REVOKED,
          title: exempt ? 'Monthly Donation Exemption Granted' : 'Monthly Donation Exemption Revoked',
          message: exempt
            ? `You have been exempted from monthly donations.${reason ? ` Reason: ${reason}` : ''}`
            : 'Your monthly donation exemption has been revoked. Please ensure your donations are up to date.',
          link: '/dashboard',
        },
      });
      await publishNotification(user.id, {
        id: notif.id, type: notif.type, title: notif.title,
        message: notif.message, link: notif.link, createdAt: notif.createdAt,
      }).catch(() => {});

      results.push({ volunteerId: vid, ok: true, fullName: user.fullName });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[admin/monthly-payments/exempt POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
