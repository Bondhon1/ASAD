import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedProfile, setCachedProfile, getCacheTTL } from "@/lib/profileCache";

export const dynamic = "force-dynamic";
export const revalidate = 30; // Cache for 30 seconds with edge

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const bustCache = searchParams.get("bustCache") === "1";
    const lite = searchParams.get("lite") === "1"; // Lite mode: minimal fields

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check in-memory cache first (unless bustCache is true)
    if (!bustCache) {
      const cached = getCachedProfile(email);
      if (cached && Date.now() - cached.timestamp < getCacheTTL()) {
        return NextResponse.json(cached.data, { 
          status: 200,
          headers: { 
            'X-Cache': 'HIT',
            // Use stale-while-revalidate for normal requests (edge caching enabled)
            'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30',
            'CDN-Cache-Control': 'max-age=10'
          }
        });
      }
    }

    // Fetch user with conditional query based on lite mode
    let user: any;
    
    if (lite) {
      // Lite mode: only essential fields for dashboard/payment pages
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          phone: true,
          status: true,
          role: true,
          volunteerId: true,
          profilePicUrl: true,
          emailVerified: true,
          createdAt: true,
          institute: { select: { id: true, name: true } },
          volunteerProfile: { 
            select: { 
              points: true, 
              isOfficial: true, 
              rank: { select: { id: true, name: true } },
              service: { select: { id: true, name: true } }
            } 
          },
          initialPayment: { 
            select: { id: true, status: true, createdAt: true, amount: true }
          },
          finalPayment: { 
            select: { id: true, status: true, createdAt: true, amount: true }
          },
          password: true // Include for hasPassword check
        }
      });
    } else {
      // Full mode: all data including submissions and donations
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          phone: true,
          status: true,
          role: true,
          volunteerId: true,
          profilePicUrl: true,
          emailVerified: true,
          createdAt: true,
          password: true,
          accounts: { select: { provider: true } },
          institute: { select: { id: true, name: true } },
          volunteerProfile: {
            select: {
              userId: true, points: true, isOfficial: true,
              sectors: true, clubs: true, serviceId: true,
              rank: { select: { id: true, name: true, thresholdPoints: true } },
              service: { select: { id: true, name: true } },
            },
          },
          initialPayment: { select: { id: true, status: true, createdAt: true, amount: true } },
          finalPayment: { select: { id: true, status: true, createdAt: true, amount: true } },
          experiences: {
            select: { id: true, title: true, organization: true, startDate: true, endDate: true, isCurrent: true },
            orderBy: { startDate: 'desc' },
          },
          taskSubmissions: {
            where: { NOT: { submissionData: '__DEADLINE_MISSED_DEDUCTION__' } },
            select: {
              id: true, taskId: true, status: true, submittedAt: true, approvedAt: true,
              task: { select: { id: true, title: true, pointsPositive: true, mandatory: true } },
            },
            orderBy: { submittedAt: 'desc' },
            take: 20,
          },
          donations: {
            select: { id: true, amount: true, donatedAt: true, campaignId: true },
            orderBy: { donatedAt: 'desc' },
            take: 20,
          },
        }
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get follower/following counts in parallel (skip in lite mode)
    let followersCount = 0;
    let followingCount = 0;
    
    if (!lite) {
      [followersCount, followingCount] = await Promise.all([
        prisma.follow.count({ where: { followingId: user.id } }),
        prisma.follow.count({ where: { followerId: user.id } }),
      ]);
    }

    // normalize rank to a name string for frontend
    const vp = user.volunteerProfile as any | null;
    if (vp && vp.rank) {
      vp.rank = vp.rank.name ?? vp.rank;
    }

    // Resolve sector/club IDs to names (skip in lite mode for performance)
    if (vp && !lite) {
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

    // Do not expose password hash or raw OAuth account records to clients
    const safeUser: any = { ...user };
    if (safeUser.password) delete safeUser.password;
    if (safeUser.accounts) delete safeUser.accounts;
    
    // In lite mode, we don't include accounts, so we skip OAuth detection
    const authProviders = lite ? [] : ((user as any).accounts || []).map((a: any) => a.provider).filter(Boolean);
    safeUser.hasPassword = !!user.password;
    safeUser.authProviders = authProviders;

    const responseData = { user: { ...safeUser, followersCount, followingCount } };

    // Cache the response
    setCachedProfile(email, responseData);

    // Conditional caching based on bustCache flag
    const cacheHeaders = (bustCache
      ? {
          // For bustCache requests (payment pages), prevent all caching
          'X-Cache': 'MISS-BUST',
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      : {
          // For normal requests, use edge caching with short TTL
          'X-Cache': 'MISS',
          'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30',
          'CDN-Cache-Control': 'max-age=10'
        }) as HeadersInit;

    return NextResponse.json(responseData, { 
      status: 200,
      headers: cacheHeaders
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
