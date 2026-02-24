import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

/** GET /api/user/leave — Get current user's leave history */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const leaves = await prisma.leave.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: {
          select: { fullName: true, volunteerId: true },
        },
      },
    });

    return NextResponse.json({ leaves });
  } catch (err: any) {
    console.error("GET /api/user/leave error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/user/leave — Submit a new leave request */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true, fullName: true, volunteerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status !== "OFFICIAL") {
      return NextResponse.json(
        { error: "Only official volunteers can apply for leave" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { reason, startDate, endDate } = body;

    if (!reason || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Reason, start date, and end date are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (end < start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    if (start < new Date(new Date().setHours(0, 0, 0, 0))) {
      return NextResponse.json(
        { error: "Start date cannot be in the past" },
        { status: 400 }
      );
    }

    // Check for overlapping approved or pending leaves
    const overlapping = await prisma.leave.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        {
          error:
            "You already have a pending or approved leave that overlaps with these dates",
        },
        { status: 409 }
      );
    }

    const leave = await prisma.leave.create({
      data: {
        userId: user.id,
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    // Notify HR/Admin/Master members about new leave request via DB + Ably
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ["HR", "MASTER", "ADMIN"] }, status: "OFFICIAL" },
      select: { id: true },
    });

    if (hrUsers.length > 0) {
      const notifTitle = "📋 New Leave Request";
      const notifMessage = `${user.fullName || "A volunteer"} (${user.volunteerId || user.id}) has submitted a leave request from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`;
      const notifLink = "/dashboard/hr/leaves";

      await Promise.all(
        hrUsers.map(async (hr) => {
          try {
            const notification = await prisma.notification.create({
              data: {
                userId: hr.id,
                broadcast: false,
                type: NotificationType.LEAVE_SUBMITTED,
                title: notifTitle,
                message: notifMessage,
                link: notifLink,
              },
            });
            await publishNotification(hr.id, {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              link: notification.link,
              createdAt: notification.createdAt,
            });
          } catch (e) {
            console.error("Failed to notify HR user", hr.id, e);
          }
        })
      );
    }

    return NextResponse.json({ leave }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/user/leave error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
