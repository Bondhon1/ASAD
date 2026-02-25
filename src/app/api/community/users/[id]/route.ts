import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/community/users/[id] — public-ish profile for community
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });
    if (!me || me.status !== "OFFICIAL")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const profile = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        volunteerId: true,
        profilePicUrl: true,
        role: true,
        status: true,
        createdAt: true,
        volunteerProfile: {
          select: {
            bio: true,
            points: true,
            joinDate: true,
            rank: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
        _count: {
          select: {
            posts: { where: { isDeleted: false } },
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isFollowing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: id } },
      select: { id: true },
    });

    return NextResponse.json({
      profile: {
        ...profile,
        isFollowing: !!isFollowing,
        isMe: me.id === id,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
