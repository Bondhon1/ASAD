import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateEmailVerificationToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { SignUpSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = SignUpSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Invalid input";
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Generate username from email
    const username = email.split('@')[0];

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate email verification token
    const verificationToken = generateEmailVerificationToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        status: "APPLICANT",
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    // Create application record
    await prisma.application.create({
      data: {
        userId: user.id,
        trxId: "pending", // Will be updated with actual payment info
        paymentMethod: "pending",
        status: "PENDING",
      },
    });

    // Send verification email
    const verificationLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;

    try {
      await sendVerificationEmail({
        email,
        fullName: username, // Use username as display name
        verificationLink,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Continue even if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Signup successful. Please check your email for verification link.",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
