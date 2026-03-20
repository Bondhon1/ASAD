import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, CACHE_TTL, invalidateAll } from '@/lib/hrUsersCache';
import { getRelevantDonationMonths, DEFAULT_DEADLINE_DAY, isAfterDeadline } from '@/lib/monthlyPayment';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    const isOfficialParam = url.searchParams.get('isOfficial');
    const finalFrom = url.searchParams.get('finalFrom');
    const finalTo = url.searchParams.get('finalTo');
    const rankParam = url.searchParams.get('rank');
    const q = url.searchParams.get('q') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));

    // Create cache key from query params (include date filters)
    const cacheKey = `${statusParam}-${isOfficialParam}-${finalFrom || ''}-${finalTo || ''}-${q}-${rankParam || ''}-${page}-${pageSize}`;

    // Check cache first (bypass cache when rank filter provided to avoid stale rank-expanded results)
    const cached = rankParam ? null : getCache(cacheKey);
    const now = Date.now();

    // Run authorization check in parallel with data fetch
    const [requester, usersData] = await Promise.all([
      prisma.user.findUnique({
        where: { email: session.user.email },
        select: { role: true, status: true },
      }),
      cached && (now - cached.timestamp < CACHE_TTL)
        ? Promise.resolve({ ...cached.data, fromCache: true })
        : fetchUsersData(statusParam, isOfficialParam, rankParam, q, page, pageSize, finalFrom, finalTo, cacheKey),
    ]);

    if (!requester || requester.status === 'BANNED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fromCache, ...responseData } = usersData;
    return NextResponse.json(responseData, {
      headers: { 
        'X-Cache': fromCache ? 'HIT' : 'MISS',
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    });
  } catch (err: any) {
    console.error('GET /api/hr/users error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

async function fetchUsersData(
  statusParam: string | null,
  isOfficialParam: string | null,
  rankParam: string | null,
  q: string,
  page: number,
  pageSize: number,
  finalFrom: string | null,
  finalTo: string | null,
  cacheKey: string
) {
  const where: any = {};
  // By default exclude BANNED users from listings unless explicitly requested
  if (statusParam) {
    if (statusParam === 'UNOFFICIAL') {
      where.NOT = { status: 'OFFICIAL' };
    } else {
      where.status = statusParam;
    }
  } else {
    where.NOT = { status: 'BANNED' };
  }

  if (isOfficialParam === 'true') {
    where.volunteerProfile = { ...(where.volunteerProfile || {}), isOfficial: true };
  }

  // Filter by rank (accepts rank id or rank name). If a parent rank is provided,
  // expand it to its immediate child ranks so users of child ranks are returned.
  // Do NOT apply rank filtering when status=UNOFFICIAL (unofficial users won't have ranks).
  if (rankParam && statusParam !== 'UNOFFICIAL') {
    const volFilter: any = { ...(where.volunteerProfile || {}) };
    try {
      const rankById = await prisma.rank.findUnique({ where: { id: rankParam }, include: { subRanks: true } });
      if (rankById) {
        if (Array.isArray(rankById.subRanks) && rankById.subRanks.length > 0) {
          const childIds = rankById.subRanks.map(s => s.id);
              volFilter.rankId = { in: childIds };
        } else {
              volFilter.rankId = rankById.id;
        }
      } else {
        // treat as name search; find matching ranks and expand children if present
        const matched = await prisma.rank.findMany({ where: { name: { contains: rankParam, mode: 'insensitive' } }, include: { subRanks: true } });
        if (matched.length > 0) {
          const ids: string[] = [];
          for (const m of matched) {
            if (Array.isArray(m.subRanks) && m.subRanks.length > 0) {
              m.subRanks.forEach(s => ids.push(s.id));
            } else {
              ids.push(m.id);
            }
          }
              if (ids.length === 1) volFilter.rankId = ids[0];
              else volFilter.rankId = { in: ids };
        } else {
          // fallback to name contains
              volFilter.rank = { name: { contains: rankParam, mode: 'insensitive' } }; // fallback to name contains on related Rank
        }
      }
    } catch (e) {
      volFilter.rank = { name: { contains: rankParam, mode: 'insensitive' } };
    }

    // default to official volunteers when filtering by rank unless status explicitly provided
    if (!statusParam && !isOfficialParam) volFilter.isOfficial = true;

    where.volunteerProfile = volFilter;
  }

  // Filter by finalPayment.verifiedAt when date range provided
  if (finalFrom || finalTo) {
    const finalFilter: any = {};
    if (finalFrom) {
      const d = new Date(finalFrom);
      if (!isNaN(d.getTime())) finalFilter.gte = d;
    }
    if (finalTo) {
      const d = new Date(finalTo);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        finalFilter.lte = d;
      }
    }
    // ensure finalPayment exists and its verifiedAt is within range
    where.finalPayment = { verifiedAt: finalFilter };
  }

  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { fullName: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
      { volunteerId: { contains: q, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * pageSize;

  // Lightweight query - only fetch what's displayed in the list view
  // Detailed data can be fetched per-user when needed (e.g., when expanded)
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        status: true,
        role: true,
        volunteerId: true,
        // Only rank is needed for list row display; all other profile/payment/institute
        // data is fetched on-demand via GET /api/hr/users/[id] when a user is expanded.
        volunteerProfile: { 
          select: { 
            rank: { select: { id: true, name: true } },
          } 
        },
        monthlyPaymentExempt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  // Normalize rank to a simple string for frontend convenience
  const usersNormalized = users.map((u: any) => {
    if (u.volunteerProfile && u.volunteerProfile.rank) {
      return { ...u, volunteerProfile: { ...u.volunteerProfile, rank: u.volunteerProfile.rank.name ?? u.volunteerProfile.rank } };
    }
    return u;
  });

  // Compute overdue donation counts for OFFICIAL non-exempt users — one batch query instead of per-user calls
  const officialIds = users.filter((u: any) => u.status === 'OFFICIAL' && !u.monthlyPaymentExempt).map((u: any) => u.id);
  const overdueMap: Record<string, number> = {};
  if (officialIds.length > 0) {
    const relevantPairs = getRelevantDonationMonths(24);
    
    // Fetch deadline configs for each month to ensure consistency with user-status endpoint
    const configs = await prisma.monthlyPaymentConfig.findMany({
      where: { OR: relevantPairs.map(p => ({ month: p.month, year: p.year })) },
    });

    // Filter pairs where deadline has passed, using config-specific deadlines
    const overduePairs = relevantPairs.filter(p => {
      const config = configs.find(c => c.month === p.month && c.year === p.year);
      const deadlineDay = config?.deadline ?? DEFAULT_DEADLINE_DAY;
      return isAfterDeadline(p.month, p.year, deadlineDay);
    });

    if (overduePairs.length > 0) {
      const payments = await prisma.monthlyPayment.findMany({
        where: {
          userId: { in: officialIds },
          status: { in: ['APPROVED', 'PENDING'] },
          OR: overduePairs.map(p => ({ month: p.month, year: p.year })),
        },
        select: { userId: true, month: true, year: true },
      });
      for (const uid of officialIds) {
        const userPayments = payments.filter((p: any) => p.userId === uid);
        overdueMap[uid] = overduePairs.filter(dp =>
          !userPayments.some((p: any) => p.month === dp.month && p.year === dp.year)
        ).length;
      }
    }
  }

  const usersWithOverdue = usersNormalized.map((u: any) => ({
    ...u,
    overdueMonthsCount: u.monthlyPaymentExempt ? 0 : (overdueMap[u.id] ?? 0),
  }));

  const data = { users: usersWithOverdue, total, page, pageSize };

  // Update cache
  setCache(cacheKey, { data, timestamp: Date.now() });

  return { ...data, fromCache: false };
}
