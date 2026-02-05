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

    const { paymentMethod, senderNumber, trxId, paymentDate, paymentTime, email, fullName, phone, instituteName, educationLevel, caReferenceId, referrerType, referrerUserId } =
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


    // Allow resubmission when previous payment was rejected OR when the user's status is REJECTED
    if (existingPayment && existingPayment.status !== "REJECTED" && user.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Payment already submitted" },
        { status: 409 }
      );
    }

    // Find or create institute by name (case-insensitive)
    const trimmedInstituteName = instituteName.trim();
    let institute = await prisma.institute.findFirst({
      where: { name: { equals: trimmedInstituteName, mode: "insensitive" } },
    });

    if (!institute) {
      institute = await prisma.institute.create({
        data: { name: trimmedInstituteName },
      });
    }

    // Check if phone number is already used by another user
    if (phone) {
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhoneUser && existingPhoneUser.id !== user.id) {
        return NextResponse.json(
          { error: "Phone number already registered with another account" },
          { status: 409 }
        );
      }
    }

    // Update user with basic info and status
    const joiningSemesterValue = educationLevel === "university"
      ? "University"
      : educationLevel === "admission_candidate"
      ? "Admission Candidate"
      : educationLevel === "medical_student"
      ? "Medical Student"
      : `Class ${educationLevel}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName,
        phone,
        instituteId: institute.id,
        joiningSemester: joiningSemesterValue,
        status: "INTERVIEW_REQUESTED",
      },
    });

    // Create payment record
    // Interpret submitted date/time as Asia/Dhaka local time to avoid timezone shifts
    const paymentDateTime = new Date(`${paymentDate}T${paymentTime}:00+06:00`);

    let payment;
    if (existingPayment) {
      // If a payment record already exists (rejected or otherwise allowed resubmission),
      // update it instead of creating a new one to avoid unique constraint errors.
      payment = await prisma.initialPayment.update({
        where: { userId: user.id },
          data: {
            amount: 30,
            paymentMethod,
            senderNumber,
            trxId,
            caReferenceId: referrerType === "CA" ? (caReferenceId || null) : null,
            referrerType: referrerType || null,
            referrerUserId: referrerType === "VOLUNTEER" ? (referrerUserId || null) : null,
            paymentDate: paymentDateTime,
            paymentTime,
            status: "PENDING",
            updatedAt: new Date(),
          },
      });
    } else {
      payment = await prisma.initialPayment.create({
        data: {
          userId: user.id,
          amount: 30,
          paymentMethod,
          senderNumber,
          trxId,
          caReferenceId: referrerType === "CA" ? (caReferenceId || null) : null,
          referrerType: referrerType || null,
          referrerUserId: referrerType === "VOLUNTEER" ? (referrerUserId || null) : null,
          paymentDate: paymentDateTime,
          paymentTime,
          status: "PENDING",
        },
      });
    }

    // Create or update application with payment info
    const existingApplication = await prisma.application.findUnique({
      where: { userId: user.id },
    });

    if (existingApplication) {
      await prisma.application.update({
        where: { userId: user.id },
        data: {
          trxId,
          paymentMethod,
          status: "INTERVIEW_REQUESTED",
        },
      });
    } else {
      // Create new application for Google users who don't have one
      await prisma.application.create({
        data: {
          userId: user.id,
          trxId,
          paymentMethod,
          status: "INTERVIEW_REQUESTED",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Payment submitted successfully. Admin will verify in a very short time.",
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
