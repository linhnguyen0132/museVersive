const CACHE_NAME = 'musee-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/components/museum.js',
  '/js/components/interaction.js',
  '/js/components/worlds.js',
  // Ajoute tes assets ici :
  '/assets/textures/parquet.jpg',
  '/assets/paintings/van_gogh.jpg',
  '/assets/panoramas/van_gogh_360.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});