import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    return NextResponse.json({
      connected: !!user.googleRefreshToken,
      email: user.calendarEmail,
      connectedAt: user.calendarConnectedAt,
    });
  } catch (error) {
    console.error("Error checking calendar status:", error);
    return NextResponse.json(
      { error: "Failed to check calendar status" },
      { status: 500 }
    );
  }
}
