/* Merge Beasts — tap, drag to merge, evolve.
   A standalone idle merge game: the artist's MemiBeasts (../art/beasts) form one long evolution chain, egg → baby →
   teen → adult → the next beast's egg, 175 levels in five worlds. Beasts on the field drop coins; tap one for a coin
   burst; drag one onto an identical one and they merge into the next level; crates drop in and open into beasts; coins
   buy beasts and upgrades. Everything lives in localStorage['merge.save']; nothing is sent anywhere. */
'use strict';
const APP_VERSION = '3';
const ART = '../art/beasts/';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EL = { earth: ['🪨', 'Earth'], grass: ['🌿', 'Grass'], water: ['💧', 'Water'], snow: ['❄️', 'Snow'], fire: ['🔥', 'Fire'], crystal: ['💎', 'Crystal'] };
const WORLDS = [
  { name: 'Meadow', els: ['earth', 'grass'], sky: 'linear-gradient(#7ec8ff, #d9f1ff)', grass: 'linear-gradient(#6cb45a, #3e7d33)' },
  { name: 'Lagoon', els: ['water'], sky: 'linear-gradient(#3d7bd8, #9fd6ff)', grass: 'linear-gradient(#58c9c0, #237f87)' },
  { name: 'Crystal Caves', els: ['snow', 'crystal'], sky: 'linear-gradient(#2a1f4e, #6b4fa0)', grass: 'linear-gradient(#b48bf0, #5b3b9c)' },
  { name: 'Ember Plains', els: ['fire'], take: 10, sky: 'linear-gradient(#f0a35a, #ffd9a0)', grass: 'linear-gradient(#c9783a, #7a3f1c)' },
  { name: 'Volcano', els: ['fire'], sky: 'linear-gradient(#3a0c0c, #b3261e)', grass: 'linear-gradient(#5a1d14, #2a0a08)' },
];
// economy: a beast at level L earns RATE(L) a second; the next crate level, a bought beast and the upgrades scale with it
const GROW = 1.33;
const RATE = L => 0.5 * Math.pow(GROW, L);
const fmt = n => { if (n < 1000) return String(Math.floor(n)); const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qd', 'Qn', 'Sd', 'St', 'Od', 'Nd', 'Vg']; let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i]; };
const UPS = {
  crate: { ic: '📦', name: 'Faster crates', desc: n => `A crate every ${crateEvery(n).toFixed(0)} s`, cost: n => 120 * Math.pow(2.4, n), max: 12 },
  cap: { ic: '🌾', name: 'Bigger field', desc: n => `Room for ${capOf(n)} beasts`, cost: n => 600 * Math.pow(3.2, n), max: 5 },
  tap: { ic: '👆', name: 'Stronger taps', desc: n => `A tap gives ${tapMult(n)}× a beast's coin`, cost: n => 80 * Math.pow(2.6, n), max: 10 },
  away: { ic: '🚜', name: 'Tractor', desc: n => `Earns ${Math.round(awayFrac(n) * 100)}% while you are away, up to ${awayHours(n)} h`, cost: n => 400 * Math.pow(3, n), max: 6 },
};
const crateEvery = n => Math.max(3, 16 * Math.pow(0.86, n));
const capOf = n => 10 + 2 * n;
const tapMult = n => 3 + 2 * n;
const awayFrac = n => Math.min(1, 0.25 + 0.15 * n);
const awayHours = n => 2 + 2 * n;

let CHAIN = [], WORLD_OF = [], save, field, els = {}, lastTick = Date.now(), crateAt = 0, ticking = false;
const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

/* ---------- the chain: every stage of every beast, by element, split into worlds ---------- */
async function buildChain() {
  const list = await (await fetch(ART + 'beasts.json')).json();
  const order = ['earth', 'grass', 'water', 'snow', 'crystal', 'fire'];
  const beasts = order.flatMap(e => list.filter(b => b.el === e));
  let wi = 0, taken = 0;
  for (const b of beasts) {
    const w = WORLDS[wi];
    if (!w.els.includes(b.el) || (w.take && taken >= w.take)) { wi++; taken = 0; }
    taken++;
    b.stages.forEach((s, i) => CHAIN.push({ key: b.key, beast: b.name, el: b.el, rare: !!b.rare, stage: s.s, name: s.name, desc: s.desc, pic: ART + b.key + '_' + s.s + '.webp', world: wi, last: i === b.stages.length - 1 }));
  }
  WORLDS.forEach((w, i) => { const lv = CHAIN.map((c, k) => c.world === i ? k : -1).filter(k => k >= 0); w.start = lv[0]; w.end = lv[lv.length - 1]; });
  CHAIN.forEach((c, i) => { WORLD_OF[i] = c.world; });
}

/* ---------- the save ---------- */
function load() {
  save = store.get('merge.save', null) || { coins: 0, world: 0, unlocked: 0, fields: {}, crate: {}, up: { crate: 0, cap: 0, tap: 0, away: 0 }, seen: {}, t: Date.now(), total: 0 };
  for (let w = 0; w < WORLDS.length; w++) { save.fields[w] = save.fields[w] || []; if (save.crate[w] == null) save.crate[w] = WORLDS[w].start; }
}
let saveTimer = 0;
const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { save.t = Date.now(); store.set('merge.save', save); }, 400); };
const income = () => Object.values(save.fields).flat().reduce((s, b) => s + RATE(b.lv), 0);

/* ---------- the field ---------- */
function mount() {
  field = $('#field');
  const w = save.world;
  field.style.setProperty('--sky', WORLDS[w].sky); field.style.setProperty('--grass', WORLDS[w].grass);
  field.querySelectorAll('.beast, .crate, .coin, .drop').forEach(e => e.remove());
  els = {};
  save.fields[w].forEach(b => place(b));
  renderWorlds(); refresh(); hint();
}
function renderWorlds() {
  $('#worlds').innerHTML = WORLDS.map((w, i) => `<button data-w="${i}" aria-pressed="${i === save.world}" class="${i > save.unlocked ? 'locked' : ''}">${i > save.unlocked ? '🔒 ' : ''}${w.name}</button>`).join('');
  $('#worlds').querySelectorAll('button').forEach(b => { b.onclick = () => { const i = +b.dataset.w; if (i > save.unlocked) { toast(`Make the ${CHAIN[WORLDS[i - 1].end].name} to open ${WORLDS[i].name}`); return; } save.world = i; persist(); mount(); }; });
}
function hint() {
  const n = save.fields[save.world].length, h = $('#hint');
  h.textContent = n === 0 ? 'Tap the crate to get your first beast' : n < 2 ? 'Tap a beast for coins · merge two of the same kind' : n >= capOf(save.up.cap) ? 'Field full — merge some beasts' : '';
}
const rnd = (a, b) => a + Math.random() * (b - a);
function spot() { return { x: rnd(12, 88), y: rnd(48, 90) }; }
function place(b, pop = false) {
  const el = document.createElement('div'); el.className = 'beast' + (pop ? ' pop' : '') + (Math.random() < .5 ? ' flip' : '');
  el.innerHTML = `<img src="${CHAIN[b.lv].pic}" alt="${esc(CHAIN[b.lv].name)}" draggable="false"><span class="lv">${b.lv + 1}</span>`;
  el.style.left = b.x + '%'; el.style.top = b.y + '%';
  el.dataset.id = b.id; els[b.id] = el; field.appendChild(el);
  bindBeast(el, b);
}
function wander() {
  if (field.querySelector('.beast.drag')) return;   // nobody moves while a beast is being carried
  for (const b of save.fields[save.world]) { if (Math.random() < .25 && !(els[b.id] && els[b.id].classList.contains('drag'))) { const s = spot(); const el = els[b.id]; if (el) { el.classList.toggle('flip', s.x < b.x); } b.x = s.x; b.y = s.y; if (el) { el.style.left = s.x + '%'; el.style.top = s.y + '%'; } } }
}
let nextId = () => (save.nid = (save.nid || 0) + 1);
function addBeast(lv, at, pop = true) {
  const w = save.world; const s = at || spot();
  const b = { id: nextId(), lv, x: s.x, y: s.y }; save.fields[w].push(b); place(b, pop);
  discover(lv); persist(); refresh(); hint();
  return b;
}
function removeBeast(b) { const f = save.fields[save.world]; const i = f.indexOf(b); if (i >= 0) f.splice(i, 1); const el = els[b.id]; if (el) el.remove(); delete els[b.id]; }

/* ---------- touch: tap for a coin, drag onto a twin to merge ---------- */
function bindBeast(el, b) {
  let start = null, moved = false, target = null;
  el.onpointerdown = e => { start = { x: e.clientX, y: e.clientY }; moved = false; el.setPointerCapture(e.pointerId); };
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
    el.classList.remove('drag');
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
  for (const o of save.fields[save.world]) { if (o === b || o.lv !== b.lv || !els[o.id]) continue; const r = els[o.id].getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my); if (d < bd) { bd = d; best = o; } }
  return best;
}
function tap(b, e) {
  const v = RATE(b.lv) * tapMult(save.up.tap) * 2;
  earn(v, b.x, b.y - 6);
  const el = els[b.id]; if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}
function earn(v, x, y) {
  save.coins += v; save.total = (save.total || 0) + v;
  const c = document.createElement('span'); c.className = 'coin'; c.textContent = '+' + fmt(v); c.style.left = x + '%'; c.style.top = y + '%'; field.appendChild(c); setTimeout(() => c.remove(), 1000);
  refresh(); persist();
}
function merge(a, t) {
  const lv = a.lv + 1;
  if (lv >= CHAIN.length) { toast('That is the final beast!'); persist(); return; }
  const at = { x: t.x, y: t.y };
  removeBeast(a); removeBeast(t);
  const b = addBeast(lv, at);
  sparks(at.x, at.y);
  if (CHAIN[lv].stage === 'egg' || CHAIN[lv].last) fanfare(lv);
  if (lv === WORLDS[save.world].end && save.unlocked === save.world && save.world < WORLDS.length - 1) { save.unlocked++; persist(); renderWorlds(); setTimeout(() => toast(`🎉 ${WORLDS[save.unlocked].name} is open!`), 1400); }
}
function discover(lv) { if (!save.seen[lv]) { save.seen[lv] = 1; $('#pediaBtn').classList.add('pulse'); } }

/* ---------- crates and buying ---------- */
function crateReady() { return Date.now() >= crateAt; }
function dropCrate() {
  const w = save.world; const s = spot();
  const el = document.createElement('div'); el.className = 'crate'; el.textContent = '📦'; el.style.left = s.x + '%'; el.style.top = s.y + '%';
  el.onpointerdown = e => { e.preventDefault(); el.remove(); if (save.fields[save.world].length >= capOf(save.up.cap)) { toast('Field full — merge some beasts first'); crateAt = 0; refresh(); return; } addBeast(save.crate[w], s); };
  field.appendChild(el);
}
function refresh() {
  $('#coins').textContent = fmt(save.coins); $('#rate').textContent = '+' + fmt(income()) + '/s';
  const w = save.world, lv = save.crate[w], ready = crateReady(), full = save.fields[w].length >= capOf(save.up.cap);
  const cb = $('#crateBtn'); cb.classList.toggle('ready', ready && !full); cb.disabled = full;
  $('#crateLbl').innerHTML = ready ? `Crate<br><small>${esc(CHAIN[lv].name)}</small>` : `Crate<br><small>${Math.ceil((crateAt - Date.now()) / 1000)} s</small>`;
  const price = 25 * Math.pow(GROW, lv), up = 40 * Math.pow(GROW, lv + 1), canUp = lv < WORLDS[w].end - 1 && lv < CHAIN.length - 2;
  const bb = $('#buyBtn'); bb.disabled = full || save.coins < price; bb.classList.toggle('ready', !full && save.coins >= price);
  $('#buyLbl').innerHTML = `Buy ${esc(CHAIN[lv].name)}<br><small>🪙 ${fmt(price)}</small>`;
  const sb = $('#shopBtn'); sb.classList.toggle('pulse', (canUp && save.coins >= up) || Object.keys(UPS).some(k => save.up[k] < UPS[k].max && save.coins >= UPS[k].cost(save.up[k])));
}
function crateUpCost(w) { return 40 * Math.pow(GROW, save.crate[w] + 1); }

/* ---------- the loop ---------- */
function tick() {
  const now = Date.now(), dt = Math.min(5, (now - lastTick) / 1000); lastTick = now;
  // every beast drops coins: paid as a steady trickle, with a little 💩 animation now and then
  const inc = income() * dt; if (inc > 0) { save.coins += inc; save.total = (save.total || 0) + inc; }
  if (Math.random() < dt * 0.6) { const f = save.fields[save.world]; if (f.length) { const b = f[Math.floor(Math.random() * f.length)]; const d = document.createElement('span'); d.className = 'drop'; d.textContent = '🪙'; d.style.left = (b.x + rnd(-6, 6)) + '%'; d.style.top = (b.y + 4) + '%'; field.appendChild(d); setTimeout(() => d.remove(), 900); } }
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
  sheet(`<h2>While you were away</h2><p>Your beasts kept going for ${secs >= 3600 ? Math.round(secs / 3600) + ' hours' : Math.round(secs / 60) + ' minutes'} and the tractor collected</p><p style="font-size:28px;font-weight:800">🪙 ${fmt(got)}</p><p class="small" style="color:var(--muted)">Upgrade the tractor to collect more, for longer.</p><button class="btn" id="ok">Collect</button>`);
  $('#ok').onclick = closeSheet;
}

/* ---------- sheets: upgrades, Beastpedia, fanfare ---------- */
function sheet(html) { const s = $('#sheet'); s.hidden = false; s.innerHTML = `<div class="panel"><button class="ib close" aria-label="Close">✕</button>${html}</div>`; s.querySelector('.close').onclick = closeSheet; s.onclick = e => { if (e.target === s) closeSheet(); }; }
function closeSheet() { $('#sheet').hidden = true; $('#sheet').innerHTML = ''; }
function shop() {
  const w = save.world, lv = save.crate[w], canUp = lv < WORLDS[w].end - 1 && lv < CHAIN.length - 2;
  const rows = [`<div class="up ${canUp ? '' : 'max'}"><span class="ic">📦</span><div class="t"><b>Better crates</b><span>${canUp ? `Crates in ${WORLDS[w].name} open into ${esc(CHAIN[lv + 1].name)} (level ${lv + 2})` : 'Crates here are as good as they get'}</span></div><button data-k="cratelv" ${save.coins < crateUpCost(w) ? 'disabled' : ''}>🪙 ${fmt(crateUpCost(w))}</button></div>`,
    ...Object.entries(UPS).map(([k, u]) => { const n = save.up[k], max = n >= u.max; return `<div class="up ${max ? 'max' : ''}"><span class="ic">${u.ic}</span><div class="t"><b>${u.name}${n ? ` · ${n}` : ''}</b><span>${max ? 'Maxed out' : u.desc(n + 1)}</span></div><button data-k="${k}" ${save.coins < u.cost(n) ? 'disabled' : ''}>🪙 ${fmt(u.cost(n))}</button></div>`; })];
  sheet(`<h2>Upgrades</h2><div class="small" style="color:var(--muted);margin-bottom:6px">You have 🪙 ${fmt(save.coins)}</div>${rows.join('')}`);
  $('#sheet').querySelectorAll('button[data-k]').forEach(b => { b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'cratelv') { const c = crateUpCost(w); if (save.coins < c) return; save.coins -= c; save.crate[w]++; }
    else { const c = UPS[k].cost(save.up[k]); if (save.coins < c) return; save.coins -= c; save.up[k]++; }
    persist(); refresh(); shop();
  }; });
}
function pedia() {
  $('#pediaBtn').classList.remove('pulse');
  const seen = Object.keys(save.seen).length;
  const cells = WORLDS.map((w, i) => `<h3>${esc(w.name)}</h3>` + CHAIN.map((c, k) => c.world === i ? `<div class="cell ${save.seen[k] ? '' : 'unseen'} ${c.rare ? 'rare' : ''}" data-k="${k}"><img src="${c.pic}" alt="" loading="lazy"><span class="n">${k + 1}</span></div>` : '').join('')).join('');
  sheet(`<h2>Beastpedia · ${seen} of ${CHAIN.length}</h2><div class="pedia">${cells}</div>`);
  $('#sheet').querySelectorAll('.cell').forEach(c => { c.onclick = () => { const k = +c.dataset.k, b = CHAIN[k]; if (!save.seen[k]) { toast(`Level ${k + 1} — not found yet`); return; }
    sheet(`<div class="detail"><img src="${b.pic}" alt=""><div class="name">${esc(b.name)}</div><div class="el">${EL[b.el][0]} ${EL[b.el][1]} · ${b.stage} · level ${k + 1}${b.rare ? ' · ✦ rare' : ''}</div><p>${esc(b.desc)}</p><p class="el">Earns 🪙 ${fmt(RATE(k))} a second</p><button class="btn" id="back">Back</button></div>`);
    $('#back').onclick = pedia; }; });
}
function fanfare(lv) {
  const b = CHAIN[lv], f = document.createElement('div'); f.className = 'fanfare';
  f.innerHTML = `<div class="card"><div class="kicker">${b.last ? 'FULLY GROWN' : 'NEW BEAST'}</div><img src="${b.pic}" alt=""><div class="name">${esc(b.name)}</div><p>${esc(b.desc)}</p><button class="btn">Nice!</button></div>`;
  f.querySelector('button').onclick = () => f.remove(); f.onclick = e => { if (e.target === f) f.remove(); };
  document.body.appendChild(f);
  for (let i = 0; i < 18; i++) { const s = document.createElement('span'); s.className = 'spark'; s.style.left = '50%'; s.style.top = '45%'; s.style.background = ['#f2a541', '#6fd18a', '#7ec8ff', '#ff7bb0', '#fff'][i % 5]; s.style.setProperty('--dx', rnd(-160, 160) + 'px'); s.style.setProperty('--dy', rnd(-200, 120) + 'px'); document.body.appendChild(s); setTimeout(() => s.remove(), 1100); }
}
function sparks(x, y) { const r = field.getBoundingClientRect(); for (let i = 0; i < 10; i++) { const s = document.createElement('span'); s.className = 'spark'; s.style.left = (r.left + x / 100 * r.width) + 'px'; s.style.top = (r.top + y / 100 * r.height) + 'px'; s.style.background = ['#fff', '#f2a541', '#ffd866'][i % 3]; s.style.setProperty('--dx', rnd(-70, 70) + 'px'); s.style.setProperty('--dy', rnd(-90, 30) + 'px'); document.body.appendChild(s); setTimeout(() => s.remove(), 1100); } }
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200); }

/* ---------- start ---------- */
async function main() {
  await buildChain(); load();
  $('#shopBtn').onclick = shop; $('#pediaBtn').onclick = pedia;
  $('#crateBtn').onclick = () => { const c = field.querySelector('.crate'); if (c) c.onpointerdown(new Event('pointerdown')); else if (!crateReady()) toast(`Next crate in ${Math.ceil((crateAt - Date.now()) / 1000)} s`); };
  $('#buyBtn').onclick = () => { const w = save.world, lv = save.crate[w], price = 25 * Math.pow(GROW, lv); if (save.fields[w].length >= capOf(save.up.cap)) { toast('Field full — merge some beasts first'); return; } if (save.coins < price) return; save.coins -= price; addBeast(lv); };
  mount(); away();
  field.addEventListener('touchend', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });   // no Safari double-tap zoom on the field
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save.t = Date.now(); store.set('merge.save', save); } else { lastTick = Date.now(); away(); } });
  window.addEventListener('pagehide', () => { save.t = Date.now(); store.set('merge.save', save); });
  if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') navigator.serviceWorker.register('sw.js').catch(() => {});
}
main();
