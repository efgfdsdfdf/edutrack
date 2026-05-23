const CACHE_NAME = 'ace-pwa-v4-install-user-details';
const URLS_TO_CACHE = [
  '/',
  '/login.html',
  '/homepage.html',
  '/profile.html',
  '/ddownload/download.html',
  '/manifest.json',
  '/ace-companion-icon.png',
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
