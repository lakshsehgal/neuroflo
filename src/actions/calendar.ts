"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { getCalendarEvents } from "@/lib/google-calendar";
import type { ActionResponse } from "@/types";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
  color: string | null;
}

export async function getMyCalendarEvents(): Promise<
  ActionResponse<{ events: CalendarEvent[] }>
> {
  const user = await requireAuth();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      googleCalendarConnected: true,
      googleAccessToken: true,
      googleRefreshToken: true,
    },
  });

  if (!dbUser?.googleCalendarConnected || !dbUser.googleAccessToken) {
    return { success: false, error: "Calendar not connected" };
  }

  try {
    const events = await getCalendarEvents(
      dbUser.googleAccessToken,
      dbUser.googleRefreshToken
    );
    return { success: true, data: { events } };
  } catch {
    // Token might be expired, mark as disconnected
    await db.user.update({
      where: { id: user.id },
      data: { googleCalendarConnected: false, googleAccessToken: null },
    });
    return { success: false, error: "Calendar session expired. Please reconnect." };
  }
}

export async function disconnectCalendar(): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.user.update({
    where: { id: user.id },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleCalendarConnected: false,
    },
  });

  return { success: true };
}

export async function isCalendarConnected(): Promise<boolean> {
  const user = await requireAuth();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { googleCalendarConnected: true },
  });

  return dbUser?.googleCalendarConnected ?? false;
}
