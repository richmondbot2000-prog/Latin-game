/* Beasts: the eggs you earn by answering cards, which hatch and grow as you keep answering, and the
   Beastpedia that collects them. The pictures and names are the artist's MemiBeasts set (art/beasts/):
   each beast has up to four stages (egg, baby, teen, adult), a one-line ecology and an element that
   colours the scene behind the cards. Progress lives in latin.beasts.<id>: { have: { key: stage },
   order: [keys as found], cur: key being raised, xp: right answers towards its next stage, total }. */
const Beasts = (() => {
  const ART = 'art/beasts/';
  const NEED = [15, 25, 30];            // right answers to hatch, to grow up, to grow fully
  const ELEMENT = { earth: ['🪨', 'Earth'], grass: ['🌿', 'Grass'], water: ['💧', 'Water'], snow: ['❄️', 'Snow'], fire: ['🔥', 'Fire'], crystal: ['💎', 'Crystal'] };
  const STAGE = { egg: 'Egg', baby: 'Baby', teen: 'Teen', adult: 'Adult' };
  let list = null, loading = null;
  function load() {
    if (list) return Promise.resolve(list);
    return loading || (loading = fetch(ART + 'beasts.json').then(r => r.json()).then(j => (list = j)).catch(() => (list = [])));
  }
  const key = u => 'latin.beasts.' + u.id;
  const fresh = () => ({ have: {}, order: [], cur: null, xp: 0, total: 0 });
  const state = u => Object.assign(fresh(), store.get(key(u), null) || {});
  const save = (u, s) => store.set(key(u), s);
  const byKey = k => (list || []).find(b => b.key === k) || null;
  const img = (b, i) => ART + b.key + '_' + b.stages[i].s + '.webp';
  const need = (b, i) => NEED[Math.min(i, NEED.length - 1)];
  // a beast the player has not found yet; the ones with all four stages come first so the first few feel complete
  function pickNew(s) {
    const left = (list || []).filter(b => !(b.key in s.have));
    if (!left.length) return null;
    const eggs = left.filter(b => b.stages[0].s === 'egg'), full = eggs.filter(b => b.stages.length === 4);
    const pool = full.length && Math.random() < .7 ? full : eggs.length ? eggs : left;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // called on every right answer; returns { kind: 'egg' | 'grow', beast, stage } when something happens
  function onRight(u) {
    if (!list) return null;
    const s = state(u); s.total = (s.total || 0) + 1;
    let ev = null;
    if (!s.cur || !byKey(s.cur)) {
      const b = pickNew(s);
      if (b) { s.have[b.key] = 0; s.order.push(b.key); s.cur = b.key; s.xp = 0; ev = { kind: 'egg', beast: b, stage: 0 }; }
    } else {
      const b = byKey(s.cur), st = s.have[b.key] || 0;
      s.xp = (s.xp || 0) + 1;
      if (st < b.stages.length - 1 && s.xp >= need(b, st)) {
        s.have[b.key] = st + 1; s.xp = 0; ev = { kind: 'grow', beast: b, stage: st + 1 };
        if (st + 1 >= b.stages.length - 1) s.cur = null;   // fully grown: the next right answer brings a new egg
      }
    }
    save(u, s);
    return ev;
  }
  // what the player is raising right now, for the little bar above the cards
  function companion(u) {
    const s = state(u); if (!s.cur) return null;
    const b = byKey(s.cur); if (!b) return null;
    const st = s.have[b.key] || 0;
    return { beast: b, stage: st, xp: s.xp || 0, need: need(b, st), last: st >= b.stages.length - 1 };
  }
  function scene(u) {
    const c = companion(u); if (c) return c.beast.el;
    const s = state(u), k = s.order[s.order.length - 1], b = k && byKey(k);
    return b ? b.el : 'earth';
  }
  const count = u => { const s = state(u); let n = 0; for (const k in s.have) n += (s.have[k] || 0) + 1; return n; };
  const totalStages = () => (list || []).reduce((n, b) => n + b.stages.length, 0);
  return { load, state, onRight, companion, scene, count, totalStages, img, need, byKey, list: () => list || [], ELEMENT, STAGE, ART };
})();
