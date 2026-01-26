import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache response for 60 seconds

// In-memory cache for user profiles (reduces DB hits during the same session)
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check in-memory cache first
    const cached = profileCache.get(email);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, { 
        status: 200,
        headers: { 'X-Cache': 'HIT' }
      });
    }

    // Fetch user with all includes in a single query (include accounts for OAuth detection)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
        institute: true,
        // include service on volunteerProfile and rank
        volunteerProfile: { include: { rank: true, service: true } },
        initialPayment: true,
        finalPayment: true,
        experiences: {
          orderBy: { startDate: 'desc' },
        },
        taskSubmissions: {
          include: { task: true },
          orderBy: { submittedAt: 'desc' },
          take: 20,
        },
        donations: {
          orderBy: { donatedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get follower/following counts in parallel
    const [followersCount, followingCount] = await Promise.all([
      prisma.friendList.count({ where: { friendId: user.id } }),
      prisma.friendList.count({ where: { userId: user.id } }),
    ]);

    // normalize rank to a name string for frontend
    const vp = user.volunteerProfile as any | null;
    if (vp && vp.rank) {
      vp.rank = vp.rank.name ?? vp.rank;
    }

    // Resolve sector/club IDs to names when possible. The DB may contain
    // either names or ids (historical data), so we try to map ids to names
    // but fall back to the stored value if no record is found.
    if (vp) {
      try {
        const [allSectors, allClubs] = await Promise.all([
          prisma.sector.findMany({ select: { id: true, name: true } }),
          prisma.club.findMany({ select: { id: true, name: true } }),
        ]);
        const sectorById = new Map(allSectors.map(s => [s.id, s.name]));
        const sectorNames = new Set(allSectors.map(s => s.name));
        const clubById = new Map(allClubs.map(c => [c.id, c.name]));
        const clubNames = new Set(allClubs.map(c => c.name));

        if (Array.isArray(vp.sectors)) {
          vp.sectors = vp.sectors.map((val: string) => {
            if (sectorById.has(val)) return sectorById.get(val);
            if (sectorNames.has(val)) return val;
            return val; // unknown value, keep as-is
          });
        }

        if (Array.isArray(vp.clubs)) {
          vp.clubs = vp.clubs.map((val: string) => {
            if (clubById.has(val)) return clubById.get(val);
            if (clubNames.has(val)) return val;
            return val;
          });
        }

        // service included above; normalize to name when present
        if (vp.service) {
          vp.service = { id: vp.service.id, name: vp.service.name };
        }
      } catch (e) {
        // ignore mapping errors and keep stored values
        console.error('Failed to resolve sector/club names', e);
      }
    }

    // Do not expose password hash to clients; provide helper flags for frontend
    const safeUser: any = { ...user };
    if (safeUser.password) delete safeUser.password;
    const authProviders = (user.accounts || []).map(a => a.provider).filter(Boolean);
    safeUser.hasPassword = !!user.password;
    safeUser.authProviders = authProviders;

    const responseData = { user: { ...safeUser, followersCount, followingCount } };

    // Cache the response
    profileCache.set(email, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData, { 
      status: 200,
      headers: { 'X-Cache': 'MISS' }
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
