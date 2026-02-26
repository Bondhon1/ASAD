import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";

/** Extract all mentioned user IDs from content containing @[Name](userId) tokens. */
export function extractMentionIds(content: string): string[] {
  const matches = [...content.matchAll(/@\[([^\]]+)\]\(([^)]+)\)/g)];
  return [...new Set(matches.map((m) => m[2]))];
}

/**
 * Notify all users mentioned in content, excluding specified user IDs
 * (e.g. the actor and anyone already notified).
 */
export async function notifyMentions({
  content,
  actorId,
  actorName,
  postId,
  excludeIds = [],
}: {
  content: string;
  actorId: string;
  actorName: string | null;
  postId: string;
  excludeIds?: string[];
}) {
  const mentionIds = extractMentionIds(content);
  if (!mentionIds.length) return;

  const skip = new Set([actorId, ...excludeIds]);
  const toNotify = mentionIds.filter((id) => !skip.has(id));
  if (!toNotify.length) return;

  const name = actorName || "A volunteer";

  await Promise.allSettled(
    toNotify.map(async (userId) => {
      try {
        const notif = await prisma.notification.create({
          data: {
            userId,
            type: "MENTION",
            title: `${name} mentioned you`,
            message: `${name} mentioned you in a post.`,
            link: `/dashboard/community?post=${postId}`,
          },
        });
        await publishNotification(userId, {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
          createdAt: notif.createdAt,
        });
      } catch {}
    })
  );
}
