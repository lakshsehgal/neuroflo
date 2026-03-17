import { OAuth2Client } from "google-auth-library";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function getOAuth2Client() {
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${APP_URL}/api/google-calendar/callback`
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ],
  });
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
  colorId?: string;
}

export async function getCalendarEvents(
  accessToken: string,
  refreshToken: string | null
) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Refresh token if needed
  const { token } = await oauth2Client.getAccessToken();

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 3);

  const params = new URLSearchParams({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: endDate.toISOString(),
    maxResults: "15",
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.status}`);
  }

  const data = await response.json();
  const items: GoogleCalendarEvent[] = data.items || [];

  return items.map((event) => ({
    id: event.id || "",
    title: event.summary || "Untitled",
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    allDay: !event.start?.dateTime,
    location: event.location || null,
    htmlLink: event.htmlLink || null,
    color: event.colorId || null,
  }));
}
