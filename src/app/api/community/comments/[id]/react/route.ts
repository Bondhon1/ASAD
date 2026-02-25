import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/community/comments/[id]/react — toggle reaction on comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const comment = await prisma.postComment.findUnique({
      where: { id },
      select: { id: true, isDeleted: true },
    });
    if (!comment || comment.isDeleted)
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const existing = await prisma.commentReaction.findUnique({
      where: { commentId_userId: { commentId: id, userId: user.id } },
    });

    let reacted: boolean;
    if (existing) {
      await prisma.commentReaction.delete({
        where: { commentId_userId: { commentId: id, userId: user.id } },
      });
      reacted = false;
    } else {
      await prisma.commentReaction.create({
        data: { commentId: id, userId: user.id, type: "LOVE" },
      });
      reacted = true;
    }

    const reactionCount = await prisma.commentReaction.count({ where: { commentId: id } });
    return NextResponse.json({ reacted, reactionCount });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
