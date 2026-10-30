/* Dance Evolution — tap, drag to merge, evolve.
   The Merge Beasts engine with dancers: 14 stages × 3 sisters = 42 levels (dancers.json + art/*.png sprite sheets drawn
   by scratchpad/dancers/sisters.py), each level a 6–8 frame dance loop. The three sisters are named below (the owner's
   decision, 30 Oct 2026: the names are fixed in the game); a level is "<stage> <name>". Save in
   localStorage['dance.save']; nothing is sent anywhere. */
'use strict';
const APP_VERSION = '21';
const ART = 'art/';
const NAMES = ['Lainey', 'Miri', 'Juliette'];   // youngest first
let SPEC = null;
const SCALE = 1.75;   // sprite pixels → screen pixels on the field
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EL = { earth: ['🪨', 'Earth'], grass: ['🌿', 'Grass'], water: ['💧', 'Water'], snow: ['❄️', 'Snow'], fire: ['🔥', 'Fire'], crystal: ['💎', 'Crystal'] };
const WORLDS = [   // by stage index (0-based); each has its own room
  { name: 'Nursery', stages: [0, 2], bg: 'art/bg_nursery.png' },      // pixel rooms drawn by scratchpad/dancers/backgrounds.py, 96 × 128, the floor from row 70
  { name: 'Dance school', stages: [3, 6], bg: 'art/bg_school.png' },
  { name: 'Ballet theatre', stages: [7, 9], bg: 'art/bg_theatre.png' },
  { name: 'City stage', stages: [10, 11], bg: 'art/bg_city.png' },
  { name: 'World tour', stages: [12, 13], bg: 'art/bg_tour.png' },
];
const DESC = ['Already bopping to the music in her cot.', 'First tutu, first wobbly twirl.', 'Star of the nursery show.', 'Her first leotard — and first position.',
  'Plié, arabesque, skip: dance school every Saturday.', 'The first real tutu, worn everywhere.', 'Sequins, kicks and jazz hands.', 'Up on pointe at last.',
  'The Swan: white tutu and a tiara.', 'Prima ballerina, curtain call.', 'Hip-hop, breaking and street style.', 'Headlining the show with a microphone.',
  'Flamenco, Bollywood and tango around the world.', 'A Dance Legend in a golden gown.'];
// economy: a beast at level L earns RATE(L) a second; the next crate level, a bought beast and the upgrades scale with it
const GROW = 1.33;
const RATE = L => 0.5 * Math.pow(GROW, L);
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

let CHAIN = [], WORLD_OF = [], save, field, els = {}, lastTick = Date.now(), crateAt = 0, ticking = false;
const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

/* ---------- the chain: 14 stages × 3 sisters, from dancers.json ---------- */
async function buildChain() {
  SPEC = await (await fetch('dancers.json')).json(); FONT = await (await fetch('art/font.json')).json();
  CHAIN = SPEC.levels.map((l, i) => ({ ...l, world: WORLDS.findIndex(w => l.stage >= w.stages[0] && l.stage <= w.stages[1]), last: l.sister === 2, pic: l.sheet, desc: DESC[l.stage] }));
  WORLDS.forEach((w, i) => { const lv = CHAIN.map((c, k) => c.world === i ? k : -1).filter(k => k >= 0); w.start = lv[0]; w.end = lv[lv.length - 1]; });
  CHAIN.forEach((c, i) => { WORLD_OF[i] = c.world; });
}
// the name above a dancer's head, two lines ("Baby" / "<name>") in the 5 × 7 pixel font of art/font.png (FONT lists its glyphs;
// accents are stripped and an unknown character is skipped)
let FONT = '';
const pixText = t => `<span class="pt">${[...t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')].map(ch => { const i = FONT.indexOf(ch); return i < 0 ? '' : `<i style="background-position:-${i * 12}px 0"></i>`; }).join('')}</span>`;
const lvHTML = (n, c) => `<span class="lv" style="top:${Math.round((c.top || 0) * SCALE) - 36}px">${pixText(c.stageName)}${pixText(NAMES[c.sister] || '')}</span>`;
const nameOf = c => `${c.stageName} ${NAMES[c.sister] || ''}`.trim();
// a dancer: a div showing one frame of her sprite sheet, the loop stepped by CSS
function spriteHTML(c, scale = SCALE, cls = 'spr') {
  const w = SPEC.w * scale, h = SPEC.h * scale;
  return `<div class="${cls}" data-frames="${c.frames}" data-fw="${w}" style="width:${w}px;height:${h}px;background-image:url('${c.sheet}');background-size:${w * c.frames}px ${h}px"></div>`;
}
// the loops are stepped here, not by CSS: every 40 ms each sprite shows its next frame (a still sprite keeps frame 0)
let frameNo = 0;
setInterval(() => { frameNo++; document.querySelectorAll('.spr:not(.still)').forEach(el => { const n = +el.dataset.frames || 1; el.style.backgroundPositionX = -((frameNo % n) * +el.dataset.fw) + 'px'; }); }, 40);
// every sheet is fetched once at the start, so a merge never waits for the network
function preloadSheets() { SPEC.levels.forEach(l => { const i = new Image(); i.src = l.sheet; }); }

/* ---------- the save ---------- */
function load() {
  save = store.get('dance.save', null) || { coins: 0, world: 0, unlocked: 0, fields: {}, crate: {}, up: { crate: 0, cap: 0, tap: 0, away: 0 }, seen: {}, t: Date.now(), total: 0 };
  for (let w = 0; w < WORLDS.length; w++) { save.fields[w] = save.fields[w] || []; if (save.crate[w] == null) save.crate[w] = WORLDS[w].start; }
}
let saveTimer = 0;
const persist = () => { save.t = Date.now(); store.set('dance.save', save); };   // written at once: a force-closed app loses nothing
const income = () => Object.values(save.fields).flat().reduce((s, b) => s + RATE(b.lv), 0);

/* ---------- the field ---------- */
function mount() {
  field = $('#field');
  const w = save.world;
  field.style.backgroundImage = `url('${WORLDS[w].bg}')`;
  field.querySelectorAll('.beast, .crate, .coin, .drop').forEach(e => e.remove());
  els = {};
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
  el.innerHTML = `${spriteHTML(CHAIN[b.lv])}${lvHTML(b.lv + 1, CHAIN[b.lv])}`;
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
function addBeast(lv, at, pop = true) {
  const w = save.world; const s = at || spot();
  const b = { id: nextId(), lv, x: s.x, y: s.y }; save.fields[w].push(b); place(b, pop);
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
  const c = document.createElement('span'); c.className = 'coin'; c.innerHTML = '<i class="cn"></i>+' + fmt(v); c.style.left = x + '%'; c.style.top = y + '%'; field.appendChild(c); setTimeout(() => c.remove(), 1000);
  refresh(); persist();
}
function merge(a, t) {
  const lv = a.lv + 1;
  if (lv >= CHAIN.length) { toast('That is the final dancer!'); persist(); return; }
  const at = { x: t.x, y: t.y };
  removeBeast(a); removeBeast(t);
  const b = addBeast(lv, at);
  sparks(at.x, at.y);
  if (CHAIN[lv].sister === 0 || CHAIN[lv].last) fanfare(lv);
  if (lv === WORLDS[save.world].end && save.unlocked === save.world && save.world < WORLDS.length - 1) { save.unlocked++; persist(); renderWorlds(); setTimeout(() => toast(`🎉 ${WORLDS[save.unlocked].name} is open!`), 1400); }
}
function discover(lv) { if (!save.seen[lv]) { save.seen[lv] = 1; $('#pediaBtn').classList.add('pulse'); } }

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
  const price = 25 * Math.pow(GROW, lv), up = 40 * Math.pow(GROW, lv + 1), canUp = lv < WORLDS[w].end - 1 && lv < CHAIN.length - 2;
  const bb = $('#buyBtn'); bb.disabled = full || save.coins < price; bb.classList.toggle('ready', !full && save.coins >= price);
  $('#buyLbl').innerHTML = `Invite ${esc(nameOf(CHAIN[lv]))}<br><small><i class="cn"></i>${fmt(price)}</small>`;
  const sb = $('#shopBtn'); sb.classList.toggle('pulse', (canUp && save.coins >= up) || Object.keys(UPS).some(k => save.up[k] < UPS[k].max && save.coins >= UPS[k].cost(save.up[k])));
}
// a dancer below the bag level would be stranded for ever (nothing could ever bring her a twin), so Invite can
// bring in any level from the lowest dancer on the stage up to the bag level
const lowest = w => save.fields[w].reduce((m, b) => Math.min(m, b.lv), save.crate[w]);
const priceOf = lv => 25 * Math.pow(GROW, lv);
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
function crateUpCost(w) { return 40 * Math.pow(GROW, save.crate[w] + 1); }

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
  const w = save.world, lv = save.crate[w], canUp = lv < WORLDS[w].end - 1 && lv < CHAIN.length - 2;
  const rows = [`<div class="up ${canUp ? '' : 'max'}"><span class="ic"><img src="art/bag.png" alt=""></span><div class="t"><b>Better dance bags</b><span>${canUp ? `Bags in the ${WORLDS[w].name} bring ${esc(nameOf(CHAIN[lv + 1]))} (level ${lv + 2})` : 'Bags here are as good as they get'}</span></div><button data-k="cratelv" ${save.coins < crateUpCost(w) ? 'disabled' : ''}><i class="cn"></i>${fmt(crateUpCost(w))}</button></div>`,
    ...Object.entries(UPS).map(([k, u]) => { const n = save.up[k], max = n >= u.max; return `<div class="up ${max ? 'max' : ''}"><span class="ic">${u.ic}</span><div class="t"><b>${u.name}${n ? ` · ${n}` : ''}</b><span>${max ? 'Maxed out' : u.desc(n + 1)}</span></div><button data-k="${k}" ${save.coins < u.cost(n) ? 'disabled' : ''}><i class="cn"></i>${fmt(u.cost(n))}</button></div>`; })];
  sheet(`<h2>Upgrades</h2><div class="small" style="color:var(--muted);margin-bottom:6px">You have <i class="cn"></i>${fmt(save.coins)}</div>${rows.join('')}<button class="linkbtn" id="moveBtn">📲 Move my game to another app or phone</button>`);
  $('#moveBtn').onclick = moveSheet;
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
  const cells = WORLDS.map((w, i) => `<h3>${esc(w.name)}</h3>` + CHAIN.map((c, k) => c.world === i ? `<div class="cell ${save.seen[k] ? '' : 'unseen'}" data-k="${k}">${spriteHTML(c, 1, 'spr still')}<span class="n">${k + 1}</span></div>` : '').join('')).join('');
  sheet(`<h2>Dancepedia · ${seen} of ${CHAIN.length}</h2><div class="pedia">${cells}</div>`);
  $('#sheet').querySelectorAll('.cell').forEach(c => { c.onclick = () => { const k = +c.dataset.k, b = CHAIN[k]; if (!save.seen[k]) { toast(`Level ${k + 1} — not found yet`); return; }
    sheet(`<div class="detail"><div class="sprwrap">${spriteHTML(b, 3)}</div><div class="name">${esc(nameOf(b))}</div><div class="el">${esc(b.stageName)} · level ${k + 1}</div><p>${esc(b.desc)}</p><p class="el">Earns <i class="cn"></i>${fmt(RATE(k))} a second</p><button class="btn" id="back">Back</button></div>`);
    $('#back').onclick = pedia; }; });
}
function fanfare(lv) {
  const b = CHAIN[lv], f = document.createElement('div'); f.className = 'fanfare';
  f.innerHTML = `<div class="card"><div class="kicker">${b.sister === 0 ? 'NEW STAGE' : 'NEW DANCER'}</div><div class="sprwrap">${spriteHTML(b, 3)}</div><div class="name">${esc(nameOf(b))}</div><p>${esc(b.desc)}</p><button class="btn">Bravo!</button></div>`;
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
  await buildChain(); load(); preloadSheets();
  $('#shopBtn').onclick = shop; $('#pediaBtn').onclick = pedia;
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
main();
