'use strict';
const PREFIX = `animals-click:${self.registration.scope}:`;
const CACHE = `${PREFIX}v6`;
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './assets/icons/zveryata-v2-192.png', './assets/icons/zveryata-v2-512.png', './assets/icons/zveryata-v2-maskable-512.png',
  ...["02-kitten", "03-irish-setter", "04-rabbit", "05-calf", "06-goat", "07-lamb", "08-chick", "09-duckling", "10-hedgehog", "11-squirrel", "12-ferret", "13-fox", "14-raccoon", "15-fawn", "16-bear", "17-lynx", "18-chipmunk", "19-amur-leopard", "20-tiger", "21-lion", "22-elephant", "23-giraffe", "24-zebra", "25-camel", "26-capybara", "27-alpaca", "28-panda", "29-hippo", "30-rhino", "31-tit", "32-owl", "33-crow", "34-magpie", "35-pigeon", "36-flamingo", "37-hummingbird", "38-cuckoo", "39-peacock", "40-swan", "41-whale", "42-shark", "43-penguin", "44-seal", "45-dolphin", "46-octopus", "47-seahorse", "48-crab", "49-ray", "50-walrus", "51-jellyfish", "52-snake", "53-lizard", "54-butterfly", "55-bee", "56-snail", "57-lemur", "58-dragonfly", "59-ladybird"]
    .map(name => `./assets/images/${name}.webp`)
].map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Atomic addAll: activation only happens when EVERY image and app file is cached.
    // Bypass HTTP cache so an update cannot mix old app code with new photos.
    await cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
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
