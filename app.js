'use strict';

/* ---------- storage (this browser only; nothing leaves the device) ---------- */
const mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    if (/^latin\.(progress|streak|level|practice|stats)\./.test(k) && typeof Sync !== 'undefined') { const u = current(); if (u && k.endsWith(u.id)) Sync.touch(u); } },
  del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} },
};

const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
  '🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦉','🦄',
  '🐝','🦋','🐌','🐞','🐢','🐍','🐙','🦀','🐠','🐬',
  '🐳','🦈','🐊','🦒','🐘','🦔','🐿️','🦕','🦖','🐉',
  '🍎','🍌','🍉','🍇','🍓','🍒','🍍','🥕','🌽','🍄',
  '🍕','🍔','🍟','🌭','🍿','🧁','🍩','🍪','🍫','🍦',
  '⚽','🏀','🎾','🏓','🎯','🎲','🧩','🎸','🎹','🥁',
  '🚀','🚂','🚗','🚲','⛵','✈️','🚁','🏰','⛺','🌋',
  '🌞','🌙','⭐','🌈','☁️','⚡','❄️','🔥','💧','🌊',
  '🌸','🌻','🌵','🌲','🍀','💎','👑','🎁','🎈','🔔'];

const APP_VERSION = '71';
const DAY = 86400000;
// spaced repetition: each right answer earns a star and a longer rest before the word comes round again
// (10 minutes, then a day, 3 days, a week, a month); a wrong answer drops it to zero stars and brings it straight back
const REST = [0, 10 * 60000, DAY, 3 * DAY, 7 * DAY, 30 * DAY];
const RETIRE_DAYS = 30;
const restText = ms => ms < 3600000 ? Math.round(ms / 60000) + ' minutes' : ms < DAY * 1.5 ? 'a day' : ms < DAY * 6 ? Math.round(ms / DAY) + ' days' : ms < DAY * 20 ? 'a week' : 'a month';

/* ---------- words ---------- */
const KIND = pos => {
  if (/^N/.test(pos)) return 'noun';
  if (/^V/.test(pos)) return 'verb';
  if (/^Adj/.test(pos)) return 'adjective';
  if (pos === 'adv' || pos === 'part') return 'adverb';
  if (pos === 'prep') return 'preposition';
  if (pos === 'conj') return 'joining word';
  if (pos === 'pro') return 'pronoun';
  if (pos === 'qu') return 'question word';
  if (/^num/.test(pos)) return 'number';
  return 'word';
};
const STOP = new Set('a an the of to be is it i he she they his her their its one my your our self s and or on in by as at for with not no'.split(' '));
const tokens = s => new Set(s.toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z]+/).filter(t => t && !STOP.has(t)));
// what the player sees: the plain word, with every form listed (a/ab -> "a, ab") and the grammar notes dropped
const showWord = w => w.replace(/\s*\+\s*(abl|acc)\.?$/, '').replace(/\s*\((verb|adverb|noun)\)$/, '').split('/').join(', ');
const WORDS = VOCAB.map((v, i) => ({ ...v, id: v.word, show: showWord(v.word), kind: KIND(v.pos), toks: tokens(v.english), i }));
const phraseFor = w => (typeof PHRASES !== 'undefined' && PHRASES[w.word]) || null;
// Latin phrase with the card's word (marked *like this*) highlighted
const phraseHTML = la => esc(la).replace(/\*([^*]+)\*/g, '<mark>$1</mark>');
const memoFor = w => (typeof MEMORY !== 'undefined' && MEMORY[w.word]) || { pic: '📜', hook: `${w.show} means ${w.english}.` };

function distractors(w, pool = WORDS) {
  // a wrong answer must be clearly different: no shared words, no shared meaning group (vocab.js "sense"),
  // and not a pair checked by hand as too close (vocab.js "avoid", applies both ways)
  const clash = o => o === w || o.english === w.english || [...o.toks].some(t => w.toks.has(t)) ||
    (o.sense || []).some(t => (w.sense || []).includes(t)) ||
    (w.avoid || []).includes(o.word) || (o.avoid || []).includes(w.word);
  let c = pool.filter(o => o.kind === w.kind && !clash(o));
  if (c.length < 3) c = WORDS.filter(o => o.kind === w.kind && !clash(o));
  if (c.length < 3) c = c.concat(WORDS.filter(o => o.kind !== w.kind && !clash(o)));
  return c;
}

/* ---------- the star rule, shared by Organise and Practice ----------
   right answer: one more star and a longer rest (spaced repetition); wrong answer: back to zero and straight back in */
function recordAnswer(u, w, ok) {
  const p = getProg(u);
  const pw = p[w.id] || { s: 0, ok: 0, bad: 0 };
  if (ok) { pw.ok = (pw.ok || 0) + 1; pw.s = Math.min(5, (pw.s || 0) + 1); pw.r = Date.now() + REST[pw.s]; }
  else { pw.bad = (pw.bad || 0) + 1; pw.s = 0; delete pw.r; pw.w = [...(pw.w || []).filter(t => t > Date.now() - DAY), Date.now()].slice(-5); }   // when it was got wrong, last 24 h
  pw.t = Date.now();
  p[w.id] = pw; saveProg(u, p);
  // the daily tally behind the leaderboard: one point per word answered, in any game
  const st = store.get('latin.stats.' + u.id, { days: {}, total: 0 }), d = dayKey();
  st.days[d] = (st.days[d] || 0) + 1; st.total = (st.total || 0) + 1;
  for (const k in st.days) if (k < dayKey(Date.now() - 40 * DAY)) delete st.days[k];
  store.set('latin.stats.' + u.id, st);
  return pw;
}

/* ---------- players ---------- */
const users = () => store.get('latin.users', []);
const keyOf = (name, emojis) => name.trim().toLowerCase() + '|' + [...emojis].sort().join('');
const current = () => users().find(u => u.id === store.get('latin.current', null)) || null;
const progressKey = u => 'latin.progress.' + u.id;
const getProg = u => store.get(progressKey(u), {});
const saveProg = (u, p) => store.set(progressKey(u), p);
const streakKey = u => 'latin.streak.' + u.id;
const levelKey = u => 'latin.level.' + u.id;

/* vocabulary settings: each one opens up more words; Level 3 is the full list */
const LEVELS = [['beginner', 'Beginner'], ['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3']];
const inLevel = (w, l) => l === 'beginner' ? !!w.beginner : w.level <= +l;
const levelOf = u => { const l = store.get(levelKey(u), 'beginner'); return LEVELS.some(x => x[0] === l) ? l : 'beginner'; };
const levelName = l => LEVELS.find(x => x[0] === l)[1];
const activeWords = u => { const l = levelOf(u); return WORDS.filter(w => inLevel(w, l)); };

/* ---------- helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const starsHTML = n => '<span class="stars" aria-label="' + n + ' of 5 stars">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(5 - n) + '</span></span>';
const resting = (p, now = Date.now()) => p && p.r && p.r > now;
const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// words answered today, this week (since Monday) and ever; players from before the tally get their 'ever' from their stars record
function statsOf(u) {
  const st = store.get('latin.stats.' + u.id, null);
  const prog = store.get('latin.progress.' + u.id, {});
  const legacy = Object.values(prog).reduce((n, p) => n + (p.ok || 0) + (p.bad || 0), 0);
  const now = new Date(), dow = (now.getDay() + 6) % 7, monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).getTime();
  const days = st ? st.days : {};
  let today = days[dayKey()] || 0, week = 0;
  for (const k in days) if (k >= dayKey(monday)) week += days[k];
  return { today, week, ever: Math.max(st ? st.total : 0, legacy) };
}
function leaderboardHTML() {
  const rows = users().map(u => ({ u, ...statsOf(u) })).sort((a, b) => b.today - a.today || b.week - a.week || b.ever - a.ever);
  return `<div class="tile board"><h2>Leaderboard</h2><p class="small" style="margin:0 0 8px">Words answered, in any game.</p>
    <table class="lb"><thead><tr><th></th><th>Today</th><th>This week</th><th>Ever</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr class="${current() && r.u.id === current().id ? 'me' : ''}"><td class="who">${i === 0 && r.today ? '🥇 ' : ''}${avatarHTML(r.u, 'tiny')}${esc(r.u.name)}</td><td>${r.today}</td><td>${r.week}</td><td>${r.ever}</td></tr>`).join('')}
    </tbody></table></div>`;
}
// how often a word should come up: twice as often if it was got wrong in the last day, three times if twice or more
const boost = (p, now = Date.now()) => { const n = p && p.w ? p.w.filter(t => t > now - DAY).length : 0; return n >= 2 ? 3 : n === 1 ? 2 : 1; };
const weightOf = p => (6 - ((p && p.s) || 0)) * boost(p);
const fmtDate = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const app = $('#app');

/* iPhone / iPad: suggest adding to the home screen (only in Safari, not once installed) */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const SHARE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-label="Share" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function installTip(where) {
  if (!isIOS || installed() || store.get('latin.tipHidden', false)) return '';
  const first = where === 'signin' ? ' Do this <b>before</b> making your player, so your stars live in the app.' : '';
  return `<div class="tip" id="tip"><button class="x" id="tipX" aria-label="Hide tip">×</button>
    <b>Make it an app!</b> Tap ${SHARE_ICON} <b>Share</b>, then <b>Add to Home Screen</b>.${first}</div>`;
}
function wireTip() { const x = $('#tipX'); if (x) x.onclick = () => { store.set('latin.tipHidden', true); $('#tip').remove(); }; }
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
const sheet = $('#sheet');

function route() {
  Celebrate.stop();
  if (typeof Practice !== 'undefined') Practice.unmount();
  if (typeof Hammer !== 'undefined') Hammer.unmount();
  closeSheet();
  const u = current();
  const h = location.hash.slice(1);
  if (!u) return renderSignIn();
  if (h === 'practice') return renderPractice(u);
  if (h === 'trophies') return renderTrophies(u);
  if (h === 'hammer') return renderHammer(u);
  if (h === 'hammer-items') return renderHammer(u, true);
  if (h === 'read') return renderRead(u);
  if (h === 'list' || h === 'play') return renderOrganise(u, h);
  if (h === 'organise') return renderOrganise(u, store.get('latin.orgTab', 'play'));
  renderHome(u);
}
window.addEventListener('hashchange', route);

/* ---------- avatars (a photo kept only in this browser, never sent anywhere) ---------- */
const AVATAR_COLOURS = ['#E8A0B4', '#8FD3FF', '#9BE564', '#FFD23F', '#C9A7F0', '#FFB347', '#7DD3C0', '#F28B82'];
function avatarHTML(u, cls = '') {
  const col = AVATAR_COLOURS[(u.name.charCodeAt(0) + u.name.length) % AVATAR_COLOURS.length];
  return u.avatar ? `<span class="avatar ${cls}"><img src="${u.avatar}" alt=""></span>`
    : `<span class="avatar ${cls} plus" style="--c:${col}"><b>${esc(u.name[0].toUpperCase())}</b><i>+</i></span>`;
}
// choose a photo, shrink it to a small square, and keep it with the player on this device
function pickPhoto(u, done) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none'; document.body.appendChild(inp);
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const S = 160, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
      const m = Math.min(img.width, img.height); g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      URL.revokeObjectURL(url);
      const data = c.toDataURL('image/jpeg', .82);
      store.set('latin.users', users().map(x => x.id === u.id ? { ...x, avatar: data } : x));
      if (done) done();
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert("That picture couldn't be read. Try another one."); };
    img.src = url;
  };
  inp.click();
}

/* ---------- sign in: pick your face, then your two secret emojis; or add a new player ---------- */
function renderSignIn(mode) {
  const all = users();
  if (mode == null) mode = all.length ? 'pick' : 'new';
  let picked = [], chosen = mode && mode.id ? mode : null;
  if (chosen) mode = 'in';
  const who = chosen ? chosen : null;
  app.innerHTML = `
  <div class="wrap">
    <h1>Salve!</h1>
    <p class="sub">Learn every Latin word, one card at a time.</p>
    ${installTip('signin')}
    ${mode === 'pick' ? `
    <p class="lbl" style="text-align:center">Who's playing?</p>
    <div class="profiles">
      ${all.map(u => `<button class="profile" data-id="${u.id}">${avatarHTML(u, 'big')}<span>${esc(u.name)}</span></button>`).join('')}
      <button class="profile" data-id="new"><span class="avatar big add">+</span><span>Add player</span></button>
    </div>` : mode === 'in' ? `
    <button class="linkbtn" id="back">← Not ${esc(who.name)}? Choose another player</button>
    <div class="hello pickhello">${avatarHTML(who, 'big')}<div class="who">${esc(who.name)}</div></div>
    <label class="lbl">Your two secret emojis</label>
    <div class="picked"><div class="slot"></div><div class="slot"></div></div>
    <div class="emojis">${EMOJIS.map(e => `<button type="button" aria-pressed="false">${e}</button>`).join('')}</div>
    <p class="err" id="err"></p>
    <button class="btn" id="go" disabled>Let's play</button>
    ${Sync.enabled() ? '<button class="btn ghost" id="link">I have a sync code from another device</button>' : ''}` : `
    ${all.length ? '<button class="linkbtn" id="back">← Back to the players</button>' : ''}
    <label class="lbl" for="name">Your first name</label>
    <input id="name" type="text" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false">
    <label class="lbl">Choose your two secret emojis</label>
    <div class="picked"><div class="slot"></div><div class="slot"></div></div>
    <div class="emojis">${EMOJIS.map(e => `<button type="button" aria-pressed="false">${e}</button>`).join('')}</div>
    <p class="err" id="err"></p>
    <button class="btn" id="go" disabled>Create my player</button>
    ${Sync.enabled() ? '<button class="btn ghost" id="link">I have a sync code from another device</button>' : ''}
    <p class="small" style="text-align:center">Remember your two emojis — they are how the game knows it’s you. You can add a photo on the next page.${Sync.enabled() ? ' Your stars are saved in the cloud under a code, never your name.' : ' Everything stays on this device.'}</p>`}
  </div>`;
  wireTip();
  const back = $('#back'); if (back) back.onclick = () => renderSignIn('pick');
  if (mode === 'pick') {
    app.querySelector('.profiles').onclick = e => {
      const b = e.target.closest('.profile'); if (!b) return;
      if (b.dataset.id === 'new') return renderSignIn('new');
      const u = all.find(x => x.id === b.dataset.id); if (u) renderSignIn(u);
    };
    return;
  }
  const name = $('#name'), go = $('#go'), err = $('#err');
  const slots = app.querySelectorAll('.slot');
  const sync = () => {
    slots.forEach((s, i) => { s.textContent = picked[i] || ''; s.classList.toggle('full', !!picked[i]); });
    app.querySelectorAll('.emojis button').forEach(b => b.setAttribute('aria-pressed', picked.includes(b.textContent)));
    go.disabled = !((mode === 'in' || name.value.trim()) && picked.length === 2);
    err.textContent = '';
  };
  app.querySelector('.emojis').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const em = b.textContent;
    picked = picked.includes(em) ? picked.filter(x => x !== em) : picked.length < 2 ? [...picked, em] : [picked[0], em];
    sync();
    if (mode === 'in' && picked.length === 2 && keyOf(who.name, picked) === keyOf(who.name, who.emojis)) go.click();   // right emojis: straight in
  };
  if (name) name.oninput = sync;
  go.onclick = () => {
    if (mode === 'in') {
      if (keyOf(who.name, picked) !== keyOf(who.name, who.emojis)) { picked = []; sync(); err.textContent = "Those aren't " + who.name + "'s emojis. Try again" + (Sync.enabled() ? ', or use a sync code below.' : '.'); return; }
      store.set('latin.current', who.id);
    } else {
      const nm = name.value.trim().replace(/\s+/g, ' ');
      const k = keyOf(nm, picked);
      if (all.find(u => keyOf(u.name, u.emojis) === k)) { err.textContent = 'That player already exists — go back and tap their face.'; return; }
      const u = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: nm, emojis: picked, created: Date.now() };
      store.set('latin.users', [...all, u]);
      store.set('latin.current', u.id);
      if (Sync.enabled()) { location.hash = ''; showCode(u, true); return; }
    }
    location.hash = '';
    route();
  };
  const link = $('#link');
  if (link) link.onclick = async () => {
    // a new device: the player types the code from the old one and their progress comes across
    let base = who;
    if (mode === 'new') {
      const nm = name.value.trim().replace(/\s+/g, ' ');
      if (!nm || picked.length !== 2) { err.textContent = 'Type your name and pick your two emojis first, then tap this.'; return; }
      if (all.find(x => keyOf(x.name, x.emojis) === keyOf(nm, picked))) { err.textContent = 'That player already exists — go back and tap their face.'; return; }
      base = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: nm, emojis: picked, created: Date.now() };
    }
    const code = prompt('Type the sync code shown on your other device (like APPLE-TIGER-2481):');
    if (code == null) return;
    if (!Sync.valid(code)) { err.textContent = 'That doesn’t look like a sync code. It has two words and four numbers.'; return; }
    err.textContent = 'Looking…';
    try {
      const blob = await Sync.link(code);
      if (!blob) { err.textContent = 'No player found with that code. Check it on the other device (Home → sync code).'; return; }
      const u = { ...base, code: Sync.normalise(code) };
      store.set('latin.users', mode === 'new' ? [...all, u] : all.map(x => x.id === u.id ? u : x));
      store.set('latin.current', u.id);
      Sync.merge(u, blob);
      location.hash = ''; route();
    } catch (e) { err.textContent = 'Couldn’t reach the sync server. Check the internet and try again.'; }
  };
  sync();
}

/* ---------- sync code sheet ---------- */
let pulledFor = null;
function showCode(u, isNew) {
  const code = Sync.codeOf(u);
  sheet.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-label="Your sync code">
      <div class="memo">
        <div class="pic" aria-hidden="true">☁️</div>
        <div class="lat" style="font-size:1.3rem">${isNew ? 'Welcome, ' + esc(u.name) + '!' : 'Your sync code'}</div>
        <div class="code">${esc(code)}</div>
        <div class="how"><h3>${isNew ? 'Write this code down' : 'What it’s for'}</h3>
          <p>Your stars and levels are saved in the cloud under this code, with no name attached. To play on another phone, tablet or computer, choose “I've played before”, type your name and emojis, then enter this code once.</p></div>
      </div>
      <button class="btn" id="codeOk">${isNew ? "Got it — let's play" : 'Close'}</button>
    </div>`;
  sheet.hidden = false;
  const done = () => { closeSheet(); if (isNew) route(); };
  $('#codeOk').onclick = done;
  sheet.onclick = e => { if (e.target === sheet) done(); };
  Sync.touch(u);
}

/* ---------- home ---------- */
function summary(u) {
  const p = getProg(u), now = Date.now();
  const c = [0, 0, 0, 0, 0, 0]; let rest = 0;
  const words = activeWords(u);
  for (const w of words) { const s = (p[w.id] && p[w.id].s) || 0; c[s]++; if (resting(p[w.id], now)) rest++; }
  return { c, rest, total: words.length };
}
function meterHTML(c, total) {
  const col = ['var(--line)', '#E9C46A', '#E9A23B', '#D97B3A', '#B85C8E', 'var(--good)'];
  return '<div class="meter">' + [5, 4, 3, 2, 1, 0].map(s => `<span style="width:${100 * c[s] / total}%;background:${col[s]}"></span>`).join('') + '</div>';
}
// throw away every saved copy of the app and fetch it fresh
async function freshen() {
  try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
  location.href = location.pathname + '?v=' + Date.now();
}
// ask the server which version is current; if it is newer than this one, refresh once by itself (and otherwise offer a button)
async function checkVersion() {
  if (!navigator.onLine) return;
  let latest = 0;
  try { const t = await (await fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })).text(); const m = t.match(/latin-v(\d+)/); if (m) latest = +m[1]; } catch (e) { return; }
  if (latest <= +APP_VERSION) return;
  const line = $('#verline'); if (!line) return;
  line.textContent = `version ${latest} is ready · tap to update`;
  let tried = 0; try { tried = +sessionStorage.getItem('latin.upd') || 0; } catch (e) {}
  if (tried < latest) { try { sessionStorage.setItem('latin.upd', String(latest)); } catch (e) {} freshen(); }
}
function renderHome(u) {
  const { c, total } = summary(u);
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><span class="title"></span><span class="userbox"><button class="linkbtn" id="who">Log out</button><button class="avatarbtn" id="avatarBtn" title="${u.avatar ? 'Change your photo' : 'Add a photo'}">${avatarHTML(u)}</button></span></div>
    <div class="hello"><div class="small">Salve,</div><div class="who"></div></div>
    ${installTip('home')}
    <div class="levels top" id="levels" role="radiogroup" aria-label="Which words">
      ${LEVELS.map(([k, n]) => `<button role="radio" data-l="${k}" aria-checked="${k === levelOf(u)}"><b>${n}</b><span>${WORDS.filter(w => inLevel(w, k)).length} words</span></button>`).join('')}
    </div>
    ${meterHTML(c, total)}
    <div class="small meterline">${c[5]} mastered · ${total - c[0]} started · ${c[0]} new</div>
    <div class="tile prac2" id="org">
      <h2>Organise</h2>
      <button class="gamebanner" data-t="play" style="background-image:url('art/banners/cards.jpg')"><span class="gname cards">Cards</span></button>
      <button class="gamebanner" data-t="list" style="background-image:url('art/banners/wordlist.jpg')"><span class="gname list">Word list</span></button>
    </div>
    <div class="tile prac2" id="readtile">
      <h2>Read</h2>
      <button class="gamebanner" id="readGo" style="background-image:url('art/banners/sentences.jpg')"><span class="gname read">Sentences</span></button>
    </div>
    <div class="tile prac2" id="prac">
      <h2>Practice</h2>
      <button class="gamebanner" id="pracGo" style="background-image:url('art/banners/squishygeddon.jpg')"><span class="gname squishy">Squishygeddon</span></button>
      <button class="gamebanner" id="hamGo" style="background-image:url('art/banners/hammer.jpg')"><span class="gname hammer">Jacques Hammer</span></button>
    </div>
    ${leaderboardHTML()}
    <button class="linkbtn verline" id="verline">version ${APP_VERSION} · tap to check for updates</button>
    ${Sync.enabled() ? `<button class="syncline" id="syncline"><span>☁️ Sync code <b>${esc(Sync.codeOf(u))}</b></span><span class="small" id="syncstat"></span></button>` : ''}
  </div>`;
  $('.who').textContent = u.name;
  $('#avatarBtn').onclick = () => pickPhoto(u, () => renderHome(current()));
  wireTip();
  if (Sync.enabled()) {
    $('#syncline').onclick = () => showCode(u, false);
    const stat = { saving: 'saving…', saved: 'saved ✓', loading: 'checking…', error: 'not reachable', off: '' };
    const show = s => { const el = $('#syncstat'); if (el) el.textContent = stat[s] || ''; };
    show(Sync.status()); Sync.onStatus(show);
    if (pulledFor !== u.id) { pulledFor = u.id; Sync.pull(u).then(changed => { if (changed && current() && current().id === u.id && location.hash === '') renderHome(u); }); }
  }
  $('#pracGo').onclick = () => { location.hash = 'practice'; };
  $('#readGo').onclick = () => { location.hash = 'read'; };
  $('#verline').onclick = () => { $('#verline').textContent = 'updating…'; freshen(); };
  checkVersion();
  $('#hamGo').onclick = () => { location.hash = 'hammer'; };
  $('#levels').onclick = e => {
    const b = e.target.closest('button'); if (!b || b.dataset.l === levelOf(u)) return;
    store.set(levelKey(u), b.dataset.l); renderHome(u);
  };
  $('#org').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    store.set('latin.orgTab', b.dataset.t); location.hash = b.dataset.t;
  };
  $('#who').onclick = () => { store.del('latin.current'); route(); };
}

/* ---------- read: sentences, one word at a time ---------- */
// put a dictionary meaning into the shape a form needs: plural nouns, he/she verbs, and (with pronoun) I / you / we / they
const IRREG = { be: ['is', 'are', 'am'], do: ['does', 'do', 'do'], go: ['goes', 'go', 'go'], have: ['has', 'have', 'have'], man: 'men', woman: 'women', child: 'children', foot: 'feet', tooth: 'teeth', mouse: 'mice', person: 'people', wife: 'wives', life: 'lives', knife: 'knives', sheep: 'sheep', ship: 'ships' };
const PRON = { v1s: 'I', v2s: 'you', v3s: 'he/she', v1p: 'we', v2p: 'you', v3p: 'they' };
function inflect(english, shape, pronoun = false) {
  let base = english.split(',')[0].trim().replace(/\s*\(.*\)$/, '');
  if (shape === 'o' || shape === 'adj' || shape === 'adjp' || shape === 'n1') return base;
  const words = base.split(' '), head = words[0], rest = words.slice(1).join(' ');
  const sfx = w => /(s|x|z|ch|sh)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /[^aeiou]o$/.test(w) ? w + 'es' : w + 's';
  if (shape === 'n2') { const ir = IRREG[base]; const pl = typeof ir === 'string' ? ir : sfx(words[words.length - 1]); return words.length > 1 ? words.slice(0, -1).join(' ') + ' ' + pl : pl; }
  const ir = Array.isArray(IRREG[head]) ? IRREG[head] : null;
  const v = shape === 'v3s' ? (ir ? ir[0] : sfx(head)) : shape === 'v1s' ? (ir ? ir[2] : head) : (ir ? ir[1] : head);
  const out = rest ? v + ' ' + rest : v;
  return pronoun && PRON[shape] ? PRON[shape] + ' ' + out : out;
}
// the whole meaning list ("villa, house, farm" / "say, tell") in a shape; verb senses like "am afraid" are dropped
function inflectAll(english, shape) {
  if (shape === 'o' || shape === 'adj' || shape === 'adjp' || shape === 'n1' || /[()\/]/.test(english)) return english;
  const parts = english.split(',').map(x => x.trim()).filter(x => x && !/^(am|is|are)\s/.test(x));
  const isVerb = /^v/.test(shape);
  const forms = parts.map(x => inflect(x, shape, false));
  return (isVerb ? PRON[shape] + ' ' : '') + forms.join(', ');
}
function renderRead(u) {
  const byId = Object.fromEntries(WORDS.map(w => [w.id, w]));
  const pool = WORDS.filter(w => w.beginner);
  const key = 'latin.read.' + u.id;
  const sv = store.get(key, { done: {}, read: 0 });
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><button class="iconbtn" id="back" aria-label="Home">← Home</button><span class="title">Sentences</span><span class="lvtag" id="rcount"></span></div>
    <p class="small" style="text-align:center;margin:0 0 6px">Read the sentence. What does the <b>highlighted word</b> mean?</p>
    <div class="rsent card" id="rsent"></div>
    <div class="ropts" id="ropts"></div>
    <p class="rmsg" id="rmsg"></p>
  </div>`;
  $('#back').onclick = () => { location.hash = ''; };
  let sent = null, i = 0, opts = [], busy = false, misses = 0;
  const pick = () => {
    const seen = sv.done || {};
    const fresh = SENTENCES.map((x, n) => n).filter(n => !seen[n]);
    const list = fresh.length ? fresh : SENTENCES.map((x, n) => n);
    const n = list[Math.floor(Math.random() * list.length)];
    return { n, ...SENTENCES[n] };
  };
  const wordsIn = () => sent.la.filter(t => t[1]);
  function show() {
    const words = wordsIn();
    const cur = words[i];
    $('#rcount').textContent = `${Object.keys(sv.done || {}).length}/${SENTENCES.length} read`;
    $('#rsent').innerHTML = `<div class="rla">${sent.la.map(t => t[1] ? `<span class="rw ${t === cur ? 'cur' : words.indexOf(t) < i ? 'done' : ''}" data-id="${esc(t[1])}">${esc(t[0])}</span>` : `<span class="rp">${esc(t[0])}</span>`).join(' ')}</div>
      <div class="ren" id="ren"></div>`;
    if (!cur) { finish(); return; }
    const w = byId[cur[1]], gloss = cur[2], shape = cur[3];
    // wrong answers are put into the same English form as the right one (horses, not horse; walks, not walk)
    const ds = distractors(w, pool).slice().sort(() => Math.random() - .5).map(d => inflect(d.english, shape)).filter(x => x !== gloss);
    opts = [gloss, ds[0], ds[1] || ds[0]].sort(() => Math.random() - .5);
    $('#ropts').innerHTML = opts.map((o, k) => `<button class="btn ghost" data-k="${k}">${esc(o)}</button>`).join('');
    $('#rmsg').textContent = '';
    busy = false;
  }
  function finish() {
    $('#ren').textContent = sent.en; $('#ren').classList.add('show');
    sv.done = sv.done || {}; sv.done[sent.n] = Date.now(); sv.read = (sv.read || 0) + 1; store.set(key, sv);
    $('#rcount').textContent = `${Object.keys(sv.done).length}/${SENTENCES.length} read`;
    $('#ropts').innerHTML = `<button class="btn" id="rnext">${misses ? 'Next sentence' : '⭐ Perfect! Next sentence'}</button>`;
    $('#rmsg').textContent = misses ? `${misses} to look at again — they'll come round sooner.` : '';
    if (!misses) Celebrate(innerWidth / 2, innerHeight / 3, 1.6);
    $('#rnext').onclick = () => { sent = pick(); i = 0; misses = 0; show(); };
  }
  $('#ropts').onclick = e => {
    const b = e.target.closest('button[data-k]'); if (!b || busy) return;
    busy = true;
    const cur = wordsIn()[i], w = byId[cur[1]], gloss = cur[2], ok = opts[+b.dataset.k] === gloss;
    recordAnswer(u, w, ok);
    if (ok) { b.classList.add('good'); setTimeout(() => { i++; show(); }, 450); }
    else {
      misses++; b.classList.add('bad');
      $('#ropts').querySelectorAll('button').forEach((x, k) => { if (opts[k] === w.english) x.classList.add('good'); });
      $('#rmsg').innerHTML = `<b>${esc(cur[0])}</b> means <b>${esc(gloss)}</b>.`;
      setTimeout(() => { i++; show(); }, 1600);
    }
  };
  sent = pick(); show();
}

/* ---------- practice (garden defence) ---------- */
function renderPractice(u) {
  app.innerHTML = '<div id="pstage"></div>';
  Practice.mount($('#pstage'), u, { home: () => { location.hash = ''; }, tag: levelName(levelOf(u)) });
}

/* ---------- Jacques Hammer ---------- */
function renderHammer(u, items) {
  app.innerHTML = '<div id="hstage"></div>';
  Hammer.mount($('#hstage'), u, { home: () => { location.hash = ''; }, tag: levelName(levelOf(u)), items });
}

/* ---------- trophy cabinet ---------- */
function renderTrophies(u) {
  const sv = store.get('latin.practice.' + u.id, {});
  const list = Practice.trophies(sv), got = list.filter(t => t.got).length;
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><button class="iconbtn" id="back" aria-label="Home">← Home</button><span class="title">Trophies</span><span class="lvtag">${got}/20</span></div>
    <div class="cabinet">
      <div class="cabsign">TROPHIES</div>
      <div class="shelves">${list.map(t => `<div class="trophy ${t.got ? 'got' : ''}" title="${esc(t.how)}"><img src="art/trophies/${t.id}.png" alt=""><span>${t.got ? esc(t.name) : '???'}</span></div>`).join('')}</div>
    </div>
    <p class="small" style="text-align:center">${sv.kills || 0} squishies squished · best level ${sv.best || 1}${got < 20 ? ' · tap a trophy to see how to earn it' : ' · you have them all!'}</p>
  </div>`;
  $('#back').onclick = () => { location.hash = ''; };
  app.querySelector('.shelves').onclick = e => { const t = e.target.closest('.trophy'); if (t) alert(t.title); };
}

/* ---------- organise ---------- */
function renderOrganise(u, tab) {
  Celebrate.stop();
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><button class="iconbtn" id="back" aria-label="Home">← Home</button><span class="title">${tab === 'play' ? 'Play' : 'Word list'}</span><span class="lvtag">${levelName(levelOf(u))}</span></div>
    <div id="pane" class="play"></div>
  </div>`;
  $('#back').onclick = () => { location.hash = ''; };
  (tab === 'play' ? renderPlay : renderList)(u, $('#pane'));
}

/* word list */
function renderList(u, pane) {
  const p = getProg(u);
  const now = Date.now();
  let filter = store.get('latin.listFilter', 'all'), term = '';
  const { c, rest, total } = summary(u);
  const opts = [['all', 'All ' + total], ['0', 'New ' + c[0]], ...[1, 2, 3, 4, 5].map(s => [String(s), '★'.repeat(s) + ' ' + c[s]]), ['rest', 'Resting ' + rest]];
  pane.innerHTML = `
    <div class="sticky">
      ${meterHTML(c, total)}
      <input type="search" id="q" placeholder="Search Latin or English…" autocomplete="off">
      <div class="filters">${opts.map(([k, l]) => `<button data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join('')}</div>
      <div class="count" id="count"></div>
    </div>
    <ul class="words" id="words"></ul>`;
  const list = $('#words', pane);
  const sorted = activeWords(u).sort((a, b) => a.word.replace(/^-/, '').localeCompare(b.word.replace(/^-/, ''), 'en', { sensitivity: 'base' }));
  const draw = () => {
    const shown = sorted.filter(w => {
      const s = (p[w.id] && p[w.id].s) || 0;
      if (filter === 'rest' ? !resting(p[w.id], now) : filter !== 'all' && String(s) !== filter) return false;
      return !term || w.show.toLowerCase().includes(term) || w.english.toLowerCase().includes(term);
    });
    list.innerHTML = shown.map(w => {
      const pw = p[w.id] || {}, s = pw.s || 0;
      return `<li><button data-i="${w.i}"><span class="lat">${esc(w.show)}</span>${starsHTML(s)}<span class="en">${esc(w.english)}${resting(pw, now) ? `<span class="rest">😴 resting until ${fmtDate(pw.r)}</span>` : ''}</span></button></li>`;
    }).join('') || '<li class="empty">No words here yet.</li>';
    $('#count', pane).textContent = shown.length + (shown.length === 1 ? ' word' : ' words') + ' · tap a word to see how to remember it';
  };
  $('.filters', pane).onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.f; store.set('latin.listFilter', filter);
    pane.querySelectorAll('.filters button').forEach(x => x.setAttribute('aria-pressed', x === b));
    draw();
  };
  $('#q', pane).oninput = e => { term = e.target.value.trim().toLowerCase(); draw(); };
  list.onclick = e => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    const w = WORDS[+b.dataset.i];
    openMemo(w, (p[w.id] && p[w.id].s) || 0);
  };
  draw();
}

/* memory card sheet */
function openMemo(w, stars, verdict, onClose, btnLabel) {
  const m = memoFor(w);
  sheet.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-label="How do we remember ${esc(w.show)}?">
      ${verdict ? `<div class="verdict bad">${verdict}</div>` : ''}
      <div class="memo">
        <div class="pic" aria-hidden="true">${esc(m.pic)}</div>
        <div class="lat">${esc(w.show)}</div>
        <div class="en">${esc(w.english)}</div>
        <div class="how"><h3>How do we remember this?</h3><p>${esc(m.hook)}</p></div>
        ${phraseFor(w) ? `<div class="how said"><h3>In a sentence</h3><p class="la">${phraseHTML(phraseFor(w).la)}</p><p class="tr">${esc(phraseFor(w).en)}</p></div>` : ''}
        <div class="meta">${starsHTML(stars)} <span class="small">· ${w.kind} · Level ${w.level}</span></div>
      </div>
      <button class="btn" id="memoOk">${btnLabel || (verdict ? 'Got it — next card' : 'Close')}</button>
    </div>`;
  sheet.hidden = false;
  const done = () => { closeSheet(); if (onClose) onClose(); };
  $('#memoOk').onclick = done;
  sheet.onclick = e => { if (e.target === sheet) done(); };
  $('#memoOk').focus();
}
function closeSheet() { sheet.hidden = true; sheet.innerHTML = ''; sheet.onclick = null; }

/* swipe game */
function renderPlay(u, pane) {
  const recent = [], GAP = 25;
  let card = null, busy = false, right = 0, seen = 0;
  const st = store.get(streakKey(u), { cur: 0, best: 0 });
  pane.innerHTML = `
    <div class="streakbar"><div class="streak" id="streak"><span class="fire">🔥</span><span class="n" id="sn">0</span><span class="lbl">in a row</span></div><div class="best" id="best"></div></div>
    <div class="score"><span id="sc">Swipe to answer</span><span id="left"></span></div>
    <div class="deck" id="deck"></div>
    <div class="answer"><button class="no" id="no">✗ Wrong</button><button class="yes" id="yes">Right ✓</button></div>
    <p class="hint">Does the Latin word mean the English? Swipe right for <b>right</b>, left for <b>wrong</b>.</p>`;
  const deck = $('#deck', pane);
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast);

  function pick() {
    const p = getProg(u), now = Date.now();
    const active = activeWords(u);
    // words due back first; once none are due, every word is in play (the recently-missed ones more often).
    // A word never comes back until at least GAP others have been shown, except when there is nothing else to show.
    const gapFor = n => Math.min(GAP, Math.max(0, n - 3));
    let pool = active.filter(w => !resting(p[w.id], now));
    pool = pool.filter(w => !recent.slice(-gapFor(pool.length)).includes(w.id));
    if (!pool.length) { pool = active.filter(w => !recent.slice(-gapFor(active.length)).includes(w.id)); }
    if (!pool.length) pool = active.filter(w => w.id !== recent[recent.length - 1]);
    if (!pool.length) pool = active.slice();
    if (!pool.length) return null;
    let total = 0;
    const wts = pool.map(w => { const t = weightOf(p[w.id]); total += t; return t; });
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= wts[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  // a card is picked one ahead, so the next word sits underneath while the top one is swiped
  let pending = null;
  function prepare() {
    const w = pick(); if (!w) return null;
    recent.push(w.id); if (recent.length > GAP) recent.shift();
    const match = Math.random() < 0.5;
    const form = typeof Forms !== 'undefined' ? Forms.pick(w) : { la: w.show, shape: 'o' };
    const ds = match ? null : distractors(w, activeWords(u));
    const raw = match ? w.english : ds[Math.floor(Math.random() * ds.length)].english;
    const shape = form.la === w.show ? 'o' : form.shape;   // the headword keeps its plain dictionary meaning
    return { w, match, form, shown: inflectAll(raw, shape) };
  }
  const cardHTML = (c, p, top) => `
      <div class="card${top ? '' : ' under'}" ${top ? 'id="top"' : 'aria-hidden="true"'} data-kind="${c.w.kind}">
        <div class="cstars">${starsHTML((p[c.w.id] && p[c.w.id].s) || 0)}</div>
        ${phraseFor(c.w) ? `<div class="phrase">${phraseHTML(phraseFor(c.w).la)}</div>` : ''}
        <div class="kind">${c.w.kind}</div>
        ${top ? '<span class="stamp yes">RIGHT</span><span class="stamp no">WRONG</span>' : ''}
        <div class="lat">${esc(c.form ? c.form.la : c.w.show)}</div>
        <div class="means">means</div>
        <div class="en">${esc(c.shown)}</div>
      </div>`;
  function next() {
    const p = getProg(u), now = Date.now();
    $('#left', pane).textContent = activeWords(u).filter(x => resting(p[x.id], now)).length + ' resting 😴';
    card = pending || prepare();
    if (!card) {
      deck.innerHTML = '<div class="empty">🏆 Every word is resting!<br>Come back soon to keep them fresh.</div>';
      return;
    }
    pending = prepare();
    deck.innerHTML = (pending ? cardHTML(pending, p, false) : '<div class="card under" aria-hidden="true"></div>') + cardHTML(card, p, true);
    drawFrame();
    attachSwipe($('#top', deck));
    busy = false;
  }
  function answer(saysMatch) {
    if (!card) return;
    busy = true;
    const { w, match, shown, form } = card, la = form ? form.la : w.show;
    card = null;
    const ok = saysMatch === match;
    seen++;
    const hadStars = (getProg(u)[w.id] || {}).s || 0;
    const pw = recordAnswer(u, w, ok);
    if (ok) {
      st.cur++; st.best = Math.max(st.best, st.cur);
      const big = st.cur % 10 === 0 ? 2.4 : st.cur % 5 === 0 ? 1.7 : 1;
      const r = deck.getBoundingClientRect();
      Celebrate(r.left + r.width / 2, r.top + 8, big);   // glitter sprays up from the top of the card
      right++;
      if (pw.s === 5) flash(`🏆 ${w.show} mastered! Resting for a month`); else if (pw.s >= 2) flash(`⭐ ${pw.s} stars — back in ${restText(REST[pw.s])}`);
    } else st.cur = 0;
    store.set(streakKey(u), st);
    showStreak(ok);
    $('#sc', pane).textContent = `${right} / ${seen} right this time`;
    if (ok) setTimeout(next, 120);
    else {
      const v = (match
        ? `Oops — “${esc(la)}” really does mean “${esc(shown)}”.`
        : `Not quite — “${esc(la)}” doesn’t mean “${esc(shown)}”.`) + (hadStars ? ' Back to zero stars for this one.' : '');
      setTimeout(() => openMemo(w, pw.s, v, next), 120);
    }
  }
  function fly(el, dir) {
    el.classList.add('anim');
    el.style.transform = `translateX(${dir * (window.innerWidth + 200)}px) rotate(${dir * 30}deg)`;
    el.style.opacity = '0';
    setTimeout(() => answer(dir > 0), 200);
  }
  function attachSwipe(el) {
    let x0 = null, y0 = 0, dx = 0, t0 = 0, id = null;
    const yes = $('.stamp.yes', el), no = $('.stamp.no', el);
    el.addEventListener('pointerdown', e => {
      if (busy) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; t0 = performance.now(); id = e.pointerId;
      el.setPointerCapture(id); el.classList.add('dragging'); el.classList.remove('anim');
    });
    el.addEventListener('pointermove', e => {
      if (x0 === null || e.pointerId !== id) return;
      dx = e.clientX - x0;
      const dy = (e.clientY - y0) * 0.2;
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      yes.style.opacity = Math.max(0, Math.min(1, dx / 90));
      no.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    });
    const end = e => {
      if (x0 === null || e.pointerId !== id) return;
      x0 = null; el.classList.remove('dragging');
      const v = Math.abs(dx) / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) > 90 || (Math.abs(dx) > 30 && v > 0.5)) { busy = true; fly(el, dx > 0 ? 1 : -1); }
      else { el.classList.add('anim'); el.style.transform = ''; yes.style.opacity = 0; no.style.opacity = 0; if (Math.abs(dx) < 8 && Math.abs(e.clientY - y0) < 8 && performance.now() - t0 < 400) flip(el); }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  // tap the card to peek: it turns over to show the meaning and the memory tip. Peeking takes the word back to
  // no stars (it clearly isn't known yet) but leaves the streak alone; the card then just moves on.
  function flip(el) {
    if (!card || busy) return;
    busy = true;
    const { w } = card; card = null;
    const p = getProg(u), pw = p[w.id] || { s: 0, ok: 0, bad: 0 };
    pw.s = 0; delete pw.r; pw.t = Date.now(); p[w.id] = pw; saveProg(u, p);
    const m = memoFor(w), ph = phraseFor(w);
    el.classList.add('flipped');
    el.insertAdjacentHTML('beforeend', `<div class="back">
        <div class="pic" aria-hidden="true">${esc(m.pic)}</div>
        <div class="blat">${esc(w.show)}</div><div class="ben">${esc(w.english)}</div>
        <div class="how"><h3>How do we remember this?</h3><p>${esc(m.hook)}</p></div>
        ${ph ? `<div class="how said"><p class="la">${phraseHTML(ph.la)}</p><p class="tr">${esc(ph.en)}</p></div>` : ''}
        <div class="small">Back to no stars for this one — now you know it!</div>
        <button class="btn" id="flipNext">Next card</button></div>`);
    $('#flipNext', el).onclick = e => { e.stopPropagation(); el.classList.add('anim'); el.style.opacity = 0; setTimeout(next, 250); };
    $('#sc', pane).textContent = `${right} / ${seen} right this time`;
  }
  function button(dir) {
    const el = $('#top', deck);
    if (!el || busy || !sheet.hidden) return;
    busy = true;
    $(dir > 0 ? '.stamp.yes' : '.stamp.no', el).style.opacity = 1;
    fly(el, dir);
  }
  function showStreak(bump) {
    $('#sn', pane).textContent = st.cur;
    $('#best', pane).textContent = st.best ? 'Best ' + st.best : '';
    const el = $('#streak', pane);
    el.classList.toggle('hot', st.cur >= 5);
    el.classList.remove('pop', 'zero'); void el.offsetWidth;
    if (bump === true) el.classList.add('pop');
    if (bump === false) el.classList.add('zero');
  }
  function drawFrame() {
    for (const el of deck.querySelectorAll('.card[data-kind]')) {
      const old = $('.frame', el); if (old) old.remove();
      el.insertAdjacentHTML('afterbegin', frameSVG(el.dataset.kind, el.clientWidth, el.clientHeight));
    }
  }
  function flash(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(flash.t); flash.t = setTimeout(() => toast.classList.remove('show'), 900);
  }
  $('#yes', pane).onclick = () => button(1);
  $('#no', pane).onclick = () => button(-1);
  const keys = e => {
    if (!document.body.contains(deck)) { document.removeEventListener('keydown', keys); toast.remove(); return; }
    if (e.key === 'ArrowRight') button(1);
    if (e.key === 'ArrowLeft') button(-1);
  };
  document.addEventListener('keydown', keys);
  const onResize = () => { if (!document.body.contains(deck)) return removeEventListener('resize', onResize); drawFrame(); };
  addEventListener('resize', onResize);
  showStreak();
  next();
}

route();
