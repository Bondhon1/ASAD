/**
 * postScoring.ts
 *
 * Ranking algorithm for Community Posts.
 *
 * Each post is scored with four components:
 *   1. Freshness        – new posts naturally rank higher
 *   2. Engagement score – reactions + comments weighted by age
 *   3. Trending boost   – rapid engagement temporarily lifts a post
 *   4. Follower boost   – posts from popular authors get a soft multiplier
 *
 * Final score = (baseScore + trendingBoost) × (1 + followerBoost)
 */

// ─── Input type ───────────────────────────────────────────────────────────────

export interface PostScoreInput {
  /** ISO string or Date object – when the post was created */
  createdAt: Date | string;
  /** Total reaction count on the post */
  reactionsCount: number;
  /** Total comment count on the post */
  commentsCount: number;
  /** Number of followers the post's author has */
  authorFollowerCount: number;
}

// ─── Core scoring function ────────────────────────────────────────────────────

/**
 * Computes a ranking score for a single post.
 *
 * @param post  - The post fields needed for scoring.
 * @param now   - Reference time (defaults to `new Date()`).
 *                Pass an explicit value when scoring a batch so all posts
 *                are compared against the exact same moment.
 * @returns     A non-negative score; higher = ranks higher in the feed.
 */
export function computePostScore(
  post: PostScoreInput,
  now: Date = new Date()
): number {
  // ── Time distance ────────────────────────────────────────────────────────────
  //
  // Convert the age of the post to hours.
  // `Math.max(0, …)` guards against clock skew / future-dated posts.
  const hoursSincePost = Math.max(
    0,
    (now.getTime() - new Date(post.createdAt).getTime()) / 3_600_000
  );

  // ── 1. Freshness ─────────────────────────────────────────────────────────────
  //
  // Starts at 1.0 when the post is brand-new (h = 0) and decays toward 0.
  // "+1" in the denominator:
  //   • prevents division by zero at t = 0
  //   • makes the decay curve smooth and convex (fast at first, then slower)
  const freshness = 1 / (hoursSincePost + 1);

  // ── 2. Engagement score ──────────────────────────────────────────────────────
  //
  // Rewards reactions and comments, but discounts older engagement.
  //
  // Why 0.5× for comments?
  //   Comments signal genuine interest but are a higher-friction action than
  //   reactions; giving them half-weight prevents comment-heavy posts from
  //   unfairly dominating reactions-heavy ones.
  //
  // Why (h + 2) ^ 1.5 in the denominator?
  //   • "+2" ensures values > 0 from the start.
  //   • Exponent 1.5 applies stronger decay than freshness (exponent 1),
  //     so raw engagement from very old posts fades faster than freshness does.
  const weightedEngagement =
    post.reactionsCount + 0.5 * post.commentsCount;
  const engagementScore =
    weightedEngagement / Math.pow(hoursSincePost + 2, 1.5);

  // ── 3. Base score ────────────────────────────────────────────────────────────
  const baseScore = freshness + engagementScore;

  // ── 4. Trending boost ────────────────────────────────────────────────────────
  //
  // Captures the *rate* of engagement, not just the total.
  // A post with 50 reactions in 2 hours outranks one with 50 reactions in 2 days.
  //
  //   engagement_rate  = (reactions + comments) / (h + 1)
  //   trending_boost   = engagement_rate / (h + 2) ^ 1.2
  //
  // The second division by (h + 2) ^ 1.2 ensures the boost is temporary –
  // even a viral post will eventually stop being "trending".
  // Exponent 1.2 (< 1.5 used above) makes the trending component decay
  // slightly slower than the raw engagement score, giving viral posts a
  // visible but time-limited lift.
  const engagementRate =
    (post.reactionsCount + post.commentsCount) / (hoursSincePost + 1);
  const trendingBoost = engagementRate / Math.pow(hoursSincePost + 2, 1.2);

  // ── 5. Follower boost ────────────────────────────────────────────────────────
  //
  // Posts from authors with many followers get a soft proportional lift.
  //
  //   follower_boost = log(follower_count + 1) × 0.05
  //
  // Why `log`?
  //   Logarithm compresses large values so an author with 10 000 followers
  //   does NOT get 1 000× more boost than one with 10 followers.
  //   It keeps this signal as a gentle quality hint, not a dominance factor.
  //
  // Why 0.05?
  //   For an author with 100 followers → boost ≈ +23 % (log(101) × 0.05 ≈ 0.23)
  //   For an author with 10 followers  → boost ≈ +12 %
  //   Keeps follower count as a secondary signal behind content quality.
  //
  // "+1" inside log() ensures authors with 0 followers get boost = 0 (not −∞).
  const followerBoost = Math.log(post.authorFollowerCount + 1) * 0.05;

  // ── Final score ──────────────────────────────────────────────────────────────
  //
  // Additive combination of content quality (base) and virality (trending),
  // multiplied by the follower signal:
  //
  //   final = (base + trending) × (1 + follower_boost)
  //
  // Multiplicative follower factor: gives popular-author posts a proportional
  // lift rather than a flat additive bonus, so it scales correctly across
  // posts with very different base scores.
  return (baseScore + trendingBoost) * (1 + followerBoost);
}

// ─── Batch sort utility ───────────────────────────────────────────────────────

/**
 * Sorts an array of posts from highest score to lowest (best first).
 *
 * All posts are scored against the **same** `now` timestamp so the
 * comparison is consistent within a single render/request.
 *
 * @param posts - Array of posts (may include any extra fields beyond PostScoreInput).
 * @param now   - Reference time (defaults to `new Date()`).
 * @returns     A new sorted array; the original array is not mutated.
 *
 * @example
 * const ranked = sortPostsByScore(enrichedPosts.map(p => ({
 *   ...p,
 *   reactionsCount:      p.reactionCount,
 *   commentsCount:       p.commentCount,
 *   authorFollowerCount: p.author.followerCount ?? 0,
 * })));
 */
export function sortPostsByScore<T extends PostScoreInput>(
  posts: T[],
  now: Date = new Date()
): T[] {
  // Compute scores once per post (cache in a Map) to avoid O(n log n) recomputation.
  const scores = new Map<T, number>(
    posts.map((p) => [p, computePostScore(p, now)])
  );
  return [...posts].sort((a, b) => scores.get(b)! - scores.get(a)!);
}
