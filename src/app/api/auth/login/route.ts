import { NextRequest, NextResponse } from "next/server";
import { comparePassword } from "@/lib/auth";
import { LogInSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = LogInSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Invalid input";
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        initialPayment: true,
        application: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email before logging in",
          requiresEmailVerification: true,
        },
        { status: 403 }
      );
    }

    // Check if password is correct
    if (!user.password || !(await comparePassword(password, user.password))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user is banned
    if (user.status === "BANNED") {
      return NextResponse.json(
        { error: "Your account has been suspended" },
        { status: 403 }
      );
    }

    // Check if initial payment exists
    if (!user.initialPayment) {
      return NextResponse.json(
        {
          error: "Please complete your payment to continue",
          requiresPayment: true,
          redirectTo: "/payment",
        },
        { status: 403 }
      );
    }

    // Check if initial payment is verified
    if (user.initialPayment.status === "PENDING") {
      return NextResponse.json(
        {
          error: "Your payment is pending verification. Please wait or contact support.",
          paymentPending: true,
        },
        { status: 403 }
      );
    }

    if (user.initialPayment.status === "REJECTED") {
      return NextResponse.json(
        {
          error: "Your payment was rejected. Please submit a new payment.",
          requiresPayment: true,
          redirectTo: "/payment",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        userId: user.id,
        email: user.email,
        status: user.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
