// Service Worker for Push Notifications
// Version 2 — bump on every change to force refresh
const SW_VERSION = "v2-2026-04-17";

// Activate this SW immediately, don't wait for tabs to close
self.addEventListener("install", (event) => {
  console.log("[SW]", SW_VERSION, "installing");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW]", SW_VERSION, "activated");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("[SW] push event received", event);

  let data = { title: "NeuroFlo", body: "You have a new notification", url: "/", tag: "default" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (err) {
      console.error("[SW] failed to parse push payload", err);
      try {
        data.body = event.data.text();
      } catch {
        // ignore
      }
    }
  }

  const options = {
    body: data.body,
    icon: "/neuroid-icon.svg",
    badge: "/neuroid-icon.svg",
    data: { url: data.url || "/" },
    tag: data.tag || "neuroid-notification",
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration
      .showNotification(data.title || "NeuroFlo", options)
      .then(() => console.log("[SW] notification shown"))
      .catch((err) => console.error("[SW] showNotification failed", err))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
