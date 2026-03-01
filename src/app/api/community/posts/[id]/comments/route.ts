import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";
import { notifyMentions } from "@/lib/mentionUtils";

export const dynamic = "force-dynamic";

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  volunteerId: true,
  profilePicUrl: true,
};

// GET /api/community/posts/[id]/comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });
    if (!user || user.status !== "OFFICIAL")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, isDeleted: true },
    });
    if (!post || post.isDeleted)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // Top-level comments with their replies — paginated
    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10));

    const comments = await prisma.postComment.findMany({
      where: { postId: id, parentCommentId: null, isDeleted: false },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { userId: true } },
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
          take: 20,
          include: {
            author: { select: AUTHOR_SELECT },
            reactions: { select: { userId: true } },
          },
        },
      },
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const enriched = items.map((c) => ({
      ...c,
      reactionCount: c.reactions.length,
      userReacted: c.reactions.some((r) => r.userId === user.id),
      replies: c.replies.map((r) => ({
        ...r,
        reactionCount: r.reactions.length,
        userReacted: r.reactions.some((rv) => rv.userId === user.id),
      })),
    }));

    return NextResponse.json({ comments: enriched, nextCursor });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/community/posts/[id]/comments
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

    const { content } = await req.json();
    if (!content?.trim())
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    if (content.length > 1000)
      return NextResponse.json({ error: "Comment exceeds 1000 characters" }, { status: 400 });

    const comment = await prisma.postComment.create({
      data: {
        postId: id,
        authorId: user.id,
        content: content.trim(),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { userId: true } },
        replies: {
          where: { isDeleted: false },
          include: { author: { select: AUTHOR_SELECT }, reactions: { select: { userId: true } } },
        },
      },
    });

    // Notify post author
    if (post.authorId !== user.id) {
      try {
        const notif = await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: "POST_COMMENT",
            title: `${user.fullName || "A volunteer"} commented on your post`,
            message: `${user.fullName || "A volunteer"} commented on your post.`,
            link: `/dashboard/community?post=${id}`,
          },
        });
        await publishNotification(post.authorId, {
          id: notif.id, type: notif.type, title: notif.title,
          message: notif.message, link: notif.link, createdAt: notif.createdAt,
        });
      } catch {}
    }

    // Notify mentioned users
    await notifyMentions({
      content: comment.content,
      actorId: user.id,
      actorName: user.fullName,
      postId: id,
      excludeIds: [post.authorId],
    });

    return NextResponse.json({
      comment: {
        ...comment,
        reactionCount: 0,
        userReacted: false,
        replies: [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
