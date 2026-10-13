'use strict';

/* ---------- storage (this browser only; nothing leaves the device) ---------- */
const mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    if (/^latin\.(progress|streak|level|practice)\./.test(k) && typeof Sync !== 'undefined') { const u = current(); if (u && k.endsWith(u.id)) Sync.touch(u); } },
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

const RETIRE_DAYS = 30;
const DAY = 86400000;

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
const WORDS = VOCAB.map((v, i) => ({ ...v, id: v.word, kind: KIND(v.pos), toks: tokens(v.english), i }));
const phraseFor = w => (typeof PHRASES !== 'undefined' && PHRASES[w.word]) || null;
// Latin phrase with the card's word (marked *like this*) highlighted
const phraseHTML = la => esc(la).replace(/\*([^*]+)\*/g, '<mark>$1</mark>');
const memoFor = w => (typeof MEMORY !== 'undefined' && MEMORY[w.word]) || { pic: '📜', hook: `${w.word} means ${w.english}.` };

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
   right answer: one more star (a word at 5 rests for a month); wrong answer: back to zero */
function recordAnswer(u, w, ok) {
  const p = getProg(u);
  const pw = p[w.id] || { s: 0, ok: 0, bad: 0 };
  if (ok) { pw.ok = (pw.ok || 0) + 1; pw.s = Math.min(5, (pw.s || 0) + 1); if (pw.s === 5) pw.r = Date.now() + RETIRE_DAYS * DAY; }
  else { pw.bad = (pw.bad || 0) + 1; pw.s = 0; delete pw.r; }
  pw.t = Date.now();
  p[w.id] = pw; saveProg(u, p);
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
  if (h === 'list' || h === 'play') return renderOrganise(u, h);
  if (h === 'organise') return renderOrganise(u, store.get('latin.orgTab', 'play'));
  renderHome(u);
}
window.addEventListener('hashchange', route);

/* ---------- sign in / new player ---------- */
function renderSignIn(mode = store.get('latin.signinMode', users().length ? 'in' : 'new')) {
  let picked = [];
  app.innerHTML = `
  <div class="wrap">
    <h1>Salve!</h1>
    <p class="sub">Learn every Latin word, one card at a time.</p>
    ${installTip('signin')}
    <div class="tabs" role="tablist">
      <button role="tab" data-m="in" aria-selected="${mode === 'in'}">I've played before</button>
      <button role="tab" data-m="new" aria-selected="${mode === 'new'}">I'm new</button>
    </div>
    <label class="lbl" for="name">Your first name</label>
    <input id="name" type="text" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false">
    <label class="lbl">${mode === 'new' ? 'Choose your two secret emojis' : 'Your two secret emojis'}</label>
    <div class="picked"><div class="slot"></div><div class="slot"></div></div>
    <div class="emojis">${EMOJIS.map(e => `<button type="button" aria-pressed="false">${e}</button>`).join('')}</div>
    <p class="err" id="err"></p>
    <button class="btn" id="go" disabled>${mode === 'new' ? 'Create my player' : "Let's play"}</button>
    ${mode === 'in' && Sync.enabled() ? '<button class="btn ghost" id="link">I have a sync code from another device</button>' : ''}
    ${mode === 'new' ? '<p class="small" style="text-align:center">Remember your name and emojis — they are how the game knows it’s you. Your progress stays on this device.</p>' : ''}
  </div>`;
  wireTip();
  const name = $('#name'), go = $('#go'), err = $('#err');
  const slots = app.querySelectorAll('.slot');
  const sync = () => {
    slots.forEach((s, i) => { s.textContent = picked[i] || ''; s.classList.toggle('full', !!picked[i]); });
    app.querySelectorAll('.emojis button').forEach(b => b.setAttribute('aria-pressed', picked.includes(b.textContent)));
    go.disabled = !(name.value.trim() && picked.length === 2);
    err.textContent = '';
  };
  app.querySelector('.tabs').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    store.set('latin.signinMode', b.dataset.m); renderSignIn(b.dataset.m);
  };
  app.querySelector('.emojis').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const em = b.textContent;
    picked = picked.includes(em) ? picked.filter(x => x !== em) : picked.length < 2 ? [...picked, em] : [picked[0], em];
    sync();
  };
  name.oninput = sync;
  go.onclick = () => {
    const nm = name.value.trim().replace(/\s+/g, ' ');
    const k = keyOf(nm, picked);
    const all = users();
    const found = all.find(u => keyOf(u.name, u.emojis) === k);
    if (mode === 'in') {
      if (!found) { err.textContent = "We can't find that player on this device. Check your name and emojis" + (Sync.enabled() ? ', use your sync code below, ' : ' ') + "or tap “I'm new”."; return; }
      store.set('latin.current', found.id);
    } else {
      if (found) { err.textContent = 'That player already exists — tap “I’ve played before”.'; return; }
      const u = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: nm, emojis: picked, created: Date.now() };
      store.set('latin.users', [...all, u]);
      store.set('latin.current', u.id);
      if (Sync.enabled()) { store.set('latin.signinMode', 'in'); location.hash = ''; showCode(u, true); return; }
    }
    store.set('latin.signinMode', 'in');
    location.hash = '';
    route();
  };
  const link = $('#link');
  if (link) link.onclick = async () => {
    const nm = name.value.trim().replace(/\s+/g, ' ');
    if (!nm || picked.length !== 2) { err.textContent = 'Type your name and pick your two emojis first, then enter the code.'; return; }
    const code = prompt('Type the sync code shown on your other device (like APPLE-TIGER-2481):');
    if (code == null) return;
    if (!Sync.valid(code)) { err.textContent = 'That doesn’t look like a sync code. It has two words and four numbers.'; return; }
    err.textContent = 'Looking…';
    try {
      const blob = await Sync.link(code);
      if (!blob) { err.textContent = 'No player found with that code. Check it on the other device (Home → sync code).'; return; }
      const all = users();
      let u = all.find(x => keyOf(x.name, x.emojis) === keyOf(nm, picked));
      if (!u) { u = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: nm, emojis: picked, created: Date.now(), code: Sync.normalise(code) }; store.set('latin.users', [...all, u]); }
      else { u.code = Sync.normalise(code); store.set('latin.users', all.map(x => x.id === u.id ? u : x)); }
      store.set('latin.current', u.id);
      Sync.merge(u, blob);
      store.set('latin.signinMode', 'in'); location.hash = ''; route();
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
function renderHome(u) {
  const { c, total } = summary(u);
  app.innerHTML = `
  <div class="wrap">
    <div class="bar"><span class="title"></span><button class="iconbtn" id="who">Switch</button></div>
    <div class="hello"><div class="small">Salve,</div><div class="who"></div></div>
    ${installTip('home')}
    <div class="tile org" id="org">
      <h2>Organise</h2>
      <p>Learn the words with swipe cards. Which words?</p>
      <div class="levels" role="radiogroup" aria-label="Which words">
        ${LEVELS.map(([k, n]) => `<button role="radio" data-l="${k}" aria-checked="${k === levelOf(u)}"><b>${n}</b><span>${WORDS.filter(w => inLevel(w, k)).length} words</span></button>`).join('')}
      </div>
      ${meterHTML(c, total)}
      <div class="small">${c[5]} mastered · ${total - c[0]} started · ${c[0]} new</div>
      <div class="orgbtns"><button class="btn ghost" data-t="list">Word list</button><button class="btn" data-t="play">Play</button></div>
    </div>
    <div class="tile org prac" id="prac">
      <img class="pracico" src="art/ui/icon_practice.png" alt="">
      <h2>Practice</h2>
      <p>Defend the garden from the squishies. Match words to earn coins for guns.</p>
      <div class="small">${(() => { const sv = store.get('latin.practice.' + u.id, { best: 1 }); return (sv.best || 1) > 1 ? `Best: level ${sv.best} · ${sv.kills || 0} squishies squished` : 'Not played yet'; })()} · uses your ${levelName(levelOf(u))} words</div>
      <div class="orgbtns"><button class="btn ghost" id="trophGo">🏆 Trophies ${(() => { const sv = store.get('latin.practice.' + u.id, {}); return Practice.trophies(sv).filter(t => t.got).length; })()}/20</button><button class="btn" id="pracGo">Play</button></div>
    </div>
    <div class="tile org prac" id="ham">
      <img class="pracico" src="art/jh/icon.png" alt="">
      <h2>Jaques Hammer</h2>
      <p>Run past the signs. Smash the wrong meanings, let the right ones by.</p>
      <div class="small">${(() => { const sv = store.get('latin.hammer.' + u.id, { best: 0 }); return sv.best ? `Best score ${sv.best}` : 'Not played yet'; })()} · uses your ${levelName(levelOf(u))} words</div>
      <div class="orgbtns"><span></span><button class="btn" id="hamGo">Play</button></div>
    </div>
    ${Sync.enabled() ? `<button class="syncline" id="syncline"><span>☁️ Sync code <b>${esc(Sync.codeOf(u))}</b></span><span class="small" id="syncstat"></span></button>` : ''}
    <button class="btn ghost" id="del" style="margin-top:auto">Delete this player</button>
  </div>`;
  $('.who').textContent = u.name + ' ' + u.emojis.join('');
  wireTip();
  if (Sync.enabled()) {
    $('#syncline').onclick = () => showCode(u, false);
    const stat = { saving: 'saving…', saved: 'saved ✓', loading: 'checking…', error: 'not reachable', off: '' };
    const show = s => { const el = $('#syncstat'); if (el) el.textContent = stat[s] || ''; };
    show(Sync.status()); Sync.onStatus(show);
    if (pulledFor !== u.id) { pulledFor = u.id; Sync.pull(u).then(changed => { if (changed && current() && current().id === u.id && location.hash === '') renderHome(u); }); }
  }
  $('#pracGo').onclick = () => { location.hash = 'practice'; };
  $('#trophGo').onclick = () => { location.hash = 'trophies'; };
  $('#hamGo').onclick = () => { location.hash = 'hammer'; };
  $('#org .levels').onclick = e => {
    const b = e.target.closest('button'); if (!b || b.dataset.l === levelOf(u)) return;
    store.set(levelKey(u), b.dataset.l); renderHome(u);
  };
  $('#org .orgbtns').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    store.set('latin.orgTab', b.dataset.t); location.hash = b.dataset.t;
  };
  $('#who').onclick = () => { store.del('latin.current'); route(); };
  $('#del').onclick = () => {
    if (!confirm(`Delete ${u.name} and all their stars on this device? This can't be undone.`)) return;
    store.set('latin.users', users().filter(x => x.id !== u.id));
    store.del(progressKey(u)); store.del(streakKey(u)); store.del(levelKey(u)); store.del('latin.current');
    route();
  };
}

/* ---------- practice (garden defence) ---------- */
function renderPractice(u) {
  app.innerHTML = '<div id="pstage"></div>';
  Practice.mount($('#pstage'), u, { home: () => { location.hash = ''; }, tag: levelName(levelOf(u)) });
}

/* ---------- Jaques Hammer ---------- */
function renderHammer(u) {
  app.innerHTML = '<div id="hstage"></div>';
  Hammer.mount($('#hstage'), u, { home: () => { location.hash = ''; }, tag: levelName(levelOf(u)) });
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
      return !term || w.word.toLowerCase().includes(term) || w.english.toLowerCase().includes(term);
    });
    list.innerHTML = shown.map(w => {
      const pw = p[w.id] || {}, s = pw.s || 0;
      return `<li><button data-i="${w.i}"><span class="lat">${esc(w.word)}</span>${starsHTML(s)}<span class="en">${esc(w.english)}${resting(pw, now) ? `<span class="rest">😴 resting until ${fmtDate(pw.r)}</span>` : ''}</span></button></li>`;
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
function openMemo(w, stars, verdict, onClose) {
  const m = memoFor(w);
  sheet.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-label="How do we remember ${esc(w.word)}?">
      ${verdict ? `<div class="verdict bad">${verdict}</div>` : ''}
      <div class="memo">
        <div class="pic" aria-hidden="true">${esc(m.pic)}</div>
        <div class="lat">${esc(w.word)}</div>
        <div class="en">${esc(w.english)}</div>
        <div class="how"><h3>How do we remember this?</h3><p>${esc(m.hook)}</p></div>
        ${phraseFor(w) ? `<div class="how said"><h3>In a sentence</h3><p class="la">${phraseHTML(phraseFor(w).la)}</p><p class="tr">${esc(phraseFor(w).en)}</p></div>` : ''}
        <div class="meta">${starsHTML(stars)} <span class="small">· ${w.kind} · Level ${w.level}</span></div>
      </div>
      <button class="btn" id="memoOk">${verdict ? 'Got it — next card' : 'Close'}</button>
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
  const recent = [];
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
    let pool = active.filter(w => !resting(p[w.id], now));
    if (!pool.length) return null;
    if (pool.length > 8) pool = pool.filter(w => !recent.includes(w.id));
    let total = 0;
    const wts = pool.map(w => { const t = 6 - ((p[w.id] && p[w.id].s) || 0); total += t; return t; });
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= wts[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function next() {
    const w = pick();
    const p = getProg(u), now = Date.now();
    $('#left', pane).textContent = activeWords(u).filter(x => resting(p[x.id], now)).length + ' resting 😴';
    if (!w) {
      deck.innerHTML = '<div class="empty">🏆 Every word is resting!<br>Come back soon to keep them fresh.</div>';
      return;
    }
    recent.push(w.id); if (recent.length > 6) recent.shift();
    const match = Math.random() < 0.5;
    const ds = match ? null : distractors(w, activeWords(u));
    const shown = match ? w.english : ds[Math.floor(Math.random() * ds.length)].english;
    card = { w, match, shown };
    const s = (p[w.id] && p[w.id].s) || 0;
    deck.innerHTML = `
      <div class="card under" aria-hidden="true"></div>
      <div class="card" id="top" data-kind="${w.kind}">
        <div class="cstars">${starsHTML(s)}</div>
        ${phraseFor(w) ? `<div class="phrase">${phraseHTML(phraseFor(w).la)}</div>` : ''}
        <div class="kind">${w.kind}</div>
        <span class="stamp yes">RIGHT</span><span class="stamp no">WRONG</span>
        <div class="lat">${esc(w.word)}</div>
        <div class="means">means</div>
        <div class="en">${esc(shown)}</div>
      </div>`;
    drawFrame();
    attachSwipe($('#top', deck));
    busy = false;
  }
  function answer(saysMatch) {
    if (!card) return;
    busy = true;
    const { w, match, shown } = card;
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
      if (pw.s === 5) flash(`🏆 ${w.word} mastered! Resting for a month`);
    } else st.cur = 0;
    store.set(streakKey(u), st);
    showStreak(ok);
    $('#sc', pane).textContent = `${right} / ${seen} right this time`;
    if (ok) setTimeout(next, 120);
    else {
      const v = (match
        ? `Oops — “${esc(w.word)}” really does mean “${esc(shown)}”.`
        : `Not quite — “${esc(w.word)}” doesn’t mean “${esc(shown)}”.`) + (hadStars ? ' Back to zero stars for this one.' : '');
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
      else { el.classList.add('anim'); el.style.transform = ''; yes.style.opacity = 0; no.style.opacity = 0; }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
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
    const el = $('#top', deck); if (!el) return;
    const old = $('.frame', el); if (old) old.remove();
    el.insertAdjacentHTML('afterbegin', frameSVG(el.dataset.kind, el.clientWidth, el.clientHeight));
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
