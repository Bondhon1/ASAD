import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/users/search?q=<query> — search for OFFICIAL users by name or volunteer ID
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });

    if (!me || me.status !== "OFFICIAL") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    // Search by name or volunteer ID
    const users = await prisma.user.findMany({
      where: {
        status: "OFFICIAL",
        id: { not: me.id }, // Exclude current user
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { volunteerId: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        volunteerId: true,
        profilePicUrl: true,
        role: true,
        status: true,
      },
      take: 20, // Limit results
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[User Search Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
