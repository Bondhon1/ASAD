import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/chat/conversations — list all conversations for the current user
export async function GET() {
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

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: me.id }, { user2Id: me.id }],
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        user1: {
          select: {
            id: true,
            fullName: true,
            volunteerId: true,
            profilePicUrl: true,
            role: true,
            status: true,
          },
        },
        user2: {
          select: {
            id: true,
            fullName: true,
            volunteerId: true,
            profilePicUrl: true,
            role: true,
            status: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            body: true,
            fromUserId: true,
            readAt: true,
            createdAt: true,
          },
        },
      },
    });

    // Count unread messages across all conversations
    const unreadCount = await prisma.message.count({
      where: {
        toUserId: me.id,
        readAt: null,
      },
    });

    const formatted = conversations.map((conv) => {
      const other = conv.user1Id === me.id ? conv.user2 : conv.user1;
      const lastMsg = conv.messages[0] ?? null;
      const hasUnread =
        lastMsg && lastMsg.fromUserId !== me.id && !lastMsg.readAt;
      return {
        id: conv.id,
        otherUser: other,
        lastMessage: lastMsg,
        hasUnread,
        lastMessageAt: conv.lastMessageAt,
      };
    });

    return NextResponse.json({ conversations: formatted, unreadCount });
  } catch (err) {
    console.error("[GET /api/chat/conversations]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/chat/conversations — start or retrieve a conversation with another user
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId || targetUserId === me.id) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    // Check target is OFFICIAL
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true, fullName: true, volunteerId: true, profilePicUrl: true, role: true },
    });

    if (!target || target.status !== "OFFICIAL") {
      return NextResponse.json({ error: "Target user not found or not OFFICIAL" }, { status: 404 });
    }

    // Always store user1Id as the lesser ID for deterministic uniqueness
    const [user1Id, user2Id] =
      me.id < targetUserId ? [me.id, targetUserId] : [targetUserId, me.id];

    const conversation = await prisma.conversation.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      create: { user1Id, user2Id },
      update: {},
      select: { id: true },
    });

    return NextResponse.json({ conversationId: conversation.id, otherUser: target });
  } catch (err) {
    console.error("[POST /api/chat/conversations]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
