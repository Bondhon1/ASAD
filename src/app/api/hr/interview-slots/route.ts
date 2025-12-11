import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// GET - List all interview slots
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

    const slots = await prisma.interviewSlot.findMany({
      orderBy: { startTime: "asc" },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}

// POST - Create new interview slot
export async function POST(request: Request) {
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

    const { startTime, endTime, capacity, meetLink } = await request.json();

    if (!startTime || !endTime || !capacity || !meetLink) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    if (capacity < 1 || capacity > 50) {
      return NextResponse.json({ error: "Capacity must be between 1 and 50" }, { status: 400 });
    }

    const slot = await prisma.interviewSlot.create({
      data: {
        startTime: start,
        endTime: end,
        capacity,
        meetLink,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error("Error creating slot:", error);
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 });
  }
}
