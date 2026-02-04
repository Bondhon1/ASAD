import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent, generateSimpleMeetLink } from "@/lib/googleCalendar";
import { decrypt } from "@/lib/encryption";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET - List all interview slots
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== "HR" && user.role !== "MASTER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const slots = await prisma.interviewSlot.findMany({
      orderBy: { startTime: "asc" },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}

// POST - Create new interview slot
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        username: true,
        googleRefreshToken: true,
      },
    });

    if (!user || (user.role !== "HR" && user.role !== "MASTER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { startTime, endTime, capacity, autoCreateMeet, meetLink: manualMeetLink } = await request.json();

    if (!startTime || !endTime || !capacity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    if (capacity < 1 || capacity > 50) {
      return NextResponse.json({ error: "Capacity must be between 1 and 50" }, { status: 400 });
    }

    let meetLink = "";
    let calendarEventId = "";

    // Try to create Google Calendar event with Meet link using HR's token
    if (autoCreateMeet) {
      // Check if HR has connected Google Calendar
      if (!user.googleRefreshToken) {
        return NextResponse.json(
          { error: "Please connect your Google Calendar first to auto-create Meet links" },
          { status: 400 }
        );
      }

      try {
        // Decrypt the HR's refresh token
        const refreshToken = decrypt(user.googleRefreshToken);

        const calendarEvent = await createCalendarEvent(refreshToken, {
          summary: "ASAD Volunteer Interview Session",
          description: `Interview session for ASAD volunteer applicants.\n\nCapacity: ${capacity} candidates\nOrganized by: ${user.fullName || user.username}`,
          startTime: start,
          endTime: end,
          attendees: [], // Attendees will be added when applications are approved
          hrEmail: user.email,
        });

        meetLink = calendarEvent.meetLink;
        calendarEventId = calendarEvent.eventId || "";
      } catch (calendarError: any) {
        console.error("Calendar API error:", calendarError);
        
        // Check if the error is due to invalid/expired refresh token
        const errorMessage = calendarError?.message || "";
        if (errorMessage.includes("invalid_grant") || errorMessage.includes("invalid_token")) {
          // Clear the expired token from the database
          await prisma.user.update({
            where: { id: user.id },
            data: {
              googleRefreshToken: null,
              calendarConnectedAt: null,
              calendarEmail: null,
            },
          });
          
          return NextResponse.json(
            { 
              error: "Your Google Calendar refresh token has expired. Please disconnect and reconnect your calendar.",
              code: "CALENDAR_TOKEN_EXPIRED"
            },
            { status: 401 }
          );
        }
        
        // For any other calendar error, don't create the slot
        return NextResponse.json(
          { 
            error: `Failed to create calendar event: ${errorMessage}. Please check your Google Calendar connection.`,
            code: "CALENDAR_ERROR"
          },
          { status: 500 }
        );
      }
    } else {
      // Manual Meet link mode - user must provide their own link
      meetLink = manualMeetLink || "";
      
      if (!meetLink) {
        return NextResponse.json(
          { error: "Please provide a Meet link or enable auto-create" },
          { status: 400 }
        );
      }
    }

    const slot = await prisma.interviewSlot.create({
      data: {
        startTime: start,
        endTime: end,
        capacity,
        meetLink,
        createdBy: user.id,
      },
    });

    return NextResponse.json({
      slot,
      message:
        autoCreateMeet && calendarEventId
          ? "Slot created with Google Calendar event"
          : "Slot created with generated Meet link",
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating slot:", error);
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 });
  }
}
