import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Create a single Prisma client instance
// The Neon pooler URL handles connection pooling automatically
export const prisma =
  global.prisma ||
  (() => {
    const appendDbParams = (dbUrl: string, extras: Record<string, string>) => {
      try {
        const u = new URL(dbUrl);
        const sp = u.searchParams;
        for (const k in extras) {
          if (!sp.has(k)) sp.set(k, extras[k]);
        }
        return u.toString();
      } catch (e) {
        // Fallback: don't modify if URL parsing fails
        return dbUrl;
      }
    };

    const rawUrl = process.env.DATABASE_URL ?? "";
    const dbUrl = rawUrl
      ? appendDbParams(rawUrl, { connect_timeout: "30" })
      : rawUrl;

    return new PrismaClient({
      datasources: { db: { url: dbUrl } },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  })();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
