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
      where.status = status;
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
