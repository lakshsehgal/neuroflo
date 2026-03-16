"use client";

import { useEffect } from "react";
import { subscribePush } from "@/actions/push-subscriptions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    registerServiceWorker();
  }, []);

  return null;
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    // If already subscribed, sync with server
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      const key = existing.getKey("p256dh");
      const auth = existing.getKey("auth");
      if (key && auth) {
        await subscribePush(
          existing.endpoint,
          btoa(String.fromCharCode(...new Uint8Array(key))),
          btoa(String.fromCharCode(...new Uint8Array(auth)))
        );
      }
    }
  } catch {
    // Service worker registration failed silently
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");
    if (!key || !auth) return false;

    await subscribePush(
      subscription.endpoint,
      btoa(String.fromCharCode(...new Uint8Array(key))),
      btoa(String.fromCharCode(...new Uint8Array(auth)))
    );

    return true;
  } catch {
    return false;
  }
}
