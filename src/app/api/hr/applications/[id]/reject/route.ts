import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { invalidateProfileCache } from "@/lib/profileCache";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hrUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!hrUser || (hrUser.role !== "HR" && hrUser.role !== "MASTER" && hrUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

    // Update initial payment status to REJECTED and record approver
    await prisma.initialPayment.update({
      where: { userId: application.userId },
      data: {
        status: "REJECTED",
        approvedById: hrUser.id,
      },
    });

    // Set user status to REJECTED so they can re-submit initial payment
    await prisma.user.update({ where: { id: application.userId }, data: { status: "REJECTED" } });

    // Update application status
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
      },
    });

    // Invalidate profile cache for fresh data
    invalidateProfileCache(application.user.email);

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
