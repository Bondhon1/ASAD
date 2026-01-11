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

    // Fetch user with all includes in a single query
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        institute: true,
        volunteerProfile: { include: { rank: true } },
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

    const responseData = { user: { ...user, followersCount, followingCount } };

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
