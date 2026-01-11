import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// In-memory cache for users data
const usersCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15000; // 15 seconds

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    const isOfficialParam = url.searchParams.get('isOfficial');
    const q = url.searchParams.get('q') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));

    // Create cache key from query params
    const cacheKey = `${statusParam}-${isOfficialParam}-${q}-${page}-${pageSize}`;

    // Check cache first
    const cached = usersCache.get(cacheKey);
    const now = Date.now();

    // Run authorization check in parallel with data fetch
    const [requester, usersData] = await Promise.all([
      prisma.user.findUnique({
        where: { email: session.user.email },
        select: { role: true, status: true },
      }),
      cached && (now - cached.timestamp < CACHE_TTL)
        ? Promise.resolve({ ...cached.data, fromCache: true })
        : fetchUsersData(statusParam, isOfficialParam, q, page, pageSize, cacheKey),
    ]);

    if (!requester || requester.status === 'BANNED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['HR', 'MASTER'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fromCache, ...responseData } = usersData;
    return NextResponse.json(responseData, {
      headers: { 'X-Cache': fromCache ? 'HIT' : 'MISS' }
    });
  } catch (err: any) {
    console.error('GET /api/hr/users error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

async function fetchUsersData(
  statusParam: string | null,
  isOfficialParam: string | null,
  q: string,
  page: number,
  pageSize: number,
  cacheKey: string
) {
  const where: any = {};

  if (statusParam) {
    if (statusParam === 'UNOFFICIAL') {
      where.NOT = { status: 'OFFICIAL' };
    } else {
      where.status = statusParam;
    }
  }

  if (isOfficialParam === 'true') {
    where.volunteerProfile = { isOfficial: true };
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
        createdAt: true,
        institute: { select: { name: true } },
        volunteerProfile: { select: { points: true, isOfficial: true, rank: true } },
        initialPayment: { select: { status: true } },
        _count: {
          select: {
            taskSubmissions: true,
            donations: true,
          },
        },
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

  const data = { users: usersNormalized, total, page, pageSize };

  // Update cache
  usersCache.set(cacheKey, { data, timestamp: Date.now() });

  return { ...data, fromCache: false };
}
