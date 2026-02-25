import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  volunteerId: true,
  profilePicUrl: true,
};

// POST /api/community/comments/[id]/replies — reply to a comment
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

    const parent = await prisma.postComment.findUnique({
      where: { id },
      select: { id: true, postId: true, authorId: true, isDeleted: true, parentCommentId: true },
    });
    if (!parent || parent.isDeleted)
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    // Flatten nesting: replies to replies become children of the top-level comment
    const topLevelParentId = parent.parentCommentId ? parent.parentCommentId : parent.id;

    const { content } = await req.json();
    if (!content?.trim())
      return NextResponse.json({ error: "Reply cannot be empty" }, { status: 400 });
    if (content.length > 1000)
      return NextResponse.json({ error: "Reply exceeds 1000 characters" }, { status: 400 });

    const reply = await prisma.postComment.create({
      data: {
        postId: parent.postId,
        authorId: user.id,
        content: content.trim(),
        parentCommentId: topLevelParentId,
      },
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { userId: true } },
      },
    });

    // Notify parent comment author
    if (parent.authorId !== user.id) {
      try {
        const notif = await prisma.notification.create({
          data: {
            userId: parent.authorId,
            type: "COMMENT_REPLY",
            title: "Someone replied to your comment",
            message: `${user.fullName || "A volunteer"} replied to your comment.`,
            link: `/dashboard/community`,
          },
        });
        await publishNotification(parent.authorId, {
          id: notif.id, type: notif.type, title: notif.title,
          message: notif.message, link: notif.link, createdAt: notif.createdAt,
        });
      } catch {}
    }

    return NextResponse.json({
      reply: { ...reply, reactionCount: 0, userReacted: false },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
