const CACHE_NAME = 'pet-fresh-food-cache-v1';
const ASSETS = [
  '/',
  '/pet-fresh-food-web/',
  '/pet-fresh-food-web/index.html',
  '/pet-fresh-food-web/styles.css',
  '/pet-fresh-food-web/app.js',
  '/pet-fresh-food-web/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
