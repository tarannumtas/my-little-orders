// Haul PWA Service Worker
// Caches all assets for offline use

const CACHE_NAME = 'haul-v1';
const ASSETS = [
  '/my-little-orders/',
  '/my-little-orders/index.html',
  '/my-little-orders/manifest.json',
  '/my-little-orders/icons/icon-192.png',
  '/my-little-orders/icons/icon-512.png',
];

// Install — cache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Haul SW] Caching core assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // For Google Fonts — network first, cache fallback
  if (e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(e.request)
          .then(response => { cache.put(e.request, response.clone()); return response; })
          .catch(() => caches.match(e.request))
      )
    );
    return;
  }

  // For everything else — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // If both cache and network fail, return the main page (for navigation)
        if (e.request.mode === 'navigate') {
          return caches.match('/my-little-orders/index.html');
        }
      });
    })
  );
});
