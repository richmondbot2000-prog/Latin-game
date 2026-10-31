// Dance Sisters service worker: the app shell is cached on install; the pictures under art/ are cached as they are fetched
// (cache first after that) and app.js fetches every one of them once (saveOffline), so the game plays with no connection. Bump CACHE together with APP_VERSION in app.js.
const CACHE = 'dance-v61';
const SHELL = ['./', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'dancers.json', 'art/font.json', 'art/font.png', 'art/font_w.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
// on activation, anything the new cache is missing (a shell file whose install fetch failed on a poor connection) is copied
// from the old cache before the old cache is deleted, so an update never leaves the game without its data offline
self.addEventListener('activate', e => { e.waitUntil((async () => {
  const ks = (await caches.keys()).filter(k => k.startsWith('dance-') && k !== CACHE); const c = await caches.open(CACHE);
  for (const k of ks) { const o = await caches.open(k); for (const req of await o.keys()) { if (/\/dance\/art\/(s\d\d_\d|bg_\w+)\.png$/.test(new URL(req.url).pathname) && !req.url.includes('?v=')) continue; if (!(await c.match(req))) { const r = await o.match(req); if (r) await c.put(req, r); } } await caches.delete(k); }
  await self.clients.claim();
})()); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/dance/art/')) {   // pictures: cache first, kept for ever
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request)));
});
