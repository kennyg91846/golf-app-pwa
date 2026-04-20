const CACHE_NAME = 'offline-golf-scorer-v5';
const APP_SHELL = [
  './',
  './index.html',
  './Golf_App.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

function isCacheableResponse(response) {
  return response && (
    response.status === 200 ||
    response.type === 'cors' ||
    response.type === 'opaque'
  );
}

async function cacheResponse(request, response) {
  if (!isCacheableResponse(response)) return response;
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isPageRequest = request.mode === 'navigate' || request.destination === 'document';

  if (isPageRequest) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => cacheResponse(request, response))
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('./index.html') || caches.match('./Golf_App.html');
        })
    );
    return;
  }

  event.respondWith(
    fetch(request, isSameOrigin ? { cache: 'no-cache' } : undefined)
      .then((response) => cacheResponse(request, response))
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.destination === 'document') {
          return caches.match('./index.html') || caches.match('./Golf_App.html');
        }
        return undefined;
      })
  );
});
