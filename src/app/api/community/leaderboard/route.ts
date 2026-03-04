import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/community/leaderboard
// Always returns exactly 10 users.
// Primary sort: monthly points desc. Tie-break: all-time points desc, then name asc.
// If fewer than 10 earned points this month, fills remaining slots from top all-time holders.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // role and status are embedded in the JWT by the auth callback — no extra DB query needed
    const viewerRole = (session.user as any).role ?? "";
    const viewerStatus = (session.user as any).status ?? "";

    const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];
    const isAllowed =
      viewerStatus === "OFFICIAL" || STAFF_ROLES.includes(viewerRole);

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Only official volunteers can view the leaderboard" },
        { status: 403 }
      );
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Step 1 – Aggregate points earned this month
    const monthlyAgg = await prisma.pointsHistory.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      _sum: { change: true },
      orderBy: { _sum: { change: "desc" } },
    });

    // Keep only positive net-gainers; cap at 50 for tie-break processing
    const positiveEntries = monthlyAgg
      .filter((e) => (e._sum.change ?? 0) > 0)
      .slice(0, 50);

    const monthlyUserIds = new Set(positiveEntries.map((e) => e.userId));

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

    // Step 3 – Fill remaining slots from top all-time point holders
    const needed = 10 - topMonthly.length;
    let fillEntries: typeof topMonthly = [];

    if (needed > 0) {
      // Get top volunteers by all-time points, excluding those already in the list
      const fillProfiles = await prisma.volunteerProfile.findMany({
        where: { userId: { notIn: [...monthlyUserIds] } },
        orderBy: { points: "desc" },
        take: needed * 3, // over-fetch in case some users are missing
        select: {
          userId: true,
          points: true,
          user: {
            select: {
              id: true,
              fullName: true,
              volunteerId: true,
              profilePicUrl: true,
              role: true,
              status: true,
            },
          },
        },
      });

      fillEntries = fillProfiles
        .map((p) => ({
          id: p.user.id,
          fullName: p.user.fullName,
          volunteerId: p.user.volunteerId,
          profilePicUrl: p.user.profilePicUrl,
          role: p.user.role,
          monthlyPoints: 0,
          totalPoints: p.points,
        }))
        .sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          return (a.fullName ?? "").localeCompare(b.fullName ?? "");
        })
        .slice(0, needed);
    }

    const leaderboard = [...topMonthly, ...fillEntries];

    return NextResponse.json({
      leaderboard,
      month: monthStart.toISOString(),
    });
  } catch (err) {
    console.error("[leaderboard] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
