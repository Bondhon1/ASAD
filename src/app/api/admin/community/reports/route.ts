import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/ably";

export const dynamic = "force-dynamic";

// GET /api/admin/community/reports — list all reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    if (!user || !["MASTER", "ADMIN"].includes(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));
    const status = searchParams.get("status") || "ALL";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build filter
    const where: any = {};
    if (status !== "ALL") {
      where.status = status;
    }

    // Count total
    const total = await prisma.postReport.count({ where });

    // Fetch reports
    const reports = await prisma.postReport.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            isDeleted: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                fullName: true,
                volunteerId: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            fullName: true,
            volunteerId: true,
            email: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      reports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("GET /api/admin/community/reports error", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
