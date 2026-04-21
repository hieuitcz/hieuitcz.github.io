const CACHE_NAME = 'kid-pwa-cache-v3';
const APP_SHELL = [
  './',
  './index.html',
  './animals.json',
  './manifest.json',
  './hd.txt',
  './images/icon-192.png',
  './images/icon-512.png'
];
const APP_SHELL_URLS = APP_SHELL.map(path => new URL(path, self.registration.scope).toString());
const OFFLINE_FALLBACK_URL = new URL('./index.html', self.registration.scope).toString();

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;

        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
            return networkResponse;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_FALLBACK_URL);
            }
            return new Response('', { status: 504, statusText: 'Gateway Timeout' });
          });
      })
  );
});
