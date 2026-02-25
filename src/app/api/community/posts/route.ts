import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: 1 post per 120 seconds per user
const postRateLimit = new Map<string, number>();

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  volunteerId: true,
  profilePicUrl: true,
  role: true,
  status: true,
};

// GET /api/community/posts?cursor=...&limit=10
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });

    if (!user || user.status !== "OFFICIAL") {
      return NextResponse.json({ error: "Only official volunteers can access the community" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);
    const authorId = searchParams.get("authorId") || undefined; // for timeline view

    const posts = await prisma.post.findMany({
      where: {
        isDeleted: false,
        ...(authorId ? { authorId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { userId: true, type: true } },
        _count: {
          select: {
            comments: { where: { isDeleted: false, parentCommentId: null } },
          },
        },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const enriched = items.map((p) => ({
      ...p,
      reactionCount: p.reactions.length,
      userReacted: p.reactions.some((r) => r.userId === user.id),
      commentCount: p._count.comments,
    }));

    return NextResponse.json({ posts: enriched, nextCursor });
  } catch (error) {
    console.error("GET /api/community/posts error", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST /api/community/posts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });

    if (!user || user.status !== "OFFICIAL") {
      return NextResponse.json({ error: "Only official volunteers can post" }, { status: 403 });
    }

    // Rate limit: 1 post per 120 seconds
    const lastPost = postRateLimit.get(user.id);
    const now = Date.now();
    if (lastPost && now - lastPost < 120_000) {
      const wait = Math.ceil((120_000 - (now - lastPost)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${wait} seconds before posting again` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const content = (body.content || "").trim();

    if (!content) {
      return NextResponse.json({ error: "Post content cannot be empty" }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "Post content exceeds 2000 characters" }, { status: 400 });
    }

    postRateLimit.set(user.id, now);

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        content,
        postType: "TEXT",
      },
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { userId: true, type: true } },
        _count: {
          select: { comments: { where: { isDeleted: false, parentCommentId: null } } },
        },
      },
    });

    return NextResponse.json({
      post: {
        ...post,
        reactionCount: 0,
        userReacted: false,
        commentCount: 0,
      },
    });
  } catch (error) {
    console.error("POST /api/community/posts error", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
