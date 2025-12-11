import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface CalendarEvent {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  hrEmail: string;
}

/**
 * Create an OAuth2 client with a specific refresh token
 */
function createOAuth2Client(refreshToken: string): OAuth2Client {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Create a Google Calendar event with Meet link using HR's refresh token
 */
export async function createCalendarEvent(
  refreshToken: string,
  eventData: CalendarEvent
) {
  try {
    console.log("Creating calendar event...");
    console.log("Event start:", eventData.startTime);
    console.log("Event end:", eventData.endTime);
    
    // Create OAuth2 client with the HR's refresh token
    const oauth2Client = createOAuth2Client(refreshToken);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: eventData.summary,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: "Asia/Dhaka",
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: "Asia/Dhaka",
      },
      attendees: eventData.attendees.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 }, // 1 day before
          { method: "popup", minutes: 60 }, // 1 hour before
        ],
      },
    };

    console.log("Sending request to Google Calendar API...");
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: event,
      sendUpdates: "all", // Send email to all attendees
    });

    console.log("Calendar API response:", {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      hasConferenceData: !!response.data.conferenceData,
    });

    const meetLink = response.data.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video"
    )?.uri;

    console.log("Meet link extracted:", meetLink);

    return {
      eventId: response.data.id,
      meetLink: meetLink || "",
      htmlLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw new Error("Failed to create calendar event");
  }
}

/**
 * Update calendar event attendees
 */
export async function updateCalendarEventAttendees(
  refreshToken: string,
  eventId: string,
  newAttendees: string[]
) {
  try {
    const oauth2Client = createOAuth2Client(refreshToken);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = await calendar.events.get({
      calendarId: "primary",
      eventId: eventId,
    });

    const existingAttendees = event.data.attendees || [];
    const updatedAttendees = [
      ...existingAttendees,
      ...newAttendees.map((email) => ({ email })),
    ];

    await calendar.events.patch({
      calendarId: "primary",
      eventId: eventId,
      requestBody: {
        attendees: updatedAttendees,
      },
      sendUpdates: "all",
    });
  } catch (error) {
    console.error("Error updating calendar event:", error);
    throw new Error("Failed to update calendar event");
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  refreshToken: string,
  eventId: string
) {
  try {
    const oauth2Client = createOAuth2Client(refreshToken);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
      sendUpdates: "all",
    });
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    throw new Error("Failed to delete calendar event");
  }
}


/**
 * Generate a simple Meet link (fallback if Calendar API fails)
 */
export function generateSimpleMeetLink(): string {
  const randomId = Math.random().toString(36).substring(2, 12);
  return `https://meet.google.com/${randomId}`;
}
