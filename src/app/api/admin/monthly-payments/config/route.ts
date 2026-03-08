import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog } from '@/lib/prisma-audit';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['MASTER', 'ADMIN'];

const ConfigSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
  amount: z.number().positive().optional(),
  fine: z.number().min(0).optional(),
  deadline: z.number().int().min(1).max(28).optional(), // safe for all months
  bkashNumber: z.string().optional().nullable(),
  nagadNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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

    const url = new URL(req.url);
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');

    if (month && year) {
      const config = await prisma.monthlyPaymentConfig.findUnique({
        where: { month_year: { month: parseInt(month), year: parseInt(year) } },
        include: { createdBy: { select: { fullName: true, volunteerId: true } } },
      });
      return NextResponse.json({ config });
    }

    const configs = await prisma.monthlyPaymentConfig.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: { createdBy: { select: { fullName: true, volunteerId: true } } },
    });
    return NextResponse.json({ configs });
  } catch (error) {
    console.error('[admin/monthly-payments/config GET]', error);
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
    const parsed = ConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { month, year, amount = 35, fine = 5, deadline = 15, bkashNumber, nagadNumber, notes } = parsed.data;

    const config = await prisma.monthlyPaymentConfig.upsert({
      where: { month_year: { month, year } },
      update: { amount, fine, deadline, bkashNumber: bkashNumber ?? null, nagadNumber: nagadNumber ?? null, notes: notes ?? null, createdById: admin.id },
      create: { month, year, amount, fine, deadline, bkashNumber: bkashNumber ?? null, nagadNumber: nagadNumber ?? null, notes: notes ?? null, createdById: admin.id },
    });

    await createAuditLog(admin.id, 'MONTHLY_PAYMENT_CONFIG_UPDATED', {
      month,
      year,
      amount,
      fine,
      deadline,
      bkashNumber: bkashNumber ?? null,
      nagadNumber: nagadNumber ?? null,
    }).catch(() => {});

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[admin/monthly-payments/config POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

