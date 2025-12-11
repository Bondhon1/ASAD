import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { encrypt } from "@/lib/encryption";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/hr/connect-calendar/callback`
);

// GET - Get OAuth URL to initiate connection
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== "HR" && user.role !== "MASTER")) {
      return NextResponse.json(
        { error: "Only HR and MASTER can connect Google Calendar" },
        { status: 403 }
      );
    }

    // Generate OAuth URL with calendar scopes
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Force to get refresh token
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error generating OAuth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}

// POST - Exchange code for refresh token and save
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: "No refresh token received. Please try again." },
        { status: 400 }
      );
    }

    // Get the Google account email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email;

    // Encrypt the refresh token
    const encryptedToken = encrypt(tokens.refresh_token);

    // Save to database
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        googleRefreshToken: encryptedToken,
        calendarConnectedAt: new Date(),
        calendarEmail: googleEmail || null,
      },
    });

    return NextResponse.json({
      success: true,
      email: googleEmail,
      message: "Google Calendar connected successfully",
    });
  } catch (error) {
    console.error("Error connecting Google Calendar:", error);
    return NextResponse.json(
      { error: "Failed to connect Google Calendar" },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect calendar
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        googleRefreshToken: null,
        calendarConnectedAt: null,
        calendarEmail: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Google Calendar disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Google Calendar" },
      { status: 500 }
    );
  }
}
