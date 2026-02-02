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

    // Read optional filters from query string
    const statusParam = url.searchParams.get('status');
    const rankParam = url.searchParams.get('rank');

    // Build baseWhere following same semantics as /api/hr/users
    const baseWhere: any = {};
    if (statusParam) {
      if (statusParam === 'UNOFFICIAL') {
        baseWhere.NOT = { status: 'OFFICIAL' };
      } else {
        baseWhere.status = statusParam;
      }
    } else {
      // default: exclude BANNED
      baseWhere.NOT = { status: 'BANNED' };
    }

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


    
      // Determine target ranks for rank filtering. If a specific rank id is provided and it has subRanks,
      // treat it as a parent: target its child ranks (show children in stats). Otherwise target the rank(s) directly.
      let targetRankIds: string[] | null = null; // null => include all ranks
      let targetRankRecords: Array<{ id: string; name: string }> = [];
      if (rankParam && statusParam !== 'UNOFFICIAL') {
        // try treat rankParam as id first
        const rankById = await prisma.rank.findUnique({ where: { id: rankParam }, include: { subRanks: true } });
        if (rankById) {
          if (Array.isArray(rankById.subRanks) && rankById.subRanks.length > 0) {
            // parent rank: target its immediate children
            targetRankIds = rankById.subRanks.map(s => s.id);
            targetRankRecords = rankById.subRanks.map(s => ({ id: s.id, name: s.name }));
          } else {
            // specific rank selected
            targetRankIds = [rankById.id];
            targetRankRecords = [{ id: rankById.id, name: rankById.name }];
          }
        } else {
          // treat rankParam as name search (fallback)
          const matched = await prisma.rank.findMany({ where: { name: { contains: rankParam, mode: 'insensitive' } }, include: { subRanks: true } });
          if (matched.length > 0) {
            // collect either children (if any) or the ranks themselves
            const ids: string[] = [];
            const recs: Array<{ id: string; name: string }> = [];
            for (const m of matched) {
              if (Array.isArray(m.subRanks) && m.subRanks.length > 0) {
                m.subRanks.forEach(s => { ids.push(s.id); recs.push({ id: s.id, name: s.name }); });
              } else {
                ids.push(m.id); recs.push({ id: m.id, name: m.name });
              }
            }
            targetRankIds = ids;
            targetRankRecords = recs;
          } else {
            // no matched ranks; fall back to no-op (no rank filtering)
            targetRankIds = null;
          }
        }
      
        // apply isOfficial default when filtering by rank unless status explicitly provided
        if (!statusParam || statusParam === 'ANY') {
          baseWhere.volunteerProfile = { ...(baseWhere.volunteerProfile || {}), isOfficial: true };
        }
      
        // Do not mutate baseWhere with a nested rank object (can cause mismatched nested filters).
        // We'll build `totalsWhere` later to apply rankId filtering for totals/official counts.
      }

    // Build totalsWhere which applies rankId filtering for totals/official counts when requested
    const totalsWhere: any = { ...baseWhere };
    if (targetRankIds && targetRankIds.length > 0) {
      totalsWhere.volunteerProfile = { ...(totalsWhere.volunteerProfile || {}), rankId: { in: targetRankIds } };
    }

    // overall totals (respecting optional date filter and rank scope)
    const total = await prisma.user.count({ where: totalsWhere });

    // OFFICIAL count (either status OFFICIAL or volunteerProfile.isOfficial) — respect date filter and rank scope
    const officialWhere = {
      AND: [
        totalsWhere,
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
    const groupWhere: any = { user: baseWhere };
    if (typeof targetRankIds !== 'undefined' && targetRankIds && targetRankIds.length > 0) {
      groupWhere.rankId = { in: targetRankIds };
    }

    const grouped = await prisma.volunteerProfile.groupBy({
      by: ['rankId'],
      where: groupWhere,
      _count: { _all: true },
    });

    // Prepare counts mapping for ranks
    const countsById: Record<string, number> = {};
    grouped.forEach(g => {
      if (g.rankId) countsById[g.rankId] = g._count._all;
    });
    // Compute unranked (null) count as: total users - users that have any rank
    let nullCount = 0;
    if (!targetRankIds || targetRankIds.length === 0) {
      const usersWithRank = await prisma.user.count({ where: { ...totalsWhere, volunteerProfile: { rankId: { not: null } } } });
      nullCount = Math.max(0, total - usersWithRank);
    }

    // Determine which ranks to report: targetRankRecords (when a rank filter is applied)
    // or all ranks when no rank filter.
    let ranksToReport: Array<{ id: string; name: string }> = [];
    if (typeof targetRankIds !== 'undefined' && targetRankIds && targetRankIds.length > 0) {
      if (targetRankRecords && targetRankRecords.length > 0) {
        ranksToReport = targetRankRecords;
      } else {
        ranksToReport = await prisma.rank.findMany({ where: { id: { in: targetRankIds } }, select: { id: true, name: true } });
      }
    } else {
      ranksToReport = await prisma.rank.findMany({ select: { id: true, name: true } });
    }

    const rankCounts = ranksToReport.map(r => ({ rank: r.name, count: countsById[r.id] || 0 }));
    // Optionally include unranked as '—' entry only when not filtering by rank
    if (nullCount > 0 && (!targetRankIds || targetRankIds.length === 0)) rankCounts.push({ rank: '—', count: nullCount });

    // sort desc
    rankCounts.sort((a, b) => b.count - a.count);

    return NextResponse.json({ total, officialCount, rankCounts });
  } catch (err: any) {
    console.error('GET /api/hr/users/stats error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
