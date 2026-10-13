// Cloudflare Worker: tiny progress store for the Latin game.
// Each player is a random sync code; the key is SHA-256 of that code. The stored blob holds
// stars, streaks and levels only — no names, nothing personal. Deployed with wrangler (see CLAUDE.md).
const ALLOWED = ['https://latin.musicalmagic.uk', 'http://127.0.0.1:8765', 'http://localhost:8765'];
const MAX_BYTES = 65536;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const m = new URL(req.url).pathname.match(/^\/p\/([a-f0-9]{64})$/);
    if (!m) return new Response('not found', { status: 404, headers: cors });
    const key = m[1];
    if (req.method === 'GET') {
      const v = await env.LATIN.get(key);
      return new Response(v || 'null', { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    if (req.method === 'PUT') {
      const body = await req.text();
      if (body.length > MAX_BYTES) return new Response('too big', { status: 413, headers: cors });
      try { const j = JSON.parse(body); if (!j || typeof j !== 'object' || !j.updated) throw 0; } catch (e) { return new Response('bad json', { status: 400, headers: cors }); }
      await env.LATIN.put(key, body);
      return new Response(null, { status: 204, headers: cors });
    }
    return new Response('method', { status: 405, headers: cors });
  },
};
