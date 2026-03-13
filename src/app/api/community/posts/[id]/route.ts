import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { prismaAudit } from "@/lib/prisma-audit";
import { computeOverdueMap } from "@/lib/computeOverdueMap";

export const dynamic = "force-dynamic";

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  volunteerId: true,
  profilePicUrl: true,
  role: true,
  status: true,
  monthlyPaymentExempt: true,
  monthlyPaymentExemptReason: true,
};

// GET /api/community/posts/[id]
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
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { userId: true, type: true } },
        _count: {
          select: { comments: { where: { isDeleted: false, parentCommentId: null } } },
        },
      },
    });

    if (!post || post.isDeleted)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const overdueMap = await computeOverdueMap(
      post.author.status === "OFFICIAL" && !post.author.monthlyPaymentExempt ? [post.author.id] : [],
    );

    return NextResponse.json({
      post: {
        ...post,
        author: {
          ...post.author,
          overdueMonthsCount: post.author.monthlyPaymentExempt ? 0 : (overdueMap[post.author.id] ?? 0),
        },
        reactionCount: post.reactions.length,
        userReacted: post.reactions.some((r) => r.userId === user.id),
        commentCount: post._count.comments,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/community/posts/[id] — edit post (author only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.isDeleted)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    if (post.authorId !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { content } = await req.json();
    if (!content?.trim())
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    if (content.length > 2000)
      return NextResponse.json({ error: "Content exceeds 2000 characters" }, { status: 400 });

    const updated = await prisma.post.update({
      where: { id },
      data: { content: content.trim() },
      include: { author: { select: AUTHOR_SELECT } },
    });

    return NextResponse.json({ post: updated });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/community/posts/[id] — soft delete (author or admin/master)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, fullName: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const isAdmin = ["MASTER", "ADMIN"].includes(user.role);
    if (post.authorId !== user.id && !isAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Update post
    await prisma.post.update({ where: { id }, data: { isDeleted: true } });

    // Create audit log in audit database (denormalized)
    await prismaAudit.postActionLog.create({
      data: {
        postId: id,
        postAuthorId: post.authorId,
        postAuthorName: post.author.fullName,
        postContent: post.content,
        actorUserId: user.id,
        actorName: user.fullName,
        actorEmail: user.email,
        actorRole: user.role,
        action: "DELETE",
        reason: isAdmin && post.authorId !== user.id ? "Admin deletion" : "Author deletion",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/community/posts/[id] error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
