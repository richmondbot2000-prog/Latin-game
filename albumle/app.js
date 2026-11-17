/* Albumle — guess one of the 250 best albums (RateYourMusic's all-time chart) from its genres and mood.
   Tradle-style: every guess says how far away you are — year, artist, country, genre, chart rank.
   A new album every day; practice games any time. Everything lives in this browser's localStorage. */
const APP_VERSION = '10';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 'D' (duo) counts as a band until the owner decides how its square should behave (`kind`)
const A = ALBUMS.map(([rank, title, artist, year, country, genres, type, placeholder], i) => ({ i, rank, title, artist, year, country, genres, type, kind: type === 'S' ? 'S' : 'B', placeholder, main: MAIN_OF[genres[0]] || genres[0] }));
const KEYS = ['year', 'type', 'genre', 'country', 'rank'];   // v8: the artist's country replaced the cover colour (the owner: colour "doesn't work well")
const REGION = { GB: 'British Isles', IE: 'British Isles', US: 'North America', CA: 'North America', SE: 'Nordic', NO: 'Nordic', IS: 'Nordic', FR: 'mainland Europe', DE: 'mainland Europe', JP: 'Asia', AU: 'Oceania', BR: 'South America', NG: 'Africa' };
const region = c => REGION[c] || cname(c);
const SWATCH = { White: '#f3f0ea', Black: '#17141c', Grey: '#8d8a95', Red: '#d8343a', Orange: '#ef8a2c', Yellow: '#f0cf3c', Green: '#3f9f5a', Blue: '#3a74d8', Purple: '#7d4fc9', Pink: '#ef7fb6', Brown: '#8a5a36' };
const MAX = 6;
// a new album every day at 9 in the morning, local time (the owner's ask, like Nerdle): day 0 began at 09:00 on 17 November 2026
const DAY0 = new Date(2026, 10, 17, 9);
const dayStart = (now = new Date()) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9); if (now < d) d.setDate(d.getDate() - 1); return d; };
const dayNo = () => Math.max(0, Math.round((dayStart() - DAY0) / 864e5));
const SITE = 'https://albumle.musicalmagic.uk';   // the game's own address (a Cloudflare worker in albumle-site/ that serves these files and looks up covers)
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// the daily order (v9, the owner's chart): day 0 — 17 Nov 2026 — was Selected Ambient Works 85-92 and must stay so; the rest of the
// 250 follow in one seeded shuffle. Placeholders (ranks still hidden in the owner's screenshots) are pushed to the end of the order.
const shuffle = (list, seed) => { const r = mulberry(seed), a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ORDER = (() => {
  const first = A.find(x => x.title === 'Selected Ambient Works 85-92') || A[0];
  const rest = shuffle(A.filter(x => x !== first && !x.placeholder).map(x => x.i), 20261118), tail = shuffle(A.filter(x => x.placeholder).map(x => x.i), 20261119);
  return [first.i, ...rest, ...tail];
})();
const dailyIndex = d => ORDER[((d % A.length) + A.length) % A.length];
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const flag = c => (COUNTRY[c] || ['🏳️', c])[0], cname = c => (COUNTRY[c] || ['', c])[1];

let mode = 'daily', G;   // G: the game in play { idx, guesses: [album index], done: 'won' | 'lost' | null, day }
function newDaily() { const d = dayNo(); const s = load('albumle.daily', null); if (s && s.day === d) return s; return { day: d, idx: dailyIndex(d), guesses: [], done: null }; }
function newPractice(seed) { const r = mulberry(seed ?? (Date.now() & 0xffffffff)); let idx = Math.floor(r() * A.length); const last = load('albumle.lastPractice', -1); if (idx === last) idx = (idx + 1) % A.length; return { day: null, idx, guesses: [], done: null }; }
function save() { if (mode === 'daily') store('albumle.daily', G); else store('albumle.practice', G); }

/* ---------- feedback: how a guess compares with the answer ---------- */
function compare(g, a) {
  const dy = a.year - g.year, dr = a.rank - g.rank, ay = Math.abs(dy), ar = Math.abs(dr);
  const sameSub = g.genres[0] === a.genres[0], sameMain = g.main === a.main;
  return {
    year: { cls: ay <= 5 ? 'g' : ay <= 10 ? 'y' : 'n', text: `${g.year}${dy === 0 ? '' : dy > 0 ? ' ▲' : ' ▼'}`, sub: dy === 0 ? 'same year' : ay <= 5 ? 'within 5 yrs' : `${ay <= 10 ? '6–10' : '10+'} yrs ${dy > 0 ? 'later' : 'earlier'}` },
    type: { cls: g.kind === a.kind ? 'g' : 'n', text: g.kind === 'B' ? 'Band' : 'Solo', sub: g.kind === a.kind ? 'yes' : 'no' },
    genre: { cls: sameSub ? 'g' : sameMain ? 'y' : 'n', text: g.genres[0], sub: sameSub ? 'same genre' : sameMain ? `${g.main}, not this` : g.main, small: true },
    country: { cls: g.country === a.country ? 'g' : region(g.country) === region(a.country) ? 'y' : 'n', text: flag(g.country), sub: g.country === a.country ? cname(g.country) : region(g.country) === region(a.country) ? `${region(g.country)}, not ${cname(g.country)}` : cname(g.country) },
    rank: { cls: ar <= 5 ? 'g' : ar <= 20 ? 'y' : 'n', text: `#${g.rank}${dr === 0 ? '' : dr < 0 ? ' ▲' : ' ▼'}`, sub: dr === 0 ? 'the one' : ar <= 5 ? 'within 5 places' : `${ar <= 20 ? '6–20' : '20+'} ${dr < 0 ? 'higher' : 'lower'}` },
  };
}
const SQ = { g: '🟩', y: '🟨', n: '🟥' };
// the range a number can still be in after a guess: green within `g`, yellow within `y`, red beyond — plus the direction
function bounds(guess, actual, g, y) {
  const d = actual - guess, ad = Math.abs(d);
  if (ad <= g) return [guess - g, guess + g];
  if (ad <= y) return d > 0 ? [guess + g + 1, guess + y] : [guess - y, guess - g - 1];
  return d > 0 ? [guess + y + 1, Infinity] : [-Infinity, guess - y - 1];
}
const rangeText = (lo, hi, fmt, min, max) => { lo = Math.max(lo, min); hi = Math.min(hi, max); return lo === hi ? fmt(lo) : lo > min && hi < max ? `${fmt(lo)}–${fmt(hi)}` : lo > min ? `after ${fmt(lo - 1)}` : hi < max ? `before ${fmt(hi + 1)}` : '?'; };
function deduce(a) {
  const k = { year: '?', type: '?', genre: '?', country: '?', rank: '?', sure: {}, part: {} };
  let ylo = -Infinity, yhi = Infinity, rlo = -Infinity, rhi = Infinity; const notCountry = [], notGenre = []; let reg = null;
  for (const gi of G.guesses) {
    const g = A[gi];
    const [a1, b1] = bounds(g.year, a.year, 5, 10); ylo = Math.max(ylo, a1); yhi = Math.min(yhi, b1);
    const [a2, b2] = bounds(g.rank, a.rank, 5, 20); rlo = Math.max(rlo, a2); rhi = Math.min(rhi, b2);
    if (g.kind === a.kind) k.sure.type = 1; k.type = a.kind === 'B' ? 'Band' : 'Solo';   // only two kinds: a red tells you too
    if (g.genres[0] === a.genres[0]) { k.genre = g.genres[0]; k.sure.genre = 1; }
    else if (g.main === a.main) { if (!k.sure.genre) { k.genre = `${g.main}, not ${g.genres[0]}`; k.part.genre = 1; } }
    else notGenre.push(g.main);
    if (g.country === a.country) { k.country = `${flag(g.country)} ${cname(g.country)}`; k.sure.country = 1; } else if (region(g.country) === region(a.country)) { reg = region(g.country); notCountry.push(g.country); } else notCountry.push(g.country);
  }
  if (G.guesses.length) {
    k.year = rangeText(ylo, yhi, String, 1900, 2100); k.rank = rangeText(rlo, rhi, n => '#' + n, 1, A.length);
    if (k.year !== '?') { k.sure.year = ylo === yhi; k.part.year = !k.sure.year; }
    if (k.rank !== '?') { k.sure.rank = rlo === rhi; k.part.rank = !k.sure.rank; }
    k.sure.type = 1;
    if (!k.sure.country && notCountry.length) { k.country = (reg ? reg + ', ' : '') + 'not ' + [...new Set(notCountry)].map(flag).join(' '); k.part.country = 1; }
    if (k.genre === '?' && notGenre.length) { k.genre = 'not ' + [...new Set(notGenre)].join(', '); k.part.genre = 1; }
  }
  return k;
}

/* ---------- the page ---------- */
function render() {
  const a = A[G.idx], n = G.guesses.length, over = !!G.done;
  // what the squares have told you so far (the owner, 17 Nov 2026): nothing before the first guess; the year and rank narrow to a
  // range — "1985 earlier" then "1979 later" gives "1979–1985" — band/solo flips after a red (there are only two), the genre shows
  // its broad family after a yellow, and the country box lists the flags ruled out
  const known = deduce(a);
  if (over) Object.assign(known, { year: String(a.year), type: a.kind === 'B' ? 'Band' : 'Solo', genre: a.genres[0], country: `${flag(a.country)} ${cname(a.country)}`, rank: '#' + a.rank, sure: { year: 1, type: 1, genre: 1, country: 1, rank: 1 } });
  const vars = [['Year', 'year'], ['Band or solo', 'type'], ['Genre', 'genre'], ['Country', 'country'], [`Rank (1–${A.length})`, 'rank']];
  const hints = [];
  if (n >= 3 || over) hints.push(`The artist's name starts with <b>${esc(a.artist[0])}</b>`);
  if (n >= 5 || over) hints.push(`The title starts with <b>${esc(a.title[0])}</b>`);
  const rows = Array.from({ length: MAX }, (_, k) => {
    const gi = G.guesses[k]; if (gi === undefined) return `<div class="row empty"></div>`;
    const g = A[gi], f = compare(g, a);
    return `<div class="row"><div class="who">${esc(g.title)} <span>— ${esc(g.artist)}</span></div><div class="cells">${KEYS.map(k => `<div class="cell ${f[k].cls}${f[k].small ? ' sm' : ''}${k === 'country' ? ' flag' : ''}">${esc(f[k].text)}<small>${esc(f[k].sub)}</small></div>`).join('')}</div></div>`;
  }).join('');
  $('#app').innerHTML = `
    <div class="sub">${mode === 'daily' ? `Albumle #${G.day + 1}` : 'Practice'} · ${over ? (G.done === 'won' ? `solved in ${n}` : 'not solved') : `guess ${n + 1} of ${MAX}`}</div>
    <div class="clue"><div class="label">${n ? 'What you know so far' : 'You are guessing its…'}</div>
      <div class="vars">${vars.map(([k, key]) => { const v = known[key]; return `<div class="var ${known.sure[key] ? 'got' : known.part[key] ? 'part' : ''}"><span>${k}</span><b>${esc(v)}</b></div>`; }).join('')}</div>
      ${hints.map(h => `<div class="hint">${h}</div>`).join('')}</div>
    ${over ? result(a) : `<div class="guessbox"><input id="q" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type an album or artist…" enterkeyhint="go"><div class="sugg" id="sugg" hidden></div></div>`}
    <div class="rows">${rows}</div>
    <div class="legend"><span>year</span><span>band/solo</span><span>genre</span><span>country</span><span>rank</span></div>
    <div class="foot">${mode === 'daily' ? `<button class="linkbtn" id="practice">Play a practice game</button>` : `<button class="linkbtn" id="daily">Back to today's album</button>`}<br>The ${A.length} albums are RateYourMusic's all-time top ${A.length} · a new one every day at 9am · the cover is fetched from Deezer when the answer shows; nothing else leaves this phone · v${APP_VERSION}</div>`;
  if (!over) wireInput(a); else showCover(a);
  const p = $('#practice'); if (p) p.onclick = () => { mode = 'practice'; G = load('albumle.practice', null); if (!G || G.done) G = newPractice(); save(); render(); };
  const d = $('#daily'); if (d) d.onclick = () => { mode = 'daily'; G = newDaily(); save(); render(); };
  const sh = $('#share'); if (sh) sh.onclick = share;
  const ag = $('#again'); if (ag) ag.onclick = () => { mode = 'practice'; G = newPractice(); store('albumle.lastPractice', G.idx); save(); render(); };
  const st = $('#seeStats'); if (st) st.onclick = stats;
}
function result(a) {
  const won = G.done === 'won', n = G.guesses.length;
  return `<div class="result"><div class="sub">${won ? ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'][n - 1] : 'Not this time'}</div>
    <div class="coverbox" id="coverbox"></div>
    <h2>${esc(a.title)}</h2><div class="by">${esc(a.artist)} · ${a.year} · ${flag(a.country)} ${esc(cname(a.country))}</div>
    <div class="meta">#${a.rank} of the ${A.length} · ${a.genres.map(esc).join(' · ')} · ${a.kind === 'B' ? 'band' : 'solo artist'}</div>
    <button class="btn" id="share">Share</button>${mode === 'daily' ? `<button class="btn ghost" id="seeStats">Stats</button>` : `<button class="btn ghost" id="again">Another one</button>`}
    ${mode === 'daily' ? `<div class="next" id="next"></div>` : ''}</div>`;
}
// the cover is looked up only when the answer is revealed, through the game's own worker (Deezer's public search) — none are stored here
async function showCover(a) {
  const box = $('#coverbox'); if (!box) return;
  try {
    const key = 'albumle.cover.' + a.i; let url = load(key, null);
    if (url === null) { const r = await fetch(`${SITE}/api/cover?title=${encodeURIComponent(a.title)}&artist=${encodeURIComponent(a.artist)}`); const j = await r.json(); url = j.url || ''; store(key, url); }
    if (!url || !$('#coverbox')) return;
    const img = new Image(); img.alt = `${a.title} — ${a.artist}`; img.className = 'cover';
    img.onload = () => { const b = $('#coverbox'); if (b) { b.innerHTML = ''; b.appendChild(img); requestAnimationFrame(() => img.classList.add('in')); } };
    img.src = url;
  } catch (e) {}
}
function wireInput(a) {
  const q = $('#q'), box = $('#sugg');
  let list = [];
  const show = () => {
    const t = fold(q.value); list = [];
    if (t.length >= 2) list = A.filter(x => !G.guesses.includes(x.i) && (fold(x.title).includes(t) || fold(x.artist).includes(t) || fold(x.title + ' ' + x.artist).includes(t))).slice(0, 8);
    box.hidden = !list.length;
    box.innerHTML = list.map(x => `<button data-i="${x.i}"><b>${esc(x.title)}</b><span>${esc(x.artist)} · ${x.year}</span></button>`).join('');
    box.querySelectorAll('button').forEach(b => { b.onclick = () => guess(+b.dataset.i); });
  };
  q.oninput = show;
  q.onkeydown = e => { if (e.key === 'Enter' && list.length) { e.preventDefault(); guess(list[0].i); } };
  q.focus();
}
function guess(i) {
  const a = A[G.idx];
  G.guesses.push(i);
  if (i === G.idx) G.done = 'won'; else if (G.guesses.length >= MAX) G.done = 'lost';
  if (mode === 'practice') store('albumle.lastPractice', G.idx);
  if (G.done && mode === 'daily') record(G.done === 'won' ? G.guesses.length : 0);
  save(); render();
  if (G.done) setTimeout(() => toast(G.done === 'won' ? '🎉 ' + a.title : 'It was ' + a.title), 300);
  else if (i !== G.idx) window.scrollTo({ top: 0, behavior: 'smooth' });
}
function record(n) {
  const s = load('albumle.stats', { played: 0, won: 0, streak: 0, max: 0, dist: [0, 0, 0, 0, 0, 0], last: null });
  s.played++; if (n) { s.won++; s.dist[n - 1]++; s.streak = (s.last === G.day - 1 || s.last === null) ? s.streak + 1 : 1; } else s.streak = 0;
  s.max = Math.max(s.max, s.streak); s.last = G.day; store('albumle.stats', s);
}
function shareText() {
  const a = A[G.idx], won = G.done === 'won';
  const lines = G.guesses.map(gi => { const f = compare(A[gi], a); return KEYS.map(k => SQ[f[k].cls]).join(''); });
  return `${mode === 'daily' ? `Albumle #${G.day + 1}` : 'Albumle practice'} ${won ? G.guesses.length : 'X'}/${MAX}\n${lines.join('\n')}\n${SITE}/`;
}
async function share() {
  const text = shareText();
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } catch (e) { prompt('Copy your result', text); }
}
function stats() {
  const s = load('albumle.stats', { played: 0, won: 0, streak: 0, max: 0, dist: [0, 0, 0, 0, 0, 0] });
  const top = Math.max(1, ...s.dist), here = mode === 'daily' && G.done === 'won' ? G.guesses.length : 0;
  sheet(`<h2>Statistics</h2><div class="stats"><div><b>${s.played}</b><span>played</span></div><div><b>${s.played ? Math.round(100 * s.won / s.played) : 0}</b><span>win %</span></div><div><b>${s.streak}</b><span>streak</span></div><div><b>${s.max}</b><span>best streak</span></div></div>
    <div class="dist">${s.dist.map((d, i) => `<div><span>${i + 1}</span><i class="${here === i + 1 ? 'hit' : ''}" style="width:${Math.max(8, 100 * d / top)}%">${d}</i></div>`).join('')}</div>
    ${G.done && mode === 'daily' ? `<p style="text-align:center;margin-top:16px"><button class="btn" id="share2">Share today's result</button></p>` : ''}`);
  const b = $('#share2'); if (b) b.onclick = share;
}
function help() {
  sheet(`<h2>How to play</h2>
    <p>Guess the album in ${MAX} tries. Every day it is one of the <b>${A.length} best albums of all time</b> as rated on RateYourMusic.</p>
    <p>You are told nothing to start with. Type any album or artist from the ${A.length}, pick it from the list, and the squares tell you how close you are on five things. The panel at the top adds up what the squares have told you — guess a 1985 album and hear "earlier", then a 1979 one and hear "later", and it reads <b>1979–1985</b>.</p>
    <div class="cells"><div class="cell y">1994 ▲<small>6–10 yrs later</small></div><div class="cell n">Band<small>no</small></div><div class="cell y sm">Alternative Rock<small>Rock, not this</small></div><div class="cell g flag">🇬🇧<small>United Kingdom</small></div><div class="cell n">#44 ▼<small>20+ lower</small></div></div>
    <p><b>Year</b>: green within 5 years, yellow 6 to 10 years away, red more than 10; ▲ the answer came out later, ▼ earlier.<br><b>Band or solo</b>: green when the answer is the same kind of act.<br><b>Genre</b>: green for the same genre, yellow for the same broad genre but a different one within it (you guess Alternative Rock, it is Indie Rock), red for a different genre altogether.<br><b>Country</b>: the artist's country — green for the same country, yellow for the same part of the world (the British Isles, North America, the Nordic countries, mainland Europe), red otherwise.<br><b>Rank</b> on the list of ${A.length}: green within 5 places, yellow 6 to 20 away, red more than 20; ▲ the answer is higher up (nearer #1), ▼ lower.</p>
    <p>After three misses you get the artist's initial, after five the title's. Share your squares when you are done, and play practice games as often as you like.</p>`);
}
function sheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2200); }
function tickNext() {
  const el = $('#next'); if (!el) return;
  const next = dayStart(); next.setDate(next.getDate() + 1); const ms = next - Date.now(), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
  el.textContent = `Next album at 9am · in ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (ms < 1000 || load('albumle.daily', G).day !== dayNo()) { G = newDaily(); save(); render(); }
}
function main() {
  G = newDaily(); save(); render();
  $('#helpBtn').onclick = help; $('#statsBtn').onclick = stats;
  $('#closeSheet').onclick = () => { $('#sheet').hidden = true; }; $('#sheet').onclick = e => { if (e.target === $('#sheet')) $('#sheet').hidden = true; };
  if (!load('albumle.seen', false)) { help(); store('albumle.seen', true); }
  setInterval(tickNext, 1000);
}
main();
