// Service Worker for offline capability
const CACHE_NAME = 'wmc-trainer-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker v5 installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache v5');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch event - NETWORK FIRST for .js and .css, then cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for JS and CSS to always get latest code
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first for other resources
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker v5 activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Old caches deleted, v5 now active');
      // Force all clients to reload to get new code
      return self.clients.matchAll().then((clients) => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_UPDATED',
            version: 'v5'
          });
        });
      });
    })
  );
  self.clients.claim();
});
