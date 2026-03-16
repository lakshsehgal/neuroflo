"use client";

import { useEffect, useState } from "react";
import { subscribePush } from "@/actions/push-subscriptions";
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
  const [showPrompt, setShowPrompt] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window)) return;

    registerServiceWorker().then(async () => {
      // If permission not yet decided and user hasn't dismissed the prompt, show it
      if (Notification.permission === "default") {
        const dismissed = localStorage.getItem("push-prompt-dismissed");
        if (!dismissed) {
          // Show prompt after a short delay so it doesn't appear immediately on page load
          setTimeout(() => setShowPrompt(true), 3000);
        }
      }
    });
  }, []);

  async function handleEnable() {
    setEnabling(true);
    const success = await requestPushPermission();
    setEnabling(false);
    setShowPrompt(false);
    if (!success) {
      // Don't show again if they denied
      localStorage.setItem("push-prompt-dismissed", "1");
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem("push-prompt-dismissed", "1");
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg max-w-sm"
        >
          <BellRing className="h-5 w-5 text-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Enable notifications?</p>
            <p className="text-xs text-muted-foreground">
              Get notified about mentions, assignments, and updates.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleEnable}
              disabled={enabling}
            >
              {enabling ? "..." : "Enable"}
            </Button>
            <button
              onClick={handleDismiss}
              className="rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
