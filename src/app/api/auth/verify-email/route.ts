import { NextRequest, NextResponse } from "next/server";
import { EmailVerificationSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate input
    const validation = EmailVerificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Find user with this token
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      // Check if there's a user with this email but no token (already verified)
      // For better UX, we check if token might have been used before
      const possiblyVerifiedUser = await prisma.user.findFirst({
        where: {
          emailVerificationToken: null,
          emailVerified: true,
        },
      });

      if (possiblyVerifiedUser) {
        return NextResponse.json(
          { error: "Email is already verified" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 404 }
      );
    }

    // Check if email is already verified (edge case)
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
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
        // Status remains APPLICANT until payment is made
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
