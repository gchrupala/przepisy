// Offline support. App files are served from the cache at once.
//
// Bump VERSION with every change to the app files. The browser then installs
// this worker again with the new files, and the page reloads into them
// (see the controllerchange handler in js/app.js).
const VERSION = 'v9';
const PREFIX = 'przepisy-app-';
const APP_CACHE = `${PREFIX}${VERSION}`;
const APP_FILES = [
  './',
  'index.html',
  'styles.css',
  'js/app.js',
  'js/store.js',
  'js/sync.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      // 'reload' skips the HTTP cache, which could still hold the old files.
      .then((cache) => cache.addAll(APP_FILES.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// Other apps on the same site (gchrupala.github.io) share the cache
// storage, so only old caches of this app go.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Pages opened with parameters (?url=… from sharing) are all the same page:
// they are served and stored as './', so the cache does not grow per link.
async function staleWhileRevalidate(request, key) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(key, { ignoreSearch: true });
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(key, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  return (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const key = request.mode === 'navigate' ? new URL('./', self.registration.scope).href : request;
  event.respondWith(staleWhileRevalidate(request, key));
});
