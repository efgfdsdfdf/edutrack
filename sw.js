const CACHE_NAME = 'ace-pwa-v2';
const URLS_TO_CACHE = [
  '/',
  '/login.html',
  '/ddownload/download.html',
  '/manifest.json',
  '/icons/ace-192.png',
  '/icons/ace-512.png',
  '/assets/css/notifications.css',
  '/assets/js/supabase-config.js',
  // Add other static assets as needed
];
// Duplicate URLS_TO_CACHE removed

self.addEventListener('install', event => {
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
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
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
