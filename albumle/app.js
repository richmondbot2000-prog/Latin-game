/* Albumle — guess one of the 200 best albums (RateYourMusic's all-time chart) from its genres and mood.
   Tradle-style: every guess says how far away you are — year, artist, country, genre, chart rank.
   A new album every day; practice games any time. Everything lives in this browser's localStorage. */
const APP_VERSION = '1';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const A = ALBUMS.map(([rank, title, artist, year, country, genres, desc, tracks, minutes], i) => ({ i, rank, title, artist, year, country, genres, desc, tracks, minutes }));
const MAX = 6;
const EPOCH = Date.UTC(2026, 10, 17);                       // day 0: 17 November 2026
const dayNo = () => Math.floor((Date.now() - EPOCH) / 864e5);
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ORDER = (() => { const r = mulberry(20261117); const a = A.map(x => x.i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
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
  const dy = a.year - g.year, dr = a.rank - g.rank;
  const shared = g.genres.filter(x => a.genres.includes(x));
  return {
    year: { cls: dy === 0 ? 'g' : Math.abs(dy) <= 3 ? 'y' : 'n', text: `${g.year}${dy === 0 ? '' : dy > 0 ? ' ▲' : ' ▼'}`, sub: dy === 0 ? 'same year' : dy > 0 ? 'later' : 'earlier' },
    artist: { cls: g.artist === a.artist ? 'g' : 'n', text: g.artist === a.artist ? '✓' : '✗', sub: g.artist === a.artist ? 'same artist' : 'artist' },
    country: { cls: g.country === a.country ? 'g' : 'n', text: flag(g.country), sub: g.country === a.country ? 'same country' : cname(g.country) },
    genre: { cls: shared.length && g.genres[0] === a.genres[0] ? 'g' : shared.length ? 'y' : 'n', text: shared.length ? (shared.length === g.genres.length ? 'all' : shared.length) : '0', sub: shared.length ? `shared genre${shared.length > 1 ? 's' : ''}` : 'genres' },
    rank: { cls: dr === 0 ? 'g' : Math.abs(dr) <= 10 ? 'y' : 'n', text: `#${g.rank}${dr === 0 ? '' : dr < 0 ? ' ▲' : ' ▼'}`, sub: dr === 0 ? 'the one' : dr < 0 ? 'ranks higher' : 'ranks lower' },
  };
}
const SQ = { g: '🟩', y: '🟨', n: '⬛' };

/* ---------- the page ---------- */
function render() {
  const a = A[G.idx], n = G.guesses.length, over = !!G.done;
  const tags = a.genres.map(g => `<span class="tag genre">${esc(g)}</span>`).join('') + a.desc.map((d, i) => `<span class="tag s${Math.min(4, 1 + Math.floor(i / 2))}">${esc(d)}</span>`).join('');
  const hints = [];
  if (n >= 3 || over) hints.push(`The artist's name starts with <b>${esc(a.artist[0])}</b>`);
  if (n >= 5 || over) hints.push(`The title starts with <b>${esc(a.title[0])}</b>`);
  const rows = Array.from({ length: MAX }, (_, k) => {
    const gi = G.guesses[k]; if (gi === undefined) return `<div class="row empty"></div>`;
    const g = A[gi], f = compare(g, a);
    return `<div class="row"><div class="who">${esc(g.title)} <span>— ${esc(g.artist)}</span></div><div class="cells">${['year', 'artist', 'country', 'genre', 'rank'].map(k => `<div class="cell ${f[k].cls}">${f[k].text}<small>${esc(f[k].sub)}</small></div>`).join('')}</div></div>`;
  }).join('');
  $('#app').innerHTML = `
    <div class="sub">${mode === 'daily' ? `Albumle #${G.day + 1}` : 'Practice'} · ${over ? (G.done === 'won' ? `solved in ${n}` : 'not solved') : `guess ${n + 1} of ${MAX}`}</div>
    <div class="clue"><div class="label">This album is…</div><div class="cloud">${tags}</div>
      <div class="facts">${a.tracks} track${a.tracks === 1 ? '' : 's'} · ${a.minutes >= 100 ? Math.round(a.minutes / 60 * 10) / 10 + ' hours' : a.minutes + ' minutes'}</div>
      ${hints.map(h => `<div class="hint">${h}</div>`).join('')}</div>
    ${over ? result(a) : `<div class="guessbox"><input id="q" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type an album or artist…" enterkeyhint="go"><div class="sugg" id="sugg" hidden></div></div>`}
    <div class="rows">${rows}</div>
    <div class="legend"><span>year</span><span>artist</span><span>country</span><span>genre</span><span>RYM rank</span></div>
    <div class="foot">${mode === 'daily' ? `<button class="linkbtn" id="practice">Play a practice game</button>` : `<button class="linkbtn" id="daily">Back to today's album</button>`}<br>The 200 albums are RateYourMusic's all-time top 200 · nothing leaves this phone · v${APP_VERSION}</div>`;
  if (!over) wireInput(a);
  const p = $('#practice'); if (p) p.onclick = () => { mode = 'practice'; G = load('albumle.practice', null); if (!G || G.done) G = newPractice(); save(); render(); };
  const d = $('#daily'); if (d) d.onclick = () => { mode = 'daily'; G = newDaily(); save(); render(); };
  const sh = $('#share'); if (sh) sh.onclick = share;
  const ag = $('#again'); if (ag) ag.onclick = () => { mode = 'practice'; G = newPractice(); store('albumle.lastPractice', G.idx); save(); render(); };
  const st = $('#seeStats'); if (st) st.onclick = stats;
}
function result(a) {
  const won = G.done === 'won', n = G.guesses.length;
  return `<div class="result"><div class="sub">${won ? ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'][n - 1] : 'Not this time'}</div>
    <h2>${esc(a.title)}</h2><div class="by">${esc(a.artist)} · ${a.year} · ${flag(a.country)} ${esc(cname(a.country))}</div>
    <div class="meta">#${a.rank} on RateYourMusic · ${a.genres.map(esc).join(' · ')}</div>
    <button class="btn" id="share">Share</button>${mode === 'daily' ? `<button class="btn ghost" id="seeStats">Stats</button>` : `<button class="btn ghost" id="again">Another one</button>`}
    ${mode === 'daily' ? `<div class="next" id="next"></div>` : ''}</div>`;
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
  const lines = G.guesses.map(gi => { const f = compare(A[gi], a); return ['year', 'artist', 'country', 'genre', 'rank'].map(k => SQ[f[k].cls]).join(''); });
  return `${mode === 'daily' ? `Albumle #${G.day + 1}` : 'Albumle practice'} ${won ? G.guesses.length : 'X'}/${MAX}\n${lines.join('\n')}\nhttps://latin.musicalmagic.uk/albumle/`;
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
    <p>Guess the album in ${MAX} tries. Every day the album is one of the <b>200 best albums of all time</b> as rated on RateYourMusic.</p>
    <p>You see its <b>genres</b> (purple) and the words listeners use to describe it, plus how many tracks it has and how long it is. Type any album or artist from the 200 and pick it from the list.</p>
    <p>Each guess tells you how close you are:</p>
    <div class="cells"><div class="cell y">1994 ▲<small>later</small></div><div class="cell n">✗<small>artist</small></div><div class="cell g">🇬🇧<small>same country</small></div><div class="cell y">1<small>shared genre</small></div><div class="cell n">#44 ▼<small>ranks lower</small></div></div>
    <p><b>Year</b>: ▲ means the answer came out later, ▼ earlier; yellow is within three years. <b>Artist</b> and <b>country</b> turn green when they match. <b>Genre</b> counts the genres you share, green when the main genre is the same. <b>Rank</b>: ▲ means the answer sits higher up the chart (nearer #1), ▼ lower; yellow is within ten places.</p>
    <p>After three misses you get the artist's initial; after five, the title's. Share your squares when you are done, and play practice games as often as you like.</p>`);
}
function sheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2200); }
function tickNext() {
  const el = $('#next'); if (!el) return;
  const ms = EPOCH + (dayNo() + 1) * 864e5 - Date.now(), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
  el.textContent = `Next album in ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (ms < 1000) { G = newDaily(); render(); }
}
function main() {
  G = newDaily(); save(); render();
  $('#helpBtn').onclick = help; $('#statsBtn').onclick = stats;
  $('#closeSheet').onclick = () => { $('#sheet').hidden = true; }; $('#sheet').onclick = e => { if (e.target === $('#sheet')) $('#sheet').hidden = true; };
  if (!load('albumle.seen', false)) { help(); store('albumle.seen', true); }
  setInterval(tickNext, 1000);
}
main();
