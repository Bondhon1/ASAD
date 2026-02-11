import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Include notifications targeted to this user OR broadcast notifications
    const where: any = {
      OR: [
        { userId: user.id },
        { broadcast: true },
      ],
    };
    if (unreadOnly) where.read = false; // note: broadcast read state is per-user and handled below

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
    });

    // For broadcast notifications, determine whether THIS user has read them
    const broadcastIds = notifications.filter(n => n.broadcast).map(n => n.id);
    let readIds = new Set<string>();
    if (broadcastIds.length > 0) {
      const reads = await prisma.broadcastRead.findMany({
        where: { notificationId: { in: broadcastIds }, userId: user.id },
        select: { notificationId: true },
      });
      readIds = new Set(reads.map(r => r.notificationId));
    }

    const notificationsWithRead = notifications.map(n => ({
      ...n,
      read: n.broadcast ? readIds.has(n.id) : n.read,
    }));

    const perUserUnread = await prisma.notification.count({ where: { userId: user.id, read: false } });
    const unreadBroadcastCount = broadcastIds.filter(id => !readIds.has(id)).length;
    const unreadCount = perUserUnread + unreadBroadcastCount;

    return NextResponse.json(
      { notifications: notificationsWithRead, unreadCount },
      {
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
        }
      }
    );
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// POST - Mark notification(s) as read
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { notificationId, markAllRead } = body as { notificationId?: string; markAllRead?: boolean };

    if (markAllRead) {
      // Mark per-user notifications read
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });

      // For broadcasts, create BroadcastRead rows for any broadcast notifications not yet read by this user
      const broadcastsToMark = await prisma.notification.findMany({
        where: { broadcast: true, NOT: { broadcastReads: { some: { userId: user.id } } } },
        select: { id: true },
      });
      if (broadcastsToMark.length > 0) {
        const data = broadcastsToMark.map(b => ({ notificationId: b.id, userId: user.id }));
        await prisma.broadcastRead.createMany({ data, skipDuplicates: true });
      }

      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
      if (!notif) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

      if (notif.broadcast) {
        // create per-user read record
        await prisma.broadcastRead.createMany({ data: [{ notificationId, userId: user.id }], skipDuplicates: true });
        return NextResponse.json({ success: true });
      }

      // non-broadcast: mark the row read (only if belongs to the user)
      await prisma.notification.updateMany({ where: { id: notificationId, userId: user.id }, data: { read: true } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing notificationId or markAllRead" }, { status: 400 });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

// DELETE - Delete a notification
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) return NextResponse.json({ error: "Missing notification id" }, { status: 400 });

    const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notif) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    if (notif.broadcast) {
      // For broadcasts, create a BroadcastRead so the notification no longer appears for this user
      await prisma.broadcastRead.createMany({ data: [{ notificationId, userId: user.id }], skipDuplicates: true });
      return NextResponse.json({ success: true });
    }

    // Non-broadcast: delete the notification row if it belongs to the user
    await prisma.notification.deleteMany({ where: { id: notificationId, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
