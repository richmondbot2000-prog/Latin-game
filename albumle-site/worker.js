// albumle.musicalmagic.uk: Albumle's own address. The game's files live in this repository at
// latin.musicalmagic.uk/albumle/ (GitHub Pages allows one custom domain per site), so this worker serves them
// from here: GET /x → the same file from /albumle/x, cached a little at the edge. It also answers
// GET /api/cover?title=…&artist=… with the album's cover art, looked up in Deezer's public search (Apple's iTunes Search as a fallback — it rate-limits Workers)
// at the moment the answer is revealed (nothing is stored in the repository — covers are copyrighted),
// cached for 30 days and sent with a CORS header so the latin.musicalmagic.uk copy of the game can use it too.
const SITE = 'https://latin.musicalmagic.uk/albumle';
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\b(the|deluxe|edition|remaster(ed)?|version|expanded|anniversary|bonus|track|tracks|explicit)\b/g, ' ').replace(/\s+/g, ' ').trim();
async function cover(u) {
  const title = u.searchParams.get('title') || '', artist = u.searchParams.get('artist') || '';
  const ft = fold(title), fa = fold(artist);
  const score = (name, who) => { const n = fold(name), a = fold(who); return (n === ft ? 4 : n.startsWith(ft) || ft.startsWith(n) ? 2 : n.includes(ft) || ft.includes(n) ? 1 : 0) + (a === fa ? 3 : a.includes(fa) || fa.includes(a) ? 1 : 0) + (/live|karaoke|tribute|cover/.test(n) && !/live|karaoke|tribute|cover/.test(ft) ? -3 : 0); };
  const pick = list => { const best = list.map(x => [score(x.name, x.who), x]).filter(p => p[0] >= 3).sort((p, q) => q[0] - p[0])[0]; return best ? best[1] : null; };
  // Deezer first (no key, answers Workers), then Apple's iTunes Search as a fallback (it rate-limits shared addresses)
  try {
    const q = encodeURIComponent(`artist:"${artist}" album:"${title}"`);
    let r = await fetch(`https://api.deezer.com/search/album?q=${q}&limit=10`, { cf: { cacheTtl: 86400 } });
    let j = r.ok ? await r.json() : { data: [] };
    if (!(j.data || []).length) { r = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(artist + ' ' + title)}&limit=10`, { cf: { cacheTtl: 86400 } }); j = r.ok ? await r.json() : { data: [] }; }
    if (!(j.data || []).length && fold(title) !== title.toLowerCase()) { r = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(fa + ' ' + ft)}&limit=10`, { cf: { cacheTtl: 86400 } }); j = r.ok ? await r.json() : { data: [] }; }
    const hit = pick((j.data || []).map(x => ({ name: x.title, who: x.artist && x.artist.name, url: x.cover_xl || x.cover_big })));
    if (hit) return { url: hit.url, name: hit.name, artist: hit.who, from: 'deezer' };
  } catch (e) {}
  try {
    const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&entity=album&limit=12&country=gb`, { cf: { cacheTtl: 86400 } });
    if (r.ok) { const j = await r.json(); const hit = pick((j.results || []).map(x => ({ name: x.collectionName, who: x.artistName, url: (x.artworkUrl100 || '').replace(/100x100bb/, '600x600bb') }))); if (hit) return { url: hit.url, name: hit.name, artist: hit.who, from: 'itunes' }; }
  } catch (e) {}
  return { url: null };
}
export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname === '/api/cover') {
      const cache = caches.default; const key = new Request(u.toString(), { method: 'GET' });
      let res = await cache.match(key); if (res) return res;
      const body = await cover(u);
      res = new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': body.url ? 'public, max-age=2592000' : 'public, max-age=3600' } });
      if (body.url) ctx.waitUntil(cache.put(key, res.clone())); return res;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const path = u.pathname === '/' ? '/' : u.pathname;
    const r = await fetch(SITE + path + u.search, { headers: { accept: req.headers.get('accept') || '*/*' }, cf: { cacheTtl: 60, cacheEverything: true } });
    const h = new Headers(r.headers); h.delete('content-security-policy'); h.set('cache-control', /\.(png|jpg|webp)$/.test(path) ? 'public, max-age=86400' : 'no-cache');
    return new Response(r.body, { status: r.status, headers: h });
  },
};
