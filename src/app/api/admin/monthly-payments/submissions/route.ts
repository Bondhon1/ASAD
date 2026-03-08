import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['MASTER', 'ADMIN', 'HR'];

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
    const status = url.searchParams.get('status'); // PENDING | APPROVED | REJECTED | all
    const monthStr = url.searchParams.get('month');
    const yearStr = url.searchParams.get('year');

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (monthStr) where.month = parseInt(monthStr);
    if (yearStr) where.year = parseInt(yearStr);

    const submissions = await prisma.monthlyPayment.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            volunteerId: true,
            email: true,
            institute: { select: { name: true } },
          },
        },
        approvedBy: { select: { fullName: true, volunteerId: true } },
        config: true,
      },
    });

    // Also fetch delay requests for these months to show alongside
    const monthYears = [...new Set(submissions.map(s => `${s.month}-${s.year}`))];
    const delayRequests = monthYears.length > 0
      ? await prisma.monthlyPaymentDelayRequest.findMany({
          where: {
            OR: [...new Set(submissions.map(s => ({ month: s.month, year: s.year })))],
          },
          include: {
            user: { select: { id: true, fullName: true, volunteerId: true } },
            reviewedBy: { select: { fullName: true, volunteerId: true } },
          },
        })
      : [];

    return NextResponse.json({ submissions, delayRequests });
  } catch (error) {
    console.error('[admin/monthly-payments/submissions GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

