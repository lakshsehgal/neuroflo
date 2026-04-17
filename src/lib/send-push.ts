import { db } from "@/lib/db";
import { webpush } from "@/lib/push";

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string,
  tag?: string
): Promise<string[]> {
  const errors: string[] = [];

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    const msg = "VAPID keys not configured";
    console.warn(`[Push] ${msg}`);
    errors.push(msg);
    return errors;
  }

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    console.warn(`[Push] No subscriptions for user ${userId}`);
    return errors;
  }

  const payload = JSON.stringify({ title, body, url, tag });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  // Clean up expired subscriptions and collect errors
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const reason = result.reason as { statusCode?: number; message?: string; body?: string };
      if (reason?.statusCode === 410 || reason?.statusCode === 404) {
        await db.pushSubscription.delete({
          where: { id: subscriptions[i].id },
        }).catch(() => {});
        errors.push(`Subscription ${i + 1}: expired (${reason.statusCode}) — removed`);
      } else {
        const msg = `Subscription ${i + 1}: ${reason?.statusCode || "?"} ${reason?.message || reason?.body || "unknown error"}`;
        console.error("[Push]", msg);
        errors.push(msg);
      }
    }
  }

  return errors;
}
