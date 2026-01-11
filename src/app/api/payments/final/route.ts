import { NextRequest, NextResponse } from "next/server";
import { FinalPaymentSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = FinalPaymentSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, paymentMethod, senderNumber, trxId, paymentDate, paymentTime } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Allow final payment if interview passed or if final payment was previously rejected
    if (!(user.status === "INTERVIEW_PASSED" || user.status === "FINAL_PAYMENT_REJECTED")) {
      return NextResponse.json({ error: "User is not eligible for final payment" }, { status: 403 });
    }

    // Check if user already has final payment
    const existing = await prisma.finalPayment.findUnique({ where: { userId: user.id } });
    // Interpret submitted date/time as Asia/Dhaka local time to avoid timezone shifts
    const paymentDateTime = new Date(`${paymentDate}T${paymentTime}:00+06:00`);

    let payment;
    if (existing && existing.status !== "REJECTED") {
      return NextResponse.json({ error: "Final payment already submitted" }, { status: 409 });
    }

    if (existing && existing.status === "REJECTED") {
      payment = await prisma.finalPayment.update({
        where: { userId: user.id },
        data: {
          amount: 170,
          paymentMethod,
          senderNumber,
          trxId,
          paymentDate: paymentDateTime,
          paymentTime,
          status: "PENDING",
          updatedAt: new Date(),
        },
      });
    } else {
      payment = await prisma.finalPayment.create({
        data: {
          userId: user.id,
          amount: 170,
          paymentMethod,
          senderNumber,
          trxId,
          paymentDate: paymentDateTime,
          paymentTime,
          status: "PENDING",
        },
      });
    }

    // Ensure user's status is set back to INTERVIEW_PASSED when they resubmit final payment
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "INTERVIEW_PASSED" },
    });

    return NextResponse.json({ success: true, paymentId: payment.id }, { status: 201 });
  } catch (error) {
    console.error("Final payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
