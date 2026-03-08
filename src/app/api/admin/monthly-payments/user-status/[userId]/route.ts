import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import {
  getRelevantDonationMonths,
  DEFAULT_DEADLINE_DAY,
  isAfterDeadline,
} from '@/lib/monthlyPayment';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['MASTER', 'ADMIN', 'HR', 'DIRECTOR'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const viewer = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    // Allow if admin/hr OR if the user is viewing their own record
    const isSelf = viewer?.id === userId;
    if (!viewer || (!ALLOWED_ROLES.includes(viewer.role) && !isSelf)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, monthlyPaymentExempt: true },
    });

    if (!targetUser || targetUser.status !== 'OFFICIAL') {
      return NextResponse.json({ unpaidCount: 0, unpaidMonths: [] });
    }

    if (targetUser.monthlyPaymentExempt) {
      return NextResponse.json({ exempt: true, unpaidCount: 0, unpaidMonths: [] });
    }

    const relevantPairs = getRelevantDonationMonths(24);

    const configs = await prisma.monthlyPaymentConfig.findMany({
      where: { OR: relevantPairs.map(p => ({ month: p.month, year: p.year })) },
    });

    const payments = await prisma.monthlyPayment.findMany({
      where: {
        userId: userId,
        OR: relevantPairs.map(p => ({ month: p.month, year: p.year })),
      },
    });

    const unpaidMonths: Array<{ month: number; year: number; monthName: string }> = [];
    const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    for (const { month, year } of relevantPairs) {
      const config = configs.find(c => c.month === month && c.year === year);
      const deadlineDay = config?.deadline ?? DEFAULT_DEADLINE_DAY;

      if (!isAfterDeadline(month, year, deadlineDay)) continue; // not yet overdue

      const monthPayments = payments.filter(p => p.month === month && p.year === year);
      const hasApproved = monthPayments.some(p => p.status === 'APPROVED');
      const hasPending = monthPayments.some(p => p.status === 'PENDING');

      if (!hasApproved && !hasPending) {
        unpaidMonths.push({ month, year, monthName: MONTH_NAMES[month] });
      }
    }

    return NextResponse.json({ unpaidCount: unpaidMonths.length, unpaidMonths });
  } catch (error) {
    console.error('[admin/monthly-payments/user-status]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
