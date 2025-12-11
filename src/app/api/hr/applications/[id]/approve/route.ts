import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check for HR/MASTER role

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

    // Update initial payment status to VERIFIED
    await prisma.initialPayment.update({
      where: { userId: application.userId },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });

    // Application status remains INTERVIEW_REQUESTED
    // It will be updated to INTERVIEW_SCHEDULED when HR sets an interview date

    return NextResponse.json(
      { success: true, message: "Payment approved. Application is ready for interview scheduling." },
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
