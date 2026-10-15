/* Beasts: monster eggs that drop at random while you answer cards, like cards from a pack, and the
   Beastpedia that collects them. A duplicate of a monster you already have evolves it one stage
   (egg → baby → teen → adult). The pictures and names are the artist's MemiBeasts set (art/beasts/):
   each beast has up to four stages, a one-line ecology and an element that colours the scene behind
   the cards. Progress lives in latin.beasts.<id>: { have: { key: stage }, order: [keys as found],
   spare: { key: spare copies of a fully grown monster, to give away }, last: key of the latest find, finds, total right answers, played cards }. */
const Beasts = (() => {
  const ART = 'art/beasts/';
  const ELEMENT = { earth: ['🪨', 'Earth'], grass: ['🌿', 'Grass'], water: ['💧', 'Water'], snow: ['❄️', 'Snow'], fire: ['🔥', 'Fire'], crystal: ['💎', 'Crystal'] };
  const STAGE = { egg: 'Egg', baby: 'Baby', teen: 'Teen', adult: 'Adult' };
  let list = null, loading = null;
  function load() {
    if (list) return Promise.resolve(list);
    return loading || (loading = fetch(ART + 'beasts.json').then(r => r.json()).then(j => { list = j; ahead(); return list; }).catch(() => (list = [])));
  }
  const key = u => 'latin.beasts.' + u.id;
  const fresh = () => ({ have: {}, order: [], spare: {}, last: null, finds: 0, total: 0 });
  const state = u => Object.assign(fresh(), store.get(key(u), null) || {});
  const save = (u, s) => store.set(key(u), s);
  const byKey = k => (list || []).find(b => b.key === k) || null;
  const img = (b, i) => ART + b.key + '_' + b.stages[i].s + '.webp';
  // which monster an egg turns out to be: any of them, at random, like a card from a pack. The next one is rolled
  // ahead of time and its pictures fetched, so the fanfare never waits for the network
  let next = null;
  const preload = b => { if (!b) return; b.stages.forEach((s, i) => { const im = new Image(); im.src = img(b, i); }); };
  const ahead = () => { if (!next && list && list.length) { next = list[Math.floor(Math.random() * list.length)]; preload(next); } };
  const roll = () => { ahead(); const b = next; next = null; ahead(); return b; };
  // called on every card played, right or wrong, with the streak so far. A beast drops every 5 right answers in a
  // row (5, 10, 15…), every 20 cards played (right or wrong), and on a new player's first right answer. A monster you
  // already have is a duplicate, and a duplicate evolves it one stage: egg → baby → teen → adult.
  // Returns { kind: 'egg' | 'grow' | 'spare', beast, stage } when a beast drops, else null.
  function onCard(u, ok, streak = 0) {
    if (!list || !list.length) return null;
    const s = state(u); s.played = (s.played || 0) + 1; if (ok) s.total = (s.total || 0) + 1;
    const drop = (ok && (s.total === 1 || (streak > 0 && streak % 5 === 0))) || s.played % 20 === 0;
    let ev = null;
    if (drop) {
      const b = roll();
      s.spare = s.spare || {};
      if (!(b.key in s.have)) { s.have[b.key] = 0; s.order.push(b.key); ev = { kind: 'egg', beast: b, stage: 0 }; }
      else if (s.have[b.key] < b.stages.length - 1) { s.have[b.key]++; ev = { kind: 'grow', beast: b, stage: s.have[b.key] }; }
      else { s.spare[b.key] = (s.spare[b.key] || 0) + 1; ev = { kind: 'spare', beast: b, stage: s.have[b.key] }; }   // fully grown already: a spare, to give to a friend
      if (ev) { s.last = b.key; s.finds = (s.finds || 0) + 1; }
    }
    save(u, s);
    return ev;
  }
  const onRight = (u, streak) => onCard(u, true, streak);
  // giving a spare away, and taking a gift in: a gift of a monster you don't have (or have at a lower stage) goes
  // straight into the Beastpedia at the sender's stage; one you already have fully grown becomes a spare
  function give(u, k) { const s = state(u); s.spare = s.spare || {}; if (!(s.spare[k] > 0)) return false; s.spare[k]--; if (!s.spare[k]) delete s.spare[k]; save(u, s); return true; }
  function receive(u, k, stage) {
    const b = byKey(k); if (!b) return null;
    const s = state(u); s.spare = s.spare || {}; stage = Math.max(0, Math.min(+stage || 0, b.stages.length - 1));
    let ev;
    if (!(k in s.have)) { s.have[k] = stage; s.order.push(k); ev = { kind: 'gift', beast: b, stage }; }
    else if (s.have[k] < stage) { s.have[k] = stage; ev = { kind: 'gift', beast: b, stage }; }
    else if (s.have[k] >= b.stages.length - 1) { s.spare[k] = (s.spare[k] || 0) + 1; ev = { kind: 'gift', beast: b, stage: s.have[k], spare: true }; }
    else { s.have[k]++; ev = { kind: 'gift', beast: b, stage: s.have[k] }; }   // a lower or equal stage still counts as a duplicate: it evolves
    s.last = k; s.finds = (s.finds || 0) + 1; save(u, s);
    return ev;
  }
  const spares = u => { const s = state(u); return Object.entries(s.spare || {}).filter(([k, n]) => n > 0 && byKey(k)).map(([k, n]) => ({ beast: byKey(k), n, stage: s.have[k] || 0 })); };
  // the latest find, for the little bar above the cards
  function latest(u) {
    const s = state(u), k = s.last || s.order[s.order.length - 1], b = k && byKey(k);
    return b ? { beast: b, stage: s.have[b.key] || 0, finds: s.finds || s.order.length } : null;
  }
  function scene(u) { const l = latest(u); return l ? l.beast.el : 'earth'; }
  const count = u => { const s = state(u); let n = 0; for (const k in s.have) n += (s.have[k] || 0) + 1; return n; };
  const totalStages = () => (list || []).reduce((n, b) => n + b.stages.length, 0);
  return { load, state, onCard, onRight, give, receive, spares, latest, scene, count, totalStages, img, byKey, list: () => list || [], ELEMENT, STAGE, ART };
})();
