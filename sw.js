const CACHE_NAME = 'ace-pwa-v39-phase5';
const URLS_TO_CACHE = [
  '/',
  '/login.html',
  '/install-complete.html',
  '/homepage.html',
  '/ai2.html',
  '/profile.html',
  '/study-groups.html',
  '/calculator.html',
  '/notes.html',
  '/timetable.html',
  '/gpa.html',
  '/panel2.html',
  '/offline.html',
  '/ddownload/download.html',
  '/manifest.json',
  '/icons/ace-192.png',
  '/icons/ace-512.png',
  '/assets/css/auth.css',
  '/assets/css/homepage.css',
  '/assets/css/navigation.css',
  '/assets/js/supabase-config.js',
  '/assets/js/auth-manager.js',
  '/assets/js/pwa-install.js',
  '/assets/js/navigation.js',
  '/assets/js/utils.js',
  '/assets/js/settings-manager.js',
  '/assets/js/notifications.js',
  '/assets/js/swipe-handler.js'
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

self.addEventListener('periodicsync', event => {
  if (event.tag === 'timetable-reminder') {
    event.waitUntil(handleBackgroundReminder());
  }
});

async function handleBackgroundReminder() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/__timetable-alarm-state.json');
    if (!response) return;
    const state = await response.json();
    const timetable = Array.isArray(state?.timetable) ? state.timetable : [];
    if (!timetable.length) return;

    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    const dueItems = timetable.filter(item => {
      if (!item.day || item.day !== currentDay) return false;
      const rawTime = item.time || item.startTime || item.start_time || '';
      if (!rawTime) return false;
      let [timeStr, modifier] = rawTime.split(' ');
      let [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return false;
      if (modifier) {
        if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      const classTimeInMinutes = hours * 60 + minutes;
      return Math.abs(classTimeInMinutes - currentTimeInMinutes) <= 1;
    });

    if (!dueItems.length) return;

    const item = dueItems[0];
    const title = 'Class Starting Now!';
    const body = `${item.courseCode || item.course || 'Class'} at ${item.location || item.room || 'TBA'}`;

    await self.registration.showNotification(title, {
      body,
      icon: '/icons/ace-192.png',
      badge: '/icons/ace-192.png',
      tag: `timetable-alarm-${item.courseCode || item.course || 'class'}`,
      requireInteraction: true,
      data: { url: '/timetable.html' }
    });
  } catch (e) {
    console.warn('[SW] Background reminder check failed:', e);
  }
}

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
