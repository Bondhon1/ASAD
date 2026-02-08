import { NextRequest, NextResponse } from "next/server";
import { ResendVerificationEmailSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { generateEmailVerificationToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Rate limiting constants
const MAX_RESEND_ATTEMPTS = 5; // Maximum resend attempts
const RESEND_COOLDOWN_MINUTES = 2; // Wait time between resends in minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = ResendVerificationEmailSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        emailVerificationToken: true,
        emailVerificationExpiry: true,
        emailVerificationResendCount: true,
        emailVerificationLastResent: true,
      },
    });

    if (!user) {
      // Don't reveal that user doesn't exist for security
      return NextResponse.json(
        { error: "If this email exists and is not verified, a verification link will be sent." },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Check resend count limit
    const resendCount = user.emailVerificationResendCount || 0;
    if (resendCount >= MAX_RESEND_ATTEMPTS) {
      return NextResponse.json(
        { 
          error: `Maximum resend limit (${MAX_RESEND_ATTEMPTS}) reached. Please contact support.`,
          maxLimitReached: true
        },
        { status: 429 }
      );
    }

    // Check cooldown period
    if (user.emailVerificationLastResent) {
      const lastResentTime = new Date(user.emailVerificationLastResent).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = (currentTime - lastResentTime) / 1000 / 60; // minutes

      if (timeDiff < RESEND_COOLDOWN_MINUTES) {
        const remainingTime = Math.ceil(RESEND_COOLDOWN_MINUTES - timeDiff);
        return NextResponse.json(
          { 
            error: `Please wait ${remainingTime} minute(s) before requesting another verification email.`,
            remainingTime,
            cooldown: true
          },
          { status: 429 }
        );
      }
    }

    // Generate new verification token
    const verificationToken = generateEmailVerificationToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token and increment resend count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
        emailVerificationResendCount: resendCount + 1,
        emailVerificationLastResent: new Date(),
      },
    });

    // Send verification email
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXTAUTH_URL || 
                    (host ? `${protocol}://${host}` : 'http://localhost:3000');
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    try {
      await sendVerificationEmail({
        email: user.email,
        fullName: user.username || 'User',
        verificationLink,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    const remainingAttempts = MAX_RESEND_ATTEMPTS - (resendCount + 1);

    return NextResponse.json(
      {
        success: true,
        message: "Verification email sent successfully. Please check your inbox.",
        remainingAttempts,
        maxAttempts: MAX_RESEND_ATTEMPTS,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
