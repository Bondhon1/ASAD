import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the latest application for this user that is scheduled for interview
    const application = await prisma.application.findFirst({
      where: {
        status: "INTERVIEW_SCHEDULED",
        user: { email },
      },
      include: {
        interviewSlot: true,
      },
      orderBy: { appliedAt: "desc" },
    });

    if (!application) {
      return NextResponse.json(
        { interview: null }, 
        { 
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=120'
          }
        }
      );
    }

    const slot = application.interviewSlot;

    return NextResponse.json(
      {
        interview: slot
          ? {
              slotId: slot.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              meetLink: slot.meetLink,
            }
          : null,
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (error) {
    console.error("Error fetching user interview:", error);
    return NextResponse.json({ error: "Failed to fetch interview" }, { status: 500 });
  }
}
