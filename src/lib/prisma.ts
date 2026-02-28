import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
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

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  const dbUrl = rawUrl
    ? appendDbParams(rawUrl, {
        connect_timeout: "30",
        // Limit connections per Prisma instance — critical for serverless / Aiven
        // Aiven default max_connections is typically 100-200; keep this low so
        // multiple concurrent serverless invocations don't exhaust the pool.
        connection_limit: "5",
        pool_timeout: "30",
      })
    : rawUrl;

  return new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Singleton pattern that works in BOTH development AND production.
// In development, we reuse the global instance across hot-reloads.
// In production (serverless), we still reuse within the same module scope,
// which prevents a fresh client — and fresh connection pool — on every request.
export const prisma = global.prisma ?? createPrismaClient();

// Always cache on global so hot-reloads (dev) and module re-evaluations
// (some runtimes) don't create extra clients.
global.prisma = prisma;
