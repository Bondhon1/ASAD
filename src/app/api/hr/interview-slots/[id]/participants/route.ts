import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET - list participants (applications) for a slot
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== "HR" && user.role !== "MASTER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const applications = await prisma.application.findMany({
      where: { interviewSlotId: id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, volunteerId: true, profilePicUrl: true },
        },
      },
      orderBy: { appliedAt: "asc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}

// POST - approve / decline a participant application
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== "HR" && user.role !== "MASTER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params; // slot id
    const body = await request.json();
    const { applicationId, action } = body as { applicationId: string; action: string };

    if (!applicationId || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application || application.interviewSlotId !== id) {
      return NextResponse.json({ error: "Application not found for this slot" }, { status: 404 });
    }

    if (action === "approve") {
      // Mark application as accepted / passed and update user status
      const updatedApp = await prisma.application.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED", interviewResult: "PASSED" },
      });

      await prisma.user.update({ where: { id: application.userId }, data: { status: "INTERVIEW_PASSED" } });

      return NextResponse.json({ application: updatedApp });
    }

    if (action === "decline") {
      // Mark application as rejected/failed. Map 'declined' to REJECTED + FAILED
      const updatedApp = await prisma.application.update({
        where: { id: applicationId },
        data: { status: "REJECTED", interviewResult: "FAILED" },
      });

      // There's no explicit "DECLINED" user status in the schema; set the user's status to INACTIVE to reflect decline.
      await prisma.user.update({ where: { id: application.userId }, data: { status: "INACTIVE" } });

      return NextResponse.json({ application: updatedApp });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating participant:", error);
    return NextResponse.json({ error: "Failed to update participant" }, { status: 500 });
  }
}
