/* Beasts: monster eggs that drop at random while you answer cards, like cards from a pack, and the
   Beastpedia that collects them. A duplicate of a monster you already have evolves it one stage
   (egg → baby → teen → adult). The pictures and names are the artist's MemiBeasts set (art/beasts/):
   each beast has up to four stages, a one-line ecology and an element that colours the scene behind
   the cards. Progress lives in latin.beasts.<id>: { have: { key: stage }, order: [keys as found],
   last: key of the latest find, finds, total: right answers }. */
const Beasts = (() => {
  const ART = 'art/beasts/';
  const ELEMENT = { earth: ['🪨', 'Earth'], grass: ['🌿', 'Grass'], water: ['💧', 'Water'], snow: ['❄️', 'Snow'], fire: ['🔥', 'Fire'], crystal: ['💎', 'Crystal'] };
  const STAGE = { egg: 'Egg', baby: 'Baby', teen: 'Teen', adult: 'Adult' };
  let list = null, loading = null;
  function load() {
    if (list) return Promise.resolve(list);
    return loading || (loading = fetch(ART + 'beasts.json').then(r => r.json()).then(j => (list = j)).catch(() => (list = [])));
  }
  const key = u => 'latin.beasts.' + u.id;
  const fresh = () => ({ have: {}, order: [], last: null, finds: 0, total: 0 });
  const state = u => Object.assign(fresh(), store.get(key(u), null) || {});
  const save = (u, s) => store.set(key(u), s);
  const byKey = k => (list || []).find(b => b.key === k) || null;
  const img = (b, i) => ART + b.key + '_' + b.stages[i].s + '.webp';
  // which monster an egg turns out to be: any of them, at random, like a card from a pack
  const roll = () => (list || [])[Math.floor(Math.random() * list.length)];
  // called on every right answer with the streak so far. Eggs drop at random (about one in twelve), always on a combo
  // (3, 5, 8, 10 in a row, then every 5) and always on a new player's first right answer. A monster you already have
  // is a duplicate, and a duplicate evolves it one stage: egg → baby → teen → adult.
  // Returns { kind: 'egg' | 'grow', beast, stage } when an egg drops, else null.
  function onRight(u, streak = 0) {
    if (!list || !list.length) return null;
    const s = state(u); s.total = (s.total || 0) + 1;
    const combo = streak === 3 || streak === 5 || streak === 8 || (streak >= 10 && streak % 5 === 0);
    const drop = s.total === 1 || combo || Math.random() < 1 / 12;
    let ev = null;
    if (drop) {
      let b = roll();
      if (b.key in s.have && s.have[b.key] >= b.stages.length - 1) {   // a duplicate of a fully grown one: try once more for something that can still grow
        const open = list.filter(x => !(x.key in s.have) || s.have[x.key] < x.stages.length - 1);
        if (open.length) b = open[Math.floor(Math.random() * open.length)];
      }
      if (!(b.key in s.have)) { s.have[b.key] = 0; s.order.push(b.key); ev = { kind: 'egg', beast: b, stage: 0 }; }
      else if (s.have[b.key] < b.stages.length - 1) { s.have[b.key]++; ev = { kind: 'grow', beast: b, stage: s.have[b.key] }; }
      if (ev) { s.last = b.key; s.finds = (s.finds || 0) + 1; }
    }
    save(u, s);
    return ev;
  }
  // the latest find, for the little bar above the cards
  function latest(u) {
    const s = state(u), k = s.last || s.order[s.order.length - 1], b = k && byKey(k);
    return b ? { beast: b, stage: s.have[b.key] || 0, finds: s.finds || s.order.length } : null;
  }
  function scene(u) { const l = latest(u); return l ? l.beast.el : 'earth'; }
  const count = u => { const s = state(u); let n = 0; for (const k in s.have) n += (s.have[k] || 0) + 1; return n; };
  const totalStages = () => (list || []).reduce((n, b) => n + b.stages.length, 0);
  return { load, state, onRight, latest, scene, count, totalStages, img, byKey, list: () => list || [], ELEMENT, STAGE, ART };
})();
