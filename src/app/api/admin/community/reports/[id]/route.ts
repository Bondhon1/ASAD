import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

// PATCH /api/admin/community/reports/[id] — update report status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, fullName: true },
    });
    if (!user || !["MASTER", "ADMIN"].includes(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { status, notes } = await req.json();
    if (!["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"].includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const report = await prisma.postReport.findUnique({
      where: { id },
      include: {
        post: { select: { id: true, authorId: true } },
        reporter: { select: { id: true } },
      },
    });
    if (!report)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });

    // Update report
    const updated = await prisma.postReport.update({
      where: { id },
      data: {
        status,
        resolutionNotes: notes || null,
        resolvedById: user.id,
        updatedAt: new Date(),
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Notify reporter about report status
    const statusMessage = status === "RESOLVED" ? "resolved" : status === "DISMISSED" ? "dismissed" : "being reviewed";
    await publishNotification(report.reporter.id, {
      id: `report-status-${id}-${Date.now()}`,
      type: "POST_REPORT_STATUS",
      title: `Report ${statusMessage.toUpperCase()}`,
      message: `Your report about the post has been ${statusMessage} by ${user.fullName}.`,
      link: `/dashboard/community`,
      createdAt: new Date(),
    });

    // If post is being deleted by admin action, notify post author
    if (status === "RESOLVED") {
      await publishNotification(report.post.authorId, {
        id: `post-action-${report.post.id}-${Date.now()}`,
        type: "POST_ACTION",
        title: "Post Reported and Under Review",
        message: `Your post has been reported and is under review by admins. Resolution: ${notes || "No notes provided"}`,
        link: `/dashboard/community`,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error("PATCH /api/admin/community/reports/[id] error", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
