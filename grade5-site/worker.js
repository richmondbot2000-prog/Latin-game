// grade5.musicalmagic.uk: the address of the music games. They live in this repository at
// latin.musicalmagic.uk/music/ (Learn the notes, on the Latin engine) and /grade5/ (the theory questions),
// so every visit is sent there. /sw.js answers with a worker that removes itself: the first version of the
// theory game ran on this host and its offline worker would otherwise linger on phones.
// Deploy from this folder: npx wrangler deploy
const SITE = 'https://latin.musicalmagic.uk';
const KILL = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));`;
export default {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === '/sw.js') return new Response(KILL, { headers: { 'content-type': 'application/javascript', 'cache-control': 'no-cache' } });
    const to = u.pathname.startsWith('/grade5/') || u.pathname.startsWith('/music/') ? u.pathname : '/music/';
    return Response.redirect(SITE + to + u.search + u.hash, 302);
  },
};
