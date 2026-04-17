// Service Worker for Push Notifications
const SW_VERSION = "v4-2026-04-17";

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

  let data = { title: "Notification", body: "You have a new notification", url: "/", tag: "default" };
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

  // Branded headline: always show "Neuroid OS" as the notification title.
  // The original event title is folded into the body so context isn't lost.
  const composedBody = data.title && data.title !== "Neuroid OS"
    ? `${data.title} — ${data.body}`
    : data.body;

  const options = {
    body: composedBody,
    icon: "/neuroid-icon-192.png",
    badge: "/neuroid-icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "neuroid-notification",
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration
      .showNotification("Neuroid OS", options)
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
