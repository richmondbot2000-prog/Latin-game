// grade5.musicalmagic.uk: serves the Grade 5 Theory game from the grade5/ folder
// of this repository (GitHub Pages at latin.musicalmagic.uk/grade5/).
// Deploy from this folder: npx wrangler deploy
const ORIGIN = 'https://latin.musicalmagic.uk/grade5';
export default {
  async fetch(req) {
    const u = new URL(req.url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    let path = u.pathname;
    if (path.endsWith('/')) path += 'index.html';
    const r = await fetch(ORIGIN + path, { method: req.method, cf: { cacheTtl: 60, cacheEverything: true } });
    const h = new Headers(r.headers);
    h.delete('set-cookie');
    h.set('cache-control', path.endsWith('sw.js') || path.endsWith('.html') ? 'no-cache' : 'public, max-age=300');
    return new Response(r.body, { status: r.status, headers: h });
  },
};
