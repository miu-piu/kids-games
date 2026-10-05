'use strict';
(() => {
  const slides = [
  [
    "02-kitten",
    "Kitten"
  ],
  [
    "03-irish-setter",
    "Irish red setter puppy"
  ],
  [
    "04-rabbit",
    "Rabbit"
  ],
  [
    "05-calf",
    "Calf"
  ],
  [
    "06-goat",
    "Young goat"
  ],
  [
    "07-lamb",
    "Lamb"
  ],
  [
    "08-chick",
    "Chick"
  ],
  [
    "09-duckling",
    "Duckling"
  ],
  [
    "10-hedgehog",
    "Hedgehog"
  ],
  [
    "11-squirrel",
    "Red squirrel"
  ],
  [
    "12-ferret",
    "Ferret"
  ],
  [
    "13-fox",
    "Fox cub"
  ],
  [
    "14-raccoon",
    "Raccoon kit"
  ],
  [
    "15-fawn",
    "Fawn"
  ],
  [
    "16-bear",
    "Bear cub"
  ],
  [
    "17-lynx",
    "Lynx kitten"
  ],
  [
    "18-chipmunk",
    "Chipmunk"
  ],
  [
    "19-amur-leopard",
    "Amur leopard cub"
  ],
  [
    "20-tiger",
    "Tiger cub"
  ],
  [
    "21-lion",
    "Lion cub"
  ],
  [
    "22-elephant",
    "Elephant calf"
  ],
  [
    "23-giraffe",
    "Giraffe calf"
  ],
  [
    "24-zebra",
    "Zebra foal"
  ],
  [
    "25-camel",
    "Camel calf"
  ],
  [
    "26-capybara",
    "Capybara pup"
  ],
  [
    "27-alpaca",
    "Alpaca cria"
  ],
  [
    "28-panda",
    "Panda cub"
  ],
  [
    "29-hippo",
    "Hippopotamus calf"
  ],
  [
    "30-rhino",
    "Rhinoceros calf"
  ],
  [
    "31-tit",
    "Great tit"
  ],
  [
    "32-owl",
    "Owlet"
  ],
  [
    "33-crow",
    "Crow"
  ],
  [
    "34-magpie",
    "Magpie"
  ],
  [
    "35-pigeon",
    "Pigeon"
  ],
  [
    "36-flamingo",
    "Flamingo"
  ],
  [
    "37-hummingbird",
    "Hummingbird"
  ],
  [
    "38-cuckoo",
    "Cuckoo chick"
  ],
  [
    "39-peacock",
    "Peacock"
  ],
  [
    "40-swan",
    "Adult white swan"
  ],
  [
    "41-whale",
    "Whale calf"
  ],
  [
    "42-shark",
    "Shark pup"
  ],
  [
    "43-penguin",
    "Penguin chick"
  ],
  [
    "44-seal",
    "Seal pup"
  ],
  [
    "45-dolphin",
    "Dolphin calf"
  ],
  [
    "46-octopus",
    "Small octopus"
  ],
  [
    "47-seahorse",
    "Seahorse"
  ],
  [
    "48-crab",
    "Crab"
  ],
  [
    "49-ray",
    "Young stingray"
  ],
  [
    "50-walrus",
    "Walrus calf"
  ],
  [
    "51-jellyfish",
    "Jellyfish"
  ],
  [
    "52-snake",
    "Snake"
  ],
  [
    "53-lizard",
    "Lizard"
  ],
  [
    "54-butterfly",
    "Butterfly"
  ],
  [
    "55-bee",
    "Bee"
  ],
  [
    "56-snail",
    "Snail"
  ],
  [
    "57-lemur",
    "Lemur infant"
  ],
  [
    "58-dragonfly",
    "Dragonfly"
  ],
  [
    "59-ladybird",
    "Ladybird"
  ]
].map(([name, alt]) => ({ src: `./assets/images/${name}.webp`, alt, position: '50% 50%' }));
  const gallery = document.getElementById('gallery');
  const image = document.getElementById('animal');
  const syncBackground = () => gallery.style.setProperty('--photo', `url("${slides[index].src}")`);
  const AUTO_MS = 30_000;
  const COOLDOWN_MS = 350;
  const loaded = new Map();
  let index = 0;
  let timer;
  let changing = false;
  let lastChange = -Infinity;
  let gesture = null;
  const pointers = new Set();
  const wrap = value => (value + slides.length) % slides.length;

  function preload(i) {
    const src = slides[wrap(i)].src;
    if (!loaded.has(src)) {
      const next = new Image();
      next.src = src;
      const ready = next.decode().then(() => next).catch(error => {
        loaded.delete(src); // Allow retry after a transient first-load failure.
        throw error;
      });
      loaded.set(src, ready);
    }
    return loaded.get(src);
  }
  function warmNeighbours() {
    // Retain only current/adjacent decoded images, never the entire gallery.
    const nearby = new Set([index, wrap(index + 1), wrap(index - 1)].map(i => slides[i].src));
    for (const src of loaded.keys()) if (!nearby.has(src)) loaded.delete(src);
    preload(index + 1).catch(() => {});
    preload(index - 1).catch(() => {});
  }
  function restartTimer() {
    clearTimeout(timer);
    if (!document.hidden) timer = setTimeout(() => change(1), AUTO_MS);
  }
  async function change(direction) {
    if (changing || document.hidden) return;
    changing = true;
    clearTimeout(timer);
    const target = wrap(index + direction);
    try {
      await preload(target);
      if (document.hidden) return;
      index = target;
      image.src = slides[index].src;
      image.alt = slides[index].alt;
      image.style.objectPosition = slides[index].position;
      syncBackground();
      lastChange = performance.now();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        image.getAnimations().forEach(animation => animation.cancel());
        image.animate([{ opacity: 0.85 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
      }
      warmNeighbours();
    } catch (error) {
      console.warn('Animal image unavailable; retaining the current photograph.', error);
    } finally {
      changing = false;
      restartTimer();
    }
  }

  gallery.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.add(event.pointerId);
    gallery.setPointerCapture(event.pointerId);
    if (pointers.size !== 1) { gesture = null; return; }
    if (changing || performance.now() - lastChange < COOLDOWN_MS) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), invalid: false };
  });
  gallery.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - gesture.x);
    const dy = Math.abs(event.clientY - gesture.y);
    // A gesture that starts vertically cannot later become a swipe.
    if (dy > 35 && dy > dx * 1.2) gesture.invalid = true;
  });
  gallery.addEventListener('pointerup', event => {
    const start = gesture;
    gesture = null;
    const wasSingle = pointers.size === 1;
    pointers.delete(event.pointerId);
    if (!start || start.id !== event.pointerId || start.invalid || !wasSingle) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = performance.now() - start.time;
    const threshold = Math.max(70, Math.min(120, gallery.clientWidth * 0.18));
    if (elapsed < 90 || elapsed > 900 || Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    if (performance.now() - lastChange < COOLDOWN_MS || changing) return;
    change(dx < 0 ? 1 : -1);
  });
  const cancelPointer = event => {
    pointers.delete(event.pointerId);
    if (gesture?.id === event.pointerId) gesture = null;
  };
  gallery.addEventListener('pointercancel', cancelPointer);
  gallery.addEventListener('lostpointercapture', cancelPointer);
  for (const name of ['contextmenu', 'dragstart', 'selectstart', 'dblclick', 'wheel', 'gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(name, event => event.preventDefault(), { passive: false });
  }
  document.addEventListener('touchmove', event => event.preventDefault(), { passive: false });
  // Taps have no handler and do not affect the timer.
  document.addEventListener('visibilitychange', () => {
    gesture = null;
    pointers.clear();
    clearTimeout(timer);
    if (!document.hidden) { warmNeighbours(); restartTimer(); }
  });
  window.addEventListener('pagehide', () => { clearTimeout(timer); gesture = null; pointers.clear(); });
  window.addEventListener('pageshow', restartTimer);
  syncBackground();
  warmNeighbours();
  restartTimer();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .catch(error => console.warn('Offline installation failed.', error));
  }
})();
