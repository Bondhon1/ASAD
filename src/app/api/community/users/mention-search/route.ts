import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/community/users/mention-search?q=abc
// Returns OFFICIAL users whose fullName starts with the query (case-insensitive)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 3) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        status: "OFFICIAL",
        fullName: { startsWith: q, mode: "insensitive" },
      },
      select: { id: true, fullName: true, volunteerId: true, profilePicUrl: true },
      take: 8,
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
