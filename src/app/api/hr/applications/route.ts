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

    const applications = await prisma.application.findMany({
      where,
      include: {
        user: {
          include: {
            institute: true,
            initialPayment: true,
          },
        },
      },
      orderBy: {
        appliedAt: "desc",
      },
    });

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
