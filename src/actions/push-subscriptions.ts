"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import type { ActionResponse } from "@/types";
import { sendPushNotification } from "@/lib/send-push";

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

export async function sendTestPushNotification(): Promise<
  ActionResponse<{ subscriptionCount: number; vapidConfigured: boolean; errors: string[] }>
> {
  const user = await requireAuth();

  const vapidConfigured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: user.id },
  });

  if (!vapidConfigured) {
    return {
      success: false,
      error: "VAPID keys are not configured on the server. Check Vercel env vars.",
      data: { subscriptionCount: subscriptions.length, vapidConfigured: false, errors: [] },
    };
  }

  if (subscriptions.length === 0) {
    return {
      success: false,
      error: "No push subscriptions found for your account. Click 'Enable' above, then try again.",
      data: { subscriptionCount: 0, vapidConfigured: true, errors: [] },
    };
  }

  const errors = await sendPushNotification(
    user.id,
    "NeuroFlo Test Notification",
    "If you can see this, push notifications are working!",
    "/dashboard",
    "test"
  );

  if (errors && errors.length > 0) {
    return {
      success: false,
      error: `Push failed for ${errors.length}/${subscriptions.length} subscription(s). See details below.`,
      data: { subscriptionCount: subscriptions.length, vapidConfigured: true, errors },
    };
  }

  return {
    success: true,
    data: { subscriptionCount: subscriptions.length, vapidConfigured: true, errors: [] },
  };
}
