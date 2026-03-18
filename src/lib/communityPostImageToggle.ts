import { prismaAudit } from "@/lib/prisma-audit";

export const COMMUNITY_OFFICIAL_POST_IMAGE_TOGGLE_ACTION =
  "COMMUNITY_OFFICIAL_POST_IMAGE_TOGGLE_SET";

function parseToggleMeta(meta: string | null): boolean {
  if (!meta) return false;

  try {
    const parsed = JSON.parse(meta) as { enabled?: unknown };
    return parsed.enabled === true;
  } catch {
    return false;
  }
}

export async function getOfficialPostImageToggle(): Promise<boolean> {
  const latest = await prismaAudit.auditLog.findFirst({
    where: { action: COMMUNITY_OFFICIAL_POST_IMAGE_TOGGLE_ACTION },
    orderBy: { createdAt: "desc" },
    select: { meta: true },
  });

  return parseToggleMeta(latest?.meta ?? null);
}
