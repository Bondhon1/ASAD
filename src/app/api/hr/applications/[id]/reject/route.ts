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
    const body = await request.json();
    const { reason } = body;

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

    // Update initial payment status to REJECTED
    await prisma.initialPayment.update({
      where: { userId: application.userId },
      data: {
        status: "REJECTED",
      },
    });

    // Update application status
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
      },
    });

    // TODO: Send email notification to user about rejection

    return NextResponse.json(
      { success: true, message: "Application rejected" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error rejecting application:", error);
    return NextResponse.json(
      { error: "Failed to reject application" },
      { status: 500 }
    );
  }
}
