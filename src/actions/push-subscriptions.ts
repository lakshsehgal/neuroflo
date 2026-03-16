"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import type { ActionResponse } from "@/types";

export async function subscribePush(
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth },
    update: { p256dh, auth, userId: user.id },
  });

  return { success: true };
}

export async function unsubscribePush(endpoint: string): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });

  return { success: true };
}
