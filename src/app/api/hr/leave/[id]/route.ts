import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

const HR_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR"];

/**
 * PATCH /api/hr/leave/[id]
 * HR approves, declines, or edits a leave request.
 *
 * Body:
 *  - action: "APPROVE" | "DECLINE" | "EDIT"
 *  - feedback?: string
 *  - startDate?: string (ISO)
 *  - endDate?: string (ISO)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, fullName: true },
    });

    if (!requester || !HR_ROLES.includes(requester.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const leave = await prisma.leave.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, fullName: true, volunteerId: true } },
      },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    const body = await req.json();
    const { action, feedback, startDate, endDate } = body;

    if (!["APPROVE", "DECLINE", "EDIT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    let newStartDate = leave.startDate;
    let newEndDate = leave.endDate;

    // If date range is provided (for EDIT or pre-approval date adjustment)
    if (startDate) {
      const s = new Date(startDate);
      if (isNaN(s.getTime())) {
        return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
      }
      newStartDate = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (isNaN(e.getTime())) {
        return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
      }
      newEndDate = e;
    }

    if (newEndDate < newStartDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    let newStatus = leave.status;
    if (action === "APPROVE") newStatus = "APPROVED";
    if (action === "DECLINE") newStatus = "DECLINED";
    // EDIT keeps existing status but can update dates and feedback

    const updated = await prisma.leave.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        feedback: feedback !== undefined ? feedback?.trim() || null : leave.feedback,
        startDate: newStartDate,
        endDate: newEndDate,
        reviewedById: requester.id,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, fullName: true, volunteerId: true } },
        reviewedBy: { select: { fullName: true, volunteerId: true } },
      },
    });

    // Send notification to the volunteer
    if (action === "APPROVE" || action === "DECLINE") {
      const notifType =
        action === "APPROVE"
          ? NotificationType.LEAVE_APPROVED
          : NotificationType.LEAVE_DECLINED;

      const title =
        action === "APPROVE"
          ? "✅ Leave Request Approved"
          : "❌ Leave Request Declined";

      const dateRange = `${newStartDate.toLocaleDateString()} – ${newEndDate.toLocaleDateString()}`;
      const message =
        action === "APPROVE"
          ? `Your leave request (${dateRange}) has been approved.${feedback ? ` HR feedback: "${feedback}"` : ""}`
          : `Your leave request (${dateRange}) has been declined.${feedback ? ` HR feedback: "${feedback}"` : ""}`;

      const notification = await prisma.notification.create({
        data: {
          userId: leave.userId,
          broadcast: false,
          type: notifType,
          title,
          message,
          link: "/settings",
        },
      });
      await publishNotification(leave.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
      });
    }

    return NextResponse.json({ leave: updated });
  } catch (err: any) {
    console.error(`PATCH /api/hr/leave/${params.id} error:`, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
