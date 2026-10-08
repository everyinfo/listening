const CACHE = 'listening-v1.0.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/app.js', './js/db.js', './js/id3.js', './js/lrc.js', './js/sentences.js', './js/lyrics-online.js', './js/icons.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async u => {
      const r = await fetch(new Request(u, { cache: 'reload' }));
      if (!r.ok) throw new Error(u + ' ' + r.status);
      await c.put(u, r);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('listening-')) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    let hit = await c.match(req, { ignoreSearch: true });
    if (!hit && req.mode === 'navigate') hit = await c.match('./index.html');
    if (hit) return hit;
    try { return await fetch(req); }
    catch (_) { return new Response('오프라인입니다', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
  })());
});
