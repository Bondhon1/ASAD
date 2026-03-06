/**
 * Audit database client — separate PostgreSQL instance so the audit trail
 * is isolated from the main database.  Even if the primary DB is lost the
 * audit records remain intact and can be used to restore system state.
 *
 * Connection string: AUDIT_DATABASE_URL  (set in .env / Vercel env vars)
 */
import { PrismaClient } from "@/generated/prisma-audit";
import { prisma } from "@/lib/prisma";

declare global {
  // eslint-disable-next-line no-var
  var prismaAudit: PrismaClient | undefined;
}

const appendDbParams = (dbUrl: string, extras: Record<string, string>) => {
  try {
    const u = new URL(dbUrl);
    const sp = u.searchParams;
    for (const k in extras) {
      if (!sp.has(k)) sp.set(k, extras[k]);
    }
    return u.toString();
  } catch {
    return dbUrl;
  }
};

function createAuditPrismaClient() {
  const rawUrl = process.env.AUDIT_DATABASE_URL ?? "";
  const dbUrl = rawUrl
    ? appendDbParams(rawUrl, {
        connect_timeout: "30",
        connection_limit: "3",
        pool_timeout: "30",
      })
    : rawUrl;

  return new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prismaAudit = global.prismaAudit ?? createAuditPrismaClient();
global.prismaAudit = prismaAudit;

// ---------------------------------------------------------------------------
// createAuditLog — central helper used by all API routes.
//
// • Resolves and denormalises actor info from the main DB (best-effort).
// • Writes to the audit DB; never throws — all errors are swallowed so a
//   logging failure never breaks a business transaction.
// ---------------------------------------------------------------------------
export async function createAuditLog(
  actorUserId: string | null | undefined,
  action: string,
  meta?: Record<string, unknown> | null,
  affectedVolunteerId?: string | null,
  points?: number | null
) {
  if (!actorUserId) {
    console.warn("[AuditLog] skipped — no actorUserId for action:", action);
    return;
  }

  try {
    // Resolve actor snapshot from main DB (best-effort, non-blocking)
    let actorName: string | null = null;
    let actorEmail: string | null = null;
    let actorVolunteerId: string | null = null;
    let actorRole: string | null = null;

    try {
      const actor = await prisma.user.findUnique({
        where: { id: actorUserId },
        select: { fullName: true, email: true, volunteerId: true, role: true },
      });
      if (actor) {
        actorName = actor.fullName ?? null;
        actorEmail = actor.email ?? null;
        actorVolunteerId = actor.volunteerId ?? null;
        actorRole = actor.role ?? null;
      }
    } catch {
      // Main DB lookup failed — still write the log without actor details
    }

    await prismaAudit.auditLog.create({
      data: {
        actorUserId,
        actorName,
        actorEmail,
        actorVolunteerId,
        actorRole,
        action,
        meta: meta ? JSON.stringify(meta) : undefined,
        affectedVolunteerId: affectedVolunteerId ?? undefined,
        points: points ?? undefined,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[AuditLog] write failed:", msg);
  }
}
