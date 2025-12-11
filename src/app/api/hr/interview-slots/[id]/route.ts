import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// DELETE - Remove interview slot
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Unassign all applications from this slot
    await prisma.application.updateMany({
      where: { interviewSlotId: id },
      data: { 
        interviewSlotId: null,
        status: "INTERVIEW_REQUESTED", // Reset status
      },
    });

    // Delete the slot
    await prisma.interviewSlot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting slot:", error);
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
  }
}

// PUT - Update interview slot
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { startTime, endTime, capacity, meetLink } = await request.json();

    const updateData: any = {};
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (capacity) updateData.capacity = capacity;
    if (meetLink) updateData.meetLink = meetLink;

    const slot = await prisma.interviewSlot.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Error updating slot:", error);
    return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
  }
}
