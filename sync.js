'use strict';

/* ---------- cloud sync ----------
   Each player gets a random sync code like APPLE-TIGER-2481. Progress (stars, streaks, levels)
   is saved under the SHA-256 of that code on a tiny Cloudflare Worker (sync/worker.js).
   No names or anything personal leave the device. Switched off until SYNC_URL is set. */
const SYNC_URL = '';   // e.g. 'https://latin-sync.example.workers.dev' once the worker is deployed

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
  const KEYS = ['progress', 'streak', 'level', 'practice'];
  const blobOf = u => ({ v: 1, updated: Date.now(), progress: store.get('latin.progress.' + u.id, {}), streak: store.get('latin.streak.' + u.id, null),
    level: store.get('latin.level.' + u.id, null), practice: store.get('latin.practice.' + u.id, null) });

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
    if (rp && (!lp || rp.best > (lp.best || 0) || rp.level > (lp.level || 0))) { store.set('latin.practice.' + u.id, { best: Math.max(rp.best || 1, lp ? lp.best || 1 : 1), level: Math.max(rp.level || 1, lp ? lp.level || 1 : 1) }); changed = true; }
    if (remote.level && !store.get('latin.level.' + u.id, null)) { store.set('latin.level.' + u.id, remote.level); changed = true; }
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
  function flush() { if (pending) { clearTimeout(timer); const x = pending; pending = null; push(x); } }
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  return { enabled, codeOf, normalise, valid, touch, pull, link, merge, flush, status: () => status, onStatus: f => listeners.add(f) };
})();
