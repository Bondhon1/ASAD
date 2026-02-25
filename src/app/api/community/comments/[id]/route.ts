import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/community/comments/[id] — edit own comment
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

    const comment = await prisma.postComment.findUnique({ where: { id } });
    if (!comment || comment.isDeleted)
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (comment.authorId !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { content } = await req.json();
    if (!content?.trim())
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    if (content.length > 1000)
      return NextResponse.json({ error: "Content exceeds 1000 characters" }, { status: 400 });

    const updated = await prisma.postComment.update({
      where: { id },
      data: { content: content.trim() },
    });

    return NextResponse.json({ comment: updated });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/community/comments/[id] — soft delete (author or post owner or admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const comment = await prisma.postComment.findUnique({
      where: { id },
      include: { post: { select: { authorId: true } } },
    });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const isAdmin = ["MASTER", "ADMIN"].includes(user.role);
    const isAuthor = comment.authorId === user.id;
    const isPostOwner = comment.post.authorId === user.id;

    if (!isAuthor && !isPostOwner && !isAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.postComment.update({ where: { id }, data: { isDeleted: true } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
