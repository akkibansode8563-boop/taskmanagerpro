const CACHE_NAME = 'taskmaster-pro-v3';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/tasks',
  '/meetings',
  '/calendar',
  '/terms',
  '/privacy',
  '/favicon.ico',
  '/dcc-logo-back.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass non-http schemes, APIs, and Supabase connections
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin.includes('supabase.co')) return;
  if (url.pathname.includes('/api/')) return;

  // Network-First strategy for pages/navigation
  const isPage = event.request.mode === 'navigate';
  if (isPage) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Default fallback if route is not cached
            return caches.match('/dashboard');
          });
        })
    );
    return;
  }

  // Cache-First strategy for static assets (JS, CSS, images, webmanifest, fonts)
  const isStatic =
    url.pathname.includes('/_next/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.includes('/fonts/');

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response;
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Default: Try network first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification received from Web Push / VAPID server
self.addEventListener('push', (event) => {
  let data = { title: 'Task Reminder', body: 'You have a pending task reminder.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const title = data.title || 'TaskMaster Pro';
  const targetUrl = data.url || (data.taskId ? `/tasks?highlight=${data.taskId}` : '/tasks');
  const tag = data.tag || (data.taskId ? `task-${data.taskId}` : 'taskmaster-push');

  const options = {
    body: data.body || '',
    icon: data.icon || '/dcc-logo-back.png',
    badge: '/favicon.ico',
    tag,
    data: {
      url: targetUrl,
      taskId: data.taskId,
    },
    requireInteraction: data.urgency === 'HIGH',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler: focuses or opens window to /tasks?highlight=<id>
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/tasks';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});
