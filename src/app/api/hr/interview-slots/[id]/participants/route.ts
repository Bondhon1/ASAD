import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendInterviewResultEmail } from "@/lib/email";
import { publishNotification } from "@/lib/ably";

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
    if (!user || (user.role !== "HR" && user.role !== "MASTER" && user.role !== "ADMIN")) {
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
    if (!user || (user.role !== "HR" && user.role !== "MASTER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params; // slot id
    const body = await request.json();
    const { applicationId, action } = body as { applicationId: string; action: string };

    if (!applicationId || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({ 
      where: { id: applicationId },
      include: { user: { select: { id: true, fullName: true, email: true } } }
    });
    if (!application || application.interviewSlotId !== id) {
      return NextResponse.json({ error: "Application not found for this slot" }, { status: 404 });
    }

    const applicantUser = application.user;

    if (action === "approve") {
      // Update interview result and use user.status as source of truth
      const updatedApp = await prisma.application.update({
        where: { id: applicationId },
        data: { interviewResult: "PASSED", reviewedById: user.id },
      });

      await prisma.user.update({ where: { id: application.userId }, data: { status: "INTERVIEW_PASSED", interviewApprovedById: user.id } });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'INTERVIEW_APPROVED',
          meta: JSON.stringify({
            applicationId: application.id,
            userId: application.userId,
            userEmail: applicantUser.email,
            slotId: id,
          }),
        },
      });

      // Create notification for the user
      const notification = await prisma.notification.create({
        data: {
          userId: application.userId,
          type: "INTERVIEW_PASSED",
          title: "Interview Passed! 🎉",
          message: "Congratulations! You have passed the interview. Please complete the final payment of ৳170 to become an official volunteer.",
          link: "/payments/final",
        },
      });

      // Publish real-time notification via Ably
      await publishNotification(application.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
      });

      // Send email notification
      try {
        await sendInterviewResultEmail({
          email: applicantUser.email,
          fullName: applicantUser.fullName || "Volunteer",
          passed: true,
          paymentLink: `${process.env.NEXTAUTH_URL}/payments/final`,
        });
      } catch (emailError) {
        console.error("Failed to send interview passed email:", emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({ application: updatedApp });
    }

    if (action === "decline") {
      // Mark application as rejected/failed. Map 'declined' to REJECTED + FAILED
      const updatedApp = await prisma.application.update({
        where: { id: applicationId },
        data: { interviewResult: "FAILED", reviewedById: user.id },
      });

      // Set the user's status to REJECTED to reflect decline.
      await prisma.user.update({ where: { id: application.userId }, data: { status: "REJECTED" } });

      // Create notification for the user
      const notification = await prisma.notification.create({
        data: {
          userId: application.userId,
          type: "INTERVIEW_REJECTED",
          title: "Interview Update",
          message: "We regret to inform you that your interview was not successful. You may reapply in the future.",
          link: "/dashboard",
        },
      });

      // Publish real-time notification via Ably
      await publishNotification(application.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
      });

      // Send email notification
      try {
        await sendInterviewResultEmail({
          email: applicantUser.email,
          fullName: applicantUser.fullName || "Volunteer",
          passed: false,
        });
      } catch (emailError) {
        console.error("Failed to send interview rejected email:", emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({ application: updatedApp });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating participant:", error);
    return NextResponse.json({ error: "Failed to update participant" }, { status: 500 });
  }
}
