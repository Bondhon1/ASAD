import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const RETENTION_MONTHS = 1;

function getCutoffDate(reference: Date = new Date()): Date {
  const cutoff = new Date(reference);
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  return cutoff;
}

async function handleCleanup(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isValidCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const requester = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { role: true, status: true },
      });

      if (!requester || !["MASTER", "ADMIN"].includes(requester.role) || requester.status === "BANNED") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const now = new Date();
    const cutoff = getCutoffDate(now);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postSeen = (prisma as any).postSeen;
    const result = await postSeen.deleteMany({
      where: { seenAt: { lt: cutoff } },
    });

    return NextResponse.json({
      ok: true,
      retentionMonths: RETENTION_MONTHS,
      cutoffIso: cutoff.toISOString(),
      deletedCount: result.count,
      triggeredBy: isValidCron ? "cron" : "manual",
    });
  } catch (error) {
    console.error("POST/GET /api/community/posts/cleanup-seen error", error);
    return NextResponse.json({ error: "Failed to cleanup seen records" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleCleanup(req);
}

export async function POST(req: Request) {
  return handleCleanup(req);
}
