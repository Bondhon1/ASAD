import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

// GET /api/community/follow/[userId] — check follow status + counts
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [isFollowing, followerCount, followingCount] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: me.id, followingId: userId } },
        select: { id: true },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return NextResponse.json({ isFollowing: !!isFollowing, followerCount, followingCount });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/community/follow/[userId] — toggle follow
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, fullName: true, status: true },
    });
    if (!me || me.status !== "OFFICIAL")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (me.id === userId)
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: userId } },
    });

    let following: boolean;
    if (existing) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId: me.id, followingId: userId } },
      });
      following = false;
    } else {
      await prisma.follow.create({
        data: { followerId: me.id, followingId: userId },
      });
      following = true;

      // Notify the followed user
      try {
        const notif = await prisma.notification.create({
          data: {
            userId: userId,
            type: "NEW_FOLLOWER",
            title: "New follower",
            message: `${me.fullName || "A volunteer"} started following you.`,
            link: `/dashboard/community/profile/${me.id}`,
          },
        });
        await publishNotification(userId, {
          id: notif.id, type: notif.type, title: notif.title,
          message: notif.message, link: notif.link, createdAt: notif.createdAt,
        });
      } catch {}
    }

    const followerCount = await prisma.follow.count({ where: { followingId: userId } });
    return NextResponse.json({ isFollowing: following, followerCount });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
