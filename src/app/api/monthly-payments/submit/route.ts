import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import {
  DONATION_MONTHS,
  DEFAULT_AMOUNT,
  DEFAULT_FINE,
  DEFAULT_DEADLINE_DAY,
  getDhakaToday,
  isAfterDeadline,
} from '@/lib/monthlyPayment';
import { z } from 'zod';
import { createAuditLog } from '@/lib/prisma-audit';

export const dynamic = 'force-dynamic';

const SubmitSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024),
  senderNumber: z.string().regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi phone number'),
  paymentMethod: z.enum(['bkash', 'nagad']),
  trxId: z.string().min(4, 'Transaction ID required'),
  coveredMonths: z.array(z.object({ month: z.number().int().min(1).max(12), year: z.number().int() })).optional(),
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
      return NextResponse.json({ error: 'Only OFFICIAL members can submit monthly payments' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { month, year, senderNumber, paymentMethod, trxId, coveredMonths = [] } = parsed.data;

    if (!DONATION_MONTHS.includes(month)) {
      return NextResponse.json({ error: 'Not a donation month' }, { status: 400 });
    }

    // Get config
    const config = await prisma.monthlyPaymentConfig.findUnique({
      where: { month_year: { month, year } },
    });

    const baseAmount = config?.amount ?? DEFAULT_AMOUNT;
    const fine = config?.fine ?? DEFAULT_FINE;
    const deadlineDay = config?.deadline ?? DEFAULT_DEADLINE_DAY;

    const late = isAfterDeadline(month, year, deadlineDay);

    // Validate: month must have started (day 1 of that month)
    const today = getDhakaToday();
    if (year > today.year || (year === today.year && month > today.month)) {
      return NextResponse.json({ error: 'Cannot submit payment for a future month' }, { status: 400 });
    }

    // Check for an approved delay request
    const delayRequest = await prisma.monthlyPaymentDelayRequest.findUnique({
      where: { userId_month_year: { userId: user.id, month, year } },
    });
    const delayApproved = delayRequest?.status === 'APPROVED';

    // Check existing payments — reject resubmit if there's already a PENDING or APPROVED
    const existingPayment = await prisma.monthlyPayment.findFirst({
      where: {
        userId: user.id,
        month,
        year,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingPayment?.status === 'APPROVED') {
      return NextResponse.json({ error: 'Payment already approved for this month' }, { status: 409 });
    }

    if (existingPayment?.status === 'PENDING') {
      return NextResponse.json({ error: 'Payment already submitted and pending review' }, { status: 409 });
    }

    // Fine applies if late and delay not approved
    const fineApplies = late && !delayApproved;
    const fineAmount = fineApplies ? fine : 0;
    const totalAmount = baseAmount + fineAmount;

    const payment = await prisma.monthlyPayment.create({
      data: {
        userId: user.id,
        month,
        year,
        baseAmount,
        fineAmount,
        totalAmount,
        isLate: late,
        isDelayApproved: delayApproved,
        senderNumber,
        paymentMethod,
        trxId,
        configId: config?.id ?? null,
        status: 'PENDING',
      },
    });

    // Create linked PENDING records for any overdue months bundled into this payment
    for (const covered of coveredMonths) {
      const covConfig = await prisma.monthlyPaymentConfig.findUnique({
        where: { month_year: { month: covered.month, year: covered.year } },
      });
      const covBase = covConfig?.amount ?? DEFAULT_AMOUNT;
      const covFine = covConfig?.fine ?? DEFAULT_FINE;
      const covDeadline = covConfig?.deadline ?? DEFAULT_DEADLINE_DAY;
      const covLate = isAfterDeadline(covered.month, covered.year, covDeadline);
      const covDelayReq = await prisma.monthlyPaymentDelayRequest.findUnique({
        where: { userId_month_year: { userId: user.id, month: covered.month, year: covered.year } },
      });
      const covDelayApproved = covDelayReq?.status === 'APPROVED';
      const covFineApplies = covLate && !covDelayApproved;
      const covFineAmount = covFineApplies ? covFine : 0;
      // Skip if already PENDING or APPROVED for this month
      const existing = await prisma.monthlyPayment.findFirst({
        where: { userId: user.id, month: covered.month, year: covered.year, status: { in: ['PENDING', 'APPROVED'] } },
      });
      if (!existing) {
        await prisma.monthlyPayment.create({
          data: {
            userId: user.id,
            month: covered.month,
            year: covered.year,
            baseAmount: covBase,
            fineAmount: covFineAmount,
            totalAmount: covBase + covFineAmount,
            isLate: covLate,
            isDelayApproved: covDelayApproved,
            senderNumber,
            paymentMethod,
            trxId,
            configId: covConfig?.id ?? null,
            status: 'PENDING',
          },
        });
      }
    }

    await createAuditLog(user.id, 'MONTHLY_PAYMENT_SUBMITTED', {
      month,
      year,
      paymentMethod,
      trxId,
      totalAmount,
      isLate: late,
      fineApplies,
      coveredMonths: coveredMonths.length > 0 ? coveredMonths : undefined,
    }).catch(() => {});

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('[monthly-payments/submit]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

