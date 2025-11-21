const CACHE_NAME = 'pet-fresh-food-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 逐个添加资源，失败的不影响其他的
      return Promise.allSettled(ASSETS.map(url => {
        return cache.add(url).catch(err => {
          console.warn('缓存失败:', url, err);
          return null;
        });
      }));
    }).then(() => {
      // 安装后立即激活
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => {
      // 激活后立即控制所有客户端
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
