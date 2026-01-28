import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendFinalPaymentStatusEmail } from "@/lib/email";
import { publishNotification } from "@/lib/ably";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hr = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!hr || (hr.role !== "HR" && hr.role !== "MASTER" && hr.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { type, action } = body as { type: string; action: string };

    if (!type || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    if (type === "initial") {
      const payment = await prisma.initialPayment.findUnique({ where: { id }, include: { user: true } });
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

      if (action === "approve") {
        await prisma.initialPayment.update({ where: { id }, data: { status: "VERIFIED", verifiedAt: new Date(), approvedById: hr.id } });
        
        // Create notification for initial payment approval
        const notification = await prisma.notification.create({
          data: {
            userId: payment.userId,
            type: "INITIAL_PAYMENT_ACCEPTED",
            title: "Payment Verified ✓",
            message: "Your initial payment has been verified. Your application is now under review.",
            link: "/dashboard",
          },
        });
        
        // Publish real-time notification via Ably
        await publishNotification(payment.userId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt,
        });
        
        return NextResponse.json({ success: true });
      }

      if (action === "reject") {
        await prisma.initialPayment.update({ where: { id }, data: { status: "REJECTED", approvedById: hr.id } });
        // set user status to REJECTED so they can re-pay
        await prisma.user.update({ where: { id: payment.userId }, data: { status: "REJECTED" } });
        
        // Create notification for initial payment rejection
        const notification = await prisma.notification.create({
          data: {
            userId: payment.userId,
            type: "INITIAL_PAYMENT_REJECTED",
            title: "Payment Issue",
            message: "Your initial payment could not be verified. Please re-submit with correct details.",
            link: "/payments/initial",
          },
        });
        
        // Publish real-time notification via Ably
        await publishNotification(payment.userId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt,
        });
        
        return NextResponse.json({ success: true });
      }
    }

    if (type === "final") {
      const payment = await prisma.finalPayment.findUnique({ where: { id }, include: { user: true } });
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

      if (action === "approve") {
        // support manual assignment: body may contain assignMode: 'auto'|'manual' and volunteerId when manual
        const { assignMode, volunteerId: manualVolunteerId } = body as { assignMode?: string; volunteerId?: string };

        // determine volunteerId to use
        let volunteerIdToUse: string | null = null;
        if (assignMode === 'manual') {
          if (!manualVolunteerId) return NextResponse.json({ error: 'Manual volunteerId required' }, { status: 400 });
          // ensure uniqueness
          const exists = await prisma.user.findFirst({ where: { volunteerId: manualVolunteerId } });
          if (exists) return NextResponse.json({ error: 'Volunteer ID already in use' }, { status: 409 });
          volunteerIdToUse = manualVolunteerId;
        } else {
          // auto-generate sequential volunteerId starting from 22000799
          const usersWithIds = await prisma.user.findMany({ where: { volunteerId: { not: null } }, select: { volunteerId: true } });
          let maxNumeric = 0;
          for (const u of usersWithIds) {
            const v = u.volunteerId || "";
            const n = parseInt(v, 10);
            if (!Number.isNaN(n) && n > maxNumeric) maxNumeric = n;
          }
          const start = 22000799;
          const nextId = maxNumeric >= start ? maxNumeric + 1 : start;
          volunteerIdToUse = String(nextId);
        }

        const ops: any[] = [];
        // mark final payment verified
        ops.push(prisma.finalPayment.update({ where: { id }, data: { status: "VERIFIED", verifiedAt: new Date(), approvedById: hr.id } }));

        // update user to OFFICIAL (only increment institute count if user wasn't already OFFICIAL)
        ops.push(prisma.user.update({ where: { id: payment.userId }, data: { status: "OFFICIAL", volunteerId: volunteerIdToUse } }));

        // If user has an institute and wasn't OFFICIAL before, increment the cached count
        if (payment.user?.instituteId && payment.user.status !== "OFFICIAL") {
          ops.push(prisma.institute.update({ where: { id: payment.user.instituteId }, data: { totalVolunteersCached: { increment: 1 } } }));
        }

        await prisma.$transaction(ops);

        // Create notification for final payment approval
        const notification = await prisma.notification.create({
          data: {
            userId: payment.userId,
            type: "FINAL_PAYMENT_ACCEPTED",
            title: "Welcome to ASAD! 🎊",
            message: `Congratulations! You are now an official volunteer. Your Volunteer ID is ${volunteerIdToUse}.`,
            link: "/dashboard",
          },
        });

        // Publish real-time notification via Ably
        await publishNotification(payment.userId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt,
        });

        // Send email notification
        try {
          await sendFinalPaymentStatusEmail({
            email: payment.user.email,
            fullName: payment.user.fullName || "Volunteer",
            accepted: true,
            volunteerId: volunteerIdToUse || undefined,
          });
        } catch (emailError) {
          console.error("Failed to send final payment accepted email:", emailError);
          // Don't fail the request if email fails
        }

        return NextResponse.json({ success: true });
      }

      if (action === "reject") {
      await prisma.finalPayment.update({ where: { id }, data: { status: "REJECTED", approvedById: hr.id } });
        await prisma.user.update({ where: { id: payment.userId }, data: { status: "FINAL_PAYMENT_REJECTED" } });

        // Create notification for final payment rejection
        const notification = await prisma.notification.create({
          data: {
            userId: payment.userId,
            type: "FINAL_PAYMENT_REJECTED",
            title: "Payment Issue",
            message: "Your final payment could not be verified. Please re-submit the 170 BDT payment.",
            link: "/payments/final",
          },
        });

        // Publish real-time notification via Ably
        await publishNotification(payment.userId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt,
        });

        // Send email notification
        try {
          await sendFinalPaymentStatusEmail({
            email: payment.user.email,
            fullName: payment.user.fullName || "Volunteer",
            accepted: false,
          });
        } catch (emailError) {
          console.error("Failed to send final payment rejected email:", emailError);
          // Don't fail the request if email fails
        }

        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: "Invalid type/action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing payment action:", error);
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
  }
}
