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
    if (!['HR', 'MASTER'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // overall totals (exclude BANNED users)
    const total = await prisma.user.count({ where: { NOT: { status: 'BANNED' } } });

    // OFFICIAL count (either status OFFICIAL or volunteerProfile.isOfficial) — exclude BANNED
    const officialCount = await prisma.user.count({
      where: {
        AND: [
          { NOT: { status: 'BANNED' } },
          {
            OR: [
              { status: 'OFFICIAL' },
              { volunteerProfile: { isOfficial: true } },
            ],
          },
        ],
      },
    });

    // Rank distribution via groupBy on VolunteerProfile.rankId
    const grouped = await prisma.volunteerProfile.groupBy({ by: ['rankId'], _count: { _all: true } });
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
