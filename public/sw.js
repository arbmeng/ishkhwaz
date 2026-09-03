const CACHE_NAME = 'ishkhwaz-pwa-v9';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// PWA Push Notification Event Handler (Handles System Lockscreen Push & App Icon Badge)
self.addEventListener('push', (event) => {
  let data = { title: 'ئیش خواز - Ishkhwaz', body: 'نۆتیفیکەیشنی نوێ بۆ هاتووە!', url: '/' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'دەستکەوتنی کار لە کوردستان',
    icon: '/logo-v2.png',
    badge: '/logo-v2.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'بڕوانە 👀' }
    ]
  };

  // Set App Icon Badge counter on home screen (like Facebook / Telegram)
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1).catch(() => {});
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ئیش خواز', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Clear App Icon Badge on click
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Network-first: always try the live server first so deploys show up immediately.
// Cache is only a fallback for when the device is actually offline — never used to
// short-circuit a working connection (that was the bug: real changes went live but
// the app kept serving an old cached snapshot indefinitely).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(async () => {
        // A failed fetch (offline, DNS, CORS) with no cached fallback used
        // to resolve to `undefined` here, which crashes the browser with
        // "Failed to convert value to 'Response'" — respondWith() requires
        // an actual Response, so a genuine miss must produce one too.
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('', { status: 503, statusText: 'Offline' });
      })
  );
});
