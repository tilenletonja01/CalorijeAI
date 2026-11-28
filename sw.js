// Service worker: aplikacija deluje brez povezave.
// Strategija: najprej predpomnilnik, v ozadju se datoteke osvežijo (novo različico dobiš ob naslednjem zagonu).
const CACHE = 'kalorije-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/logic/numbers.js',
  './js/logic/nutrition.js',
  './js/logic/dates.js',
  './js/logic/settings.js',
  './js/ui/components.js',
  './js/ui/day.js',
  './js/ui/entrySheet.js',
  './js/ui/foodEditor.js',
  './js/ui/library.js',
  './js/ui/settings.js',
  './js/ui/placeholder.js',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate';
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(isPage ? './index.html' : req, { ignoreSearch: true });
    const network = fetch(req)
      .then((res) => {
        if (res.ok) cache.put(isPage ? './index.html' : req, res.clone());
        return res;
      })
      .catch(() => cached);
    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    return network;
  })());
});
