import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { prismaAudit } from "@/lib/prisma-audit";
import {
  COMMUNITY_OFFICIAL_POST_IMAGE_TOGGLE_ACTION,
  getOfficialPostImageToggle,
} from "@/lib/communityPostImageToggle";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, status: true },
    });

    const isOfficialOrStaff =
      user?.status === "OFFICIAL" || STAFF_ROLES.includes(user?.role ?? "");

    if (!user || !isOfficialOrStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const enabled = await getOfficialPostImageToggle();
    return NextResponse.json({ enabled, canManage: user.role === "MASTER" });
  } catch (error) {
    console.error("GET /api/community/post-image-toggle error", error);
    return NextResponse.json(
      { error: "Failed to fetch post image setting" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        volunteerId: true,
      },
    });

    if (!actor || actor.role !== "MASTER") {
      return NextResponse.json({ error: "Only MASTER can update this setting" }, { status: 403 });
    }

    const body = await request.json();
    const enabled = body?.enabled === true;

    await prismaAudit.auditLog.create({
      data: {
        actorUserId: actor.id,
        actorName: actor.fullName ?? null,
        actorEmail: actor.email ?? null,
        actorVolunteerId: actor.volunteerId ?? null,
        actorRole: actor.role,
        action: COMMUNITY_OFFICIAL_POST_IMAGE_TOGGLE_ACTION,
        meta: JSON.stringify({ enabled }),
      },
    });

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error("POST /api/community/post-image-toggle error", error);
    return NextResponse.json(
      { error: "Failed to update post image setting" },
      { status: 500 }
    );
  }
}
