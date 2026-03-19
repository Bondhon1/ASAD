import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyMentions } from "@/lib/mentionUtils";
import { createAuditLog } from "@/lib/prisma-audit";
import { computeOverdueMap } from "@/lib/computeOverdueMap";
import { resolveAudienceUserIds, parseAudience } from "@/lib/taskAudience";
import { getOfficialPostImageToggle } from "@/lib/communityPostImageToggle";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: 1 post per 120 seconds per user
const postRateLimit = new Map<string, number>();

// Roles that can create Notice posts
const NOTICE_ROLES = ["ADMIN", "MASTER", "SECRETARIES"];
// Only MASTER can create Sponsored AD posts
const AD_ROLES = ["MASTER"];
// Staff roles allowed in community
const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];

// Baseline priority boost keeps compatibility with existing ranking behavior.
// Additional always-on special boost is applied below in seen-aware scoring.
const PRIORITY_BOOST_HOURS = 6;

// Seen-aware feed tuning
const SEEN_RANDOM_WINDOW_HOURS = 6; // seen posts are shuffled inside this random window
const UNSEEN_LATEST_BOOST_HOURS = 18; // newest unseen posts get an extra freshness lift
const EXTRA_PRIORITY_PEAK_HOURS = 24; // initial special boost for sponsored/notice
const EXTRA_PRIORITY_DECAY_TAU_HOURS = 24; // larger = slower decay
const EXTRA_PRIORITY_FLOOR_HOURS = 0.75; // keeps a small persistent bonus
const POST_SEEN_RETENTION_MONTHS = 1;
const POST_SEEN_CLEANUP_INTERVAL_HOURS = 6;

const SEEN_RANDOM_WINDOW_MS = SEEN_RANDOM_WINDOW_HOURS * 60 * 60 * 1000;
const UNSEEN_LATEST_BOOST_MS = UNSEEN_LATEST_BOOST_HOURS * 60 * 60 * 1000;
const EXTRA_PRIORITY_PEAK_MS = EXTRA_PRIORITY_PEAK_HOURS * 60 * 60 * 1000;
const EXTRA_PRIORITY_FLOOR_MS = EXTRA_PRIORITY_FLOOR_HOURS * 60 * 60 * 1000;
const POST_SEEN_CLEANUP_INTERVAL_MS = POST_SEEN_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;

let lastPostSeenCleanupAtMs = 0;

function stableRandom01(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function getDecayedPriorityBoostMs(priority: number, ageHours: number): number {
  if (priority <= 0) return 0;

  const baselineBoost = priority * PRIORITY_BOOST_HOURS * 60 * 60 * 1000;
  const peakBoost = priority * EXTRA_PRIORITY_PEAK_MS;
  const floorBoost = priority * EXTRA_PRIORITY_FLOOR_MS;
  const decayedSpecialBoost = floorBoost + peakBoost * Math.exp(-ageHours / EXTRA_PRIORITY_DECAY_TAU_HOURS);

  return baselineBoost + decayedSpecialBoost;
}

async function getSeenPostIdsForUser(userId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postSeen = (prisma as any).postSeen;

  const seenRows = await postSeen.findMany({
    where: {
      userId,
      postId: { in: postIds },
    },
    select: { postId: true },
  });

  return new Set(seenRows.map((row: { postId: string }) => row.postId));
}

function getPostSeenCutoffDate(reference: Date = new Date()): Date {
  const cutoff = new Date(reference);
  cutoff.setMonth(cutoff.getMonth() - POST_SEEN_RETENTION_MONTHS);
  return cutoff;
}

async function cleanupOldPostSeenIfDue(nowMs: number = Date.now()) {
  if (nowMs - lastPostSeenCleanupAtMs < POST_SEEN_CLEANUP_INTERVAL_MS) return;

  lastPostSeenCleanupAtMs = nowMs;
  const cutoffDate = getPostSeenCutoffDate(new Date(nowMs));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postSeen = (prisma as any).postSeen;

  try {
    await postSeen.deleteMany({
      where: { seenAt: { lt: cutoffDate } },
    });
  } catch (error) {
    console.warn("PostSeen cleanup failed", error);
  }
}

async function markPostsSeen(userId: string, postIds: string[]) {
  if (postIds.length === 0) return;

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postSeen = (prisma as any).postSeen;
  await Promise.all(
    postIds.map((postId) =>
      postSeen.upsert({
        where: { postId_userId: { postId, userId } },
        create: { postId, userId, seenAt: now },
        update: { seenAt: now },
      })
    )
  );

  await cleanupOldPostSeenIfDue(now.getTime());
}

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
    const q = (searchParams.get("q") || "").trim();

    // For search queries — return top matching posts by relevance (recency)
    if (q.length >= 2) {
      const posts = await prisma.post.findMany({
        where: { isDeleted: false, content: { contains: q, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          author: { select: AUTHOR_SELECT },
          _count: { select: { reactions: true, comments: { where: { isDeleted: false, parentCommentId: null } } } },
        },
      });
      const overdueMap = await computeOverdueMap(
        [...new Set(posts.filter((p) => p.author.status === "OFFICIAL" && !p.author.monthlyPaymentExempt).map((p) => p.author.id))]
      );
      const enriched = posts.map((p) => ({
        ...p,
        author: { ...p.author, overdueMonthsCount: p.author.monthlyPaymentExempt ? 0 : (overdueMap[p.author.id] ?? 0) },
        reactionCount: p._count.reactions,
        userReacted: false,
        commentCount: p._count.comments,
      }));
      return NextResponse.json({ posts: enriched, nextCursor: null });
    }

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
          sharedPost: {
            include: {
              author: { select: AUTHOR_SELECT },
              _count: { select: { reactions: true, comments: { where: { isDeleted: false, parentCommentId: null } } } },
            },
          },
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

    // ── Community feed: seen-aware ranking ───────────────────────────────────
    // Rules:
    // 1) Sponsored + Notice get extra priority with age decay.
    // 2) Unseen + latest posts are boosted for each user.
    // 3) Seen posts are shuffled using stable randomness.

    const MAX_FEED_POSTS = 300; // enough for ~30 pages of 10

    let cursorScore: number | null = null;
    let cursorId: string | null = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString());
        cursorScore = typeof decoded.s === "number" ? decoded.s : new Date(decoded.t).getTime();
        cursorId = decoded.id;
      } catch { /* invalid cursor → start from top */ }
    }

    // Single Prisma query — no raw SQL, no parameter issues
    const allPosts = await prisma.post.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: MAX_FEED_POSTS,
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { where: { userId: user.id }, select: { type: true }, take: 1 },
        _count: { select: { reactions: true, comments: { where: { isDeleted: false, parentCommentId: null } } } },
        sharedPost: {
          include: {
            author: { select: AUTHOR_SELECT },
            _count: { select: { reactions: true, comments: { where: { isDeleted: false, parentCommentId: null } } } },
          },
        },
      },
    });

    const nowMs = Date.now();
    const daySeed = new Date(nowMs).toISOString().slice(0, 10);
    const seenPostIds = await getSeenPostIdsForUser(user.id, allPosts.map((p) => p.id));

    // Score each post and sort by score DESC, id DESC (stable tie-break)
    const withScore = allPosts.map((p) => {
      const createdAtMs = new Date(p.createdAt).getTime();
      const ageHours = Math.max(0, (nowMs - createdAtMs) / 3_600_000);
      const isSeenByUser = seenPostIds.has(p.id);

      const priorityBoost = getDecayedPriorityBoostMs(p.priority || 0, ageHours);

      let score = 0;
      if (isSeenByUser) {
        const randomPart = stableRandom01(`${user.id}:${p.id}:${daySeed}`);
        score = randomPart * SEEN_RANDOM_WINDOW_MS;
      } else {
        const latestUnseenBoost = UNSEEN_LATEST_BOOST_MS / (1 + ageHours);
        score = createdAtMs + latestUnseenBoost;
      }

      score += priorityBoost;

      return {
        post: p,
        score,
      };
    });
    withScore.sort((a, b) => b.score - a.score || b.post.id.localeCompare(a.post.id));

    // Cursor-based keyset pagination
    let startIdx = 0;
    if (cursorScore !== null && cursorId !== null) {
      const cs = cursorScore, ci = cursorId;
      const idx = withScore.findIndex(({ score, post }) =>
        score < cs || (score === cs && post.id < ci)
      );
      startIdx = idx === -1 ? withScore.length : idx;
    }

    const page = withScore.slice(startIdx, startIdx + limit + 1);
    const hasMore = page.length > limit;
    const scoredItems = hasMore ? page.slice(0, limit) : page;

    markPostsSeen(user.id, scoredItems.map(({ post }) => post.id));

    const overdueMap = await computeOverdueMap(
      [...new Set(scoredItems
        .filter(({ post: p }) => p.author.status === "OFFICIAL" && !p.author.monthlyPaymentExempt)
        .map(({ post: p }) => p.author.id)
      )]
    );

    const enriched = scoredItems.map(({ post: p, score }) => ({
      ...p,
      author: { ...p.author, overdueMonthsCount: p.author.monthlyPaymentExempt ? 0 : (overdueMap[p.author.id] ?? 0) },
      reactionCount: p._count.reactions,
      userReacted: p.reactions.length > 0,
      commentCount: p._count.comments,
      reactions: undefined,
      score: undefined, // strip internal field
    }));

    const lastItem = hasMore ? scoredItems[scoredItems.length - 1] : null;
    const nextCursor = lastItem
      ? Buffer.from(JSON.stringify({ s: lastItem.score, id: lastItem.post.id })).toString("base64url")
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
    if (!content && !body.sharedPostId) return NextResponse.json({ error: "Post content cannot be empty" }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ error: "Post content exceeds 2000 characters" }, { status: 400 });

    // Validate sharedPostId if provided
    let originalPost: { id: string; authorId: string; content: string } | null = null;
    if (body.sharedPostId) {
      originalPost = await prisma.post.findFirst({
        where: { id: body.sharedPostId, isDeleted: false },
        select: { id: true, authorId: true, content: true },
      });
      if (!originalPost) {
        return NextResponse.json({ error: "Original post not found" }, { status: 404 });
      }
    }

    const rawImages: string[] = Array.isArray(body.images)
      ? body.images.filter((u: unknown) => typeof u === "string" && u.startsWith("http"))
      : [];

    let images: string[] = [];
    if (rawType === "TEXT") {
      const imageToggleEnabled = await getOfficialPostImageToggle();
      const canAttachRegularPostImage = imageToggleEnabled && user.status === "OFFICIAL";

      if (rawImages.length > 0 && !canAttachRegularPostImage) {
        return NextResponse.json(
          { error: "Image upload for regular posts is currently disabled" },
          { status: 403 }
        );
      }

      images = rawImages.slice(0, 1);
    } else {
      images = rawImages.slice(0, 10);
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = await (prisma.post.create as any)({
      data: {
        authorId: user.id,
        content,
        postType: rawType,
        images,
        priority,
        ...(targetAudience ? { targetAudience } : {}),
        ...(originalPost ? { sharedPostId: originalPost.id } : {}),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { userId: true, type: true } },
        _count: { select: { comments: { where: { isDeleted: false, parentCommentId: null } } } },
        sharedPost: {
          include: {
            author: { select: AUTHOR_SELECT },
            _count: { select: { reactions: true, comments: { where: { isDeleted: false, parentCommentId: null } } } },
          },
        },
      },
    });

    // Increment shareCount on original post and notify original author
    if (originalPost) {
      await prisma.post.update({
        where: { id: originalPost.id },
        data: { shareCount: { increment: 1 } },
      });

      // Notify original post author (not if sharing own post)
      if (originalPost.authorId !== user.id) {
        const preview = originalPost.content.length > 80 ? originalPost.content.slice(0, 77) + "…" : originalPost.content;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.notification.create as any)({
          data: {
            userId: originalPost.authorId,
            type: "POST_SHARED",
            title: "🔁 Your post was shared",
            message: `${user.fullName || "Someone"} shared your post: "${preview}"`,
            link: `/dashboard/community?post=${post.id}`,
            groupKey: `post_shared:${originalPost.id}`,
            actorIds: [user.id],
          },
        });
      }
    }

    // Notify mentioned users
    await notifyMentions({ content, actorId: user.id, actorName: user.fullName, postId: post.id });

    // Audit log for special post types
    if (rawType === "NOTICE" || rawType === "SPONSORED_AD") {
      const action = rawType === "NOTICE" ? "NOTICE_CREATED" : "SPONSORED_AD_CREATED";
      await createAuditLog(user.id, action, {
        postId: post.id,
        contentPreview: content.length > 100 ? content.slice(0, 97) + "…" : content,
        imageCount: images.length,
        ...(rawType === "NOTICE" && targetAudience ? { targetAudience } : {}),
      });
    }

    // Send NOTICE_PUBLISHED broadcast notification to targeted users
    if (rawType === "NOTICE" && notificationTargetIds.length > 0) {
      const noticeTitle = content.length > 80 ? content.slice(0, 77) + "…" : content;
      await prisma.notification.create({
        data: {
          userId: user.id,
          broadcast: true,
          targetUserIds: notificationTargetIds, // stored on Notification, not on Post
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: "NOTICE_PUBLISHED" as any,
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
        shareCount: 0,
      },
    });
  } catch (error) {
    console.error("POST /api/community/posts error", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
