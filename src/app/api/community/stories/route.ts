import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];

type StoryDelegate = {
  findMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
};

const prismaStory = (prisma as unknown as { story: StoryDelegate }).story;

function isOfficialOrStaff(status?: string, role?: string) {
  return status === "OFFICIAL" || STAFF_ROLES.includes(role ?? "");
}

// GET /api/community/stories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true, role: true },
    });

    if (!user || !isOfficialOrStaff(user.status, user.role)) {
      return NextResponse.json({ error: "Only official members can access stories" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 30), 1), 60);

    const stories = await prismaStory.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            volunteerId: true,
            profilePicUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("GET /api/community/stories error", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

// POST /api/community/stories
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "MASTER") {
      return NextResponse.json({ error: "Only MASTER can upload stories" }, { status: 403 });
    }

    const body = await request.json();
    const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const info = typeof body?.info === "string" ? body.info.trim() : "";

    if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
      return NextResponse.json({ error: "A valid imageUrl is required" }, { status: 400 });
    }

    const story = await prismaStory.create({
      data: {
        imageUrl,
        displayName: displayName || null,
        info: info || null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            volunteerId: true,
            profilePicUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ story }, { status: 201 });
  } catch (error) {
    console.error("POST /api/community/stories error", error);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}
