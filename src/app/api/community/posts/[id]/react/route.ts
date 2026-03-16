import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

// GET /api/community/posts/[id]/react — list users who reacted
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const reactions = await prisma.postReaction.findMany({
      where: { postId: id },
      select: {
        user: { select: { id: true, fullName: true, profilePicUrl: true, volunteerId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ reactions: reactions.map((r) => r.user) });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/community/posts/[id]/react — toggle LOVE reaction
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, fullName: true, status: true },
    });
    if (!user || user.status !== "OFFICIAL")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, isDeleted: true },
    });
    if (!post || post.isDeleted)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const existing = await prisma.postReaction.findUnique({
      where: { postId_userId: { postId: id, userId: user.id } },
    });

    let reacted: boolean;
    if (existing) {
      await prisma.postReaction.delete({
        where: { postId_userId: { postId: id, userId: user.id } },
      });
      reacted = false;
    } else {
      await prisma.postReaction.create({
        data: { postId: id, userId: user.id, type: "LOVE" },
      });
      reacted = true;

      // Notify post author (not if reacting to own post)
      if (post.authorId !== user.id) {
        try {
          const groupKey = `post_reaction:${id}`;
          const existingNotif = await prisma.notification.findFirst({
            where: { userId: post.authorId, groupKey },
          });

          let notif;
          if (existingNotif) {
            // Prepend this actor (most-recent first), deduplicate
            const updatedActorIds = [
              user.id,
              ...existingNotif.actorIds.filter((aid) => aid !== user.id),
            ];
            const actorUsers = await prisma.user.findMany({
              where: { id: { in: updatedActorIds.slice(0, 2) } },
              select: { id: true, fullName: true },
            });
            // Preserve ordering: most-recent first
            const orderedNames = updatedActorIds
              .slice(0, 2)
              .map((aid) => actorUsers.find((u) => u.id === aid)?.fullName || "A volunteer");
            const total = updatedActorIds.length;
            const { title, message } = buildReactionText(orderedNames, total);

            notif = await prisma.notification.update({
              where: { id: existingNotif.id },
              data: { title, message, actorIds: updatedActorIds, read: false },
            });
          } else {
            const { title, message } = buildReactionText(
              [user.fullName || "A volunteer"],
              1,
            );
            notif = await prisma.notification.create({
              data: {
                userId: post.authorId,
                type: "POST_REACTION",
                groupKey,
                actorIds: [user.id],
                title,
                message,
                link: `/dashboard/community?post=${id}`,
              },
            });
          }

          await publishNotification(post.authorId, {
            id: notif.id,
            type: notif.type,
            title: notif.title,
            message: notif.message ?? null,
            link: notif.link ?? null,
            createdAt: notif.createdAt,
          });
        } catch {}
      }
    }

    const reactionCount = await prisma.postReaction.count({ where: { postId: id } });
    return NextResponse.json({ reacted, reactionCount });
  } catch (err) {
    console.error("POST react error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function buildReactionText(
  names: string[],
  total: number,
): { title: string; message: string } {
  if (total === 1) {
    return {
      title: `${names[0]} loved your post`,
      message: `${names[0]} reacted to your post.`,
    };
  }
  if (total === 2) {
    return {
      title: `${names[0]} and ${names[1]} loved your post`,
      message: `${names[0]} and ${names[1]} reacted to your post.`,
    };
  }
  const rest = total - 2;
  return {
    title: `${names[0]}, ${names[1]} and ${rest} more loved your post`,
    message: `${names[0]}, ${names[1]} and ${rest} more reacted to your post.`,
  };
}
