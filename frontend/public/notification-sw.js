// Native notification bridge imported by the generated PWA service worker.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;

  const { title, body, icon, tag, data, renotify } = event.data;
  self.registration.showNotification(title, {
    body: body || '',
    icon: icon || '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: tag || 'kamla-notification',
    renotify: Boolean(renotify),
    vibrate: [200, 100, 200],
    data: data || {},
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
