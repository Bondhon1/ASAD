import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const DHAKA_UTC_OFFSET_HOURS = 6;

type LeaderboardResponse = {
  leaderboard: Array<{
    id: string;
    fullName: string | null;
    volunteerId: string | null;
    profilePicUrl: string | null;
    role: string;
    monthlyPoints: number;
    totalPoints: number;
  }>;
  month: string;
};

type SessionUserWithAccess = {
  email?: string | null;
  role?: string | null;
  status?: string | null;
};

// Leaderboard is expensive (raw SQL aggregation + user fetches).
// Cache briefly, but tie the cache to the active Dhaka month so it resets cleanly.
let leaderboardCache: { data: LeaderboardResponse; timestamp: number; monthKey: string } | null = null;
const LEADERBOARD_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getDhakaMonthWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  const monthStartUtc = new Date(Date.UTC(year, month - 1, 1, -DHAKA_UTC_OFFSET_HOURS, 0, 0, 0));
  const nextMonthStartUtc = new Date(Date.UTC(year, month, 1, -DHAKA_UTC_OFFSET_HOURS, 0, 0, 0));
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  return { monthStartUtc, nextMonthStartUtc, monthKey };
}

// GET /api/community/leaderboard
// Primary sort: monthly points desc. Tie-break: all-time points desc, then name asc.
// If fewer than 10 users earned points this month, remaining slots are filled with 0-point users.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUserWithAccess | undefined;

    if (!sessionUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // role and status are embedded in the JWT by the auth callback — no extra DB query needed
    const viewerRole = sessionUser.role ?? "";
    const viewerStatus = sessionUser.status ?? "";

    const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];
    const isAllowed =
      viewerStatus === "OFFICIAL" || STAFF_ROLES.includes(viewerRole);

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Only official volunteers can view the leaderboard" },
        { status: 403 }
      );
    }

    const { monthStartUtc, nextMonthStartUtc, monthKey } = getDhakaMonthWindow();

    // Return cached result if still fresh for the current Dhaka month.
    const nowMs = Date.now();
    if (
      leaderboardCache &&
      leaderboardCache.monthKey === monthKey &&
      nowMs - leaderboardCache.timestamp < LEADERBOARD_CACHE_TTL
    ) {
      return NextResponse.json(leaderboardCache.data, {
        headers: {
          'Cache-Control': 'private, no-store',
          'X-Cache': 'HIT',
        },
      });
    }

    // Step 1 – Aggregate points earned this month
    // Uses raw SQL so that batch PointsHistory rows (targetUserIds non-empty) are correctly
    // expanded per recipient via unnest(), rather than attributed to the actor's userId.
    const rawAgg = await prisma.$queryRaw<{ user_id: string; total: bigint }[]>`
      SELECT user_id, SUM(change)::bigint AS total
      FROM (
        -- Individual rows (no batch targets)
        SELECT "userId" AS user_id, change
        FROM "PointsHistory"
        WHERE "createdAt" >= ${monthStartUtc} AND "createdAt" < ${nextMonthStartUtc}
          AND array_length("targetUserIds", 1) IS NULL
        UNION ALL
        -- Batch rows: expand targetUserIds into individual entries
        SELECT unnest("targetUserIds") AS user_id, change
        FROM "PointsHistory"
        WHERE "createdAt" >= ${monthStartUtc} AND "createdAt" < ${nextMonthStartUtc}
          AND array_length("targetUserIds", 1) > 0
      ) t
      GROUP BY user_id
      HAVING SUM(change) > 0
      ORDER BY total DESC
      LIMIT 50
    `;

    const positiveEntries = rawAgg.map(r => ({
      userId: r.user_id,
      _sum: { change: Number(r.total) },
    }));

    // Helper to fetch user info by ids
    const fetchUsers = (ids: string[]) =>
      prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          fullName: true,
          volunteerId: true,
          profilePicUrl: true,
          role: true,
          status: true,
          volunteerProfile: { select: { points: true } },
        },
      });

    // Step 2 – Resolve monthly earners into full entries
    const monthlyUsers = positiveEntries.length > 0
      ? await fetchUsers(positiveEntries.map((e) => e.userId))
      : [];

    const monthlyUserMap = new Map(monthlyUsers.map((u) => [u.id, u]));

    const monthlyEntries = positiveEntries
      .map((entry) => {
        const u = monthlyUserMap.get(entry.userId);
        if (!u) return null;
        return {
          id: u.id,
          fullName: u.fullName,
          volunteerId: u.volunteerId,
          profilePicUrl: u.profilePicUrl,
          role: u.role,
          monthlyPoints: entry._sum.change ?? 0,
          totalPoints: u.volunteerProfile?.points ?? 0,
        };
      })
      .filter(Boolean) as {
        id: string; fullName: string | null; volunteerId: string | null;
        profilePicUrl: string | null; role: string;
        monthlyPoints: number; totalPoints: number;
      }[];

    // Sort monthly entries with tie-breaking
    monthlyEntries.sort((a, b) => {
      if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return (a.fullName ?? "").localeCompare(b.fullName ?? "");
    });

    const topMonthly = monthlyEntries.slice(0, 10);
    const monthlyUserIds = new Set(topMonthly.map((entry) => entry.id));

    const needed = 10 - topMonthly.length;
    let fillEntries: typeof topMonthly = [];

    if (needed > 0) {
      const fillProfiles = await prisma.volunteerProfile.findMany({
        where: {
          isOfficial: true,
          userId: { notIn: [...monthlyUserIds] },
        },
        orderBy: [
          { points: "desc" },
          { joinDate: "asc" },
        ],
        take: needed,
        select: {
          points: true,
          user: {
            select: {
              id: true,
              fullName: true,
              volunteerId: true,
              profilePicUrl: true,
              role: true,
            },
          },
        },
      });

      fillEntries = fillProfiles.map((profile) => ({
        id: profile.user.id,
        fullName: profile.user.fullName,
        volunteerId: profile.user.volunteerId,
        profilePicUrl: profile.user.profilePicUrl,
        role: profile.user.role,
        monthlyPoints: 0,
        totalPoints: profile.points ?? 0,
      }));
    }

    const leaderboard = [...topMonthly, ...fillEntries];

    const responseData = {
      leaderboard,
      month: monthStartUtc.toISOString(),
    };

    // Update server-side cache
    leaderboardCache = { data: responseData, timestamp: Date.now(), monthKey };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    console.error("[leaderboard] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
