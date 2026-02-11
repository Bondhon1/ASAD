import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 30; // Cache for 30 seconds

// In-memory cache for calendar status
const statusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15000; // 15 seconds

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userEmail = session.user.email;
    
    // Check cache first
    const cached = statusCache.get(userEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, { 
        headers: { 
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=15'
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        googleRefreshToken: true,
        calendarConnectedAt: true,
        calendarEmail: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    const responseData = {
      connected: !!user.googleRefreshToken,
      email: user.calendarEmail,
      connectedAt: user.calendarConnectedAt,
    };
    
    // Cache the result
    statusCache.set(userEmail, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData, { 
      headers: { 
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=15'
      }
    });
  } catch (error) {
    console.error("Error checking calendar status:", error);
    return NextResponse.json(
      { error: "Failed to check calendar status" },
      { status: 500 }
    );
  }
}
