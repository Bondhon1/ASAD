import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

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
          const notif = await prisma.notification.create({
            data: {
              userId: post.authorId,
              type: "POST_REACTION",
              title: `${user.fullName || "A volunteer"} loved your post`,
              message: `${user.fullName || "A volunteer"} reacted to your post.`,
              link: `/dashboard/community?post=${id}`,
            },
          });
          await publishNotification(post.authorId, {
            id: notif.id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            link: notif.link,
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
