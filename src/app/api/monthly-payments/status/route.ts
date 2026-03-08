import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import {
  DONATION_MONTHS,
  DEFAULT_AMOUNT,
  DEFAULT_FINE,
  DEFAULT_DEADLINE_DAY,
  MONTH_NAMES,
  getDhakaToday,
  isAfterDeadline,
  getRelevantDonationMonths,
} from '@/lib/monthlyPayment';

export const dynamic = 'force-dynamic';

/**
 * GET /api/monthly-payments/status
 * Returns the current monthly payment situation for the logged-in OFFICIAL user:
 *  - currentMonth: the active donation month (if any)
 *  - unpaidMonths: list of past donation months with no APPROVED payment
 *  - payments: all payments by this user
 *  - delayRequests: all delay requests by this user
 */
export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: 'Only OFFICIAL members have monthly donations' }, { status: 403 });
    }

    const today = getDhakaToday();

    // Fetch all relevant monthly payments for this user
    const relevantPairs = getRelevantDonationMonths(24);
    const monthYearPairs = relevantPairs.map(p => ({ month: p.month, year: p.year }));

    // Get existing payments
    const payments = await prisma.monthlyPayment.findMany({
      where: {
        userId: user.id,
        OR: monthYearPairs.map(p => ({ month: p.month, year: p.year })),
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Get configs for relevant months
    const configs = await prisma.monthlyPaymentConfig.findMany({
      where: {
        OR: monthYearPairs.map(p => ({ month: p.month, year: p.year })),
      },
    });

    // Get delay requests
    const delayRequests = await prisma.monthlyPaymentDelayRequest.findMany({
      where: {
        userId: user.id,
        OR: monthYearPairs.map(p => ({ month: p.month, year: p.year })),
      },
    });

    // Helper to get config for a month/year
    const getConfig = (month: number, year: number) =>
      configs.find(c => c.month === month && c.year === year);

    // Build summary of each relevant donation month
    const monthSummaries = relevantPairs.map(({ month, year }) => {
      const config = getConfig(month, year);
      const amount = config?.amount ?? DEFAULT_AMOUNT;
      const fine = config?.fine ?? DEFAULT_FINE;
      const deadlineDay = config?.deadline ?? DEFAULT_DEADLINE_DAY;
      const bkashNumber = config?.bkashNumber ?? null;
      const nagadNumber = config?.nagadNumber ?? null;

      const late = isAfterDeadline(month, year, deadlineDay);

      // Find the best payment for this month (prefer APPROVED > PENDING > REJECTED)
      const monthPayments = payments
        .filter(p => p.month === month && p.year === year)
        .sort((a, b) => {
          const priority = (s: string) => s === 'APPROVED' ? 0 : s === 'PENDING' ? 1 : 2;
          return priority(a.status) - priority(b.status);
        });
      const bestPayment = monthPayments[0] ?? null;

      const delayReq = delayRequests.find(d => d.month === month && d.year === year) ?? null;
      const delayApproved = delayReq?.status === 'APPROVED';

      const isPaid = bestPayment?.status === 'APPROVED';
      const isPending = bestPayment?.status === 'PENDING';
      const isRejected = bestPayment?.status === 'REJECTED' && monthPayments.length > 0;
      const isUnpaid = !isPaid && !isPending;

      // Fine applies if: late AND no approved delay AND not yet paid
      const fineApplies = late && !delayApproved;
      const dueAmount = fineApplies ? amount + fine : amount;

      return {
        month,
        year,
        monthName: MONTH_NAMES[month],
        amount,
        fine,
        deadlineDay,
        bkashNumber,
        nagadNumber,
        isLate: late,
        fineApplies,
        dueAmount,
        isPaid,
        isPending,
        isRejected,
        isUnpaid,
        payment: bestPayment,
        allPayments: monthPayments,
        delayRequest: delayReq,
        delayApproved,
      };
    });

    // Current month (if it's a donation month and already started)
    const currentMonthSummary = monthSummaries.find(
      s => s.month === today.month && s.year === today.year
    ) ?? null;

    // Unpaid overdue months (past deadline, not paid, not pending)
    const unpaidMonths = monthSummaries.filter(s => {
      if (s.isPaid || s.isPending) return false;
      if (!s.isLate) return false; // not yet past deadline → not yet "overdue"
      return true;
    });

    return NextResponse.json({
      today,
      isDonationMonth: DONATION_MONTHS.includes(today.month),
      currentMonthSummary,
      unpaidMonths,
      unpaidCount: unpaidMonths.length,
      monthSummaries,
    });
  } catch (error) {
    console.error('[monthly-payments/status]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

