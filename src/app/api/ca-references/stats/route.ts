import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || !["HR", "ADMIN", "MASTER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10) || 20, 200);

    // Build where clause for filtering
    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { caCode: { contains: search, mode: "insensitive" } },
        { groupName: { contains: search, mode: "insensitive" } },
        { teamLeader: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get all CA references with usage count (apply date filter on included payments)
    const references = await prisma.cAReference.findMany({
      where: whereClause,
      include: {
        initialPayments: {
          where: {
            ...(startDate && endDate
              ? {
                  createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                }
              : {}),
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                volunteerId: true,
              },
            },
          },
        },
      },
      // we'll sort by usageCount server-side after fetching
    });

    // Transform data for response
    const allStats = references.map((ref: any) => ({
      id: ref.id,
      groupName: ref.groupName,
      caCode: ref.caCode,
      teamLeader: ref.teamLeader,
      usageCount: ref.initialPayments.length,
      users: ref.initialPayments.map((payment: any) => ({
        id: payment.user.id,
        fullName: payment.user.fullName,
        email: payment.user.email,
        volunteerId: payment.user.volunteerId,
        createdAt: payment.createdAt,
      })),
    }));

    // Sort by usageCount desc
    allStats.sort((a, b) => b.usageCount - a.usageCount);

    const total = allStats.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const stats = allStats.slice(start, end);

    // Volunteer referrer aggregation (group by referrerUserId)
    const volunteerPage = parseInt(searchParams.get("volunteerPage") || "1", 10) || 1;
    const volunteerPageSize = Math.min(parseInt(searchParams.get("volunteerPageSize") || "20", 10) || 20, 200);

    const volunteerGroups = await prisma.initialPayment.groupBy({
      by: ["referrerUserId"],
      where: {
        referrerUserId: { not: null },
        ...(startDate && endDate
          ? {
              createdAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {}),
      },
      _count: { referrerUserId: true },
      orderBy: { _count: { referrerUserId: "desc" } },
    });

    const volunteerTotal = volunteerGroups.length;
    const vStart = (volunteerPage - 1) * volunteerPageSize;
    const vEnd = vStart + volunteerPageSize;
    const volunteerPageGroups = volunteerGroups.slice(vStart, vEnd);

    const volunteerUserIds = volunteerPageGroups.map((g) => g.referrerUserId).filter(Boolean) as string[];
    const volunteerUsers = await prisma.user.findMany({
      where: { id: { in: volunteerUserIds } },
      select: { id: true, fullName: true, email: true, volunteerId: true },
    });

    const volunteerStats = volunteerPageGroups.map((g) => {
      const u = volunteerUsers.find((x) => x.id === g.referrerUserId);
      return {
        id: g.referrerUserId,
        fullName: u?.fullName || "N/A",
        email: u?.email || "",
        volunteerId: u?.volunteerId || null,
        usageCount: g._count.referrerUserId || 0,
      };
    });

    return NextResponse.json({ stats, total, page, pageSize, volunteerStats, volunteerTotal, volunteerPage, volunteerPageSize });
  } catch (error: any) {
    console.error("Error fetching CA statistics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch CA statistics" },
      { status: 500 }
    );
  }
}
