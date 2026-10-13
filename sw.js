// Offline support. Always tries the network first so updates appear straight
// away; falls back to the saved copy when there is no connection.
const CACHE = 'latin-v6';
const FILES = ['./', 'index.html', 'app.css', 'app.js', 'vocab.js', 'memory.js', 'phrases.js', 'effects.js', 'practice.js', 'sync.js',
  'manifest.webmanifest',
  ...['chomp1','chomp2','skitter1','skitter2','chompking','antbun1','antbun3','antbunskelly','kamikaze1','kamikaze2','ghost1','ghost2','flying1','flying2','moley','broodqueen1','broodqueen2','ghostking'].map(a => 'art/squishies/' + a + '.png'), 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
