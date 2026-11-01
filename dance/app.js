/* Dance Sisters (Dance Evolution until v38) — tap, drag to merge, evolve.
   The Merge Beasts engine with dancers: 36 stages × 3 sisters = 108 levels (dancers.json + art/*.png sprite sheets drawn
   by scratchpad/dancers/sisters.py), each level a 6–8 frame dance loop. The three sisters are named below (the owner's
   decision, 30 Oct 2026: the names are fixed in the game); a level is "<stage> <name>". Save in
   localStorage['dance.save']; nothing is sent anywhere. */
'use strict';
const APP_VERSION = '69';
const ART = 'art/'; let ART_V = '';
const NAMES = ['Lainey', 'Miri', 'Juliette'];   // youngest first
let SPEC = null;
const SCALE = 0.875;   // sprite pixels (96 × 128 sheets, the cute design at double resolution) → screen pixels on the field (84 × 112)
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EL = { earth: ['🪨', 'Earth'], grass: ['🌿', 'Grass'], water: ['💧', 'Water'], snow: ['❄️', 'Snow'], fire: ['🔥', 'Fire'], crystal: ['💎', 'Crystal'] };
const WORLDS = [   // by stage index (0-based): nine rooms of four stages, each with its own pixel room (scratchpad/dancers/backgrounds.py, academy.py, rooms2.py)
  { name: 'Nursery', stages: [0, 3], bg: 'art/bg_nursery.png' },
  { name: 'Dance school', stages: [4, 7], bg: 'art/bg_school.png' },
  { name: 'Ballet theatre', stages: [8, 11], bg: 'art/bg_theatre.png' },
  { name: 'City stage', stages: [12, 15], bg: 'art/bg_city.png' },
  { name: 'World tour', stages: [16, 19], bg: 'art/bg_tour.png' },
  { name: 'Academy', stages: [20, 23], bg: 'art/bg_academy.png' },
  { name: 'Studio', stages: [24, 27], bg: 'art/bg_studio.png' },
  { name: 'Stage door', stages: [28, 31], bg: 'art/bg_stagedoor.png' },
  { name: 'Hall of fame', stages: [32, 36], bg: 'art/bg_hall.png' },   // stage 36 is the Spirit of Dance, one level above Legend Juliette
];
const DESC = ['Already bopping to the music in her cot.', 'First tutu, first wobbly twirl.', 'Party hat, balloon and a birthday bounce.', 'Star of the nursery show.',
  'Her first leotard — and first position.', 'Plié, arabesque, skip: dance school every Saturday.', 'The first real tutu, worn everywhere.', 'Top hat, stripes and jazz hands.',
  'Up on pointe at last.', 'The Swan: white tutu and a tiara.', 'The Sugar Plum Fairy, wand and all.', 'Prima ballerina, curtain call.',
  'Hip-hop, breaking and street style.', 'Bowler hat and tap shoes: shuffle, hop, step.', 'Salsa night: ruffles and red heels.', 'Headlining the show with a microphone.',
  'Flamenco, Bollywood and tango around the world.', 'Bollywood: bangles, a flower and a hundred wrist circles.', 'Flashbulbs on the red carpet.', 'A waltz at the palace, tiara and all.',
  'Passing it on: her very own dance school.', 'The examiner: marks on the clipboard, a nod.', 'The judge holds up a 10.', 'Graduation day: cap, gown and a jump for joy.',
  'Warming up: leg warmers and a water bottle.', 'Five, six, seven, eight — making the dances now.', 'Dance captain: leading the line.', 'The coach in her tracksuit: squats, stretches, claps.',
  'The understudy in the wings, script in hand.', 'Opening night: the bow from the wings.', 'The leading lady: boa, gloves and the pose.', 'The producer, on the phone, making it happen.',
  'An icon: her very first move, perfected.', 'A gold statue that comes to life.', 'Superstar: gold fringe and flashbulbs.', 'A Dance Legend in a golden gown.', 'The spirit grows.'];
// economy: a beast at level L earns RATE(L) a second; the next crate level, a bought beast and the upgrades scale with it
const GROW = 1.33;
const RATE = L => 0.5 * Math.pow(GROW, L) * (save && save.encore ? 1 + 0.5 * save.encore : 1) * (save && save.hard ? Math.pow(.5, save.hard) : 1);   // an Encore (new game after the finale) adds 50 % for ever
const fmt = n => { if (n < 1000) return String(Math.floor(n)); const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qd', 'Qn', 'Sd', 'St', 'Od', 'Nd', 'Vg']; let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i]; };
const UPS = {
  crate: { ic: '<img src="art/bag.png" alt="">', name: 'Faster dance bags', desc: n => `A bag every ${crateEvery(n).toFixed(0)} s`, cost: n => 120 * Math.pow(2.4, n), max: 12 },
  cap: { ic: '<img src="art/stage.png" alt="">', name: 'Bigger stage', desc: n => `Room for ${capOf(n)} dancers`, cost: n => 600 * Math.pow(3.2, n), max: 5 },
  tap: { ic: '<img src="art/clap.png" alt="">', name: 'Louder applause', desc: n => `A tap gives ${tapMult(n)}× a dancer's coin`, cost: n => 80 * Math.pow(2.6, n), max: 10 },
  away: { ic: '<img src="art/manager.png" alt="">', name: 'Manager', desc: n => `Earns ${Math.round(awayFrac(n) * 100)}% while you are away, up to ${awayHours(n)} h`, cost: n => 400 * Math.pow(3, n), max: 6 },
};
const crateEvery = n => Math.max(3, 16 * Math.pow(0.86, n));
const capOf = n => 10 + 2 * n;
const tapMult = n => 3 + 2 * n;
const awayFrac = n => Math.min(1, 0.25 + 0.15 * n);
const awayHours = n => 2 + 2 * n;

let LEGEND = 107, SPIRIT = 108, CHAIN = [], WORLD_OF = [], save, field, els = {}, lastTick = Date.now(), crateAt = 0, ticking = false;
const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

/* ---------- the chain: 14 stages × 3 sisters, from dancers.json ---------- */
async function buildChain() {
  // the dancers list and the font: fetched (retried, caches bypassed on a retry), kept in localStorage as the last good copy
  // so the game still starts offline after an update on a poor connection
  const get = async (url, key) => {
    for (let i = 0; i < 3; i++) { try { const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 4000); const r = await fetch(url, { cache: i ? 'reload' : 'default', signal: ac.signal }); clearTimeout(tm); if (r.ok) { const j = await r.json(); store.set(key, j); return j; } } catch (e) {} await new Promise(r => setTimeout(r, 500)); }
    const saved = store.get(key, null); if (saved) return saved; throw new Error('Could not load ' + url);
  };
  SPEC = await get('dancers.json', 'dance.spec'); FONT = await get('art/font.json', 'dance.font');
  // pictures are served cache-first by the worker, so a redrawn picture gets a new address: ?v= the art stamp from dancers.json
  ART_V = SPEC.artv || ''; const stamp = u => ART_V ? u + '?v=' + ART_V : u;
  SPEC.levels.forEach(l => { l.sheet = stamp(l.sheet); (l.tiers || []).forEach(t => { t.sheet = stamp(t.sheet); }); }); WORLDS.forEach(w => { w.bg = stamp(w.bg.replace(/\?.*$/, '')); });
  CHAIN = SPEC.levels.map((l, i) => ({ ...l, world: WORLDS.findIndex(w => l.stage >= w.stages[0] && l.stage <= w.stages[1]), last: l.sister === 2 || l.sister < 0, spirit: l.sister < 0, pic: l.sheet, desc: DESC[l.stage] }));
  LEGEND = CHAIN.findIndex(c => c.stageName === 'Legend' && c.sister === 2); SPIRIT = CHAIN.length - 1;
  WORLDS.forEach((w, i) => { const lv = CHAIN.map((c, k) => c.world === i ? k : -1).filter(k => k >= 0); w.start = lv[0]; w.end = lv[lv.length - 1]; });
  CHAIN.forEach((c, i) => { WORLD_OF[i] = c.world; });
}
// the name above a dancer's head, two lines ("Baby" / "<name>") in the 5 × 7 pixel font of art/font.png (FONT lists its glyphs;
// accents are stripped and an unknown character is skipped)
let FONT = '';
const pixText = t => `<span class="pt">${[...t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')].map(ch => { const i = FONT.indexOf(ch); return i < 0 ? '' : `<i style="--i:${i}"></i>`; }).join('')}</span>`;
const lvHTML = (n, c) => `<span class="lv" style="top:${Math.round((c.top || 0) * SCALE) - 27}px">${c.spirit ? pixText('Spirit of') + pixText('Dance') : pixText(c.stageName) + pixText(NAMES[c.sister] || '')}</span>`;
const nameOf = c => `${c.stageName} ${NAMES[c.sister] || ''}`.trim();
// a dancer: a div showing one frame of her sprite sheet, the loop stepped by CSS
function spriteHTML(c, scale = SCALE, cls = 'spr') {
  const w = (c.w || SPEC.w) * scale, h = (c.h || SPEC.h) * scale;
  return `<div class="${cls}" data-frames="${c.frames}" data-fw="${w}" style="width:${w}px;height:${h}px;background-image:url('${c.sheet}');background-size:${w * c.frames}px ${h}px"></div>`;
}
// the loops are stepped here, not by CSS: every 40 ms each sprite shows its next frame (a still sprite keeps frame 0)
let frameNo = 0;
setInterval(() => { frameNo++; document.querySelectorAll('.spr:not(.still)').forEach(el => { const n = +el.dataset.frames || 1; el.style.backgroundPositionX = -((frameNo % n) * +el.dataset.fw) + 'px'; }); }, 40);
// every sheet is fetched once at the start, so a merge never waits for the network
function preloadSheets() { SPEC.levels.forEach(l => { const i = new Image(); i.src = l.sheet; (l.tiers || []).forEach(t => { const j = new Image(); j.src = t.sheet; }); }); }
/* everything the game needs is fetched once in the background, so the worker holds it and the game plays with no
   connection afterwards: every sheet, every room, the icons; done again only when the art or the app changes */
const OFFLINE_FILES = ['art/bag.png', 'art/book.png', 'art/clap.png', 'art/coin.png', 'art/coin1.png', 'art/home.png', 'art/manager.png', 'art/shoe.png', 'art/stage.png', 'art/star.png', 'art/trophy.png', 'art/up.png', 'art/font.png', 'art/font_w.png', 'art/font.json', 'icons/icon-192.png', 'icons/icon-512.png', 'manifest.webmanifest'];
async function saveOffline() {
  if (!('serviceWorker' in navigator) || !window.caches) return;
  const stamp = ART_V + ':' + APP_VERSION; if (store.get('dance.offline', '') === stamp) return;
  try { await navigator.serviceWorker.ready; } catch (e) { return; }
  const urls = [...new Set([...SPEC.levels.map(l => l.sheet), ...SPEC.levels.flatMap(l => (l.tiers || []).map(t => t.sheet)), ...WORLDS.map(w => w.bg), ...OFFLINE_FILES])];
  let missing = 0;
  for (const u of urls) {
    try { const r = await fetch(u); if (!r.ok) missing++; else await r.arrayBuffer(); } catch (e) { missing++; }
    await new Promise(r => setTimeout(r, 40));
  }
  if (missing) return;   // try again next time the game opens
  const first = !store.get('dance.offline', ''); store.set('dance.offline', stamp);
  if (first) toast('✅ Saved on this phone — the game now plays without internet');
}

/* ---------- the save ---------- */
function load() {
  save = store.get('dance.save', null) || { coins: 0, world: 0, unlocked: 0, fields: {}, crate: {}, up: { crate: 0, cap: 0, tap: 0, away: 0 }, seen: {}, t: Date.now(), total: 0, chainv: 2 };   // chainv 2: a new game is never put through the old-chain conversion below (v60 — it had shifted every room's first bag three levels up, skipping the Leotard dancers)
  if (!save.fields || typeof save.fields !== 'object') save.fields = {}; if (!save.crate) save.crate = {}; if (!save.up) save.up = { crate: 0, cap: 0, tap: 0, away: 0 }; if (!save.seen) save.seen = {};
  if (!(save.world >= 0 && save.world < WORLDS.length)) save.world = 0; if (!(save.unlocked >= 0)) save.unlocked = 0;
  for (let w = 0; w < WORLDS.length; w++) { save.fields[w] = save.fields[w] || []; if (save.crate[w] == null) save.crate[w] = WORLDS[w].start; }
  // v36 went from 20 stages to 36: a save from before is remapped by stage name (every old level keeps its dancer, bag and pedia entry)
  if ((save.chainv || 1) < 2) {
    const OLD = ['Baby', 'Tot', 'Nursery', 'Leotard', 'Dance school', 'First tutu', 'Jazz', 'En pointe', 'Swan', 'Prima', 'Street', 'Stage star', 'World tour', 'Movie star', 'Royal gala', 'Teacher', 'Choreographer', 'Director', 'Icon', 'Legend'];
    const map = old => { const st = SPEC.stages.indexOf(OLD[Math.floor(old / 3)]); return st < 0 ? null : st * 3 + old % 3; };
    for (const w in save.fields) save.fields[w] = save.fields[w].map(b => (b && map(b.lv) != null) ? { ...b, lv: map(b.lv) } : null).filter(Boolean);
    for (const w in save.crate) { const m = map(save.crate[w]); if (m != null) save.crate[w] = m; }
    const seen = {}; for (const k in save.seen) { const m = map(+k); if (m != null) seen[m] = 1; } save.seen = seen;
    save.chainv = 2;
  }
  // rooms can be split in an update (v35 split the Academy into four): every dancer moves to the room of her stage, a bag that
  // pointed into a later room moves there too (clamped inside each room's levels), and the open rooms follow what has been made
  const all = Object.values(save.fields).flat().filter(b => b && CHAIN[b.lv]);
  for (let w = 0; w < WORLDS.length; w++) save.fields[w] = all.filter(b => CHAIN[b.lv].world === w);
  for (let w = 0; w < WORLDS.length; w++) {
    const W_ = WORLDS[w], c = save.crate[w];
    if (c > W_.end) { for (let v = w + 1; v < WORLDS.length; v++) if (c >= WORLDS[v].start && (save.crate[v] == null || save.crate[v] < Math.min(c, WORLDS[v].end))) save.crate[v] = Math.min(c, WORLDS[v].end); }
    save.crate[w] = Math.max(W_.start, Math.min(W_.end, c));
  }
  // a bag can only have been upgraded past a level once that level was made, so a bag sitting above an unmade level of its room
  // was pushed there by the old conversion: it goes back to the lowest unmade level (the skipped dancers then come from the bag)
  for (let w = 0; w < WORLDS.length; w++) {
    const W_ = WORLDS[w]; let low = W_.start; while (low < save.crate[w] && save.seen[low]) low++;
    if (low < save.crate[w]) save.crate[w] = low;
  }
  const made = Object.keys(save.seen).map(Number).filter(k => CHAIN[k]); const top = Math.max(-1, ...made, ...all.map(b => b.lv));
  if (top >= 0) { let u = CHAIN[top].world; for (let w = 0; w < WORLDS.length - 1; w++) if (save.seen[WORLDS[w].end]) u = Math.max(u, w + 1); save.unlocked = Math.max(save.unlocked, Math.min(u, WORLDS.length - 1)); }
  if (save.world > save.unlocked) save.world = save.unlocked;
}
let saveTimer = 0;
const persist = () => { save.t = Date.now(); store.set('dance.save', save); };   // written at once: a force-closed app loses nothing
const earns = b => RATE(b.lv) * (b.lv === SPIRIT ? (b.sl || 1) : 1);   // the Spirit of Dance earns its level times a dancer's rate
const income = () => Object.values(save.fields).flat().reduce((s, b) => s + earns(b), 0);
/* the Spirit of Dance: a level 1–100 in the middle of the cloud, which grows at 10 / 30 / 50 / 75; at 100 the game is won */
const SPIRIT_MAX = 100;
// the Spirit grows at 5 / 10 / 25 / 40 (the same cloud, bigger) and becomes a new, larger cloud at 50 / 70 / 90 (`tiers` in dancers.json, drawn by spirit.py)
const SPIRIT_GROWS = [5, 10, 25, 40, 50, 70, 90];
const spiritTier = sl => sl >= 90 ? 3 : sl >= 70 ? 2 : sl >= 50 ? 1 : 0;
const spiritScale = sl => sl >= 90 ? 1.65 : sl >= 70 ? 1.5 : sl >= 50 ? 1.35 : sl >= 40 ? 1.25 : sl >= 25 ? 1.1 : sl >= 10 ? .95 : sl >= 5 ? .8 : .65;
const spiritPic = sl => { const c = CHAIN[SPIRIT], t = (c.tiers || [])[spiritTier(sl)]; return t ? { ...c, sheet: t.sheet, top: t.top, w: t.w, h: t.h, mid: t.mid } : c; };

/* ---------- the field ---------- */
function mount() {
  field = $('#field');
  const w = save.world;
  field.style.backgroundImage = `url('${WORLDS[w].bg}')`;
  field.querySelectorAll('.beast, .crate, .coin, .drop').forEach(e => e.remove());
  els = {};
  save.fields[w] = save.fields[w].filter(b => b && CHAIN[b.lv]);
  save.fields[w].forEach(b => place(b));
  const last = field.querySelector('.beast:last-of-type'); if (last) last.classList.add('last');
  renderWorlds(); refresh(); hint();
}
function renderWorlds() {
  $('#worlds').innerHTML = WORLDS.map((w, i) => `<button data-w="${i}" aria-pressed="${i === save.world}" class="${i > save.unlocked ? 'locked' : ''}">${i > save.unlocked ? '🔒 ' : ''}${w.name}</button>`).join('');
  $('#worlds').querySelectorAll('button').forEach(b => { b.onclick = () => { const i = +b.dataset.w; if (i > save.unlocked) { toast(`Make ${nameOf(CHAIN[WORLDS[i - 1].end])} to open ${WORLDS[i].name}`); return; } save.world = i; persist(); mount(); }; });
}
function hint() {
  const n = save.fields[save.world].length, h = $('#hint');
  h.textContent = n === 0 ? 'Tap the dance bag to meet your first dancer' : n < 2 ? 'Tap a dancer for coins · merge two of the same dancer' : n >= capOf(save.up.cap) ? 'Stage full — merge some dancers' : '';
}
const rnd = (a, b) => a + Math.random() * (b - a);
function spot() { return { x: rnd(14, 86), y: rnd(60, 92) }; }
function place(b, pop = false) {
  const el = document.createElement('div'); el.className = 'beast' + (pop ? ' pop' : '') + (Math.random() < .5 ? ' flip' : '') + (CHAIN[b.lv].stage === 0 ? ' crawl' : '');
  const pic = b.lv === SPIRIT ? spiritPic(b.sl || 1) : CHAIN[b.lv];
  el.innerHTML = `${spriteHTML(pic)}${lvHTML(b.lv + 1, pic)}`;
  if (b.lv === SPIRIT) {   // the cloud: semi-transparent, sized by its level (a bigger picture from 50 / 70 / 90), the level number in the middle
    const sl = b.sl || 1, ss = spiritScale(sl), tier = spiritTier(sl); el.classList.add('spirit'); el.style.setProperty('--ss', ss);
    el.insertAdjacentHTML('beforeend', `<span class="sn" style="--ss:${ss * (1.6 + tier * .35)};bottom:${Math.round((pic.mid || 61) * SCALE * ss)}px">${pixText(String(sl))}</span>`);
    const lv = el.querySelector('.lv'); if (lv) lv.style.top = Math.round(112 - ((pic.h || SPEC.h) - (pic.top || 0)) * SCALE * ss) - 27 + 'px';
  }
  el.style.left = b.x + '%'; el.style.top = b.y + '%';
  el.dataset.id = b.id; els[b.id] = el; field.appendChild(el);
  bindBeast(el, b);
}
function wander() {
  if (field.querySelector('.beast.drag')) return;   // nobody moves while a beast is being carried
  // a baby only moves across the floor while her loop is crawling (`crawl` in dancers.json lists the runs of frames on all fours),
  // starting as a run begins and arriving before it ends
  for (const b of save.fields[save.world]) {
    const c = CHAIN[b.lv]; let run = null;
    if (c.crawl) { const k = frameNo % c.frames; run = c.crawl.find(r => k >= r[0] && k < r[0] + 5 && r[1] - r[0] > 8); if (!run) continue; }
    if (Math.random() < (run ? .7 : .25) && !(els[b.id] && els[b.id].classList.contains('drag'))) {
      if (run && els[b.id]) els[b.id].style.transitionDuration = ((run[1] - run[0]) * 40 - 100) + 'ms'; const s = spot(); const el = els[b.id]; if (el) { el.classList.toggle('flip', s.x < b.x); } b.x = s.x; b.y = s.y; if (el) { el.style.left = s.x + '%'; el.style.top = s.y + '%'; } } }
}
let nextId = () => (save.nid = (save.nid || 0) + 1);
function addBeast(lv, at, pop = true, sl = 1) {
  const w = save.world; const s = at || spot();
  const b = { id: nextId(), lv, x: s.x, y: s.y }; if (lv === SPIRIT) b.sl = sl; save.fields[w].push(b); place(b, pop);
  discover(lv); persist(); refresh(); hint();
  return b;
}
function removeBeast(b) { const f = save.fields[save.world]; const i = f.indexOf(b); if (i >= 0) f.splice(i, 1); const el = els[b.id]; if (el) el.remove(); delete els[b.id]; }

/* ---------- touch: tap for a coin, drag onto a twin to merge ---------- */
// the dancer touched last comes to the front and keeps her name in black and bold until another is touched
function front(el) { field.querySelectorAll('.beast.last').forEach(e => e.classList.remove('last')); el.classList.add('last'); field.appendChild(el); }
function bindBeast(el, b) {
  let start = null, moved = false, target = null;
  el.onpointerdown = e => { start = { x: e.clientX, y: e.clientY }; moved = false; el.classList.add('hold'); front(el); el.setPointerCapture(e.pointerId); };
  el.onpointermove = e => {
    if (!start) return;
    if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
    moved = true; el.classList.add('drag');
    const r = field.getBoundingClientRect();
    b.x = Math.max(6, Math.min(94, (e.clientX - r.left) / r.width * 100)); b.y = Math.max(20, Math.min(94, (e.clientY - r.top) / r.height * 100));
    el.style.left = b.x + '%'; el.style.top = b.y + '%';
    const t = twinNear(b); if (t !== target) { if (target && els[target.id]) els[target.id].classList.remove('target'); target = t; if (t && els[t.id]) els[t.id].classList.add('target'); }
  };
  el.onpointerup = el.onpointercancel = e => {
    if (!start) return; start = null;
    el.classList.remove('drag', 'hold');
    if (target && els[target.id]) els[target.id].classList.remove('target');
    if (!moved) { tap(b, e); return; }
    if (target) merge(b, target); else persist();
    target = null;
  };
}
// the twin nearest the dragged beast, measured where the beasts are drawn (a wandering beast is mid-glide)
function twinNear(b) {
  const me = els[b.id]; if (!me) return null; const m = me.getBoundingClientRect(), mx = m.left + m.width / 2, my = m.top + m.height / 2;
  let best = null, bd = 48;
  for (const o of save.fields[save.world]) { if (o === b || !canMerge(b, o) || !els[o.id]) continue; const r = els[o.id].getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my); if (d < bd) { bd = d; best = o; } }
  return best;
}
function tap(b, e) {
  const v = earns(b) * tapMult(save.up.tap) * 2;
  earn(v, b.x, b.y - 6);
  const el = els[b.id]; if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}
function earn(v, x, y) {
  save.coins += v; save.total = (save.total || 0) + v;
  const c = document.createElement('span'); c.className = 'coin'; c.innerHTML = '<i class="cn"></i>+' + fmt(v); c.style.left = x + '%'; c.style.top = y + '%'; field.appendChild(c); setTimeout(() => c.remove(), 1000);
  refresh(); persist();
}
// two of the same dancer merge; the Spirit of Dance also absorbs a Legend Juliette (+1) or another Spirit (the levels add)
const canMerge = (a, o) => o.lv === a.lv || (a.lv === SPIRIT && o.lv === LEGEND) || (a.lv === LEGEND && o.lv === SPIRIT);
function merge(a, t) {
  if (a.lv === SPIRIT || t.lv === SPIRIT) {
    const sl = Math.min(SPIRIT_MAX, (a.lv === SPIRIT ? a.sl || 1 : 1) + (t.lv === SPIRIT ? t.sl || 1 : 1)), was = Math.max(a.sl || 0, t.sl || 0), at = { x: t.x, y: t.y };
    removeBeast(a); removeBeast(t); addBeast(SPIRIT, at, true, sl); sparks(at.x, at.y);
    const grew = SPIRIT_GROWS.some(g => was < g && sl >= g); if (grew && sl < SPIRIT_MAX) toast(`✨ The Spirit of Dance grows — level ${sl}`);
    if (sl >= SPIRIT_MAX && !save.won) { save.won = Date.now(); persist(); setTimeout(won, 1200); }
    return;
  }
  const lv = a.lv + 1;
  const at = { x: t.x, y: t.y };
  removeBeast(a); removeBeast(t);
  const b = addBeast(lv, at);
  sparks(at.x, at.y);
  if (CHAIN[lv].sister === 0 || CHAIN[lv].last) fanfare(lv);
  if (lv === WORLDS[save.world].end && save.unlocked === save.world && save.world < WORLDS.length - 1) { save.unlocked++; persist(); renderWorlds(); setTimeout(() => toast(`🎉 ${WORLDS[save.unlocked].name} is open!`), 1400); }
}
function discover(lv) {
  if (!save.seen[lv]) { save.seen[lv] = 1; $('#pediaBtn').classList.add('pulse'); }
  if (lv === LEGEND && !save.finished) { save.finished = Date.now(); persist(); setTimeout(finale, 1500); }
  if (lv === SPIRIT && !save.spirit) { save.spirit = Date.now(); persist(); }
}
/* ---------- the ending: a curtain call the first time the last dancer is made; then two Legend Juliettes become the Spirit of Dance, and level 100 wins ---------- */
function finale() {
  document.querySelectorAll('.fanfare').forEach(f => f.remove());
  const trio = CHAIN.slice(LEGEND - 2, LEGEND + 1).map(c => `<div class="legend">${spriteHTML(c, 1.25)}</div>`).join('');
  const f = document.createElement('div'); f.className = 'finale';
  f.innerHTML = `<div class="curtain l"></div><div class="curtain r"></div><div class="show"><div class="kicker">CURTAIN CALL</div><h1>You did it!</h1><p>All three sisters are Dance Legends — from the cot to the golden gown.</p><div class="trio">${trio}</div><img class="trophy" src="art/trophy.png" alt=""><p class="small">The game goes on: two Legend Juliettes become the Spirit of Dance, and feeding it takes you to the very end.</p><button class="btn" id="bow">Take a bow 🌹</button></div>`;
  document.body.appendChild(f);
  requestAnimationFrame(() => f.classList.add('open'));
  for (let i = 0; i < 40; i++) setTimeout(() => { const s = document.createElement('span'); s.className = 'spark'; s.style.left = rnd(10, 90) + '%'; s.style.top = '-10px'; s.style.background = ['#f2a541', '#ff7bb0', '#7ec8ff', '#fff', '#ffd866'][i % 5]; s.style.setProperty('--dx', rnd(-60, 60) + 'px'); s.style.setProperty('--dy', rnd(300, 700) + 'px'); s.style.animationDuration = '2.6s'; document.body.appendChild(s); setTimeout(() => s.remove(), 2700); }, i * 90);
  $('#bow').onclick = () => f.remove();
}
function won() {
  document.querySelectorAll('.fanfare, .finale').forEach(f => f.remove());
  const f = document.createElement('div'); f.className = 'finale won';
  f.innerHTML = `<div class="curtain l"></div><div class="curtain r"></div><div class="show"><div class="kicker">THE SPIRIT OF DANCE · LEVEL ${SPIRIT_MAX}</div><h1>Congratulations</h1>
    <div class="trio"><div class="legend">${spriteHTML(CHAIN[SPIRIT], 1.5)}</div></div>
    <p>The girls have gone beyond being physical dancers and have become the universal spirit of dance itself. All dancers forever will channel their power and energy through them. The girls will never die, and the dancing will never end. The universe is a more harmonious place, and everyone has better moves.</p>
    <p><b>Would you like to restart the game on HARD mode?</b></p><button class="btn" id="hardBtn">RESTART ON HARD MODE</button></div>`;
  document.body.appendChild(f); requestAnimationFrame(() => f.classList.add('open'));
  for (let i = 0; i < 60; i++) setTimeout(() => { const s = document.createElement('span'); s.className = 'spark'; s.style.left = rnd(10, 90) + '%'; s.style.top = '-10px'; s.style.background = ['#56c2b8', '#f06aa0', '#9060d0', '#fff', '#ffd866'][i % 5]; s.style.setProperty('--dx', rnd(-60, 60) + 'px'); s.style.setProperty('--dy', rnd(300, 700) + 'px'); s.style.animationDuration = '2.6s'; f.appendChild(s); setTimeout(() => s.remove(), 2700); }, i * 60);
  $('#hardBtn').onclick = () => hardMode(f);
}
// Hard mode: everything starts over — dancers, coins, bags, upgrades, the Dancepedia and stars — and every dancer earns half as much (halved again for each hard restart)
function hardMode(overlay) {
  if (!confirm('Restart on HARD mode? All progress is undone — dancers, coins, bags, upgrades, Dancepedia, stars — and every dancer earns 50% less.')) return;
  const hard = (save.hard || 0) + 1;
  save = { coins: 0, world: 0, unlocked: 0, fields: {}, crate: {}, up: { crate: 0, cap: 0, tap: 0, away: 0 }, seen: {}, t: Date.now(), total: 0, chainv: save.chainv, hard };
  for (let w = 0; w < WORLDS.length; w++) { save.fields[w] = []; save.crate[w] = WORLDS[w].start; }
  persist(); if (overlay) overlay.remove(); closeSheet(); mount(); hardTag(); toast(`🔥 HARD MODE ${hard > 1 ? '×' + hard : ''} — every dancer earns ${Math.round(100 * (1 - Math.pow(.5, hard)))}% less`);
}
function hardTag() { let t = $('#hardTag'); if (!t) { t = document.createElement('span'); t.id = 'hardTag'; $('#rate').after(t); } t.textContent = save.hard ? ` HARD${save.hard > 1 ? ' ×' + save.hard : ''}` : ''; }
const NEW_GAME_LINK = '<button class="linkbtn" id="newGame" style="margin-top:18px;color:#ff8a5c">🔄 Start the game again</button>';
function newGame() {
  if (!confirm('Start the game again from the very beginning? Every dancer, coin, bag, upgrade, star and the Dancepedia will be gone. This cannot be undone.')) return;
  if (!confirm('Are you sure? Tap OK to wipe the game and start again.')) return;
  save = { coins: 0, world: 0, unlocked: 0, fields: {}, crate: {}, up: { crate: 0, cap: 0, tap: 0, away: 0 }, seen: {}, t: Date.now(), total: 0, chainv: 2 };
  for (let w = 0; w < WORLDS.length; w++) { save.fields[w] = []; save.crate[w] = WORLDS[w].start; }
  persist(); closeSheet(); mount(); hardTag(); toast('A brand-new show — tap the dance bag to meet your first dancer');
}

/* ---------- crates and buying ---------- */
function crateReady() { return Date.now() >= crateAt; }
function dropCrate() {
  const w = save.world; const s = spot();
  const el = document.createElement('div'); el.className = 'crate'; el.innerHTML = '<img src="art/bag.png" alt="Dance bag" draggable="false">'; el.style.left = s.x + '%'; el.style.top = s.y + '%';
  if (!save.bagsOpened) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'A new dancer is inside — tap it!'; el.appendChild(t); }
  el.onpointerdown = e => { e.preventDefault(); el.remove(); save.bagsOpened = (save.bagsOpened || 0) + 1; if (save.fields[save.world].length >= capOf(save.up.cap)) { toast('Stage full — merge some dancers first'); crateAt = 0; refresh(); return; } addBeast(save.crate[w], s); };
  field.appendChild(el);
}
function refresh() {
  $('#coins').textContent = fmt(save.coins); $('#rate').textContent = '+' + fmt(income()) + '/s';
  const w = save.world, lv = save.crate[w], ready = crateReady(), full = save.fields[w].length >= capOf(save.up.cap);
  const cb = $('#crateBtn'); cb.classList.toggle('ready', ready && !full); cb.disabled = full;
  $('#crateLbl').innerHTML = ready ? `Dance bag<br><small>${esc(nameOf(CHAIN[lv]))}</small>` : `Dance bag<br><small>${Math.ceil((crateAt - Date.now()) / 1000)} s</small>`;
  const price = priceOf(lv), up = crateUpCost(w), canUp = lv < WORLDS[w].end - 1 && lv < CHAIN.length - 2;
  const bb = $('#buyBtn'); bb.disabled = full || save.coins < price; bb.classList.toggle('ready', !full && save.coins >= price);
  $('#buyLbl').innerHTML = `Invite ${esc(nameOf(CHAIN[lv]))}<br><small><i class="cn"></i>${fmt(price)}</small>`;
  const sb = $('#shopBtn'); sb.classList.toggle('pulse', (canUp && crateEarned(w) && save.coins >= up) || Object.keys(UPS).some(k => save.up[k] < UPS[k].max && save.coins >= UPS[k].cost(save.up[k])));
}
// a dancer below the bag level would be stranded for ever (nothing could ever bring her a twin), so Invite can
// bring in any level from the lowest dancer on the stage up to the bag level
const lowest = w => save.fields[w].reduce((m, b) => Math.min(m, b.lv), save.crate[w]);
const priceOf = lv => 40 * Math.pow(1.35, lv);
function invite(lv) { const w = save.world; if (save.fields[w].length >= capOf(save.up.cap)) { toast('Stage full — merge some dancers first'); return false; } if (save.coins < priceOf(lv)) { toast('Not enough coins yet'); return false; } save.coins -= priceOf(lv); addBeast(lv); return true; }
function inviteSheet() {
  const w = save.world, on = {}; save.fields[w].forEach(b => { on[b.lv] = (on[b.lv] || 0) + 1; });
  const rows = []; for (let lv = lowest(w); lv <= save.crate[w]; lv++) {
    const alone = on[lv] === 1, note = alone ? 'One on stage, waiting for a twin' : on[lv] ? `${on[lv]} on stage` : lv === save.crate[w] ? 'What the dance bags bring' : 'None on stage';
    rows.push(`<div class="up"><span class="ic sp">${spriteHTML(CHAIN[lv], 1)}</span><div class="t"><b>${esc(nameOf(CHAIN[lv]))}</b><span>${note}</span></div><button data-lv="${lv}" ${save.coins < priceOf(lv) ? 'disabled' : ''}><i class="cn"></i>${fmt(priceOf(lv))}</button></div>`);
  }
  sheet(`<h2>Who shall we invite?</h2>${rows.join('')}`);
  document.querySelectorAll('.sheet button[data-lv]').forEach(b => { b.onclick = () => { if (invite(+b.dataset.lv)) closeSheet(); }; });
}
function crateUpCost(w) { return 300 * Math.pow(1.38, save.crate[w]); }
// better bags must be earned: the dancer two levels above the bag has to have been made by merging first
const GATE = 3;   // a bag can bring a dancer once the dancer three levels above the bag has been made by merging (the owner's rule, v43)
const crateGate = w => save.crate[w] + GATE < CHAIN.length ? save.crate[w] + GATE : CHAIN.length - 1;
const crateEarned = w => { const g = crateGate(w); return g == null || !!save.seen[g]; };

/* ---------- the loop ---------- */
function tick() {
  const now = Date.now(), dt = Math.min(5, (now - lastTick) / 1000); lastTick = now;
  // every beast drops coins: paid as a steady trickle, with a little 💩 animation now and then
  const inc = income() * dt; if (inc > 0) { save.coins += inc; save.total = (save.total || 0) + inc; }
  if (Math.random() < dt * 0.6) { const f = save.fields[save.world]; if (f.length) { const b = f[Math.floor(Math.random() * f.length)]; const d = document.createElement('span'); d.className = 'drop'; d.innerHTML = `<img src="art/coin1.png" alt="">`; d.style.left = (b.x + rnd(-6, 6)) + '%'; d.style.top = (b.y + 4) + '%'; field.appendChild(d); setTimeout(() => d.remove(), 900); } }
  if (crateReady() && !field.querySelector('.crate') && save.fields[save.world].length < capOf(save.up.cap)) { dropCrate(); crateAt = now + crateEvery(save.up.crate) * 1000; }
  refresh();
  if (Math.random() < dt * 0.5) wander();
  persist();
}

/* ---------- away earnings ---------- */
function away() {
  const gone = (Date.now() - (save.t || Date.now())) / 1000, hours = awayHours(save.up.away);
  if (gone < 60 || income() <= 0) return;
  const secs = Math.min(gone, hours * 3600), got = income() * secs * awayFrac(save.up.away);
  save.coins += got; save.total = (save.total || 0) + got; persist();
  sheet(`<h2>While you were away</h2><p>Your dancers kept going for ${secs >= 3600 ? Math.round(secs / 3600) + ' hours' : Math.round(secs / 60) + ' minutes'} and the tractor collected</p><p style="font-size:28px;font-weight:800"><i class="cn"></i>${fmt(got)}</p><p class="small" style="color:var(--muted)">Upgrade the manager to collect more, for longer.</p><button class="btn" id="ok">Collect</button>`);
  $('#ok').onclick = closeSheet;
}

/* ---------- sheets: upgrades, Beastpedia, fanfare ---------- */
function sheet(html) { const s = $('#sheet'); s.hidden = false; s.innerHTML = `<div class="panel"><button class="ib close" aria-label="Close">✕</button>${html}</div>`; s.querySelector('.close').onclick = closeSheet; s.onclick = e => { if (e.target === s) closeSheet(); }; }
function closeSheet() { $('#sheet').hidden = true; $('#sheet').innerHTML = ''; }
function shop() {
  const w = save.world, lv = save.crate[w], canUp = lv < WORLDS[w].end - 1 && lv < CHAIN.length - 2, earned = crateEarned(w);
  const rows = [`<div class="up ${canUp ? '' : 'max'}"><span class="ic"><img src="art/bag.png" alt=""></span><div class="t"><b>Better dance bags</b><span>${canUp ? (earned ? `Bags in the ${WORLDS[w].name} bring ${esc(nameOf(CHAIN[lv + 1]))} (level ${lv + 2})` : `Locked: make ${esc(nameOf(CHAIN[crateGate(w)]))} by merging first — then bags here can bring ${esc(nameOf(CHAIN[lv + 1]))}`) : 'Bags here are as good as they get'}</span></div><button data-k="cratelv" ${save.coins < crateUpCost(w) || !earned ? 'disabled' : ''}>${canUp && !earned ? '🔒 Locked' : `<i class="cn"></i>${fmt(crateUpCost(w))}`}</button></div>`,
    ...Object.entries(UPS).map(([k, u]) => { const n = save.up[k], max = n >= u.max; return `<div class="up ${max ? 'max' : ''}"><span class="ic">${u.ic}</span><div class="t"><b>${u.name}${n ? ` · ${n}` : ''}</b><span>${max ? 'Maxed out' : u.desc(n + 1)}</span></div><button data-k="${k}" ${save.coins < u.cost(n) ? 'disabled' : ''}><i class="cn"></i>${fmt(u.cost(n))}</button></div>`; })];
  sheet(`<h2>Upgrades</h2><div class="small" style="color:var(--muted);margin-bottom:6px">You have <i class="cn"></i>${fmt(save.coins)}</div>${rows.join('')}<button class="linkbtn" id="moveBtn">📲 Move my game to another app or phone</button>`);
  $('#moveBtn').onclick = moveSheet;
  $('#sheet').querySelectorAll('button[data-k]').forEach(b => { b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'cratelv') { const c = crateUpCost(w); if (save.coins < c || !crateEarned(w)) return; save.coins -= c; save.crate[w]++; }
    else { const c = UPS[k].cost(save.up[k]); if (save.coins < c) return; save.coins -= c; save.up[k]++; }
    persist(); refresh(); shop();
  }; });
}
function pedia() {
  $('#pediaBtn').classList.remove('pulse');
  const seen = Object.keys(save.seen).length;
  const cells = WORLDS.map((w, i) => `<h3>${esc(w.name)}</h3>` + CHAIN.map((c, k) => c.world === i ? `<div class="cell ${save.seen[k] ? '' : 'unseen'}" data-k="${k}">${spriteHTML(c, .5, 'spr still')}<span class="n">${k + 1}</span></div>` : '').join('')).join('');
  sheet(`<h2>Dancepedia · ${seen} of ${CHAIN.length}</h2><div class="pedia">${cells}</div>${NEW_GAME_LINK}`);
  $('#newGame').onclick = newGame;
  $('#sheet').querySelectorAll('.cell').forEach(c => { c.onclick = () => { const k = +c.dataset.k, b = CHAIN[k]; if (!save.seen[k]) { toast(`Level ${k + 1} — not found yet`); return; }
    sheet(`<div class="detail"><div class="sprwrap">${spriteHTML(b, 1.5)}</div><div class="name">${esc(nameOf(b))}</div><div class="el">${esc(b.stageName)} · level ${k + 1}</div><p>${esc(b.desc)}</p><p class="el">Earns <i class="cn"></i>${fmt(RATE(k))} a second</p><button class="btn" id="back">Back</button></div>`);
    $('#back').onclick = pedia; }; });
}
function fanfare(lv) {
  const b = CHAIN[lv], f = document.createElement('div'); f.className = 'fanfare';
  f.innerHTML = `<div class="card"><div class="kicker">${b.spirit ? '✨ THE SPIRIT OF DANCE ✨' : b.sister === 0 ? 'NEW STAGE' : 'NEW DANCER'}</div><div class="sprwrap">${spriteHTML(b, 1.5)}</div><div class="name">${esc(nameOf(b))}</div><p>${esc(b.desc)}</p><button class="btn">Bravo!</button></div>`;
  f.querySelector('button').onclick = () => f.remove(); f.onclick = e => { if (e.target === f) f.remove(); };
  document.body.appendChild(f);
  for (let i = 0; i < 18; i++) { const s = document.createElement('span'); s.className = 'spark'; s.style.left = '50%'; s.style.top = '45%'; s.style.background = ['#f2a541', '#6fd18a', '#7ec8ff', '#ff7bb0', '#fff'][i % 5]; s.style.setProperty('--dx', rnd(-160, 160) + 'px'); s.style.setProperty('--dy', rnd(-200, 120) + 'px'); document.body.appendChild(s); setTimeout(() => s.remove(), 1100); }
}
function sparks(x, y) { const r = field.getBoundingClientRect(); for (let i = 0; i < 10; i++) { const s = document.createElement('span'); s.className = 'spark'; s.style.left = (r.left + x / 100 * r.width) + 'px'; s.style.top = (r.top + y / 100 * r.height) + 'px'; s.style.background = ['#fff', '#f2a541', '#ffd866'][i % 3]; s.style.setProperty('--dx', rnd(-70, 70) + 'px'); s.style.setProperty('--dy', rnd(-90, 30) + 'px'); document.body.appendChild(s); setTimeout(() => s.remove(), 1100); } }
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200); }

/* ---------- move the game: a save code (the save and the names, as text) to copy from one app or phone into another ---------- */
function saveCode() { return btoa(unescape(encodeURIComponent(JSON.stringify({ s: save })))); }
function moveSheet() {
  const code = saveCode();
  sheet(`<h2>Move my game</h2><p class="small" style="color:var(--muted)">On an iPhone the home-screen app and Safari keep separate games. Copy this code here and paste it into the other one (or another phone) to carry everything across: dancers, coins and upgrades.</p>
    <textarea class="nm" id="mvCode" rows="4" readonly style="font-size:12px;word-break:break-all">${code}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="mvCopy">Copy</button>${navigator.share ? '<button class="btn" id="mvShare">Share</button>' : ''}</div>
    <h2 style="margin-top:18px">Paste a code</h2><textarea class="nm" id="mvIn" rows="3" placeholder="Paste a code from the other app…" style="font-size:12px"></textarea>
    <button class="btn" id="mvLoad">Load it</button><p class="small" style="color:var(--muted)">Loading replaces the game in this app.</p>`);
  $('#mvCopy').onclick = async () => { try { await navigator.clipboard.writeText(code); toast('Copied'); } catch (e) { $('#mvCode').select(); document.execCommand('copy'); toast('Copied'); } };
  const sh = $('#mvShare'); if (sh) sh.onclick = () => navigator.share({ text: code }).catch(() => {});
  $('#mvLoad').onclick = () => {
    try { const o = JSON.parse(decodeURIComponent(escape(atob($('#mvIn').value.trim())))); if (!o.s || !o.s.fields) throw 0;
      save = o.s; store.set('dance.save', save); for (let w = 0; w < WORLDS.length; w++) { save.fields[w] = save.fields[w] || []; if (save.crate[w] == null) save.crate[w] = WORLDS[w].start; }
      closeSheet(); mount(); toast('Game loaded'); } catch (e) { toast('That code did not work'); }
  };
}

/* ---------- start ---------- */
async function main() {
  await buildChain(); load(); preloadSheets(); setTimeout(saveOffline, 2500);
  // the page may be an older cached copy (an update on a poor connection): add anything newer that it lacks
  if (save.won) setTimeout(won, 800);   // the game is over: the ending stays until the player restarts on hard mode
  if ($('#hallBtn')) $('#hallBtn').remove();   // the Hall of Fame sheet was dropped in v66; an older cached page still has its button
  $('#shopBtn').onclick = shop; $('#pediaBtn').onclick = pedia; hardTag();
  // belt and braces for iOS: if the page is ever nudged (the keyboard closing after the Move sheet, a stray scroll), put it back
  const unnudge = () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); };
  addEventListener('focusout', () => setTimeout(unnudge, 50)); addEventListener('resize', unnudge); document.addEventListener('visibilitychange', () => { if (!document.hidden) unnudge(); }); setInterval(unnudge, 2000);
  document.addEventListener('touchmove', e => { if (!e.target.closest('.sheet .panel, .worlds, textarea')) e.preventDefault(); }, { passive: false });   // nothing outside a sheet or the room strip scrolls
  $('#crateBtn').onclick = () => { const c = field.querySelector('.crate'); if (c) c.onpointerdown(new Event('pointerdown')); else if (!crateReady()) toast(`Next crate in ${Math.ceil((crateAt - Date.now()) / 1000)} s`); };
  $('#buyBtn').onclick = () => { const w = save.world; if (save.fields[w].length >= capOf(save.up.cap)) { toast('Stage full — merge some dancers first'); return; } if (lowest(w) < save.crate[w]) inviteSheet(); else invite(save.crate[w]); };
  // Safari zooms on a quick double tap; taps on the stage are game moves, never zooms
  mount(); away();
  field.addEventListener('touchend', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save.t = Date.now(); store.set('dance.save', save); } else { lastTick = Date.now(); away(); } });
  window.addEventListener('pagehide', () => { save.t = Date.now(); store.set('dance.save', save); });
  if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') navigator.serviceWorker.register('sw.js').catch(() => {});
}
main().catch(e => { const h = $('#hint'); if (h) h.textContent = 'The game could not start: ' + (e && e.message ? e.message : e) + ' — tap to try again'; if (h) h.onclick = () => location.reload(); console.error(e); });
