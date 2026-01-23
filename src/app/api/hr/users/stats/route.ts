import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const finalFrom = url.searchParams.get('finalFrom');
    const finalTo = url.searchParams.get('finalTo');

    // Build base where (exclude BANNED)
    const baseWhere: any = { NOT: { status: 'BANNED' } };

    // If date range provided, filter users by finalPayment.verifiedAt within range
    if (finalFrom || finalTo) {
      const finalFilter: any = {};
      if (finalFrom) {
        const d = new Date(finalFrom);
        if (!isNaN(d.getTime())) finalFilter.gte = d;
      }
      if (finalTo) {
        const d = new Date(finalTo);
        if (!isNaN(d.getTime())) { d.setHours(23,59,59,999); finalFilter.lte = d; }
      }
      baseWhere.finalPayment = { verifiedAt: finalFilter };
    }

    // overall totals (respecting optional date filter)
    const total = await prisma.user.count({ where: baseWhere });

    // OFFICIAL count (either status OFFICIAL or volunteerProfile.isOfficial) — respect date filter
    const officialWhere = {
      AND: [
        baseWhere,
        {
          OR: [
            { status: 'OFFICIAL' },
            { volunteerProfile: { isOfficial: true } },
          ],
        },
      ],
    };

    const officialCount = await prisma.user.count({ where: officialWhere });

    // Rank distribution via groupBy on VolunteerProfile.rankId (respect optional date filter via user relation)
    const grouped = await prisma.volunteerProfile.groupBy({
      by: ['rankId'],
      where: { user: baseWhere },
      _count: { _all: true },
    });
    const rankIds = grouped.map(g => g.rankId).filter(Boolean) as string[];
    const ranks = await prisma.rank.findMany({ where: { id: { in: rankIds } }, select: { id: true, name: true } });
    const rankMap: Record<string, string> = {};
    ranks.forEach(r => { rankMap[r.id] = r.name; });

    const rankCounts = grouped.map(g => ({ rank: g.rankId ? (rankMap[g.rankId] || g.rankId) : '—', count: g._count._all }));
    // sort desc
    rankCounts.sort((a, b) => b.count - a.count);

    return NextResponse.json({ total, officialCount, rankCounts });
  } catch (err: any) {
    console.error('GET /api/hr/users/stats error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
