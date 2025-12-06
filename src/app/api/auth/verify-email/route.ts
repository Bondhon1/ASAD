import { NextRequest, NextResponse } from "next/server";
import { EmailVerificationSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = EmailVerificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    console.log("Verifying token:", token);

    // Find user with this token
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    console.log("User found:", user ? `Yes (ID: ${user.id})` : "No");

    if (!user) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 404 }
      );
    }

    // Check if token has expired
    if (
      user.emailVerificationExpiry &&
      user.emailVerificationExpiry < new Date()
    ) {
      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      );
    }

    // Update user to mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        status: "INTERVIEW_SCHEDULED", // Move to next stage after email verification
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully",
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
