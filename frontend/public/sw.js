// Kamla OTS Service Worker – handles native push notifications

const CACHE_NAME = 'kamla-ots-v1';

// Install event – activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event – claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the main app to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
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
  }
});

// Listen for Web Push events from the backend server
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'New Alert', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Notification';
  const options = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/android-chrome-192x192.png',
    badge: payload.badge || '/favicon-32x32.png',
    data: payload.data || {},
    vibrate: [200, 100, 200, 100, 200],
    sound: '/notification.mp3',
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click – focus the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
