'use strict';

/* ---------- cloud sync ----------
   Each player gets a random sync code like APPLE-TIGER-2481. Progress (stars, streaks, levels)
   is saved under the SHA-256 of that code on a tiny Cloudflare Worker (sync/worker.js).
   No names or anything personal leave the device. Switched off until SYNC_URL is set. */
const SYNC_URL = 'https://sync.musicalmagic.uk';   // the Cloudflare Worker in sync/ (also at latin-sync.richmondbot2000.workers.dev)

const Sync = (() => {
  const WORDS = ('apple tiger moon river stone cloud lemon panda otter robin maple candle pepper rocket violet amber'
    + ' bridge castle comet daisy eagle falcon garden honey island jungle kitten ladder magnet nutmeg oyster pirate quartz rabbit saddle'
    + ' tulip umbrella velvet walnut yellow zebra acorn badger berry button cactus cherry cobalt dragon ember fossil ginger harbor'
    + ' indigo jigsaw kettle lantern marble nickel olive parrot pebble puffin radish ribbon salmon sparrow teapot turnip walrus wizard'
    + ' anchor basket beacon blossom bubble cabin canyon clover copper coral cradle crystal desert dolphin fennel feather forest'
    + ' glacier goblet hammer hazel helmet iguana jasper kayak koala lagoon lilac lobster meadow mitten monkey noodle orchid oxbow'
    + ' pancake pepper pickle planet poppy pumpkin quiver raven ripple rooster saffron scooter shadow sorbet spruce summit sundae'
    + ' thistle tomato trumpet tundra vanilla violin waffle willow yogurt zephyr').split(' ');
  const url = () => (store.get('latin.syncUrl', '') || SYNC_URL).replace(/\/$/, '');
  const enabled = () => !!url() && !!(crypto && crypto.subtle);
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
  const makeCode = () => `${pick()}-${pick()}-${1000 + Math.floor(Math.random() * 9000)}`;
  const normalise = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const valid = s => /^[A-Z]+-[A-Z]+-\d{4}$/.test(normalise(s));
  async function keyFor(code) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('latin:' + normalise(code)));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // the player's code, created on demand for players made before sync existed
  function codeOf(u) {
    if (u.code) return u.code;
    u.code = makeCode();
    store.set('latin.users', users().map(x => x.id === u.id ? { ...x, code: u.code } : x));
    return u.code;
  }
  const KEYS = ['progress', 'streak', 'level', 'practice', 'stats', 'hammer', 'read', 'beasts', 'passages'];
  const blobOf = u => ({ v: 1, updated: Date.now(), progress: store.get('latin.progress.' + u.id, {}), streak: store.get('latin.streak.' + u.id, null),
    level: store.get('latin.level.' + u.id, null), practice: store.get('latin.practice.' + u.id, null), stats: store.get('latin.stats.' + u.id, null),
    hammer: store.get('latin.hammer.' + u.id, null), read: store.get('latin.read.' + u.id, null), beasts: store.get('latin.beasts.' + u.id, null), passages: store.get('latin.passages.' + u.id, null) });

  // merge what the cloud has into this device: per word, keep the more recent answer
  function merge(u, remote) {
    if (!remote || typeof remote !== 'object') return false;
    let changed = false;
    const local = store.get('latin.progress.' + u.id, {});
    const merged = { ...local };
    for (const w in remote.progress || {}) {
      const r = remote.progress[w], l = local[w];
      if (!l || (r.t || 0) > (l.t || 0)) { merged[w] = r; changed = true; }
    }
    if (changed) store.set('latin.progress.' + u.id, merged);
    const ls = store.get('latin.streak.' + u.id, null), rs = remote.streak;
    if (rs && (!ls || rs.best > ls.best)) { store.set('latin.streak.' + u.id, { cur: ls ? ls.cur : rs.cur, best: Math.max(rs.best, ls ? ls.best : 0) }); changed = true; }
    const lp = store.get('latin.practice.' + u.id, null), rp = remote.practice;
    if (rp) {   // best level, current level and every counter: the bigger value wins
      const m = { ...(lp || {}) }; let ch = false;
      for (const k in rp) if (typeof rp[k] === 'number' && (m[k] == null || rp[k] > m[k])) { m[k] = rp[k]; ch = true; }
      if (rp.stars) { m.stars = { ...(m.stars || {}) }; for (const l in rp.stars) if ((m.stars[l] || 0) < rp.stars[l]) { m.stars[l] = rp.stars[l]; ch = true; } }
      if (ch) { store.set('latin.practice.' + u.id, m); changed = true; }
    }
    const lst = store.get('latin.stats.' + u.id, null), rst = remote.stats;
    if (rst) {   // the daily tallies: the bigger count for each day wins
      const m = { days: { ...((lst && lst.days) || {}) }, total: Math.max((lst && lst.total) || 0, rst.total || 0) }; let ch = !lst || m.total !== lst.total;
      for (const d in rst.days || {}) if ((m.days[d] || 0) < rst.days[d]) { m.days[d] = rst.days[d]; ch = true; }
      if (ch) { store.set('latin.stats.' + u.id, m); changed = true; }
    }
    if (remote.level && !store.get('latin.level.' + u.id, null)) { store.set('latin.level.' + u.id, remote.level); changed = true; }
    const lh = store.get('latin.hammer.' + u.id, null), rh = remote.hammer;
    if (rh) {   // Jacques Hammer: best scores and levels go up; items bought on either device are kept; coins follow whichever device has earned more
      const a = lh || {}, newer = (rh.earned || 0) > (a.earned || 0) ? rh : a;
      const m = { ...a, ...newer, best: Math.max(a.best || 0, rh.best || 0), level: Math.max(a.level || 1, rh.level || 1), cleared: Math.max(a.cleared || 0, rh.cleared || 0),
        plays: Math.max(a.plays || 0, rh.plays || 0), earned: Math.max(a.earned || 0, rh.earned || 0), owned: [...new Set([...(a.owned || []), ...(rh.owned || [])])] };
      if (JSON.stringify(m) !== JSON.stringify(lh)) { store.set('latin.hammer.' + u.id, m); changed = true; }
    }
    const lr = store.get('latin.read.' + u.id, null), rr = remote.read;
    if (rr) {   // Read: a sentence done on either device counts as done
      const a = lr || { done: {}, read: 0 }, m = { ...a, done: { ...(a.done || {}) }, read: Math.max(a.read || 0, rr.read || 0) };
      for (const n in rr.done || {}) if (!m.done[n] || m.done[n] < rr.done[n]) m.done[n] = rr.done[n];
      if (JSON.stringify(m) !== JSON.stringify(lr)) { store.set('latin.read.' + u.id, m); changed = true; }
    }
    // passages: a story read on either device counts
    const lps = store.get('latin.passages.' + u.id, null), rps = remote.passages;
    if (rps && rps.done) { const m = { done: { ...((lps && lps.done) || {}), ...rps.done } }; if (JSON.stringify(m) !== JSON.stringify(lps)) { store.set('latin.passages.' + u.id, m); changed = true; } }
    // beasts: every beast either device has found, at its furthest stage; the one being raised stays the local one
    const lb = store.get('latin.beasts.' + u.id, null), rb = remote.beasts;
    if (rb && typeof rb === 'object') {
      const a = lb || { have: {}, order: [], spare: {}, last: null, finds: 0, total: 0 }, m = { ...a, have: { ...(a.have || {}) }, spare: { ...(a.spare || {}) }, order: [...(a.order || [])], total: Math.max(a.total || 0, rb.total || 0), finds: Math.max(a.finds || 0, rb.finds || 0) };
      for (const k in (rb.spare || {})) m.spare[k] = Math.max(m.spare[k] || 0, rb.spare[k] || 0);
      for (const k in (rb.have || {})) { m.have[k] = Math.max(m.have[k] || 0, rb.have[k] || 0); if (!m.order.includes(k)) m.order.push(k); }
      if (!m.last && rb.last) m.last = rb.last;
      delete m.cur; delete m.xp;
      if (JSON.stringify(m) !== JSON.stringify(lb)) { store.set('latin.beasts.' + u.id, m); changed = true; }
    }
    return changed;
  }

  let timer = 0, pending = null, status = 'off';
  const listeners = new Set();
  const setStatus = s => { status = s; listeners.forEach(f => f(s)); };
  async function push(u) {
    if (!enabled()) return;
    try {
      setStatus('saving');
      const r = await fetch(url() + '/p/' + await keyFor(codeOf(u)), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(blobOf(u)) });
      setStatus(r.ok ? 'saved' : 'error');
    } catch (e) { setStatus('error'); }
  }
  // called whenever progress changes; batches writes so a run of swipes is one save
  function touch(u) {
    if (!enabled() || !u) return;
    pending = u; clearTimeout(timer);
    timer = setTimeout(() => { const x = pending; pending = null; push(x); }, 2500);
  }
  async function fetchBlob(code) {
    const r = await fetch(url() + '/p/' + await keyFor(code), { cache: 'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }
  // on opening the game: bring down anything newer from the cloud, then put our merged copy back up
  async function pull(u) {
    if (!enabled()) return false;
    try {
      setStatus('loading');
      const remote = await fetchBlob(codeOf(u));
      const changed = merge(u, remote);
      await push(u);
      return changed;
    } catch (e) { setStatus('error'); return false; }
  }
  // link a player from another device by their sync code; returns the blob, or null if none
  async function link(code) {
    if (!enabled() || !valid(code)) return null;
    return fetchBlob(code);
  }
  // ---- player names and gifts (see sync/worker.js) ----
  const api = async (method, path, data) => {
    const r = await fetch(url() + path, { method, headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined, cache: 'no-store' });
    if (!r.ok) { const e = new Error(await r.text().catch(() => '') || ('http ' + r.status)); e.status = r.status; throw e; }
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };
  const cleanName = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
  const validName = s => /^[a-z0-9]{3,16}$/.test(s);
  const setPlayer = (u, name) => { u.player = name; store.set('latin.users', users().map(x => x.id === u.id ? { ...x, player: name } : x)); };
  async function claimName(u, name) {   // 'taken' | 'ok'
    name = cleanName(name); if (!validName(name)) throw new Error('invalid');
    try { await api('PUT', '/name/' + name, { key: await keyFor(codeOf(u)) }); } catch (e) { if (e.status === 409) return 'taken'; throw e; }
    setPlayer(u, name); return 'ok';
  }
  async function whoAmI(u) {   // the name this player holds on the server (another device may have claimed it)
    const r = await api('GET', '/who/' + await keyFor(codeOf(u))); if (r && r.name && r.name !== u.player) setPlayer(u, r.name); return r && r.name;
  }
  const sendGift = async (u, to, beast, stage) => api('POST', '/gift', { from: await keyFor(codeOf(u)), to: cleanName(to), beast, stage });
  const inbox = async u => (await api('GET', '/inbox/' + await keyFor(codeOf(u)))) || [];
  const dropInbox = async (u, id) => api('DELETE', '/inbox/' + await keyFor(codeOf(u)) + '/' + id);
  const giftCode = async (u, beast, stage) => (await api('POST', '/code', { from: await keyFor(codeOf(u)), beast, stage })).code;
  const claimCode = async (u, code) => api('POST', '/claim/' + String(code || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''), { key: await keyFor(codeOf(u)) });
  function flush() { if (pending) { clearTimeout(timer); const x = pending; pending = null; push(x); } }
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  return { enabled, codeOf, normalise, valid, touch, pull, link, merge, flush, status: () => status, onStatus: f => listeners.add(f), cleanName, validName, claimName, whoAmI, sendGift, inbox, dropInbox, giftCode, claimCode };
})();
