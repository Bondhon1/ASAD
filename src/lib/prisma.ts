import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// Configure Neon for optimal performance
// Use WebSocket for local development (requires ws package)
// In production on Vercel Edge/serverless, HTTP fetch is used
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  // Use Neon serverless adapter for faster connections (HTTP-based, no TCP cold starts)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
