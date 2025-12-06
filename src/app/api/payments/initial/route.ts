import { NextRequest, NextResponse } from "next/server";
import { InitialPaymentSchema } from "@/lib/validations";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = InitialPaymentSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Invalid input";
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    const { paymentMethod, senderNumber, trxId, paymentDate, paymentTime, email } =
      validation.data;

    // Find user by email (email should be provided in the request)
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email first" },
        { status: 403 }
      );
    }

    // Check if user already has a payment record
    const existingPayment = await prisma.initialPayment.findUnique({
      where: { userId: user.id },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "Payment already submitted" },
        { status: 409 }
      );
    }

    // Create payment record
    const paymentDateTime = new Date(`${paymentDate}T${paymentTime}`);

    const payment = await prisma.initialPayment.create({
      data: {
        userId: user.id,
        amount: 30,
        paymentMethod,
        senderNumber,
        trxId,
        paymentDate: paymentDateTime,
        paymentTime,
        status: "PENDING",
      },
    });

    // Update application with payment info
    await prisma.application.update({
      where: { userId: user.id },
      data: {
        trxId,
        paymentMethod,
        status: "INTERVIEW_SCHEDULED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Payment submitted successfully. Admin will verify within 24 hours.",
        paymentId: payment.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Payment submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
