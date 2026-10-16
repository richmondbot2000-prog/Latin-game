'use strict';

/* ---------- storage (this browser only; nothing leaves the device) ---------- */
const mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    if (/^latin\.(progress|streak|level|practice|stats|hammer|read|beasts|passages|book)\./.test(k) && typeof Sync !== 'undefined') { const u = current(); if (u && k.endsWith(u.id)) Sync.touch(u); } },
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

const APP_VERSION = '119';
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
  const gm = h.match(/^gift\/([A-Za-z0-9-]+)$/);
  if (gm) { store.set('latin.pendingGift', gm[1].toUpperCase()); location.hash = ''; return; }   // the hash change brings us back here, signed in or not
  if (!u) return renderSignIn();
  if (h === 'practice') return renderPractice(u);
  if (h === 'trophies') return renderTrophies(u);
  if (h === 'hammer') return renderHammer(u);
  if (h === 'hammer-items') return renderHammer(u, true);
  if (h === 'read') return renderRead(u);
  if (h === 'beasts') return renderBeasts(u);
  if (h === 'cards') return renderCardsHome(u);
  if (h === 'passages') return renderPassages(u);
  if (h === 'snap') return renderSnap(u);
  if (h === 'library') return renderSnap(u, 'books');
  if (h === 'book') return levelOf(u) === '3' ? renderPassages(u, true) : renderHome(u);
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
      <button class="btn ghost" id="codeSave">${navigator.share ? '📤 Save my code (Notes, a message to a parent…)' : '📋 Copy my code'}</button>
      <button class="btn" id="codeOk">${isNew ? "Got it — let's play" : 'Close'}</button>
    </div>`;
  sheet.hidden = false;
  const done = () => { closeSheet(); if (isNew) route(); };
  $('#codeSave').onclick = async () => {
    const msg = `My Latin game sync code is ${code}. Keep it safe: it brings my stars and beasts to any device at https://latin.musicalmagic.uk`;
    try { if (navigator.share) await navigator.share({ text: msg }); else { await navigator.clipboard.writeText(code); $('#codeSave').textContent = '✓ Copied'; } store.set('latin.codeSaved.' + u.id, true); } catch (e) {}
  };
  $('#codeOk').onclick = done;
  sheet.onclick = e => { if (e.target === sheet) done(); };
  Sync.touch(u);
}


/* ---------- player names, gifts and the inbox (sync/worker.js) ---------- */
// a player name is what friends type to send you a beast: one word, letters and digits, not a real name
function nameSheet(u, done) {
  sheet.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-label="Player name">
      <div class="memo">
        <div class="pic" aria-hidden="true">🎁</div>
        <div class="lat" style="font-size:1.3rem">${u.player ? 'Your player name' : 'Choose a player name'}</div>
        <p class="small">Friends type this name to send you a beast. One word, letters and numbers only — <b>not your real name</b>. Other players will see it.</p>
        <input type="text" id="pname" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. ${esc(Sync.cleanName(Sync.codeOf(u).split('-')[0] + Sync.codeOf(u).split('-')[2]).toUpperCase())}" value="${esc((u.player || '').toUpperCase())}">
        <p class="err" id="perr"></p>
      </div>
      <button class="btn" id="pOk" disabled>${u.player ? 'Change name' : 'Claim this name'}</button>
      <button class="btn ghost" id="pNo">Not now</button>
    </div>`;
  sheet.hidden = false;
  const inp = $('#pname'), ok = $('#pOk'), err = $('#perr');
  let t = 0;
  inp.oninput = () => {
    const n = Sync.cleanName(inp.value); ok.disabled = true; err.textContent = '';
    if (!Sync.validName(n)) { if (inp.value.length) err.textContent = '3 to 16 letters or numbers, no spaces.'; return; }
    clearTimeout(t); t = setTimeout(async () => { try { const r = await fetch((store.get('latin.syncUrl', '') || 'https://sync.musicalmagic.uk') + '/name/' + n, { cache: 'no-store' }).then(x => x.json()); if (Sync.cleanName(inp.value) !== n) return; if (r.free || n === u.player) { err.textContent = '✓ ' + n.toUpperCase() + ' is free'; ok.disabled = false; } else err.textContent = n.toUpperCase() + ' is taken — try another.'; } catch (e) { err.textContent = 'Can’t reach the server right now.'; } }, 350);
  };
  ok.onclick = async () => {
    ok.disabled = true; err.textContent = 'Claiming…';
    try { const r = await Sync.claimName(u, inp.value); if (r === 'taken') { err.textContent = 'Just taken by someone else — try another.'; return; } closeSheet(); if (done) done(); }
    catch (e) { err.textContent = 'Couldn’t claim it — check the internet and try again.'; ok.disabled = false; }
  };
  $('#pNo').onclick = closeSheet; sheet.onclick = e => { if (e.target === sheet) closeSheet(); };
  inp.focus();
}
// give a spare of beast b away: to a player by name, or to a friend who isn't in the game yet by a share-able gift code
function giveSheet(u, b, done) {
  if (!u.player) { nameSheet(u, () => giveSheet(u, b, done)); return; }
  const s = Beasts.state(u), stage = s.have[b.key] || 0, st = b.stages[stage];
  sheet.innerHTML = `
    <div class="panel bsheet" role="dialog" aria-modal="true" aria-label="Give ${esc(st.name)}">
      <img class="bbig" src="${Beasts.img(b, stage)}" alt="" style="width:min(40vw,160px)">
      <div class="bname">Give ${esc(an(st.name))}</div>
      <p class="small">Your spare goes to them and leaves your collection.</p>
      <label class="lbl" for="gto">To a player in the game</label>
      <div class="typerow"><input type="text" id="gto" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="their player name"><button class="btn" id="gSend" type="button">Send</button></div>
      <p class="small" style="margin:14px 0 6px">Or a friend who isn’t in the game yet:</p>
      <button class="btn ghost" id="gInvite">📤 Invite a friend with this ${esc(st.name)}</button>
      <p class="err" id="gerr"></p>
      <button class="btn ghost" id="gNo">Cancel</button>
    </div>`;
  sheet.hidden = false;
  const err = $('#gerr');
  const fail = e => { err.textContent = e.status === 404 ? 'No player has that name. Check the spelling with your friend.' : e.status === 429 ? 'That’s 10 gifts today — more tomorrow!' : e.status === 403 ? 'You don’t have a spare of that one any more.' : e.status === 400 && /self/.test(e.message) ? 'That’s you!' : 'Couldn’t send — check the internet and try again.'; };
  $('#gSend').onclick = async () => {
    const to = Sync.cleanName($('#gto').value); if (!Sync.validName(to)) { err.textContent = 'Type their player name.'; return; }
    $('#gSend').disabled = true; err.textContent = 'Sending…';
    try { Sync.flush(); await Sync.sendGift(u, to, b.key, stage); Beasts.give(u, b.key); Sync.flush(); closeSheet(); flashHome(`🎁 Your ${st.name} is on its way to ${to.toUpperCase()}!`); if (done) done(); }
    catch (e) { fail(e); $('#gSend').disabled = false; }
  };
  $('#gInvite').onclick = async () => {
    $('#gInvite').disabled = true; err.textContent = 'Making a gift code…';
    try {
      Sync.flush(); const code = await Sync.giftCode(u, b.key, stage); Beasts.give(u, b.key); Sync.flush();
      const msg = `${u.player.toUpperCase()} has sent you ${an(st.name)}! Join the Latin game to open it: https://latin.musicalmagic.uk/#gift/${code}`;
      let shared = false;
      try { if (navigator.share) { await navigator.share({ text: msg }); shared = true; } } catch (e) {}
      if (!shared) { try { await navigator.clipboard.writeText(msg); } catch (e) {} }
      sheet.innerHTML = `<div class="panel memo" role="dialog"><div class="pic">🎁</div><div class="lat" style="font-size:1.2rem">Gift code ${esc(code)}</div><p class="small">${shared ? 'Sent! ' : 'Copied — paste it into a message. '}The first person to open the link and join the game gets your ${esc(st.name)}. The code lasts 60 days.</p><div class="code">${esc(msg)}</div><button class="btn" id="gOk">Done</button></div>`;
      $('#gOk').onclick = () => { closeSheet(); if (done) done(); };
    } catch (e) { fail(e); $('#gInvite').disabled = false; }
  };
  $('#gNo').onclick = closeSheet; sheet.onclick = e => { if (e.target === sheet) closeSheet(); };
}
// a picture that failed to load (a dropped connection) is asked for again a few seconds later, up to five times
function retryImg(im) { const n = +(im.dataset.retry || 0); if (n >= 5) return; im.dataset.retry = n + 1; setTimeout(() => { im.src = im.src.split('?')[0] + '?r=' + (n + 1); }, 1500 * (n + 1)); }
function flashHome(msg) { const t = document.createElement('div'); t.className = 'toast show'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
// a gift arrives: the beast card in a sheet, with who it came from
function giftSheet(ev, from, done) {
  const b = ev.beast, st = b.stages[ev.stage], el = Beasts.ELEMENT[b.el] || ['', ''];
  sheet.innerHTML = `<div class="panel bsheet" role="dialog" aria-modal="true" aria-label="A gift">
      <div class="card beast egg giftcard"><div class="btitle">GIFT</div>
        <div class="bstage"><img class="bnew" src="${Beasts.img(b, ev.stage)}" alt="" onerror="retryImg(this)"><span class="glow"></span></div>
        <div class="ribbon"><span>${esc(st.name)}</span></div><div class="belem">${el[0]}</div></div>
      <p style="margin:12px 0 0">${from ? `<b>${esc(from.toUpperCase())}</b> sent you this ${esc(st.name)}${ev.spare ? ' — you already had one, so it’s a spare you can pass on' : ''}!` : `Someone opened your gift!`}</p>
      <button class="btn" id="gfOk">Wonderful</button></div>`;
  sheet.hidden = false;
  Celebrate(innerWidth / 2, innerHeight / 3, 2.6);
  $('#gfOk').onclick = () => { closeSheet(); if (done) done(); }; sheet.onclick = e => { if (e.target === sheet) { closeSheet(); if (done) done(); } };
}
const muteKey = u => 'latin.mutes.' + u.id;
const an = name => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;
// the inbox: gifts waiting on the server, and a pending gift link; shown as a box at the top of the home page
async function loadInbox(u) {
  if (!Sync.enabled()) return;
  const box = $('#inbox'); if (!box) return;
  const pending = store.get('latin.pendingGift', null);
  if (pending) {
    store.del('latin.pendingGift');
    try { const g = await Sync.claimCode(u, pending); await Beasts.load(); const ev = Beasts.receive(u, g.beast, g.stage); if (ev) giftSheet(ev, g.from, () => renderHome(u)); }
    catch (e) { flashHome(e.status === 404 ? 'That gift has already been opened, or the code is wrong.' : e.status === 400 ? 'That’s your own gift link!' : 'Couldn’t open the gift — check the internet and try again.'); }
  }
  let items; try { items = await Sync.inbox(u); } catch (e) { return; }
  if (!document.body.contains(box)) return;
  const mutes = store.get(muteKey(u), []);
  for (const it of items) if (it.kind === 'gift' && mutes.includes(it.from)) { Sync.dropInbox(u, it.id).catch(() => {}); }   // gifts from muted players are thrown away unseen
  items = items.filter(it => !(it.kind === 'gift' && mutes.includes(it.from)));
  if (!items.length) { box.innerHTML = ''; return; }
  await Beasts.load();
  box.innerHTML = items.map(it => { const b = Beasts.byKey(it.beast); const nm = b ? b.stages[Math.min(it.stage || (b.stages.length - 1), b.stages.length - 1)].name : 'beast';
    return it.kind === 'gift'
      ? `<div class="giftbox" data-id="${it.id}"><img src="${b ? Beasts.img(b, Math.min(it.stage || 0, b.stages.length - 1)) : ''}" alt=""><div class="gtxt"><b>${esc(it.from.toUpperCase())}</b> has sent you ${/^[aeiou]/i.test(nm) ? 'an' : 'a'} <b>${esc(nm)}</b>!<div class="gbtns"><button class="btn" data-open="${it.id}">Open</button><button class="linkbtn" data-mute="${esc(it.from)}">Don’t accept from ${esc(it.from.toUpperCase())}</button></div></div></div>`
      : `<div class="giftbox" data-id="${it.id}"><span class="gpic">🎉</span><div class="gtxt">Someone opened your <b>${esc(nm)}</b> gift and joined the game!<div class="gbtns"><button class="btn ghost" data-ok="${it.id}">Nice</button></div></div></div>`; }).join('');
  box.onclick = async e => {
    const o = e.target.closest('[data-open]'), m = e.target.closest('[data-mute]'), k = e.target.closest('[data-ok]');
    if (o) { const it = items.find(x => x.id === o.dataset.open); o.disabled = true; try { await Sync.dropInbox(u, it.id); } catch (err) { o.disabled = false; return; } const ev = Beasts.receive(u, it.beast, it.stage); Sync.flush(); if (ev) giftSheet(ev, it.from, () => renderHome(u)); else renderHome(u); }
    if (m) { if (!confirm(`Throw away gifts from ${m.dataset.mute.toUpperCase()} from now on?`)) return; store.set(muteKey(u), [...new Set([...store.get(muteKey(u), []), m.dataset.mute])]); renderHome(u); }
    if (k) { try { await Sync.dropInbox(u, k.dataset.ok); } catch (err) {} renderHome(u); }
  };
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
    <div id="inbox"></div>
    ${installTip('home')}
    <div class="levels top" id="levels" role="radiogroup" aria-label="Which words">
      ${LEVELS.map(([k, n]) => `<button role="radio" data-l="${k}" aria-checked="${k === levelOf(u)}"><b>${n}</b><span>${WORDS.filter(w => inLevel(w, k)).length} words</span></button>`).join('')}
    </div>
    ${meterHTML(c, total)}
    <div class="small meterline">${c[5]} mastered · ${total - c[0]} started · ${c[0]} new</div>
    <div class="tile prac2" id="org">
      <h2>Organise</h2>
      <button class="gamebanner" data-t="list" style="background-image:url('art/banners/wordlist.jpg')"><span class="gname list">Word list</span></button>
    </div>
    <div class="tile prac2" id="prac">
      <h2>Practice</h2>
      <button class="gamebanner" id="cardsGo" style="background-image:url('art/banners/cards.jpg')"><span class="gname cards">Cards &amp; Beasts</span></button>
      <button class="gamebanner" id="pracGo" style="background-image:url('art/banners/squishygeddon.jpg')"><span class="gname squishy">Squishygeddon</span></button>
      <button class="gamebanner" id="hamGo" style="background-image:url('art/banners/hammer.jpg')"><span class="gname hammer">Jacques Hammer</span></button>
    </div>
    <div class="tile prac2" id="readtile">
      <h2>Read</h2>
      <button class="gamebanner" id="readGo" style="background-image:url('art/banners/sentences.jpg')"><span class="gname read">Sentences</span></button>
      <button class="gamebanner" id="passGo" style="background-image:url('art/banners/passages.jpg')"><span class="gname pass">Passages</span></button>
      <button class="gamebanner${levelOf(u) === '3' ? '' : ' locked'}" id="bookGo" style="background-image:url('art/banners/book.jpg')"><span class="gname book">Read a book</span>${levelOf(u) === '3' ? '' : '<span class="corner">Level 3</span>'}</button>
      <button class="gamebanner" id="snapGo" style="background-image:url('art/banners/snap.jpg')"><span class="gname snap">Snap a page</span></button>
      <button class="gamebanner" id="libGo" style="background-image:url('art/banners/library.jpg')"><span class="gname lib">Library</span></button>
    </div>
    ${leaderboardHTML()}
    <button class="linkbtn verline" id="verline">version ${APP_VERSION} · tap to check for updates</button>
    ${Sync.enabled() ? `<button class="syncline" id="syncline"><span>☁️ Sync code <b>${esc(Sync.codeOf(u))}</b></span><span class="small" id="syncstat"></span></button>
    <button class="syncline" id="nameline"><span>🎁 ${u.player ? `Player name <b>${esc(u.player.toUpperCase())}</b>` : 'Choose a player name so friends can send you beasts'}</span></button>` : ''}
  </div>`;
  $('.who').textContent = u.name;
  $('#avatarBtn').onclick = () => pickPhoto(u, () => renderHome(current()));
  wireTip();
  if (Sync.enabled()) {
    $('#syncline').onclick = () => showCode(u, false);
    const stat = { saving: 'saving…', saved: 'saved ✓', loading: 'checking…', error: 'not reachable', off: '' };
    const show = s => { const el = $('#syncstat'); if (el) el.textContent = stat[s] || ''; };
    show(Sync.status()); Sync.onStatus(show);
    $('#nameline').onclick = () => nameSheet(u, () => renderHome(u));
    if (pulledFor !== u.id) { pulledFor = u.id; Sync.pull(u).then(changed => { if (changed && current() && current().id === u.id && location.hash === '') renderHome(u); }); }
    loadInbox(u);
  }
  $('#pracGo').onclick = () => { location.hash = 'practice'; };
  $('#readGo').onclick = () => { location.hash = 'read'; };
  $('#cardsGo').onclick = () => { location.hash = 'cards'; };
  $('#passGo').onclick = () => { location.hash = 'passages'; };
  $('#snapGo').onclick = () => { location.hash = 'snap'; };
  $('#libGo').onclick = () => { location.hash = 'library'; };
  $('#bookGo').onclick = () => { if (levelOf(u) === '3') location.hash = 'book'; else flashHome('📖 The book opens at Level 3 — choose Level 3 above to read it.'); };
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


/* ---------- Cards & Beasts: the home screen — a face-down deck to swipe, and the Beastpedia ---------- */
function renderCardsHome(u) {
  Celebrate.stop();
  const st = store.get(streakKey(u), { cur: 0, best: 0 });
  // the same frame as the play screen (bar, streak, deck, a row below), so the deck does not move when play starts
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><button class="iconbtn" id="back" aria-label="Home">← Home</button><span class="title">Cards &amp; Beasts</span><span class="lvtag">${levelName(levelOf(u))}</span></div>
    <div id="pane" class="play chome scene-earth">
      <div class="streakbar"><div class="streak${st.cur >= 5 ? ' hot' : ''}${st.cur ? '' : ' zero'}"><span class="fire">🔥</span><span class="n">${st.cur}</span><span class="lbl">in a row</span></div><div class="best">${st.best ? 'Best ' + st.best : ''}</div></div>
      <div class="deck" id="deckhome">
        <div class="cardback b3"></div><div class="cardback b2"></div>
        <div class="cardback top" id="topback"><div class="orn top"></div><div class="orn bottom"></div><div class="emblem">⚡</div><div class="deckhint">Swipe a card to play</div></div>
      </div>
      <div class="answer pediarow"><button class="gamebanner" id="pediaGo" style="background-image:url('art/banners/beastpedia.jpg')"><span class="gname beasts">Beastpedia</span></button></div>
      <p class="small deckcount" id="deckcount"></p>
    </div>
  </div>`;
  $('#back').onclick = () => { location.hash = ''; };
  $('#pediaGo').onclick = () => { location.hash = 'beasts'; };
  const pane = $('#pane');
  Beasts.load().then(() => { if (!document.body.contains(pane)) return; pane.className = 'play chome scene-' + Beasts.scene(u); $('#deckcount').textContent = `${Beasts.count(u)} / ${Beasts.totalStages()} beasts found`; });
  // the top card slides off with the finger (or a tap) and the game begins
  const top = $('#topback'); let x0 = null, y0 = 0, id = null, moved = 0;
  const go = dir => { top.classList.add('anim'); top.style.transform = `translate(${dir * (innerWidth + 200)}px, -40px) rotate(${dir * 25}deg)`; top.style.opacity = '0'; setTimeout(() => { location.hash = 'play'; }, 220); };
  top.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; id = e.pointerId; moved = 0; top.setPointerCapture(id); top.classList.remove('anim'); });
  top.addEventListener('pointermove', e => { if (x0 === null || e.pointerId !== id) return; const dx = e.clientX - x0, dy = e.clientY - y0; moved = Math.max(moved, Math.abs(dx), Math.abs(dy)); top.style.transform = `translate(${dx}px, ${dy * .3}px) rotate(${dx / 18}deg)`; });
  const end = e => { if (x0 === null || e.pointerId !== id) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60 || moved < 8) go(dx < 0 ? -1 : 1); else { top.classList.add('anim'); top.style.transform = ''; } };
  top.addEventListener('pointerup', end); top.addEventListener('pointercancel', end);
}

/* ---------- Beastpedia: every beast found so far, and the shadows of the ones still to find ---------- */
function renderBeasts(u) {
  Celebrate.stop();
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><button class="iconbtn" id="back" aria-label="Back">← Cards</button><span class="title">Beastpedia</span><span class="lvtag" id="bcount"></span></div>
    <div id="pane" class="pedia"><p class="small" style="text-align:center">Loading…</p></div>
  </div>`;
  $('#back').onclick = () => { location.hash = 'cards'; };
  Beasts.load().then(() => {
    const pane = $('#pane'); if (!pane) return;
    const s = Beasts.state(u), l = Beasts.latest(u);
    $('#bcount').textContent = Beasts.count(u) + ' / ' + Beasts.totalStages();
    const sp = s.spare || {};
    const circ = (b, i, known) => `<button class="bc${known ? '' : ' unknown'}" data-k="${b.key}" data-i="${i}" aria-label="${known ? esc(b.stages[i].name) : 'Not found yet'}"><img src="${Beasts.img(b, i)}" alt="" loading="lazy">${known && i === b.stages.length - 1 && sp[b.key] > 0 ? `<span class="spare">×${1 + sp[b.key]}</span>` : ''}</button>`;
    pane.innerHTML = `
      ${l ? `<div class="pal big"><img class="bpic" src="${Beasts.img(l.beast, l.stage)}" alt=""><span class="btxt"><b>${esc(l.beast.stages[l.stage].name)}</b><span class="small">Latest find · ${Beasts.list().length} monsters, ${Beasts.totalStages()} stages to collect. A beast every 5 right in a row and every 20 cards; find a monster again and it evolves.</span></span></div>` : `<p class="small" style="text-align:center">A monster egg drops every 5 right answers in a row and every 20 cards played. Find the same monster again and it evolves: egg, baby, teen, adult. ${Beasts.totalStages()} to collect!</p>`}
      <div class="bgrid">${Beasts.list().map(b => b.stages.map((st, i) => circ(b, i, b.key in s.have && (s.have[b.key] || 0) >= i)).join('')).join('')}</div>`;
    pane.onclick = e => {
      const bt = e.target.closest('.bc'); if (!bt) return;
      const b = Beasts.byKey(bt.dataset.k), i = +bt.dataset.i;
      if (bt.classList.contains('unknown')) { bt.classList.remove('nudge'); void bt.offsetWidth; bt.classList.add('nudge'); return; }
      const st = b.stages[i], el = Beasts.ELEMENT[b.el] || ['', ''];
      sheet.innerHTML = `<div class="panel bsheet" role="dialog" aria-modal="true" aria-label="${esc(st.name)}">
          <img class="bbig" src="${Beasts.img(b, i)}" alt="">
          <div class="bname">${esc(st.name)}</div>
          <div class="small">${Beasts.STAGE[st.s]} · ${el[0]} ${el[1]}</div>
          <p class="becol">${esc(st.desc)}</p>
          ${i === b.stages.length - 1 && sp[b.key] > 0 ? `<p class="small">You have <b>${sp[b.key]}</b> spare ${sp[b.key] === 1 ? 'copy' : 'copies'} of this one.</p><button class="btn" id="bGive">🎁 Give one to a friend</button>` : ''}
          <button class="btn ghost" id="bOk">Close</button></div>`;
      sheet.hidden = false;
      $('#bOk').onclick = closeSheet; sheet.onclick = ev => { if (ev.target === sheet) closeSheet(); };
      const g = $('#bGive'); if (g) g.onclick = () => giveSheet(u, b, () => renderBeasts(u));
    };
  });
}

/* ---------- read: sentences, one word at a time ---------- */
// put a dictionary meaning into the shape a form needs: plural nouns, he/she verbs, and (with pronoun) I / you / we / they
const IRREG = { be: ['is', 'are', 'am'], do: ['does', 'do', 'do'], go: ['goes', 'go', 'go'], have: ['has', 'have', 'have'], man: 'men', woman: 'women', child: 'children', foot: 'feet', tooth: 'teeth', mouse: 'mice', person: 'people', wife: 'wives', life: 'lives', knife: 'knives', sheep: 'sheep', ship: 'ships' };
const PRON = { v1s: 'I', v2s: 'you', v3s: 'he/she', v1p: 'we', v2p: 'you', v3p: 'they' };
const PAST = { be: 'was', see: 'saw', give: 'gave', say: 'said', lead: 'led', take: 'took', run: 'ran', come: 'came', go: 'went', hear: 'heard', write: 'wrote', drink: 'drank', fight: 'fought', sleep: 'slept', throw: 'threw', build: 'built', hold: 'held', have: 'had', put: 'put', read: 'read', stand: 'stood', send: 'sent', make: 'made', do: 'did', find: 'found', flee: 'fled', catch: 'caught', leave: 'left', bring: 'brought', sit: 'sat', eat: 'ate', fall: 'fell', meet: 'met', seek: 'sought', set: 'set', tell: 'told', know: 'knew', win: 'won', hide: 'hid', drive: 'drove', overcome: 'overcame', strike: 'struck', get: 'got', wear: 'wore', can: 'could' };
const pastOf = w => PAST[w] || (/e$/.test(w) ? w + 'd' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ied' : w + 'ed');
function inflect(english, shape, pronoun = false) {
  let base = english.split(',')[0].trim().replace(/\s*\(.*\)$/, '');
  if (shape === 'o' || shape === 'adj' || shape === 'adjp' || shape === 'n1') return base;
  const words = base.split(' '), head = words[0], rest = words.slice(1).join(' ');
  const sfx = w => /(s|x|z|ch|sh)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /[^aeiou]o$/.test(w) ? w + 'es' : w + 's';
  if (shape === 'n2') { const ir = IRREG[base]; const pl = typeof ir === 'string' ? ir : sfx(words[words.length - 1]); return words.length > 1 ? words.slice(0, -1).join(' ') + ' ' + pl : pl; }
  if (shape === 'inf') return 'to ' + base;
  if (shape === 'imp') return base + '!';
  if (/^p[123][sp]$/.test(shape)) { const v = head === 'be' ? (shape === 'p3s' || shape === 'p1s' ? 'was' : 'were') : pastOf(head); return rest ? v + ' ' + rest : v; }   // perfect tense
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
  const pool = activeWords(u);   // wrong answers come from the words of the chosen level
  const L = ['beginner', '1', '2', '3'].indexOf(levelOf(u));
  const key = 'latin.read.' + u.id;
  const sv = store.get(key, { done: {}, read: 0 });
  // the sentences for this level and below; the stories, as lists of sentence numbers in reading order
  const avail = SENTENCES.map((x, n) => n).filter(n => (SENTENCES[n].lv || 0) <= L);
  const stories = {}; avail.forEach(n => { const p = SENTENCES[n].p; if (p) (stories[p] = stories[p] || []).push(n); });
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><button class="iconbtn" id="back" aria-label="Home">← Home</button><span class="title">Sentences</span><span class="lvtag" id="rcount"></span></div>
    <p class="small" style="text-align:center;margin:0 0 6px">Read the sentence. What does the <b>highlighted word</b> mean?</p>
    <div class="rtitle" id="rtitle" hidden></div>
    <div class="rstory" id="rstory" hidden></div>
    <div class="rsent card" id="rsent"></div>
    <div class="ropts" id="ropts"></div>
    <p class="rmsg" id="rmsg"></p>
  </div>`;
  $('#back').onclick = () => { location.hash = ''; };
  let sent = null, i = 0, opts = [], busy = false, misses = 0, story = null;   // story = { id, title, list, at }
  const count = () => `${avail.filter(n => (sv.done || {})[n]).length}/${avail.length} read`;
  const pick = () => {
    const seen = sv.done || {};
    let fresh = avail.filter(n => !seen[n]); if (!fresh.length) fresh = avail;
    // the level's own sentences come up most (7 in 10), the easier ones stay in the mix
    const own = fresh.filter(n => (SENTENCES[n].lv || 0) === L);
    const list = own.length && Math.random() < .7 ? own : fresh;
    const n = list[Math.floor(Math.random() * list.length)], p = SENTENCES[n].p;
    if (p) { story = { id: p, title: SENTENCES[n].pt, list: stories[p], at: 0 }; return stories[p][0]; }   // a story is read from its first line
    story = null; return n;
  };
  const load = n => { sent = { n, ...SENTENCES[n] }; i = 0; misses = 0; };
  const plain = n => SENTENCES[n].la.map(t => t[0]).join(' ').replace(/ ([,.;:?!])/g, '$1');
  const wordsIn = () => sent.la.filter(t => t[1]);
  function show() {
    const words = wordsIn();
    const cur = words[i];
    $('#rcount').textContent = count();
    const tt = $('#rtitle'), st = $('#rstory');
    tt.hidden = !story; st.hidden = !story || !story.at;
    if (story) {
      tt.innerHTML = `📖 <b>${esc(story.title)}</b> <span class="small">· line ${story.at + 1} of ${story.list.length}</span>`;
      st.innerHTML = story.list.slice(0, story.at).map(n => `<div class="rline"><span class="rl">${esc(plain(n))}</span><span class="re">${esc(SENTENCES[n].en)}</span></div>`).join('');
    }
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
    $('#rcount').textContent = count();
    const more = story && story.at < story.list.length - 1;
    $('#ropts').innerHTML = `<button class="btn" id="rnext">${more ? (misses ? 'Next line' : '⭐ Perfect! Next line') : story ? '🏆 The end — next' : (misses ? 'Next sentence' : '⭐ Perfect! Next sentence')}</button>`;
    $('#rmsg').textContent = misses ? `${misses} to look at again — they'll come round sooner.` : '';
    if (!misses) Celebrate(innerWidth / 2, innerHeight / 3, story && !more ? 2.4 : 1.6);
    $('#rnext').onclick = () => { if (more) { story.at++; load(story.list[story.at]); } else load(pick()); show(); };
  }
  $('#ropts').onclick = e => {
    const b = e.target.closest('button[data-k]'); if (!b || busy) return;
    busy = true;
    const cur = wordsIn()[i], w = byId[cur[1]], gloss = cur[2], ok = opts[+b.dataset.k] === gloss;
    recordAnswer(u, w, ok);
    if (ok) { b.classList.add('good'); setTimeout(() => { i++; show(); }, 450); }
    else {
      misses++; b.classList.add('bad');
      $('#ropts').querySelectorAll('button').forEach((x, k) => { if (opts[k] === gloss) x.classList.add('good'); });
      $('#rmsg').innerHTML = `<b>${esc(cur[0])}</b> means <b>${esc(gloss)}</b>.`;
      setTimeout(() => { i++; show(); }, 1600);
    }
  };
  load(pick()); show();
}


/* ---------- passages: read a story aloud in English, word by word ---------- */
// The stories from read.js (the sentences that share a p id), one at a time, at random. The current sentence sits
// at the top in Latin; underneath, its English translation with every word hidden. The player speaks (Web Speech
// API, English) or types: each word heard fills the matching blank in the translation and flips the Latin word it
// translates to its English. When every blank is filled the next sentence comes; at the end of the story, fireworks.
const PASSAGES = (() => { const by = {}; SENTENCES.forEach((s, n) => { if (s.p) (by[s.p] = by[s.p] || { id: s.p, title: s.pt, lv: s.lv || 0, lines: [] }).lines.push(n); }); return Object.values(by); })();
const normWord = w => w.toLowerCase().replace(/[’']s$/, '').replace(/[^a-z0-9]/g, '');
const stemWord = w => w.length > 4 ? w.replace(/(ing|ies|ed|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w;
const sameWord = (a, b) => a === b || (a.length > 3 && b.length > 3 && stemWord(a) === stemWord(b));
const BOOK_LINES = typeof BOOK !== 'undefined' ? BOOK.chapters.flatMap((c, ci) => c.sents.map((x, i) => ({ ...x, ch: ci, first: i === 0, lastInCh: i === c.sents.length - 1 }))) : [];
// the typing box under the microphone: words are used as soon as they are complete, wherever in the box they were
// typed (the keyboard's own 🎤 dictation on an iPhone lands here too); Say sends the lot and clears the box
function bindTyped(say, isDone) {
  const said = {};
  $('#typeform').onsubmit = e => { e.preventDefault(); const v = $('#typed').value; $('#typed').value = ''; for (const k in said) delete said[k]; v.split(/\s+/).forEach(say); $('#heard').textContent = v; };
  $('#typed').oninput = () => {
    const v = $('#typed').value, ws = v.split(/\s+/).filter(Boolean), end = $('#typed').selectionEnd;
    const atEnd = /\s$/.test(v) || end < v.length;   // the last word is still being typed unless the caret has left it
    const complete = atEnd ? ws : ws.slice(0, -1), have = {};
    complete.forEach(w => { have[w] = (have[w] || 0) + 1; if (have[w] > (said[w] || 0)) { said[w] = have[w]; say(w); } });
    if (isDone()) { $('#typed').value = ''; for (const k in said) delete said[k]; }
  };
}
// the microphone row shared by Passages, the book and Snap a page
const micHTML = () => `<div class="microw">
      <button class="mic" id="mic" aria-label="Listen">🎤</button>
      <div class="micside"><div class="small" id="micmsg"></div><div class="heard" id="heard"></div><div class="miclog small" id="miclog"></div></div>
    </div>
    <form class="typerow" id="typeform"><input type="text" id="typed" placeholder="…or type / dictate here" autocomplete="off" autocapitalize="off" autocorrect="off"><button class="btn ghost" type="submit">Say</button></form>
    <p class="small" style="margin:4px 0 0;text-align:center">On an iPhone the keyboard’s own 🎤 key dictates straight into the box.</p>`;
// the speech engine: every word heard goes to say(word). Returns setMic (status line) and stopRec.
function micListener(say) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, heard = 0, seen = [];
  // speech: continuous, in English; the words of each result are handed to say() once
  // the status line under the microphone says exactly what the recogniser is doing, so a problem can be named
  let note = '';
  const log = []; const logEv = t => { log.push(new Date().toTimeString().slice(3, 8) + ' ' + t); if (log.length > 6) log.shift(); const el = $('#miclog'); if (el) el.textContent = log.join(' · '); };
  function setMic(text) {
    const m = $('#mic'), msg = $('#micmsg'); if (!m) return;
    if (text != null) note = text;
    m.classList.toggle('on', listening);
    if (!SR) { m.disabled = true; msg.textContent = (navigator.standalone ? 'The home-screen app can’t use the microphone — open latin.musicalmagic.uk in Safari, ' : 'This browser can’t hear you — ') + 'or tap the box below and use the keyboard’s 🎤 dictation.'; }
    else msg.textContent = note || (listening ? 'Listening… say the English words' : 'Tap the microphone, then say the English words');
  }
  const ERRORS = { 'not-allowed': 'The microphone is blocked for this site. Settings → Safari → Microphone → Allow, or use the keyboard’s 🎤 dictation in the box below.',
    'service-not-allowed': 'Speech recognition is switched off on this phone (Settings → Siri & Search → Enable Dictation). The keyboard’s 🎤 dictation in the box below works instead.',
    'audio-capture': 'No microphone could be opened.', 'network': 'The speech service could not be reached — check the connection.', 'language-not-supported': 'English speech is not available on this phone.' };
  // every session is a fresh recogniser: Safari restarted on the same object sometimes comes back silently dead
  let watch = 0, dead = 0, gen = 0;
  function spin() {
    if (!SR || !listening) return;
    const my = ++gen;
    const r = rec = new SR(); r.lang = 'en-GB'; r.interimResults = true; r.maxAlternatives = 3; heard = 0; seen = [];
    r.continuous = !isIOS;   // iPhone Safari drops a continuous session after a few seconds: short sessions, started afresh after each, are steadier
    let alive = false;
    const live = () => { alive = true; dead = 0; clearTimeout(watch); };
    // a session that opens no audio within a few seconds is dead: replace it; after three in a row, hand back to the player
    clearTimeout(watch); watch = setTimeout(() => { if (!listening || my !== gen || alive) return; dead++; logEv('silent ' + dead); try { r.abort(); } catch (e) {}
      if (dead >= 3) { listening = false; rec = null; setMic('The phone stopped listening. Tap the microphone to start again (or use the keyboard’s 🎤 in the box below).'); } else setTimeout(() => { if (listening && gen === my) spin(); }, 200); }, 4000);   // abort normally ends the session, and end starts the next; if it doesn't, start one anyway
    r.onstart = () => { logEv('start'); setMic('Starting…'); };
    r.onaudiostart = () => { live(); logEv('audio'); setMic('Listening… say the English words'); };
    r.onsoundstart = () => { live(); logEv('sound'); setMic('Hearing you…'); };
    r.onspeechstart = () => { live(); logEv('speech'); setMic('Hearing you…'); };
    r.onnomatch = () => logEv('nomatch');
    r.onresult = e => {
      live();
      // the phone rewrites the last few words as it listens ("Father" becomes "a farmer"): every word that is new
      // or has changed since the last look is tried, and every alternative the recogniser offers for it
      const all = []; let fresh = [];
      for (let i = 0; i < e.results.length; i++) {
        const alts = []; for (let a = 0; a < e.results[i].length; a++) alts.push(e.results[i][a].transcript.split(/\s+/).filter(Boolean));
        const ws = alts[0] || [], old = seen[i] || [];
        ws.forEach((w, k) => { if (old[k] !== w) { fresh.push(w); alts.slice(1).forEach(x => { if (x[k] && x[k] !== w) fresh.push(x[k]); }); } });
        seen[i] = ws; all.push(...ws);
      }
      logEv('result ' + all.length + (e.results[e.results.length - 1].isFinal ? ' final' : ''));
      $('#heard').textContent = all.slice(-8).join(' ');
      fresh.forEach(say);
      setMic('Listening… say the English words');
    };
    r.onend = () => { if (my !== gen) return; logEv('end'); clearTimeout(watch); if (listening) setTimeout(spin, 120); else setMic(''); };
    r.onerror = ev => {
      if (my !== gen) return; logEv('error ' + ev.error);
      if (ev.error === 'no-speech' || ev.error === 'aborted') { return; }   // the session simply ends and a fresh one starts
      listening = false; clearTimeout(watch); setMic(ERRORS[ev.error] || ('Speech error: ' + ev.error + ' — type the words or use the keyboard’s 🎤 dictation.'));
    };
    try { r.start(); } catch (err) { listening = false; clearTimeout(watch); setMic('The microphone would not start (' + err.message + '). Tap the box below and use the keyboard’s 🎤 dictation.'); }
  }
  function startRec() {
    if (!SR || listening) return;
    listening = true; dead = 0; logEv('v' + APP_VERSION + (navigator.standalone ? ' app' : ' browser') + (isIOS ? ' short' : ' cont'));
    setMic('Starting the microphone…'); spin();
  }
  function stopRec() { listening = false; gen++; clearTimeout(watch); if (rec) { try { rec.stop(); } catch (err) {} rec = null; } setMic(''); }
  $('#mic').onclick = () => listening ? stopRec() : startRec();
  return { setMic, stopRec, startRec };
}
function renderPassages(u, book = false) {
  Celebrate.stop();
  const key = book ? 'latin.book.' + u.id : 'latin.passages.' + u.id, sv = store.get(key, book ? { at: 0 } : { done: {} });
  const byIdAll = Object.fromEntries(WORDS.map(w => [w.id, w]));
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><button class="iconbtn" id="back" aria-label="Home">← Home</button><span class="title">${book ? 'Read a book' : 'Passages'}</span><span class="lvtag" id="pcount"></span></div>
    ${book ? `<div class="booktitle"><b>${esc(BOOK.title)}</b><span class="small">${esc(BOOK.sub)}</span></div>` : ''}
    <div class="rtitle" id="ptitle"></div>
    <div class="pbox card" id="pbox"></div>
    <div class="pen" id="pen"></div>
    ${micHTML()}
    <p class="rmsg" id="pmsg"></p>
  </div>`;
  $('#back').onclick = () => { stopRec(); location.hash = ''; };
  let pas = null, at = 0, sent = null, flipped = [], filled = [], done = false;
  const count = () => book ? `${Math.min(sv.at || 0, BOOK_LINES.length)}/${BOOK_LINES.length}` : `${Object.keys(sv.done || {}).length}/${PASSAGES.length} read`;
  const lineObj = k => book ? BOOK_LINES[k] : SENTENCES[pas.lines[k]];
  const words = () => sent.la.filter(t => t[1]);
  const enWords = () => sent.en.split(/\s+/).flatMap(w => w.split('-')).map(w => ({ show: w, n: normWord(w) })).filter(w => w.n);   // slave-girls is said as two words
  function pick() {
    if (book) { pas = { id: 'book', title: BOOK.title, lines: BOOK_LINES.map((x, i) => i) }; at = Math.min(sv.at || 0, BOOK_LINES.length - 1); loadLine(); return; }
    const seen = sv.done || {}, fresh = PASSAGES.filter(p => !seen[p.id]);
    const list = fresh.length ? fresh : PASSAGES;
    pas = list[Math.floor(Math.random() * list.length)]; at = 0; loadLine();
  }
  function loadLine() { sent = lineObj(at); flipped = words().map(() => false); filled = enWords().map(() => false); done = false; show(); }
  function show() {
    $('#pcount').textContent = count();
    const plain = s => esc(s.la.map(t => t[0]).join(' ').replace(/ ([,.;:?!])/g, '$1').replace(/" (.*?) "/g, '"$1"'));
    if (book) { const ch = BOOK.chapters[sent.ch], start = BOOK_LINES.findIndex(x => x.ch === sent.ch); $('#ptitle').innerHTML = `📖 <b>${esc(ch.title)}</b> <span class="small">· ${esc(ch.en)} · sentence ${at - start + 1} of ${ch.sents.length}</span>`; }
    else $('#ptitle').innerHTML = `📖 <b>${esc(pas.title)}</b> <span class="small">· sentence ${at + 1} of ${pas.lines.length}</span>`;
    const ws = words();
    // the book shows the three sentences just read (with their English) and the one coming; a passage shows all its lines
    const shown = book ? pas.lines.filter(k => k >= at - 3 && k <= at + 1 && lineObj(k).ch === sent.ch) : pas.lines.map((n, k) => k);
    $('#pbox').innerHTML = shown.map(k => {
      const s = lineObj(k);
      if (k !== at) return `<div class="pline ${k < at ? 'past' : 'ahead'}">${plain(s)}${book && k < at ? `<div class="ptr">${esc(s.en)}</div>` : ''}</div>`;
      return `<div class="pline cur">${s.la.map(t => { if (!t[1]) return `<span class="rp">${esc(t[0])}</span>`; const i = ws.indexOf(t); return `<button class="pw${flipped[i] ? ' flip' : ''}" data-i="${i}"><span class="f">${esc(t[0])}</span><span class="b">${esc(t[2])}</span></button>`; }).join(' ')}</div>`;
    }).join('');
    $('#pen').innerHTML = enWords().map((w, i) => `<span class="ew${filled[i] ? ' on' : ''}" style="--n:${w.n.length}">${filled[i] ? esc(w.show) : ''}</span>`).join(' ');
    setMic();
  }
  // a word heard or typed: fill its blank in the translation, flip the Latin words whose meaning contains it
  const STOPW = new Set(['of', 'the', 'a', 'an', 'to', 'for', 'in', 'on', 'at', 'by', 'up', 'out', 'be', 'is', 'am', 'are', 'it', 'not', 'do', 'and', 'with', 'into', 'from', 'over']);
  const meansCache = {};
  const meansOf = t => {   // every single word that counts for a token: gloss, dictionary senses, spoken alternatives (phrases by their content words)
    if (meansCache[t[1]]) return meansCache[t[1]];
    const w = byIdAll[t[1]], out = new Set();
    const add = phrase => { const ws = phrase.toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z0-9']+/).filter(Boolean); const keep = ws.length > 1 ? ws.filter(x => !STOPW.has(x)) : ws; (keep.length ? keep : ws).forEach(x => out.add(normWord(x))); };
    add(t[2]); if (w) w.english.split(',').forEach(add); ((typeof SYNONYMS !== 'undefined' && SYNONYMS[t[1]]) || []).forEach(add);
    return (meansCache[t[1]] = [...out].filter(Boolean));
  };
  function say(raw) {
    const w = normWord(raw); if (!w || done) return false;
    let hit = false;
    const ew = enWords();
    const k = ew.findIndex((x, i) => !filled[i] && sameWord(x.n, w));
    if (k >= 0) { filled[k] = true; hit = true; }
    // a Latin word flips when any of its meanings is said: its gloss here, the dictionary senses, or a spoken
    // alternative from synonyms.js (great for magnus); its blank in the translation fills with it
    words().forEach((t, i) => {
      if (flipped[i] || !meansOf(t).some(m => sameWord(m, w))) return;
      flipped[i] = true; hit = true;
      const gl = t[2].toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      ew.forEach((x, j) => { if (!filled[j] && gl.some(g => sameWord(g, x.n))) filled[j] = true; });
    });
    if (hit) { show(); check(); }
    return hit;
  }
  function check() {
    if (filled.every(Boolean)) {
      done = true; $('#pmsg').textContent = '⭐ ' + sent.en;
      const last = at >= pas.lines.length - 1;
      if (book) {
        sv.at = Math.max(sv.at || 0, at + 1); store.set(key, sv); $('#pcount').textContent = count();
        if (last) { Celebrate(innerWidth / 2, innerHeight / 3, 2.6); $('#pen').insertAdjacentHTML('afterend', `<p class="small" style="text-align:center">That is the end of the book so far — more chapters are coming.</p><button class="btn" id="pnext">📖 Read it again from the start</button>`); $('#pnext').onclick = () => { $('#pnext').remove(); sv.at = 0; store.set(key, sv); $('#pmsg').textContent = ''; pick(); }; }
        else if (sent.lastInCh) { Celebrate(innerWidth / 2, innerHeight / 3, 2.4); $('#pen').insertAdjacentHTML('afterend', `<button class="btn" id="pnext">🏆 Chapter finished — carry on</button>`); $('#pnext').onclick = () => { $('#pnext').remove(); $('#pmsg').textContent = ''; at++; loadLine(); }; }
        else { Celebrate(innerWidth / 2, innerHeight / 3, 1.4); setTimeout(() => { if (done) { at++; $('#pmsg').textContent = ''; loadLine(); } }, 1200); }
        return;
      }
      if (last) {
        sv.done = sv.done || {}; sv.done[pas.id] = Date.now(); store.set(key, sv); $('#pcount').textContent = count();
        Celebrate(innerWidth / 2, innerHeight / 3, 2.6);
        $('#pen').insertAdjacentHTML('afterend', `<button class="btn" id="pnext">🏆 The end — next passage</button>`);
        $('#pnext').onclick = () => { $('#pnext').remove(); $('#pmsg').textContent = ''; pick(); };
      } else { Celebrate(innerWidth / 2, innerHeight / 3, 1.4); setTimeout(() => { if (done) { at++; $('#pmsg').textContent = ''; loadLine(); } }, 1200); }
    }
  }
  $('#pbox').onclick = e => { const b = e.target.closest('.pw'); if (!b || done) return; const i = +b.dataset.i; if (!flipped[i]) { flipped[i] = true; say(words()[i][2]); show(); check(); } };   // a tap flips a word too
  bindTyped(say, () => done);
  const { setMic, stopRec } = micListener(say);
  window.addEventListener('hashchange', stopRec, { once: true });
  pick();
}

/* ---------- Snap a page: a photographed (or pasted) English text with its vocabulary words turned into Latin ---------- */
function renderSnap(u, mode = 'snap') {   // mode 'books': the Library — Project Gutenberg books in the same reader
  Celebrate.stop();
  const key = 'latin.snap.' + u.id, sv = store.get(key, { pages: 0, words: 0, last: '' });
  const byIdAll = Object.fromEntries(WORDS.map(w => [w.id, w]));
  const lv = levelOf(u), pool = activeWords(u);
  // the start screen: white, one big "Enter text" box, round Pictures / Camera buttons along the bottom
  const shell = () => '';
  const ICON = { pic: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
    cam: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    go: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' };
  let cam = null;   // the live camera stream while the camera screen is open
  const stopCam = () => { if (cam) { cam.getTracks().forEach(t => t.stop()); cam = null; } };
  window.addEventListener('hashchange', () => { stopCam(); document.documentElement.classList.remove('readermode', 'rdark'); }, { once: true });
  function start(msg) {
    stopCam();
    document.documentElement.classList.add('readermode'); applyDark();
    app.innerHTML = `<div class="snapstart">
      <div class="rhead"><button class="iconbtn" id="back" aria-label="Home">← Home</button><span class="rpos">${sv.pages ? sv.pages + ' page' + (sv.pages === 1 ? '' : 's') + ' read' : ''}</span><span style="width:44px"></span></div>
      <textarea id="pasted" placeholder="Enter text" aria-label="Paste or type English text"></textarea>
      ${msg ? `<p class="snapnote">${esc(msg)}</p>` : ''}
      <div class="sfoot">
        <label class="sround"><input type="file" accept="image/*" id="snapPic" hidden><span class="scirc">${ICON.pic}</span><span>Pictures</span></label>
        <button class="sround" id="snapCamBtn"><span class="scirc">${ICON.cam}</span><span>Camera</span></button>
        ${sv.last ? `<button class="sround" id="snapLast"><span class="scirc">↩</span><span>Last page</span></button>` : ''}
        <button class="sround go" id="snapGo2" hidden><span class="scirc">${ICON.go}</span><span>Read</span></button>
      </div>
      <input type="file" accept="image/*" capture="environment" id="snapCam" hidden>
    </div>`;
    $('#back').onclick = () => { document.documentElement.classList.remove('readermode', 'rdark'); location.hash = ''; };
    $('#pasted').oninput = () => { $('#snapGo2').hidden = $('#pasted').value.trim().replace(/[^a-z]/gi, '').length < 10; };
    $('#snapGo2').onclick = () => read($('#pasted').value.trim());
    if ($('#snapLast')) $('#snapLast').onclick = () => read(sv.last);
    $('#snapPic').onchange = e => take(e.target.files[0]); $('#snapCam').onchange = e => take(e.target.files[0]);
    $('#snapCamBtn').onclick = camera;
  }
  // a picture → the words → the reader, with a progress line on whatever screen is showing
  async function take(file, progressEl) {
    if (!file) return;
    const prog = progressEl || (() => { const d = document.createElement('div'); d.className = 'snapprog2'; d.innerHTML = '<div class="snapbar"><span id="snapfill"></span></div><div class="small" id="snapmsg"></div>'; ($('.snapstart') || app).appendChild(d); return d; })();
    try {
      const r = await Snap.ocr(file, (m, p) => { const t = prog.querySelector('#snapmsg'), f = prog.querySelector('#snapfill'); if (t) t.textContent = m + (p ? ' ' + Math.round(p * 100) + '%' : ''); if (f) f.style.width = Math.round(p * 100) + '%'; });
      stopCam();
      if (!r.text || r.text.replace(/[^a-z]/gi, '').length < 10) return start('No words could be read in that picture — try a closer, straighter photo in good light.');
      read(r.text);
    } catch (err) { stopCam(); start('The picture could not be read (' + (err.message || err) + '). You can paste the text instead.'); }
  }
  // the camera screen: the live view, a shutter, a gallery button; the phone's own camera app if the live view is refused
  async function camera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#snapCam').click(); return; }
    app.innerHTML = `<div class="camscreen">
      <video id="camv" autoplay playsinline muted></video>
      <div class="camtop"><button class="camback" id="camBack" aria-label="Back">‹</button><span>Snap a page</span><span style="width:44px"></span></div>
      <div class="camhint">Hold the phone flat over the page, in good light</div>
      <div class="cambot"><label class="camgal" aria-label="Pictures"><input type="file" accept="image/*" id="snapPic2" hidden>${ICON.pic}</label><button class="shutter" id="shutter" aria-label="Take the photo"><span></span></button><span style="width:52px"></span></div>
      <div class="camprog" id="camprog" hidden><div class="snapbar"><span id="snapfill"></span></div><div id="snapmsg"></div></div>
    </div>`;
    $('#camBack').onclick = () => start();
    $('#snapPic2').onchange = e => { $('#camprog').hidden = false; take(e.target.files[0], $('#camprog')); };
    try {
      cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false });
      $('#camv').srcObject = cam;
    } catch (err) { stopCam(); start(); $('#snapCam').click(); return; }
    $('#shutter').onclick = () => {
      const v = $('#camv'); if (!v || !v.videoWidth) return;
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
      $('#shutter').disabled = true; $('#camprog').hidden = false;
      c.toBlob(b => take(b, $('#camprog')), 'image/jpeg', .92);
    };
  }
  // the reader: white paper, the Latin words in bold; the word in focus is highlighted and three meanings float under it
  const RK = 'latin.reader', rs = Object.assign({ font: 'serif', size: 2, dark: false }, store.get(RK, null) || {});
  const applyDark = () => document.documentElement.classList.toggle('rdark', !!rs.dark);
  const saveRS = () => store.set(RK, rs);
  // opts (a book page): { label, back, next } — the head shows the book and page, ← goes to the shelf, the end of the page offers the next one
  function read(text, opts = {}) {
    text = text.replace(/-\n(?=[a-z])/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, opts.label ? 20000 : 6000);
    // a book's pictures ([[img src="…" cap="…" w h]]) stand in the text as IMGMARKn (capitals: never turned into Latin)
    const pics = [];
    text = text.split('\n\n').map(p => { const m = p.match(/^\[\[img (.*)\]\]$/); if (!m) return p; const at = k => (m[1].match(new RegExp('\\b' + k + '="([^"]*)"')) || [])[1] || ''; pics.push({ src: at('src'), cap: at('cap'), w: +at('w'), h: +at('h') }); return 'IMGMARK' + (pics.length - 1); }).join('\n\n');
    if (!opts.label) { sv.last = text; store.set(key, sv); }
    const sents = Snap.latinise(text, pool);
    if (!sents.some(s => s.some(t => t.la))) return start('None of the words on that page are in the ' + levelName(lv) + ' list — try another page, or a higher level.');
    const toks = []; sents.forEach(s => s.forEach(t => { if (t.la && !t.skip) toks.push(t); }));
    const state = toks.map(() => 0);   // 0 to do, 1 right, -1 wrong
    let focus = 0, right = 0, done = false;
    // three meanings for a word: its own, and two from other words of the same kind in the same English shape
    const kindOf = w => /^N/.test(w.pos) ? 'n' : /^V/.test(w.pos) ? 'v' : /^Adj|^numo/.test(w.pos) ? 'a' : 'o';
    const choices = t => {
      const w = byIdAll[t.id], gloss = t.gloss || t.en, k = w ? kindOf(w) : 'o';
      // a wrong option must not also be right: no word shared with any meaning of the word (its dictionary senses and the
      // spoken alternatives in synonyms.js — 'huge' is right for magnus), and no names (Troy, Rome) as wrong options
      const STOPW = /^(a|an|the|to|be|of|in|on|at|for|with|by|from|up|out|off|and|or|not|one|some|very|is|am|are|was|were|i|you|he|she|it|we|they|my|your|his|her|its|our|their)$/;
      const bits = s => s.toLowerCase().split(/[^a-z']+/).filter(x => x && !STOPW.test(x)).map(stemWord);
      const meansSet = x => new Set([x.english, ...((typeof SYNONYMS !== 'undefined' && SYNONYMS[x.id]) || [])].flatMap(bits));
      const mine = w ? meansSet(w) : new Set(); bits(gloss).forEach(b => mine.add(b));
      const others = pool.filter(x => x.id !== t.id && kindOf(x) === k && !/^[A-Z]/.test(x.word) && (!w || !(w.avoid || []).includes(x.id)) && ![...meansSet(x)].some(b => mine.has(b)));
      const pick = [];
      for (let tries = 0; tries < 40 && pick.length < 2 && others.length; tries++) {
        const x = others[Math.floor(Math.random() * others.length)], e = Snap.shapeLike(gloss, x.english.split(/[,;]/)[0].trim(), k);
        if (!e || /^[-…(]|\.\.\.|…|\?/.test(e) || e.toLowerCase() === gloss.toLowerCase() || pick.includes(e) || bits(e).some(b => mine.has(b)) || (w && w.english.toLowerCase().split(/[,;]/).map(s => s.trim()).includes(e.toLowerCase()))) continue;
        pick.push(e);
      }
      const all = [gloss, ...pick]; for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      return all;
    };
    document.documentElement.classList.add('readermode'); applyDark();
    window.addEventListener('hashchange', () => document.documentElement.classList.remove('readermode', 'rdark'), { once: true });
    // the page, and a panel across the bottom fifth of the screen with the three meanings; pulled up, it also holds
    // the font, the size and white-on-black
    app.innerHTML = `<div class="reader">
      <div class="rhead"><button class="iconbtn" id="back" aria-label="Back">${opts.back ? '← Books' : '← Home'}</button><span class="rpos" id="rprog"></span><span style="width:44px"></span></div>
      <div class="paper ${rs.font} size${rs.size}" id="paper"></div>
      <div class="rsheet" id="rsheet">
        <div class="rgrip" id="rgrip" aria-label="Pull up for text settings"><span class="rword" id="rword"></span><span class="rbar"></span><span class="rhint">Aa</span></div>
        <div class="rans" id="rans"></div>
        <div class="rset">
          <div class="rrow"><span>Font</span><div class="rseg"><button class="rtool${rs.font === 'serif' ? ' on' : ''}" data-font="serif" style="font-family:Georgia,serif">Serif</button><button class="rtool${rs.font === 'sans' ? ' on' : ''}" data-font="sans" style="font-family:system-ui,sans-serif">Sans</button></div></div>
          <div class="rrow"><span>Size</span><div class="rseg"><button class="rtool sz1${rs.size === 1 ? ' on' : ''}" data-size="1">A</button><button class="rtool sz2${rs.size === 2 ? ' on' : ''}" data-size="2">A</button><button class="rtool sz3${rs.size === 3 ? ' on' : ''}" data-size="3">A</button></div></div>
          <div class="rrow"><span>Page</span><div class="rseg"><button class="rtool${rs.dark ? '' : ' on'}" data-dark="0">☀ White</button><button class="rtool${rs.dark ? ' on' : ''}" data-dark="1">☾ Black</button></div></div>
        </div>
      </div>
    </div>`;
    $('#back').onclick = () => { if (opts.back) return opts.back(); document.documentElement.classList.remove('readermode', 'rdark'); location.hash = ''; };
    const sheet = $('#rsheet'), setOpen = o => sheet.classList.toggle('open', o);
    // the grip: tap to open or close; drag up to open, down to close
    let y0 = null, moved = false;
    $('#rgrip').addEventListener('pointerdown', e => { y0 = e.clientY; moved = false; });
    window.addEventListener('pointermove', e => { if (y0 != null && Math.abs(e.clientY - y0) > 24) { moved = true; setOpen(e.clientY < y0); y0 = e.clientY; } });
    window.addEventListener('pointerup', () => { y0 = null; });
    $('#rgrip').onclick = () => { if (!moved) setOpen(!sheet.classList.contains('open')); moved = false; };
    sheet.querySelectorAll('.rtool').forEach(b => { b.onclick = () => {
      if (b.dataset.font) rs.font = b.dataset.font; else if (b.dataset.size) rs.size = +b.dataset.size; else rs.dark = b.dataset.dark === '1';
      saveRS(); applyDark();
      sheet.querySelectorAll('.rtool').forEach(x => x.classList.toggle('on', x.dataset.font ? x.dataset.font === rs.font : x.dataset.size ? +x.dataset.size === rs.size : (x.dataset.dark === '1') === !!rs.dark));
      $('#paper').className = `paper ${rs.font} size${rs.size}`;
    }; });
    let html = '', k = 0, prevEnd = -1;
    html += '<p>';
    for (const s of sents) {
      s.forEach((t, j) => {
        if (t.skip) return;
        const gap = prevEnd >= 0 && t.at != null ? text.slice(prevEnd, t.at) : ''; if (t.at != null) prevEnd = t.to != null ? t.to : t.at + t.en.length;
        if (/\n\n/.test(gap)) html += '</p><p>';
        const punct = !/[a-z0-9]/i.test(t.en), sp = j === 0 && !/\n\n/.test(gap) && html.slice(-3) !== '<p>' ? ' ' : (j === 0 || punct || /^["'(]$/.test(s[j - 1] && s[j - 1].en)) ? '' : ' ';
        if (!t.la) { html += sp + esc(t.en); return; }
        const i = k++;
        html += sp + `<span class="lw" data-i="${i}">${esc(t.la)}</span>`;
      });
    }
    html += '</p>';
    $('#paper').innerHTML = html;
    // a short line with no full stop is a heading (CHAPTER I, a story's title)
    // the pictures: a full-width figure with its caption; a small one (a drawn initial) floats at the start of the next paragraph
    $('#paper').querySelectorAll('p').forEach(p => {
      const m = p.textContent.replace(/\s/g, '').match(/^IMGMARK(\d+)$/); if (!m) return;
      const pic = pics[+m[1]]; if (!pic || !opts.pic) { p.remove(); return; }
      const url = opts.pic(pic.src);
      if (pic.w && pic.h && pic.w <= 150 && pic.h <= 150) { const nx = p.nextElementSibling; if (nx && nx.tagName === 'P') nx.insertAdjacentHTML('afterbegin', `<img class="rdrop" src="${esc(url)}" alt="" onerror="retryImg(this)">`); p.remove(); return; }
      const f = document.createElement('figure'); f.className = 'rpic';
      f.innerHTML = `<img src="${esc(url)}" alt="${esc(pic.cap)}" loading="lazy" onerror="retryImg(this)"${pic.w && pic.h ? ` width="${pic.w}" height="${pic.h}"` : ''}>${pic.cap ? `<figcaption>${esc(pic.cap)}</figcaption>` : ''}`;
      p.replaceWith(f);
    });
    // headings stay English, so a line with Latin in it is text
    $('#paper').querySelectorAll('p').forEach(p => { const t = p.textContent.trim(); if (p.querySelector('.lw')) return; const ws = t.split(/\s+/); if (t.length < 90 && !/[.,;:!?]["'”’)]?$/.test(t) || /^(CHAPTER|Chapter)\b/.test(t) && t.length < 120 || t.length < 50 && !/["“”]/.test(t) && ws.filter(w => /^[A-Z0-9]/.test(w)).length / ws.length >= .5) p.className = 'rh'; });
    const lw = i => $('#paper').querySelector(`.lw[data-i="${i}"]`);
    let busy = false;
    function show() {
      $('#rprog').textContent = (opts.label ? opts.label + ' · ' : '') + `${state.filter(Boolean).length} of ${toks.length}`;
      toks.forEach((t, i) => { const el = lw(i); if (!el) return; el.className = 'lw' + (i === focus && !done ? ' focus' : '') + (state[i] === 1 ? ' ok' : state[i] === -1 ? ' bad' : ''); if (state[i]) { el.textContent = t.gloss || t.en; el.title = t.la; } else el.textContent = t.la; });
      if (done) return;
      const t = toks[focus];
      $('#rword').textContent = t.la;
      $('#rans').innerHTML = choices(t).map(c => `<button class="rchoice">${esc(c)}</button>`).join('');
      $('#rans').querySelectorAll('.rchoice').forEach(b => { b.onclick = () => answer(b, b.textContent); });
      busy = false;
      // keep the word in focus in view, clear of the panel
      const el = lw(focus); if (el) { const r = el.getBoundingClientRect(), bottom = innerHeight - sheet.offsetHeight - 24; if (r.top < 56 || r.bottom > bottom) scrollBy({ top: r.top - (56 + (bottom - 56) * .35), behavior: 'smooth' }); }
    }
    function answer(btn, picked) {
      if (busy) return; busy = true;
      const t = toks[focus], ok = picked === (t.gloss || t.en), w = byIdAll[t.id];
      if (w) recordAnswer(u, w, ok);
      if (ok) { right++; state[focus] = 1; btn.classList.add('isright'); const r = btn.getBoundingClientRect(); Celebrate(r.left + r.width / 2, r.top, .9); setTimeout(next, 250); }
      else { state[focus] = -1; btn.classList.add('wrong'); $('#rans').querySelectorAll('.rchoice').forEach(b => { if (b.textContent === (t.gloss || t.en)) b.classList.add('isright'); }); setTimeout(next, 1000); }
    }
    function next() {
      let n = -1; for (let i = focus + 1; i < toks.length; i++) if (!state[i]) { n = i; break; }
      if (n < 0) for (let i = 0; i < toks.length; i++) if (!state[i]) { n = i; break; }
      if (n < 0) { finish(); return; }
      focus = n; show();
    }
    function finish() {
      done = true; if (!opts.label) { sv.pages = (sv.pages || 0) + 1; sv.words = (sv.words || 0) + toks.length; store.set(key, sv); }
      show(); Celebrate(innerWidth / 2, innerHeight / 3, 2.6);
      $('#rword').textContent = `🏆 ${right} of ${toks.length} right`;
      $('#rans').innerHTML = `<button class="rchoice main" id="pnext">${opts.next ? 'Next page →' : opts.back ? '🏆 The end — back to the books' : '📷 Another page'}</button><button class="rchoice" id="pagain">↩ Read it again</button>`;
      if (opts.done) opts.done();
      $('#pnext').onclick = () => opts.next ? opts.next() : opts.back ? opts.back() : start(); $('#pagain').onclick = () => read(text, opts);
    }
    $('#paper').onclick = e => { const el = e.target.closest('.lw'); if (!el || done || busy) return; const i = +el.dataset.i; if (!state[i]) { focus = i; show(); } };   // tap any word to jump to it
    show();
  }
  if (mode === 'books') return library();
  start();

  /* ---------- the Library: Project Gutenberg books, fetched through the sync worker (Gutenberg sends no CORS header) ---------- */
  function library() {
    const LK = 'latin.library.' + u.id, lib = Object.assign({ books: {}, last: null }, store.get(LK, null) || {});
    const saveLib = () => store.set(LK, lib);
    // the illustrated Gutenberg editions where there is one (the 4th field: it has pictures)
    const SHELF = [[67098, 'Winnie-the-Pooh', 'A. A. Milne', 1], [14838, 'The Tale of Peter Rabbit', 'Beatrix Potter', 1], [11757, 'The Velveteen Rabbit', 'Margery Williams', 1],
      [28885, 'Alice’s Adventures in Wonderland', 'Lewis Carroll', 1], [43936, 'The Wonderful Wizard of Oz', 'L. Frank Baum', 1], [32488, 'Just So Stories', 'Rudyard Kipling', 1],
      [27805, 'The Wind in the Willows', 'Kenneth Grahame', 1], [236, 'The Jungle Book', 'Rudyard Kipling', 1], [26999, 'Peter Pan in Kensington Gardens', 'J. M. Barrie', 1],
      [16, 'Peter Pan', 'J. M. Barrie'], [16865, 'Pinocchio', 'Carlo Collodi', 1], [902, 'The Happy Prince and Other Tales', 'Oscar Wilde', 1], [52521, 'Grimm’s Fairy Tales', 'The Brothers Grimm', 1],
      [17314, 'Five Children and It', 'E. Nesbit', 1], [46409, 'Heidi', 'Johanna Spyri', 1], [120, 'Treasure Island', 'Robert Louis Stevenson', 1], [64365, 'Anne of Green Gables', 'L. M. Montgomery', 1],
      [113, 'The Secret Garden', 'Frances Hodgson Burnett'], [1874, 'The Railway Children', 'E. Nesbit'], [271, 'Black Beauty', 'Anna Sewell']];
    const BOOK_V = 14;   // the worker's cleaning version (/__book/<n>/v8 in its cache): a new number skips any stale copy on the way and on the phone
    const SYNC_BASE = () => store.get('latin.syncUrl', null) || 'https://sync.musicalmagic.uk';
    const BOOK_URL = id => SYNC_BASE() + '/book/' + id + '?v=' + BOOK_V;
    const PIC_URL = (id, src) => SYNC_BASE() + '/bookimg/' + id + '/' + src.split('/').map(encodeURIComponent).join('/');
    const progressOf = id => { const b = lib.books[id]; return b && b.pages ? `Page ${Math.min(b.at + 1, b.pages)} of ${b.pages}` : ''; };
    function shelf(msg) {
      document.documentElement.classList.add('readermode'); applyDark();
      const last = lib.last && lib.books[lib.last];
      const row = ([id, title, author, ill]) => { const p = progressOf(id), b = lib.books[id]; return `<button class="lbook" data-id="${id}"><span class="lt">${esc(title)}</span><span class="la">${esc(author)}${ill || (b && b.pics) ? ' · Illustrated' : ''}${p ? ' · ' + p : ''}</span>${b && b.pages ? `<span class="lbar"><span style="width:${Math.round(100 * Math.min(1, b.at / b.pages))}%"></span></span>` : ''}</button>`; };
      const extra = Object.entries(lib.books).filter(([id]) => !SHELF.some(s => s[0] === +id)).map(([id, b]) => [+id, b.title, b.author || '', b.pics]);
      app.innerHTML = `<div class="libpage">
        <div class="rhead"><button class="iconbtn" id="back" aria-label="Home">← Home</button><span class="rpos">Project Gutenberg</span><span style="width:44px"></span></div>
        <h1 class="libtitle">Library</h1>
        ${last ? `<button class="lcarry lbook" data-id="${lib.last}"><span class="lk">Carry on reading</span><span class="lt">${esc(last.title)}</span><span class="la">${esc(progressOf(lib.last))}</span><span class="lbar"><span style="width:${Math.round(100 * Math.min(1, last.at / (last.pages || 1)))}%"></span></span></button>` : ''}
        <div class="lshelf">${[...extra, ...SHELF].map(row).join('')}</div>
        <form class="lopen" id="lopen"><input id="lurl" type="text" inputmode="url" autocomplete="off" autocapitalize="off" placeholder="Paste a Project Gutenberg link or number"><button class="rchoice main" type="submit">Open</button></form>
        ${msg ? `<p class="snapnote">${esc(msg)}</p>` : ''}
        <p class="lnote">Free classic books from gutenberg.org. Every word from your Latin list turns into Latin.</p>
      </div>`;
      $('#back').onclick = () => { document.documentElement.classList.remove('readermode', 'rdark'); location.hash = ''; };
      app.querySelectorAll('.lbook').forEach(b => { b.onclick = () => open(+b.dataset.id); });
      $('#lopen').onsubmit = e => { e.preventDefault(); const m = $('#lurl').value.match(/(?:ebooks\/|epub\/|pg|files\/|^\s*)(\d{1,6})/); if (!m) return shelf('That doesn’t look like a Project Gutenberg book — paste a link like gutenberg.org/ebooks/67098, or just the number.'); open(+m[1]); };
    }
    // the book's text, from the phone's own copy if it has one
    // the book's text: the phone's own copy if it has one, else from the worker. Read once (no clone: Safari can stall a
    // split response), saved in the background (never waited for), every step with a time limit so nothing can hang
    const within = (ms, p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
    async function getBook(id, fresh) {
      const url = BOOK_URL(id);
      let c = null;
      if (!fresh) try { c = await within(2000, caches.open('latin-books')); const hit = await within(2000, c.match(url)); if (hit) { const j = JSON.parse(await within(4000, hit.text())); if (j && j.text) return j; } } catch (e) { c = null; }
      const stale = j => /\*\*\* ?START OF/.test(j.text.slice(0, 20000));   // an old copy from before the worker cut the licence text
      const load = async (opt = {}) => {
        const ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(() => ctl && ctl.abort(), 25000);
        try {
          const r = await fetch(url, Object.assign({ signal: ctl && ctl.signal }, opt));
          if (!r.ok) throw new Error(r.status === 404 ? 'That book could not be found on Project Gutenberg' : 'The library could not be reached');
          return await r.text();
        } catch (err) { throw err.name === 'AbortError' ? new Error('The book took too long to arrive — check the connection') : err.message === 'Load failed' || err.message === 'Failed to fetch' ? new Error('The library could not be reached — check the connection') : err; }
        finally { clearTimeout(timer); }
      };
      let body = await load(), j = JSON.parse(body);
      if (stale(j)) { await new Promise(ok => setTimeout(ok, 1200)); try { body = await load({ cache: 'reload' }); j = JSON.parse(body); } catch (e) {} }
      if (stale(j)) { const ps = j.text.split('\n\n'), k = ps.map((p, i) => /\*\*\* ?START OF/.test(p) ? i : -1).filter(i => i >= 0).pop(); j.text = ps.slice(k + 1).join('\n\n'); return j; }   // trimmed here, not kept
      (async () => { try { const cc = c || await within(3000, caches.open('latin-books')); await within(10000, cc.put(url, new Response(body, { headers: { 'Content-Type': 'application/json' } }))); } catch (e) {} })();
      return j;
    }
    // pages of about 200 words, broken between paragraphs (a very long paragraph between sentences)
    function paginate(text) {
      const out = []; let cur = [], n = 0;
      const push = () => { if (cur.length) out.push(cur.join('\n\n')); cur = []; n = 0; };
      let afterPic = false;
      for (const p of text.split('\n\n')) {
        const pic = /^\[\[img /.test(p), small = pic && /w="(\d+)" h="(\d+)"/.test(p) && +RegExp.$1 <= 150 && +RegExp.$2 <= 150;
        if (pic) { if (!small && n + 70 > 260 && n >= 120) push(); cur.push(p); n += small ? 0 : 70; afterPic = true; continue; }   // a picture stays with the text after it
        const w = p.split(/\s+/).length;
        if (w > 320) { push(); let part = []; let pn = 0; for (const s of p.match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) || [p]) { part.push(s.trim()); pn += s.split(/\s+/).length; if (pn >= 200) { out.push(part.join(' ')); part = []; pn = 0; } } if (part.length) { cur = [part.join(' ')]; n = pn; } continue; }
        if (n + w > 260 && n >= 120 && !afterPic) push();
        cur.push(p); n += w; afterPic = false;
        if (n >= 200 && !(p.length < 90 && !/[.!?]["'”’)]?$/.test(p))) push();   // never end a page on a heading
      }
      push();
      return out;
    }
    async function open(id, fresh) {
      document.documentElement.classList.add('readermode'); applyDark();
      app.innerHTML = `<div class="libpage"><div class="rhead"><button class="iconbtn" id="back">← Books</button><span></span><span style="width:44px"></span></div><p class="lload">Opening the book…</p></div>`;
      $('#back').onclick = () => shelf();
      // anything that goes wrong shows a message and a way on, never a frozen "Opening the book…"
      const fail = (msg, fresh) => { const el = app.querySelector('.lload'); if (!el) return; el.innerHTML = `${esc(msg)}<br><br><button class="rchoice main" id="lretry">Try again</button>`; $('#lretry').onclick = () => open(id, true); };
      const slow = setTimeout(() => { const el = app.querySelector('.lload'); if (el && !el.dataset.n) { el.dataset.n = 1; el.insertAdjacentHTML('beforeend', '<br><span class="small">Still fetching the book…</span>'); } }, 6000);
      let book; try { book = await getBook(id, fresh); } catch (e) { clearTimeout(slow); return fail((e.message || 'The book could not be opened') + '.'); }
      clearTimeout(slow);
      if (!book || !book.text) return fail('That book has no text that can be read here.');
      try {
      const pages = paginate(book.text), b = lib.books[id] = Object.assign({ at: 0 }, lib.books[id] || {}, { title: book.title, author: book.author, pages: pages.length, pics: book.pics || 0 });
      b.at = Math.min(b.at, pages.length - 1); lib.last = id; saveLib();
      const page = () => { const here = b.at; read(pages[here], { label: `p. ${here + 1}/${pages.length}`, back: () => shelf(), pic: src => PIC_URL(id, src),
        done: () => { b.at = Math.max(b.at, Math.min(here + 1, pages.length)); saveLib(); },
        next: here + 1 < pages.length ? () => { page2(); } : null }); };
      const page2 = () => { b.at = Math.min(b.at, pages.length - 1); page(); scrollTo(0, 0); };
      page();
      } catch (e) {
        // show what went wrong so it can be reported; a fresh copy from the library on Try again
        app.innerHTML = `<div class="libpage"><div class="rhead"><button class="iconbtn" id="back">← Books</button><span></span><span style="width:44px"></span></div><p class="lload">The book could not be shown (${esc(String(e && e.message || e))}).<br><br><button class="rchoice main" id="lretry">Try again</button></p></div>`;
        $('#back').onclick = () => shelf(); $('#lretry').onclick = () => { try { caches.open('latin-books').then(c => c.delete(BOOK_URL(id))); } catch (er) {} open(id, true); };
      }
    }
    shelf();
  }
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
    <div class="bar"><button class="iconbtn" id="back" aria-label="Back">${tab === 'play' ? '← Cards' : '← Home'}</button><span class="title">${tab === 'play' ? '' : 'Word list'}</span><span class="lvtag">${tab === 'play' ? '' : levelName(levelOf(u))}</span></div>
    <div id="pane" class="play"></div>
  </div>`;
  $('#back').onclick = () => { location.hash = tab === 'play' ? 'cards' : ''; };
  (tab === 'play' ? renderPlay : renderList)(u, $('#pane'));
}

/* word list */
function renderList(u, pane) {
  const p = getProg(u);
  const now = Date.now();
  let filter = store.get('latin.listFilter', 'all'), term = '';
  const { c, rest, total } = summary(u);
  if (filter !== 'all' && !(filter === 'rest' ? rest : c[+filter])) filter = 'all';   // a remembered filter with nothing in it any more falls back to everything
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
    <button class="pal" id="buddy" aria-label="Your beast" hidden></button>
    <div class="score" hidden><span id="sc">Swipe to answer</span><span id="left"></span></div>
    <div class="deck" id="deck"></div>
    <div class="combo" id="combo" aria-live="polite"></div>
    <div class="answer"><button class="no" id="no">✗ Wrong</button><button class="yes" id="yes">Right ✓</button></div>`;
  const deck = $('#deck', pane);
  // the scene behind the cards follows the element of the beast being raised; the bar above the cards shows it growing
  const setScene = () => { pane.className = 'play scene-' + Beasts.scene(u); };
  pane.className = 'play scene-earth';
  function buddy() {
    const el = $('#buddy', pane); if (!el) return;
    const l = Beasts.latest(u);
    if (!l) { el.innerHTML = Beasts.list().length ? `<span class="bpic egg">🥚</span><span class="btxt"><b>Monster eggs drop as you play</b><span class="small">Right answers and combos find them · duplicates evolve</span></span>` : ''; return; }
    const st = l.beast.stages[l.stage];
    el.innerHTML = `<img class="bpic" src="${Beasts.img(l.beast, l.stage)}" alt=""><span class="btxt"><b>${esc(st.name)}</b><span class="small">Latest find · ${Beasts.count(u)} / ${Beasts.totalStages()} in your Beastpedia</span></span>`;
  }
  $('#buddy', pane).onclick = () => { location.hash = 'beasts'; };
  Beasts.load().then(() => { if (document.body.contains(pane)) { setScene(); buddy(); } });
  const COMBO = ['SWEET!', 'SICKKK!', 'MAGIC!', 'PERFECT!'];
  function combo(n) {
    const word = n === 3 ? 'SWEET!' : n === 5 ? 'SICKKK!' : n === 8 ? 'MAGIC!' : n === 10 ? 'PERFECT!' : n > 10 && n % 5 === 0 ? COMBO[(n / 5) % 4] : null;
    if (!word) return;
    const el = $('#combo', pane); el.textContent = word; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  // the egg or growth card: the artist's fanfare — trumpets and confetti for a new egg, a white glow for a growth
  function showBeast(ev, done) {
    const b = ev.beast, st = b.stages[ev.stage], el = Beasts.ELEMENT[b.el] || ['', ''];
    const prev = ev.kind === 'grow' ? Beasts.img(b, ev.stage - 1) : null;
    deck.innerHTML = `<div class="card beast ${ev.kind}" id="beastCard">
        <div class="btitle">${ev.kind === 'egg' ? 'NEW' : ev.kind === 'spare' ? 'SPARE!' : 'EVOLVING'}</div>
        <div class="bstage"><img class="bnew" src="${Beasts.img(b, ev.stage)}" alt="${esc(st.name)}" onerror="retryImg(this)">${prev ? `<img class="bold" src="${prev}" alt="">` : ''}<span class="glow"></span></div>
        <div class="ribbon"><span>${esc(st.name)}</span></div>
        <div class="belem" title="${el[1]}">${el[0]}</div>
        <div class="small btap">${ev.kind === 'grow' ? 'Found again — it evolves! Tap to carry on' : ev.kind === 'spare' ? 'A second one — give it to a friend from the Beastpedia. Tap to carry on' : 'Tap to carry on'}</div>
      </div>${ev.kind === 'egg' ? `<img class="trumpets l" src="art/beasts/trumpets_l.png" alt=""><img class="trumpets r" src="art/beasts/trumpets_r.png" alt="">` : ''}`;
    const r = deck.getBoundingClientRect();
    if (ev.kind === 'egg') { Celebrate(r.left + r.width / 2, r.top + 10, 2.6); flash('🥚 You found an egg!'); }
    else if (ev.kind === 'spare') Celebrate(r.left + r.width / 2, r.top + 10, 1.6);
    else setTimeout(() => Celebrate(r.left + r.width / 2, r.top + r.height * .4, 1.8), 700);
    setScene(); buddy();
    const go = () => { deck.onclick = null; done(); };
    deck.onclick = go;
    setTimeout(() => { if (deck.onclick === go) { /* still showing: leave it until tapped */ } }, 4000);
  }
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div'); toast.className = 'toast ctoast'; document.body.appendChild(toast);

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
        <div class="orn top"><span class="num">${seen + (top ? 1 : 2)}</span></div>
        <div class="orn bottom"></div>
        <div class="cstars">${starsHTML((p[c.w.id] && p[c.w.id].s) || 0)}</div>
        ${phraseFor(c.w) ? `<div class="phrase">${phraseHTML(phraseFor(c.w).la)}</div>` : ''}
        <div class="kind">${c.w.kind}</div>
        ${top ? '<span class="stamp yes">✓</span><span class="stamp no">✗</span>' : ''}
        <div class="lat">${esc(c.form ? c.form.la : c.w.show)}</div>
        <div class="rule"></div>
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
    attachSwipe($('#top', deck));
    buddy();
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
    let ev = null;
    if (ok) {
      st.cur++; st.best = Math.max(st.best, st.cur);
      const big = st.cur % 10 === 0 ? 2.4 : st.cur % 5 === 0 ? 1.7 : 1;
      const r = deck.getBoundingClientRect();
      Celebrate(r.left + r.width / 2, r.top + 8, big);   // glitter sprays up from the top of the card
      right++; combo(st.cur);
      ev = Beasts.onCard(u, true, st.cur);
      if (pw.s === 5) flash(`🏆 ${w.show} mastered! Resting for a month`); else if (pw.s >= 2) flash(`⭐ ${pw.s} stars — back in ${restText(REST[pw.s])}`);
    } else { st.cur = 0; ev = Beasts.onCard(u, false, 0); }   // the 20th card drops a beast even when it is wrong
    store.set(streakKey(u), st);
    showStreak(ok);
    $('#sc', pane).textContent = `${right} / ${seen} right this time`;
    if (ok) setTimeout(ev ? () => showBeast(ev, next) : next, 120);
    else {
      const v = (match
        ? `Oops — “${esc(la)}” really does mean “${esc(shown)}”.`
        : `Not quite — “${esc(la)}” doesn’t mean “${esc(shown)}”.`) + (hadStars ? ' Back to zero stars for this one.' : '');
      setTimeout(() => openMemo(w, pw.s, v, ev ? () => showBeast(ev, next) : next), 120);
    }
  }
  function fly(el, dir) {
    const ok = card && (dir > 0) === card.match;
    el.classList.add('judged', ok ? 'ok' : 'bad');
    el.insertAdjacentHTML('beforeend', `<span class="badge ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</span>`);
    setTimeout(() => {
      el.classList.add('anim');
      el.style.transform = `translateX(${dir * (window.innerWidth + 200)}px) rotate(${dir * 30}deg)`;
      el.style.opacity = '0';
    }, 260);
    setTimeout(() => answer(dir > 0), 480);
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
      const dyUp = y0 - e.clientY;
      if (Math.abs(dx) > 90 || (Math.abs(dx) > 30 && v > 0.5)) { busy = true; fly(el, dx > 0 ? 1 : -1); }
      else if (dyUp > 70 && Math.abs(dx) < 60) { el.classList.add('anim'); el.style.transform = ''; flip(el); }   // swipe up: "I don't know" — turn the card over
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
  function flash(msg) {
    toast.textContent = msg;
    // under the card and its buttons, so it never covers the next word
    const bt = $('#yes', pane), r = bt && bt.getBoundingClientRect();
    if (r && r.bottom > 0) { toast.style.top = Math.min(r.bottom + 18, innerHeight - 70) + 'px'; toast.style.bottom = 'auto'; }
    else { toast.style.top = 'auto'; toast.style.bottom = 'calc(env(safe-area-inset-bottom) + 24px)'; }
    toast.classList.add('show');
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
  showStreak();
  next();
}

route();
