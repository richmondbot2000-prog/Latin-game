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
//   PUT /lb/<game>/<key>  {emo, days, total}   the player's tally for the leaderboard: their two emojis, words answered
//                                 by day (last 10 days) and ever; stored with the player name this key holds (or none)
//   GET /lb/<game>                everyone's tallies [{ id, name, emo, days, total, t }] — player names only, never a real
//                                 name; `id` is the first 12 characters of the key, so a device can spot its own rows
//   GET /book/<n>                 a Project Gutenberg book as { id, title, author, text } (Gutenberg sends no CORS header,
//                                 so the game cannot fetch it itself); the licence header and footer are cut off, paragraphs
//                                 joined into single lines, cached for 30 days
// Player names are chosen by the players (the game tells them not to use real names) and are only ever
// looked up by exact name — there is no list. Gifts are limited to 10 a day per player.
const ALLOWED = ['https://latin.musicalmagic.uk', 'http://127.0.0.1:8765', 'http://localhost:8765'];
const MAX_BYTES = 65536, GIFTS_A_DAY = 10, INBOX_MAX = 50;
const NAME = /^[a-z0-9]{3,16}$/, KEY = /^[a-f0-9]{64}$/, CODE = /^[A-Z]+-[A-Z0-9]{4}$/;

// ---------- Project Gutenberg books ----------
// The HTML edition (it has the pictures) is read into paragraphs: a picture is its own paragraph
// [[img src="images/x.jpg" cap="caption"]]; drop-cap letters drawn as pictures go back into the text; tiny ornaments,
// page numbers, footnote marks and tables (contents) are dropped. The plain-text edition is the fallback.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', shy: '', aelig: 'æ', AElig: 'Æ', oelig: 'œ', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', aacute: 'á', iuml: 'ï', ouml: 'ö', uuml: 'ü', ccedil: 'ç', pound: '£', middot: '·', times: '×' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m));
const plain = s => decode(s.replace(/<\/?(span|a|i|em|b|strong|sup|sub|small|abbr|font|u|cite|ins|del|q)\b[^>]*>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, a) => { const m = tag.match(new RegExp('\\b' + a + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i')); return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : ''; };
function htmlParas(html) {
  let b = html;
  const s = b.search(/id="pg-start-separator"|\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG/), e = b.search(/id="pg-end-separator"|\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/);
  if (s >= 0) b = b.slice(b.indexOf('>', b.indexOf('\n', s) >= 0 ? s : s) + 1);
  if (e >= 0) { const e2 = b.search(/id="pg-end-separator"|\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/); if (e2 >= 0) b = b.slice(0, b.lastIndexOf('<', e2)); }
  b = b.replace(/<(script|style|table)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<span[^>]*class="[^"]*pagenum[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' ')
    .replace(/<a[^>]*class="[^"]*fnanchor[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
  // captions first, then pictures
  b = b.replace(/<(p|div|span|figcaption)\b[^>]*class="[^"]*caption[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi, (m0, t, inner) => '\n\n[[cap ' + plain(inner).replace(/[\[\]"]/g, '') + ']]\n\n')
    .replace(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi, (m0, inner) => '\n\n[[cap ' + plain(inner).replace(/[\[\]"]/g, '') + ']]\n\n')
    .replace(/<img\b[^>]*>/gi, tag => {
      const src = attr(tag, 'src'), alt = attr(tag, 'alt').trim(), st = attr(tag, 'style');
      const wd = +attr(tag, 'width') || +((st.match(/width:\s*(\d+)px/) || [])[1] || 0), ht = +attr(tag, 'height') || +((st.match(/height:\s*(\d+)px/) || [])[1] || 0);
      if (/^[A-Z]$/.test(alt)) return alt;   // a drop cap drawn as a picture
      if (!/^[\w\-./{}% ]+\.(jpe?g|png|gif)$/i.test(src) || /^https?:/i.test(src) || src.includes('..')) return ' ';
      if ((wd && wd < 90) || (ht && ht < 90)) return ' ';   // ornaments
      return '\n\n[[img src="' + src.replace(/"/g, '') + '"' + (wd && ht ? ' w="' + wd + '" h="' + ht + '"' : '') + ']]\n\n';
    })
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|h[1-6]|blockquote|li|ul|ol|tr|section|hr|pre|figure|dl|dt|dd)\b[^>]*>/gi, '\n\n');
  const out = [];
  for (let p of b.split(/\n\s*\n/)) {
    p = p.trim(); if (!p) continue;
    if (/^\[\[(img|cap) /.test(p)) { out.push(p); continue; }
    p = plain(p); if (p) out.push(p);
  }
  for (let i = 0; i < out.length - 1; i++) {
    if (/^[A-Z]$/.test(out[i]) && (/^[a-z]/.test(out[i + 1]) || /^[A-Z]{1,4}\s+[a-z]/.test(out[i + 1]))) { out[i + 1] = out[i] + out[i + 1]; out.splice(i, 1); }
  }
  // a caption joins the picture just before it; a caption with no picture is dropped
  const res = [];
  for (const p of out) {
    const c = p.match(/^\[\[cap (.*)\]\]$/);
    if (c) { const k = res.length - 1; if (k >= 0 && /^\[\[img /.test(res[k]) && !/ cap="/.test(res[k]) && c[1]) res[k] = res[k].replace(/\]\]$/, ' cap="' + c[1] + '"]]'); continue; }
    res.push(p);
  }
  return res;
}
function txtParas(t) {
  let s = -1; for (const mm of t.matchAll(/^\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG.*$/gm)) s = mm.index;
  if (s >= 0) t = t.slice(t.indexOf('\n', s) + 1);
  const e = t.search(/^\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/m); if (e >= 0) t = t.slice(0, e);
  return t.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
}
// the story starts at the first chapter heading followed by real prose — not in an introduction, preface, foreword,
// contents or list of illustrations; failing that, at the first long paragraph of prose, stepped back to the story's title
function storyStart(paras) {
  const isPic = p => /^\[\[img /.test(p);
  const HEAD = /^(CHAPTER|Chapter|BOOK|Book|PART|Part|STORY|Story)\b|^(I|1)\.?\s*$|^(?=[IVX])X{0,3}(IX|IV|V?I{0,3})\.\s+[A-Z]/;   // I.–XXXIX., not 'L. Frank Baum'
  const FRONT = /^(introduction|introductory|preface|foreword|fore-word|dedication|acknowledg|transcriber|editor'?s note|note to|a note on|biographical|to the reader)\b/i;
  const LIST = /^(contents|table of contents|list of (illustrations|plates|chapters|pictures|colou?red plates)|illustrations|chapters)\b/i;
  const isProse = p => { if (isPic(p)) return false; const L = (p.match(/[a-z]/gi) || []).length, low = (p.match(/[a-z]/g) || []).length, dig = (p.match(/\d/g) || []).length;
    const ws = p.split(/\s+/), caps = ws.filter(x => /^[A-Z]/.test(x)).length;
    return L > 30 && low / L > .6 && dig / p.length < .02 && caps / ws.length < .5 && /[a-z][.!?,;:]/.test(p) && !/\.\s?\.\s?\./.test(p); };
  const titleLike = p => !isPic(p) && p.length < 80 && !isProse(p);
  const proseAfter = i => { let n = 0; for (let j = i + 1; j < Math.min(paras.length, i + 10); j++) { if (HEAD.test(paras[j]) && paras[j].length < 120) break; if (isProse(paras[j])) n += paras[j].length; } return n > 400; };
  // front-matter sections: from a heading like PREFACE to the next heading that is not one
  const front = []; let inFront = false;
  paras.forEach((p, i) => {
    const t = p.replace(/[^\w\s'-]/g, '').trim();
    if (titleLike(p) && FRONT.test(t)) inFront = 'prose';
    else if (titleLike(p) && LIST.test(t)) inFront = 'list';
    else if (inFront === 'list' && HEAD.test(p) && p.length < 120 && proseAfter(i)) inFront = false;   // the first chapter after the list
    else if (inFront === 'list' && isProse(p) && p.length > 150) {   // a list has no sentences: the first one is the book, with its title just before it
      inFront = false;
      for (let j = i - 1, k = 0; j >= 0 && k < 2 && front[j]; j--) { if (/^\[\[img /.test(paras[j])) { front[j] = false; continue; } if (!titleLike(paras[j]) || LIST.test(paras[j])) break; front[j] = false; k++; }
    }
    // a preface or introduction ends at the next real heading (a chapter, or a title in capitals) — not at the author's signature
    else if (inFront === 'prose' && titleLike(p) && (HEAD.test(p) || (/[A-Z]{3,}/.test(p) && !/[a-z]{2,}/.test(p.replace(/^(the|a|an|and|of|in)\b/gi, ''))) || (proseAfter(i) && /[A-Z]{2,}|^[A-Z][a-z]+( [A-Z][a-z]+){0,6}$/.test(p.trim()) && !/^[A-Z]\. /.test(p.trim())))) inFront = false;
    front[i] = !!inFront || /^(transcriber|editor'?s note|produced by|this e-?book|e-?text prepared)/i.test(t) || /\bcopyright(ed)?\b|all rights reserved/i.test(p);
  });
  let first = paras.findIndex((p, i) => !front[i] && p.length < 120 && HEAD.test(p) && proseAfter(i));
  if (first < 0 || first > paras.length / 3) {
    first = paras.findIndex((p, i) => !front[i] && p.length > 300 && isProse(p));
    let earliest = first;
    for (let j = first - 1, steps = 0; j >= 0 && steps < 40; j--) {
      const p = paras[j];
      if (front[j]) break;
      if (isPic(p)) continue;
      steps++;
      if (isProse(p) || (p.length < 100 && /[a-z]/.test(p) && /[,.;:!?\-—]["'”’)]?$/.test(p))) { earliest = j; continue; }
      if (p.length < 80) earliest = j;
      break;
    }
    first = earliest;
  }
  return Math.max(0, first);
}
async function gutenberg(id) {
  const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'latin.musicalmagic.uk reader' } }); return r.ok ? (await r.text()).replace(/\r/g, '') : null; };
  const txt = await get(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`);
  const html = await get(`https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`);
  if (!txt && !html) return null;
  const head = (txt || plain(html.slice(0, 8000))).slice(0, 5000), field = k => ((head.match(new RegExp('^\\s*' + k + ':\\s*(.+)$', 'm')) || [])[1] || '').trim();
  const title = field('Title') || ((html || '').match(/<title>([^<]*)<\/title>/i) || [])[1] || 'Book ' + id, author = field('Author');
  let paras = html ? htmlParas(html) : txtParas(txt);
  paras = paras.map(p => /^\[\[img /.test(p) ? p : p.replace(/\[(Illustration|Picture)[^\]]*\]/gi, '').replace(/\[\d+\]/g, '').replace(/_/g, '').replace(/\s+/g, ' ').trim())
    .filter(p => p && (/^\[\[img /.test(p) || /[a-z]/i.test(p)) && !/\*\*\* ?(START|END) OF/.test(p));
  let st = storyStart(paras); if (st > 0 && /^\[\[img /.test(paras[st - 1])) st--;   // the one picture just before the start (a chapter's opening drawing, a drawn initial), not a dedication before it
  paras.splice(0, st);
  return { id: +id, title: decode(title.replace(/^The Project Gutenberg eBook of /i, '').replace(/,? by .*$/, '').trim()), author, pics: paras.filter(p => /^\[\[img /.test(p)).length, text: paras.join('\n\n').slice(0, 1500000) };
}

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
      const id = m[1], cache = caches.default, ck = new Request(new URL('/__book/' + id + '/v14', req.url).toString());   // bump v9 when the cleaning changes (and BOOK_V in app.js)
      let hit = await cache.match(ck);
      if (!hit) {
        const book = await gutenberg(id);
        if (!book) return text('no such book', 404);
        hit = new Response(JSON.stringify(book), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=2592000' } });
        await cache.put(ck, hit.clone());
      }
      return new Response(hit.body, { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } });
    }
    // a book's picture, passed through so the game only ever loads from its own domains
    if ((m = path.match(/^\/bookimg\/(\d{1,6})\/(.+)$/)) && req.method === 'GET') {
      const id = m[1], file = decodeURIComponent(m[2]);
      if (!/^[\w\-./{}% ]+\.(jpe?g|png|gif)$/i.test(file) || file.includes('..')) return text('bad', 400);
      const cache = caches.default, ck = new Request(new URL('/__bookimg/' + id + '/' + encodeURIComponent(file), req.url).toString());
      let hit = await cache.match(ck);
      if (!hit) {
        const r = await fetch(`https://www.gutenberg.org/cache/epub/${id}/${file.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'User-Agent': 'latin.musicalmagic.uk reader' } });
        if (!r.ok) return text('no picture', 404);
        hit = new Response(r.body, { headers: { 'Content-Type': r.headers.get('Content-Type') || 'image/jpeg', 'Cache-Control': 'public, max-age=2592000' } });
        await cache.put(ck, hit.clone());
      }
      return new Response(hit.body, { headers: { ...cors, 'Content-Type': hit.headers.get('Content-Type'), 'Cache-Control': 'public, max-age=2592000' } });
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

    if ((m = path.match(/^\/lb\/([a-z]{2,12})(?:\/([a-f0-9]{64}))?$/))) {
      const ns = m[1];
      if (req.method === 'PUT' && m[2]) {
        const b = await body(); if (!b) return text('bad', 400);
        const emo = typeof b.emo === 'string' ? [...b.emo].slice(0, 4).join('') : '';
        const days = {};
        if (b.days && typeof b.days === 'object') for (const k of Object.keys(b.days).filter(k => /^\d{4}-\d\d-\d\d$/.test(k)).sort().slice(-10)) days[k] = Math.max(0, Math.min(1e6, Math.floor(+b.days[k] || 0)));
        const total = Math.max(0, Math.min(1e8, Math.floor(+b.total || 0)));
        const name = (await kv.get('k:' + m[2])) || null;
        // one document per game holds every row (a key listing lags by up to a minute; a document reads straight back);
        // the newest 300 players are kept, so a player not seen for a year or so drops off
        const all = (await getJ('lbi:' + ns)) || {};
        all[m[2].slice(0, 12)] = { name, emo, days, total, t: Date.now() };
        const keep = Object.entries(all).sort((a, b) => b[1].t - a[1].t).slice(0, 300);
        await kv.put('lbi:' + ns, JSON.stringify(Object.fromEntries(keep)));
        return new Response(null, { status: 204, headers: cors });
      }
      if (req.method === 'GET' && !m[2]) {
        const all = (await getJ('lbi:' + ns)) || {};
        return json(Object.entries(all).filter(([, r]) => r.total > 0).map(([id, r]) => ({ id, ...r })));   // a row needs at least one word answered
      }
      return text('method', 405);
    }
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
