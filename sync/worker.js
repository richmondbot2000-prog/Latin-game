// Cloudflare Worker: tiny progress store for the Latin game.
// Each player is a random sync code; the key is SHA-256 of that code. The stored blob holds
// stars, streaks and levels only — no names, nothing personal. Deployed with wrangler (see CLAUDE.md).
//
//   GET/PUT /p/<key>              the player's progress blob
//   GET /name/<name>              { free } — is a player name free?
//   PUT /name/<name>  {key}       claim a player name for this key (one name per key; 409 if taken)
//   GET /who/<key>                { name } — the name this key holds
//   POST /gift  {from, to, beast, stage}   give a spare beast to the player called `to` (into their inbox)
//   GET /inbox/<key>              the gifts waiting for this player
//   DELETE /inbox/<key>/<id>      a gift taken out of the inbox
//   POST /code  {from, beast, stage}       a gift code for a friend who is not in the game yet → { code }
//   POST /claim/<code>  {key}     open a gift code → the gift; the sender's inbox gets a note that it was opened
//   GET /book/<n>                 a Project Gutenberg book as { id, title, author, text } (Gutenberg sends no CORS header,
//                                 so the game cannot fetch it itself); the licence header and footer are cut off, paragraphs
//                                 joined into single lines, cached for 30 days
// Player names are chosen by the players (the game tells them not to use real names) and are only ever
// looked up by exact name — there is no list. Gifts are limited to 10 a day per player.
const ALLOWED = ['https://latin.musicalmagic.uk', 'http://127.0.0.1:8765', 'http://localhost:8765'];
const MAX_BYTES = 65536, GIFTS_A_DAY = 10, INBOX_MAX = 50;
const NAME = /^[a-z0-9]{3,16}$/, KEY = /^[a-f0-9]{64}$/, CODE = /^[A-Z]+-[A-Z0-9]{4}$/;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    const text = (t, status) => new Response(t, { status, headers: cors });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const path = new URL(req.url).pathname;
    const body = async () => { try { const j = JSON.parse(await req.text()); return j && typeof j === 'object' ? j : null; } catch (e) { return null; } };
    const kv = env.LATIN;
    const getJ = async k => { const v = await kv.get(k); return v ? JSON.parse(v) : null; };
    const inboxKey = key => 'in:' + key;
    const today = () => new Date().toISOString().slice(0, 10);
    // one more gift today for this sender, or false once the day's allowance is used
    const allow = async key => { const k = 'r:' + key + ':' + today(); const n = +(await kv.get(k) || 0); if (n >= GIFTS_A_DAY) return false; await kv.put(k, String(n + 1), { expirationTtl: 172800 }); return true; };
    const addInbox = async (key, item) => { const list = (await getJ(inboxKey(key))) || []; list.push(item); while (list.length > INBOX_MAX) list.shift(); await kv.put(inboxKey(key), JSON.stringify(list)); };
    const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    let m;

    if ((m = path.match(/^\/book\/(\d{1,6})$/)) && req.method === 'GET') {
      const id = m[1], cache = caches.default, ck = new Request(new URL('/__book/' + id + '/v8', req.url).toString());   // bump v8 when the cleaning below changes
      let hit = await cache.match(ck);
      if (!hit) {
        const r = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, { headers: { 'User-Agent': 'latin.musicalmagic.uk reader' } });
        if (!r.ok) return text('no such book', 404);
        let t = (await r.text()).replace(/\r/g, '');
        const head = t.slice(0, 4000), field = k => ((head.match(new RegExp('^' + k + ':\\s*(.+)$', 'm')) || [])[1] || '').trim();
        const title = field('Title') || 'Book ' + id, author = field('Author');
        // after the last START marker (some books carry the licence header twice), up to the END marker
        let s = -1; for (const mm of t.matchAll(/^\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG.*$/gm)) s = mm.index;
        if (s >= 0) t = t.slice(t.indexOf('\n', s) + 1);
        const e = t.search(/^\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/m); if (e >= 0) t = t.slice(0, e);
        // one paragraph per line; illustrations, footnote marks and underscores (italics) dropped
        const paras = t.split(/\n\s*\n/).map(p => p.replace(/\[(Illustration|Picture)[^\]]*\]/gi, '').replace(/\[\d+\]/g, '').replace(/_/g, '').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()).filter(p => p && /[a-z]/i.test(p));
        // the story starts at the first chapter heading followed by real prose — sentences, not a contents list
        const HEAD = /^(CHAPTER|Chapter|BOOK|Book|PART|Part|STORY|Story)\b|^(I|1)\.?\s*$|^[IVXLC]+\.\s+[A-Z]/;
        const isProse = p => { const L = (p.match(/[a-z]/gi) || []).length, low = (p.match(/[a-z]/g) || []).length, dig = (p.match(/\d/g) || []).length;
          const ws = p.split(/\s+/), caps = ws.filter(x => /^[A-Z]/.test(x)).length;
          return L > 30 && low / L > .6 && dig / p.length < .02 && caps / ws.length < .5 && /[a-z][.!?,;:]/.test(p) && !/\.\s?\.\s?\./.test(p); };
        const proseAfter = i => { let n = 0; for (let j = i + 1; j < Math.min(paras.length, i + 8); j++) { if (HEAD.test(paras[j]) && paras[j].length < 120) break; if (isProse(paras[j])) n += paras[j].length; } return n > 400; };
        let first = paras.findIndex((p, i) => p.length < 120 && HEAD.test(p) && proseAfter(i));
        if (first < 0 || first > paras.length / 3) {
          first = paras.findIndex(p => p.length > 300 && isProse(p));
          // step back over the opening dialogue or verse to the story's own title (a short line that is not a sentence)
          // step back over the opening sentences, short lines of verse or dialogue, to the story's own title
          let earliest = first;
          for (let j = first - 1; j >= 0 && j >= first - 30; j--) {
            const p = paras[j];
            if (isProse(p) || (p.length < 100 && /[a-z]/.test(p) && /[,.;:!?\-—]["'”’)]?$/.test(p))) { earliest = j; continue; }
            if (p.length < 80) earliest = j;
            break;
          }
          first = earliest;
        }
        if (first > 0) paras.splice(0, first);
        const body = JSON.stringify({ id: +id, title, author, text: paras.join('\n\n').slice(0, 1500000) });
        hit = new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=2592000' } });
        await cache.put(ck, hit.clone());
      }
      return new Response(hit.body, { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } });
    }
    if ((m = path.match(/^\/p\/([a-f0-9]{64})$/))) {
      const key = m[1];
      if (req.method === 'GET') { const v = await kv.get(key); return new Response(v || 'null', { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
      if (req.method === 'PUT') {
        const raw = await req.text();
        if (raw.length > MAX_BYTES) return text('too big', 413);
        try { const j = JSON.parse(raw); if (!j || typeof j !== 'object' || !j.updated) throw 0; } catch (e) { return text('bad json', 400); }
        await kv.put(key, raw);
        return new Response(null, { status: 204, headers: cors });
      }
      return text('method', 405);
    }
    if ((m = path.match(/^\/name\/([a-z0-9]{3,16})$/))) {
      const name = m[1];
      if (req.method === 'GET') { const owner = await kv.get('n:' + name); return json({ free: !owner }); }
      if (req.method === 'PUT') {
        const b = await body(); if (!b || !KEY.test(b.key || '')) return text('bad', 400);
        const owner = await kv.get('n:' + name);
        if (owner && owner !== b.key) return text('taken', 409);
        const old = await kv.get('k:' + b.key);
        if (old && old !== name) await kv.delete('n:' + old);   // a player keeps one name; the old one is freed
        await kv.put('n:' + name, b.key); await kv.put('k:' + b.key, name);
        return new Response(null, { status: 204, headers: cors });
      }
      return text('method', 405);
    }
    if ((m = path.match(/^\/who\/([a-f0-9]{64})$/)) && req.method === 'GET') return json({ name: (await kv.get('k:' + m[1])) || null });

    if (path === '/gift' && req.method === 'POST') {
      const b = await body(); if (!b || !KEY.test(b.from || '') || typeof b.to !== 'string' || typeof b.beast !== 'string') return text('bad', 400);
      const to = b.to.toLowerCase(); if (!NAME.test(to)) return text('bad name', 400);
      const fromName = await kv.get('k:' + b.from); if (!fromName) return text('no name', 403);
      const toKey = await kv.get('n:' + to); if (!toKey) return text('no player', 404);
      if (toKey === b.from) return text('self', 400);
      const blob = await getJ(b.from), spare = blob && blob.beasts && blob.beasts.spare && blob.beasts.spare[b.beast];   // the sender must really hold a spare of it
      if (!spare) return text('no spare', 403);
      if (!(await allow(b.from))) return text('limit', 429);
      await addInbox(toKey, { id: id(), kind: 'gift', from: fromName, beast: b.beast, stage: +b.stage || 0, t: Date.now() });
      return new Response(null, { status: 204, headers: cors });
    }
    if ((m = path.match(/^\/inbox\/([a-f0-9]{64})(?:\/([a-z0-9]+))?$/))) {
      if (req.method === 'GET' && !m[2]) return json((await getJ(inboxKey(m[1]))) || []);
      if (req.method === 'DELETE' && m[2]) { const list = ((await getJ(inboxKey(m[1]))) || []).filter(x => x.id !== m[2]); await kv.put(inboxKey(m[1]), JSON.stringify(list)); return new Response(null, { status: 204, headers: cors }); }
      return text('method', 405);
    }
    if (path === '/code' && req.method === 'POST') {
      const b = await body(); if (!b || !KEY.test(b.from || '') || typeof b.beast !== 'string') return text('bad', 400);
      const fromName = await kv.get('k:' + b.from); if (!fromName) return text('no name', 403);
      const blob = await getJ(b.from), spare = blob && blob.beasts && blob.beasts.spare && blob.beasts.spare[b.beast];
      if (!spare) return text('no spare', 403);
      if (!(await allow(b.from))) return text('limit', 429);
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code; do { code = b.beast.replace(/[^a-z]/g, '').toUpperCase().slice(0, 10) + '-' + [0, 0, 0, 0].map(() => letters[Math.floor(Math.random() * letters.length)]).join(''); } while (await kv.get('c:' + code));
      await kv.put('c:' + code, JSON.stringify({ from: fromName, fromKey: b.from, beast: b.beast, stage: +b.stage || 0, t: Date.now() }), { expirationTtl: 60 * 86400 });
      return json({ code });
    }
    if ((m = path.match(/^\/claim\/([A-Z]+-[A-Z0-9]{4})$/)) && req.method === 'POST') {
      const b = await body(); if (!b || !KEY.test(b.key || '')) return text('bad', 400);
      const g = await getJ('c:' + m[1]); if (!g) return text('gone', 404);
      if (g.fromKey === b.key) return text('self', 400);
      await kv.delete('c:' + m[1]);
      await addInbox(g.fromKey, { id: id(), kind: 'opened', beast: g.beast, t: Date.now() });
      return json({ from: g.from, beast: g.beast, stage: g.stage });
    }
    return text('not found', 404);
  },
};
