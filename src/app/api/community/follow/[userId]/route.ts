import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

// GET /api/community/follow/[userId] — check follow status + counts, or list followers/following
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

    const type = req.nextUrl.searchParams.get("type");

    if (type === "followers") {
      const rows = await prisma.follow.findMany({
        where: { followingId: userId },
        select: { follower: { select: { id: true, fullName: true, profilePicUrl: true, volunteerId: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ users: rows.map((r) => r.follower) });
    }

    if (type === "following") {
      const rows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { following: { select: { id: true, fullName: true, profilePicUrl: true, volunteerId: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ users: rows.map((r) => r.following) });
    }

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
        const groupKey = `new_follower`;
        const existingNotif = await prisma.notification.findFirst({
          where: { userId, groupKey },
        });

        let notif;
        if (existingNotif) {
          const updatedActorIds = [
            me.id,
            ...existingNotif.actorIds.filter((aid) => aid !== me.id),
          ];
          const actorUsers = await prisma.user.findMany({
            where: { id: { in: updatedActorIds.slice(0, 2) } },
            select: { id: true, fullName: true },
          });
          const orderedNames = updatedActorIds
            .slice(0, 2)
            .map((aid) => actorUsers.find((u) => u.id === aid)?.fullName || "A volunteer");
          const total = updatedActorIds.length;
          const { title, message } = buildFollowerText(orderedNames, total);

          notif = await prisma.notification.update({
            where: { id: existingNotif.id },
            data: { title, message, actorIds: updatedActorIds, read: false },
          });
        } else {
          const { title, message } = buildFollowerText(
            [me.fullName || "A volunteer"],
            1,
          );
          notif = await prisma.notification.create({
            data: {
              userId,
              type: "NEW_FOLLOWER",
              groupKey,
              actorIds: [me.id],
              title,
              message,
              link: `/dashboard/community/profile/${userId}`,
            },
          });
        }

        await publishNotification(userId, {
          id: notif.id, type: notif.type, title: notif.title,
          message: notif.message ?? null, link: notif.link ?? null,
          createdAt: notif.createdAt,
        });
      } catch {}
    }

    const followerCount = await prisma.follow.count({ where: { followingId: userId } });
    return NextResponse.json({ isFollowing: following, followerCount });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function buildFollowerText(
  names: string[],
  total: number,
): { title: string; message: string } {
  if (total === 1) {
    return {
      title: `${names[0]} started following you`,
      message: `${names[0]} started following you.`,
    };
  }
  if (total === 2) {
    return {
      title: `${names[0]} and ${names[1]} started following you`,
      message: `${names[0]} and ${names[1]} started following you.`,
    };
  }
  const rest = total - 2;
  return {
    title: `${names[0]}, ${names[1]} and ${rest} more started following you`,
    message: `${names[0]}, ${names[1]} and ${rest} more started following you.`,
  };
}
