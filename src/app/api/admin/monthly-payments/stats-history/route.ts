import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['MASTER', 'ADMIN', 'HR'];

export async function GET() {
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

    // Group by month + year + status to get counts and sums
    const groups = await prisma.monthlyPayment.groupBy({
      by: ['month', 'year', 'status'],
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    // Merge groups into per-period entries
    const periodMap = new Map<string, {
      month: number; year: number;
      pending: number; approved: number; rejected: number;
      totalCollected: number;
    }>();

    for (const g of groups) {
      const key = `${g.month}-${g.year}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, { month: g.month, year: g.year, pending: 0, approved: 0, rejected: 0, totalCollected: 0 });
      }
      const entry = periodMap.get(key)!;
      const count = g._count.id;
      const sum = g._sum.totalAmount ?? 0;
      if (g.status === 'PENDING') entry.pending = count;
      else if (g.status === 'APPROVED') { entry.approved = count; entry.totalCollected = sum; }
      else if (g.status === 'REJECTED') entry.rejected = count;
    }

    const history = Array.from(periodMap.values()).sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month
    );

    return NextResponse.json({ history });
  } catch (err) {
    console.error('stats-history error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
