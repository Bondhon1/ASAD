import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HR_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR"];

/** GET /api/hr/leave — HR gets all leave requests with optional status filter */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!requester || !HR_ROLES.includes(requester.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // PENDING | APPROVED | DECLINED
    const sortBy = searchParams.get("sortBy") || "createdAt"; // createdAt | startDate | volunteerId
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '50', 10));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {};
    if (status && ["PENDING", "APPROVED", "DECLINED"].includes(status)) {
      whereClause.status = status;
    }

    // Map sort fields
    const orderByField: any =
      sortBy === "startDate"
        ? { startDate: "asc" }
        : { createdAt: "desc" };

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where: whereClause,
        orderBy: sortBy === "volunteerId" ? { createdAt: "desc" } : orderByField,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              volunteerId: true,
              email: true,
              profilePicUrl: true,
            },
          },
          reviewedBy: {
            select: { fullName: true, volunteerId: true },
          },
        },
        skip,
        take: pageSize,
      }),
      prisma.leave.count({ where: whereClause }),
    ]);

    // If sorting by volunteerId, do it in-memory since it's on a related model
    let sorted = leaves;
    if (sortBy === "volunteerId") {
      sorted = [...leaves].sort((a, b) =>
        (a.user.volunteerId || "").localeCompare(b.user.volunteerId || "")
      );
    }

    return NextResponse.json({ leaves: sorted, total, page, pageSize });
  } catch (err: any) {
    console.error("GET /api/hr/leave error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
