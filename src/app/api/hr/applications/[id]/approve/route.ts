import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { sendInterviewInvitation } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hrUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!hrUser || (hrUser.role !== "HR" && hrUser.role !== "MASTER" && hrUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: applicationId } = await params;

    // Find the application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Find the first available slot (not full, ordered by start time)
    const now = new Date();
    const availableSlot = await prisma.interviewSlot.findFirst({
      where: {
        filledCount: {
          lt: prisma.interviewSlot.fields.capacity,
        },
        startTime: {
          gt: now, // only pick upcoming slots
        },
      },
      orderBy: { startTime: "asc" },
    });

    if (!availableSlot) {
      return NextResponse.json(
        { error: "No available interview slots. Please create slots first." },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction([
      // Update initial payment status to VERIFIED
      prisma.initialPayment.update({
        where: { userId: application.userId },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      }),
      // Assign application to slot and update status
      prisma.application.update({
        where: { id: applicationId },
        data: {
          interviewSlotId: availableSlot.id,
          interviewDate: availableSlot.startTime,
          status: "INTERVIEW_SCHEDULED",
        },
      }),
      // Increment slot's filled count
      prisma.interviewSlot.update({
        where: { id: availableSlot.id },
        data: {
          filledCount: {
            increment: 1,
          },
        },
      }),
    ]);

    // Send interview invitation email
    try {
      await sendInterviewInvitation({
        applicantName: application.user.fullName || application.user.username || "Applicant",
        applicantEmail: application.user.email,
        interviewDate: availableSlot.startTime,
        startTime: availableSlot.startTime,
        endTime: availableSlot.endTime,
        meetLink: availableSlot.meetLink,
        hrName: hrUser.fullName || hrUser.username || "ASAD HR Team",
      });
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the approval if email fails
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Application approved! Interview invitation sent to applicant.",
        slot: {
          startTime: availableSlot.startTime,
          endTime: availableSlot.endTime,
          meetLink: availableSlot.meetLink,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error approving application:", error);
    return NextResponse.json(
      { error: "Failed to approve application" },
      { status: 500 }
    );
  }
}
