import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishChatMessage } from "@/lib/ably";

// GET /api/chat/[conversationId]/messages?before=<cursor>&limit=<n>
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });

    if (!me || me.status !== "OFFICIAL") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { conversationId } = await params;
    const url = new URL(req.url);
    const before = url.searchParams.get("before") ?? undefined;
    const after = url.searchParams.get("after") ?? undefined;
    const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "40", 10));

    // Verify user is a participant
    const conv = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user1Id: me.id }, { user2Id: me.id }],
      },
      select: { id: true, user1Id: true, user2Id: true },
    });

    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: before ? "desc" : "asc" },
      take: limit,
      select: {
        id: true,
        body: true,
        fromUserId: true,
        toUserId: true,
        readAt: true,
        createdAt: true,
      },
    });

    // For "before" (load older), reverse so chronological order
    const ordered = before ? messages.reverse() : messages;

    // Mark unread messages as read
    const unreadIds = ordered
      .filter((m) => m.toUserId === me.id && !m.readAt)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { readAt: new Date() },
      });
    }

    const otherUserId = conv.user1Id === me.id ? conv.user2Id : conv.user1Id;
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, fullName: true, volunteerId: true, profilePicUrl: true, role: true },
    });

    return NextResponse.json({
      messages: ordered,
      otherUser,
      myId: me.id,
      hasMore: messages.length === limit,
    });
  } catch (err) {
    console.error("[GET /api/chat/[conversationId]/messages]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/chat/[conversationId]/messages — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });

    if (!me || me.status !== "OFFICIAL") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { conversationId } = await params;

    // Verify user is a participant
    const conv = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ user1Id: me.id }, { user2Id: me.id }],
      },
      select: { id: true, user1Id: true, user2Id: true },
    });

    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const text = (body.body ?? "").trim();

    if (!text || text.length > 1000) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const toUserId = conv.user1Id === me.id ? conv.user2Id : conv.user1Id;

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          fromUserId: me.id,
          toUserId,
          body: text,
        },
        select: {
          id: true,
          body: true,
          fromUserId: true,
          toUserId: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    // Publish real-time event to both participants via Ably
    publishChatMessage({
      conversationId,
      senderId: me.id,
      recipientId: toUserId,
      message,
    });

    return NextResponse.json({ message });
  } catch (err) {
    console.error("[POST /api/chat/[conversationId]/messages]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
