// sw.js — lets Door Tech Simulator run offline once it has been opened.
// On first visit it saves every game file on the phone. After that it plays from the
// saved copy instantly and quietly checks for a newer version in the background.
// Bump VERSION whenever the game is republished so phones pick up the new files.

const VERSION = 'dts-v1.1-gh1';

const FILES = [
  './',
  'index.html',
  'sandbox.html',
  'style.css',
  'manifest.webmanifest',
  'icons-icon-192.png',
  'icons-icon-512.png',
  'icons-icon-maskable-512.png',
  'icons-apple-touch-icon.png',
  'icons-favicon.png',
  'vendor-three.module.js',
  'src-audio.js', 'src-camera.js', 'src-career.js', 'src-clues.js', 'src-components.js',
  'src-diagnosis.js', 'src-door.js', 'src-drive.js', 'src-faults.js', 'src-input.js',
  'src-inspection.js', 'src-jobs.js', 'src-main.js', 'src-params.js', 'src-repair.js',
  'src-safety.js', 'src-sandbox.js', 'src-scene.js', 'src-sceneKit.js', 'src-selection.js',
  'src-testing.js', 'src-textures.js', 'src-tools.js', 'src-truck.js', 'src-truckScene.js',
  'src-tutorial.js', 'src-vehicleKit.js', 'src-vehicles.js', 'src-vehicles2.js',
  'src-sites-autoshop.js', 'src-sites-coffee.js', 'src-sites-dock.js', 'src-sites-dockman.js',
  'src-sites-drafts.js', 'src-sites-firestation.js', 'src-sites-hospital.js', 'src-sites-hotel.js',
  'src-sites-index.js', 'src-sites-school.js',
  'art-ada-plate.png', 'art-closer-body.png', 'art-control-box.png', 'art-strike.png', 'art-toolbag.png',
  'art-drive-truck_lv1.png', 'art-drive-truck_lv4.png', 'art-drive-truck_lv7.png', 'art-drive-truck_lv10.png',
  'art-tools-allenKeys.png', 'art-tools-level.png', 'art-tools-lubricant.png',
  'art-tools-multimeter.png', 'art-tools-screwdriver.png', 'art-tools-wrench.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Save files one by one so a single missing file can't stop the rest.
    await Promise.all(FILES.map((f) => cache.add(new Request(f, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('dts-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameSite = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameSite && !fonts) return;

  // Online: always get the newest file (and keep a copy). Offline: use the saved copy.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      if (res) return res;
    } catch (e) { /* offline */ }

    const cached = await cache.match(req, { ignoreSearch: sameSite });
    if (cached) return cached;
    // Offline and never saved: fall back to the game page for navigations.
    if (req.mode === 'navigate') {
      const page = (await cache.match('index.html')) || (await cache.match('./'));
      if (page) return page;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
