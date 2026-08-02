// Baby Care service worker — precaches the app shell (HTML, three.js, music, icons) so the game is
// installable and playable offline. Bump CACHE_NAME on every deploy that changes any precached file;
// the old cache is dropped on activate.
const CACHE_NAME = 'babycare-v2';
const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'vendor/three.min.js',
  'music/game-vibes.mp3',
  'music/retro-arcade.mp3',
  'assets/favicon.ico',
  'assets/favicon-16.png',
  'assets/favicon-32.png',
  'assets/apple-touch-icon.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first for same-origin GETs — always serves the latest deploy when online (this is an
// actively-developed game, not a versioned/hashed asset pipeline, so "prefer cache" would mean a
// stale index.html keeps being served indefinitely even after a fresh deploy). Cache is updated on
// every successful fetch and used only as the offline fallback. Firebase/CDN traffic (cross-origin)
// always goes straight to the network, since that's live data, not a static asset.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp && resp.ok) caches.open(CACHE_NAME).then(cache => cache.put(e.request, resp.clone()));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
