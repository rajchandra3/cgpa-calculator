const CACHE_NAME = 'cgpa-calculator-v2';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/college/anna-university.html',
  '/college/ktu.html',
  '/college/srm.html',
  '/src/css/app.css',
  '/src/js/app.js',
  '/src/js/math.js',
  '/src/js/universities.js',
  '/src/js/analytics.js',
  '/manifest/vit.json',
  '/manifest/anna.json',
  '/manifest/ktu.json',
  '/manifest/srm.json',
  '/src/images/icons/favicon.png',
  '/src/images/icons/icon-256x256.png',
  '/src/images/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
