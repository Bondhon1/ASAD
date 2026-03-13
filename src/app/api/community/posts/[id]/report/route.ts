import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { prismaAudit } from "@/lib/prisma-audit";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

// POST /api/community/posts/[id]/report — report a post
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true, fullName: true },
    });
    if (!user || user.status !== "OFFICIAL")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, isDeleted: true, authorId: true, content: true },
    });
    if (!post || post.isDeleted)
      return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // Cannot report own posts
    if (post.authorId === user.id)
      return NextResponse.json({ error: "Cannot report own posts" }, { status: 400 });

    const { reason, description } = await req.json();
    if (!reason || !["INAPPROPRIATE", "SPAM", "OFFENSIVE", "OTHER"].includes(reason))
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });

    // Check if user already reported this post
    const existing = await prisma.postReport.findFirst({
      where: { postId: id, reporterId: user.id },
    });
    if (existing)
      return NextResponse.json({ error: "You have already reported this post" }, { status: 400 });

    const report = await prisma.postReport.create({
      data: {
        postId: id,
        reporterId: user.id,
        reason,
        description: description?.trim() || null,
      },
    });

    // Get author details for audit log
    const postAuthor = await prisma.user.findUnique({
      where: { id: post.authorId },
      select: { id: true, fullName: true },
    });

    // Log this action in audit database (denormalized)
    await prismaAudit.postActionLog.create({
      data: {
        postId: id,
        postAuthorId: post.authorId,
        postAuthorName: postAuthor?.fullName || null,
        postContent: post.content,
        actorUserId: user.id,
        actorName: user.fullName,
        actorEmail: session.user.email,
        actorRole: "USER", // Reporter is always a regular user
        action: "REPORT",
        reason: reason,
        metadata: JSON.stringify({ reportId: report.id, description }),
      },
    });

    // Notify admins about new report (real-time)
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["MASTER", "ADMIN"] },
      },
      select: { id: true },
    });

    const postPreview = post.content.substring(0, 100) + (post.content.length > 100 ? "..." : "");
    
    for (const admin of admins) {
      await publishNotification(admin.id, {
        id: `report-new-${report.id}`,
        type: "POST_REPORT_NEW",
        title: "New Post Report",
        message: `${user.fullName} reported a post: "${postPreview}" - Reason: ${reason}`,
        link: `/dashboard/admin/community/reports`,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("POST /api/community/posts/[id]/report error", error);
    return NextResponse.json({ error: "Failed to report post" }, { status: 500 });
  }
}
