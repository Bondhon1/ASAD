import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400 }
      );
    }

    // Verify the Google ID token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 401 }
      );
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

    const { email, name, email_verified } = payload;

    if (!email_verified) {
      return NextResponse.json(
        { error: "Email not verified with Google" },
        { status: 401 }
      );
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        initialPayment: true,
        volunteerProfile: true,
      },
    });

    let isNewUser = false;

    if (user) {
      // Existing user - check if banned
      if (user.status === "BANNED") {
        return NextResponse.json(
          { error: "Your account has been suspended" },
          { status: 403 }
        );
      }
    } else {
      // New Google user - create account (same logic as NextAuth)
      user = await prisma.user.create({
        data: {
          email,
          fullName: name || email.split("@")[0],
          username: email.split("@")[0],
          emailVerified: true,
          status: "APPLICANT",
          role: "VOLUNTEER",
        },
        include: {
          initialPayment: true,
          volunteerProfile: true,
        },
      });

      // Create volunteer profile
      if (!user.volunteerProfile) {
        await prisma.volunteerProfile.create({
          data: {
            userId: user.id,
            points: 0,
          },
        });
      }

      isNewUser = true;
    }

    // Return user data for client-side session creation
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName || user.username,
        role: user.role,
        status: user.status,
        needsPayment: !user.initialPayment,
        isNewUser,
      },
    });
  } catch (error) {
    console.error("Native Google auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
