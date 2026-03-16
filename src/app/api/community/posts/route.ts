import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyMentions } from "@/lib/mentionUtils";
import { computeOverdueMap } from "@/lib/computeOverdueMap";
import { resolveAudienceUserIds, parseAudience } from "@/lib/taskAudience";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: 1 post per 120 seconds per user
const postRateLimit = new Map<string, number>();

// Roles that can create Notice posts
const NOTICE_ROLES = ["ADMIN", "MASTER", "SECRETARIES"];
// Only MASTER can create Sponsored AD posts
const AD_ROLES = ["MASTER"];
// Staff roles allowed in community
const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];

// Priority boost: each priority point makes the post appear as if it's this many hours newer.
// NOTICE (priority=2) → +12h boost; SPONSORED_AD (priority=1) → +6h boost.
// The post decays naturally after that window.
const PRIORITY_BOOST_HOURS = 6;

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  volunteerId: true,
  profilePicUrl: true,
  role: true,
  status: true,
  monthlyPaymentExempt: true,
  monthlyPaymentExemptReason: true,
};

type RawRow = { id: string; adjusted_time: Date };

// GET /api/community/posts?cursor=...&limit=10
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true, role: true },
    });

    const isOfficialOrStaff =
      user?.status === "OFFICIAL" || STAFF_ROLES.includes(user?.role ?? "");
    if (!user || !isOfficialOrStaff) {
      return NextResponse.json({ error: "Only official volunteers can access the community" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);
    const authorId = searchParams.get("authorId") || undefined;

    // For timeline view (own posts only), simple createdAt sort — no priority boost needed
    if (authorId) {
      const posts = await prisma.post.findMany({
        where: { isDeleted: false, authorId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          author: { select: AUTHOR_SELECT },
          reactions: { where: { userId: user.id }, select: { type: true }, take: 1 },
          _count: { select: { reactions: true, comments: { where: { isDeleted: false, parentCommentId: null } } } },
        },
      });

      const hasMore = posts.length > limit;
      const items = hasMore ? posts.slice(0, limit) : posts;
      const overdueMap = await computeOverdueMap(
        [...new Set(items.filter((p) => p.author.status === "OFFICIAL" && !p.author.monthlyPaymentExempt).map((p) => p.author.id))]
      );
      const enriched = items.map((p) => ({
        ...p,
        author: { ...p.author, overdueMonthsCount: p.author.monthlyPaymentExempt ? 0 : (overdueMap[p.author.id] ?? 0) },
        reactionCount: p._count.reactions,
        userReacted: p.reactions.length > 0,
        commentCount: p._count.comments,
        reactions: undefined,
      }));
      return NextResponse.json({ posts: enriched, nextCursor: hasMore ? items[items.length - 1].id : null });
    }

    // ── Community feed: time-decay sort ──────────────────────────────────────
    // adjusted_time = createdAt + (priority * BOOST hours)
    // Sort by adjusted_time DESC, then id DESC for stable tie-breaking.
    // Cursor = base64url({ t: ISO adjusted_time, id })
    // The interval '6 hours' literal is inlined directly in the SQL string —
    // Prisma parameterizes ${...} template values and PostgreSQL rejects a bound
    // parameter inside interval arithmetic, so we avoid any ${} in that expression.

    let cursorTime: Date | null = null;
    let cursorId: string | null = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString());
        cursorTime = new Date(decoded.t);
        cursorId = decoded.id;
      } catch { /* invalid cursor → start from top */ }
    }

    // Two concrete queries — avoids composing Prisma.sql fragments which can
    // re-introduce parameter placeholders inside the interval expression.
    const rawRows: RawRow[] = cursorTime && cursorId
      ? await prisma.$queryRaw<RawRow[]>`
          SELECT
            p.id,
            p."createdAt" + (p.priority * interval '6 hours') AS adjusted_time
          FROM "Post" p
          WHERE p."isDeleted" = false
            AND (
              (p."createdAt" + (p.priority * interval '6 hours')) < ${cursorTime}
              OR (
                (p."createdAt" + (p.priority * interval '6 hours')) = ${cursorTime}
                AND p.id < ${cursorId}
              )
            )
          ORDER BY adjusted_time DESC, p.id DESC
          LIMIT ${limit + 1}
        `
      : await prisma.$queryRaw<RawRow[]>`
          SELECT
            p.id,
            p."createdAt" + (p.priority * interval '6 hours') AS adjusted_time
          FROM "Post" p
          WHERE p."isDeleted" = false
          ORDER BY adjusted_time DESC, p.id DESC
          LIMIT ${limit + 1}
        `;

    const hasMore = rawRows.length > limit;
    const pageRows = hasMore ? rawRows.slice(0, limit) : rawRows;
    const pageIds = pageRows.map((r) => r.id);

    // Fetch full post data for the page IDs
    const postMap = new Map(
      (await prisma.post.findMany({
        where: { id: { in: pageIds } },
        include: {
          author: { select: AUTHOR_SELECT },
          reactions: { where: { userId: user.id }, select: { type: true }, take: 1 },
          _count: { select: { reactions: true, comments: { where: { isDeleted: false, parentCommentId: null } } } },
        },
      })).map((p) => [p.id, p])
    );

    // Restore the raw-query order
    const items = pageIds.map((id) => postMap.get(id)!).filter(Boolean);

    const overdueMap = await computeOverdueMap(
      [...new Set(items.filter((p) => p.author.status === "OFFICIAL" && !p.author.monthlyPaymentExempt).map((p) => p.author.id))]
    );

    const enriched = items.map((p) => ({
      ...p,
      author: { ...p.author, overdueMonthsCount: p.author.monthlyPaymentExempt ? 0 : (overdueMap[p.author.id] ?? 0) },
      reactionCount: p._count.reactions,
      userReacted: p.reactions.length > 0,
      commentCount: p._count.comments,
      reactions: undefined,
    }));

    // Next cursor = adjusted_time + id of last returned row
    const lastRaw = hasMore ? pageRows[pageRows.length - 1] : null;
    const nextCursor = lastRaw
      ? Buffer.from(JSON.stringify({ t: lastRaw.adjusted_time.toISOString(), id: lastRaw.id })).toString("base64url")
      : null;

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
      select: { id: true, fullName: true, status: true, role: true },
    });

    const isOfficialOrStaff =
      user?.status === "OFFICIAL" || STAFF_ROLES.includes(user?.role ?? "");
    if (!user || !isOfficialOrStaff) {
      return NextResponse.json({ error: "Only official volunteers can post" }, { status: 403 });
    }

    const body = await request.json();
    const rawType = (body.postType || "TEXT").toUpperCase();

    // Role checks for special post types
    if (rawType === "NOTICE" && !NOTICE_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Only ADMIN, MASTER, or SECRETARIES can create Notice posts" }, { status: 403 });
    }
    if (rawType === "SPONSORED_AD" && !AD_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Only MASTER can create Sponsored AD posts" }, { status: 403 });
    }

    const isSpecial = rawType === "NOTICE" || rawType === "SPONSORED_AD";

    // Rate limit only applies to regular posts
    if (!isSpecial) {
      const lastPost = postRateLimit.get(user.id);
      const now = Date.now();
      if (lastPost && now - lastPost < 120_000) {
        const wait = Math.ceil((120_000 - (now - lastPost)) / 1000);
        return NextResponse.json({ error: `Please wait ${wait} seconds before posting again` }, { status: 429 });
      }
      postRateLimit.set(user.id, Date.now());
    }

    const content = (body.content || "").trim();
    if (!content) return NextResponse.json({ error: "Post content cannot be empty" }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ error: "Post content exceeds 2000 characters" }, { status: 400 });

    const images: string[] = Array.isArray(body.images)
      ? body.images.filter((u: unknown) => typeof u === "string" && u.startsWith("http")).slice(0, 10)
      : [];

    const priority = rawType === "NOTICE" ? 2 : rawType === "SPONSORED_AD" ? 1 : 0;

    // Resolve notice audience — only to send notifications (not stored as user IDs)
    let targetAudience: string | null = null;
    let notificationTargetIds: string[] = [];

    if (rawType === "NOTICE") {
      if (body.targetAudience) {
        const audienceSpec = parseAudience(
          typeof body.targetAudience === "string" ? body.targetAudience : JSON.stringify(body.targetAudience)
        );
        const audienceJson = typeof body.targetAudience === "string" ? body.targetAudience : JSON.stringify(body.targetAudience);

        const hasAudience =
          audienceSpec.all ||
          (audienceSpec.services?.length ?? 0) > 0 ||
          (audienceSpec.sectors?.length ?? 0) > 0 ||
          (audienceSpec.clubs?.length ?? 0) > 0 ||
          (audienceSpec.committees?.length ?? 0) > 0 ||
          (audienceSpec.departments?.length ?? 0) > 0;

        if (hasAudience) {
          targetAudience = audienceJson; // store the spec (not user IDs)
          notificationTargetIds = await resolveAudienceUserIds(audienceSpec, { includeRequesterId: user.id });
        }
      }

      if (notificationTargetIds.length === 0) {
        // No specific audience → target all officials (resolved here, not stored)
        const allOfficials = await prisma.user.findMany({ where: { status: "OFFICIAL" }, select: { id: true } });
        notificationTargetIds = allOfficials.map((u) => u.id);
      }
    }

    const postType = rawType as "TEXT" | "GALLERY" | "EVENT" | "NOTICE" | "SPONSORED_AD";

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        content,
        postType,
        images,
        priority,
        ...(targetAudience ? { targetAudience } : {}),
        // noticeTargetUserIds intentionally NOT stored — too large, resolved transiently above
      },
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { userId: true, type: true } },
        _count: { select: { comments: { where: { isDeleted: false, parentCommentId: null } } } },
      },
    });

    // Notify mentioned users
    await notifyMentions({ content, actorId: user.id, actorName: user.fullName, postId: post.id });

    // Send NOTICE_PUBLISHED broadcast notification to targeted users
    if (rawType === "NOTICE" && notificationTargetIds.length > 0) {
      const noticeTitle = content.length > 80 ? content.slice(0, 77) + "…" : content;
      await prisma.notification.create({
        data: {
          userId: user.id,
          broadcast: true,
          targetUserIds: notificationTargetIds, // stored on Notification, not on Post
          type: "NOTICE_PUBLISHED",
          title: "📢 New Notice",
          message: noticeTitle,
          link: `/dashboard/community?post=${post.id}`,
        },
      });
    }

    const overdueMap = await computeOverdueMap(post.author.monthlyPaymentExempt ? [] : [user.id]);

    return NextResponse.json({
      post: {
        ...post,
        author: {
          ...post.author,
          overdueMonthsCount: post.author.monthlyPaymentExempt ? 0 : (overdueMap[user.id] ?? 0),
        },
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
