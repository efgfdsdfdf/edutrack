const CACHE_NAME = 'ace-pwa-v14-math-history-scientific';
const URLS_TO_CACHE = [
  '/',
  '/login.html',
  '/install-complete.html',
  '/homepage.html',
  '/profile.html',
  '/calculator.html',
  '/notes.html',
  '/timetable.html',
  '/gpa.html',
  '/ddownload/download.html',
  '/manifest.json',
  '/icons/ace-192.png',
  '/icons/ace-512.png',
  '/assets/css/notifications.css',
  '/assets/js/supabase-config.js',
  '/assets/js/auth-manager.js',
  '/assets/js/pwa-install.js',
  // Add other static assets as needed
];
// Duplicate URLS_TO_CACHE removed

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/timetable.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const shouldPreferNetwork =
    event.request.mode === 'navigate' ||
    requestUrl.pathname.endsWith('.html') ||
    requestUrl.pathname.endsWith('.js');

  if (shouldPreferNetwork) {
    event.respondWith(
      fetch(event.request).then(fetchResponse => {
        const clone = fetchResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return fetchResponse;
      }).catch(() => caches.match(event.request).then(response => response || caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        const clone = fetchResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return fetchResponse;
      }).catch(() => caches.match('/offline.html'));
    })
  );
});
