import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// GET - Get available slots with capacity
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== "HR" && user.role !== "MASTER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find slots that are not full
    const slots = await prisma.interviewSlot.findMany({
      where: {
        filledCount: {
          lt: prisma.interviewSlot.fields.capacity,
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ slots, hasAvailableSlots: slots.length > 0 });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
