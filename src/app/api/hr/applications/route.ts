import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check for HR/MASTER role

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const slotId = searchParams.get("slotId");

    const where: any = {};
    if (status) {
      if (status === "INTERVIEW_REQUESTED") {
        // still pending payment verification
        where.user = { status, initialPayment: { status: "PENDING" } };
      } else if (status === "INTERVIEW_SCHEDULED") {
        // use application status so older approvals (that didn't set user.status) still appear
        where.status = "INTERVIEW_SCHEDULED";
      } else {
        where.user = { status };
      }
    }
    if (slotId) {
      where.interviewSlotId = slotId;
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') || '50', 10));
    const skip = (page - 1) * pageSize;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        select: {
          id: true,
          status: true,
          appliedAt: true,
          trxId: true,
          paymentMethod: true,
          interviewSlotId: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              volunteerId: true,
              status: true,
              profilePicUrl: true,
              institute: { select: { id: true, name: true } },
              initialPayment: { select: { id: true, status: true, amount: true, createdAt: true } },
            },
          },
        },
        orderBy: { appliedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.application.count({ where }),
    ]);

    return NextResponse.json({ applications, total, page, pageSize }, { status: 200 });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
