import { db } from "@/lib/db";
import { webpush } from "@/lib/push";

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string,
  tag?: string
) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return; // Push not configured
  }

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

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

  // Clean up expired subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (
      result.status === "rejected" &&
      result.reason?.statusCode === 410
    ) {
      await db.pushSubscription.delete({
        where: { id: subscriptions[i].id },
      }).catch(() => {});
    }
  }
}
