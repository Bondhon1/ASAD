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

    const { startTime, endTime, capacity, autoCreateMeet } = await request.json();

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
      } catch (calendarError) {
        console.error("Calendar API error:", calendarError);
        // Graceful fallback to generated Meet link so slot creation still works
        meetLink = generateSimpleMeetLink();
      }
    } else {
      // Use simple meet link generation
      meetLink = generateSimpleMeetLink();
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
