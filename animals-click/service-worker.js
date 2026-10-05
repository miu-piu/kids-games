'use strict';
const PREFIX = `animals-click:${self.registration.scope}:`;
const CACHE = `${PREFIX}v2`;
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/maskable-512.png',
  ...['02-kitten', '03-corgi', '04-rabbit', '05-calf', '06-goat', '07-lamb', '08-chick', '09-duckling', '10-hedgehog']
    .map(name => `./assets/images/${name}.webp`)
].map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Atomic addAll: activation only happens when EVERY image and app file is cached.
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    if (event.request.mode === 'navigate') return cache.match(new URL('./index.html', self.registration.scope).href);
    return fetch(event.request);
  })());
});
