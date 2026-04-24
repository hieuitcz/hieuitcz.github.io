const CACHE_PREFIX = 'kid-pwa';
const STATIC_CACHE = `${CACHE_PREFIX}-static-v4`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-v4`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './hd.txt',
  './images/icon-192.png',
  './images/icon-512.png'
];
const APP_SHELL_URLS = APP_SHELL.map(path => new URL(path, self.registration.scope).toString());
const OFFLINE_FALLBACK_URL = new URL('./index.html', self.registration.scope).toString();
const ANIMALS_PATH = new URL('./animals.json', self.registration.scope).pathname;

function isCacheable(response) {
  return !!response && response.status === 200 && (response.type === 'basic' || response.type === 'default');
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (isCacheable(networkResponse)) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (isCacheable(networkResponse)) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(networkResponse => {
      if (isCacheable(networkResponse)) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cached || networkPromise || new Response('', { status: 504, statusText: 'Gateway Timeout' });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, STATIC_CACHE, OFFLINE_FALLBACK_URL));
    return;
  }

  if (requestUrl.pathname === ANIMALS_PATH) {
    // Du lieu danh sach: uu tien lay ban moi tu mang.
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
    return;
  }

  if (event.request.destination === 'image' || event.request.destination === 'audio') {
    // Media: cache-first de mo nhanh va dung duoc offline.
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
});
