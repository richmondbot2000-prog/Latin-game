/* Albumle prototype — the owner's son's design (17 Nov 2026).
   Every album carries its RateYourMusic page: year, chart rank, all its genres, its descriptors, its language, band or solo.
   A guess shows ONLY what it shares with the answer — the common genres, the common descriptors, the language and the
   kind of act if they match — and the year and rank as earlier / later, higher / lower. Everything shared piles up in
   the panel at the top, which therefore only ever says things that are true of the answer.
   Same daily album and practice games as the main game; progress is kept apart under albumle.proto.* */
const APP_VERSION = 'p3';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const A = ALBUMS.map(([rank, title, artist, year, country, genres, descriptors, type, lang, rating, date], i) => ({ i, rank, title, artist, year, country, genres, descriptors, type, kind: type === 'S' ? 'S' : 'B', lang, rating, date }));
// no limit on guesses (the son's rule): you keep going until the album is found
const DAY0 = new Date(2026, 10, 17, 9);
const dayStart = (now = new Date()) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9); if (now < d) d.setDate(d.getDate() - 1); return d; };
const dayNo = () => Math.max(0, Math.round((dayStart() - DAY0) / 864e5));
const SITE = 'https://albumle.net';
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const shuffle = (list, seed) => { const r = mulberry(seed), a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ORDER = (() => { const first = A.find(x => x.title === 'Selected Ambient Works 85-92') || A[0]; return [first.i, ...shuffle(A.filter(x => x !== first).map(x => x.i), 20261118)]; })();
const dailyIndex = d => ORDER[((d % A.length) + A.length) % A.length];
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const flag = c => (COUNTRY[c] || ['🏳️', c])[0], cname = c => (COUNTRY[c] || ['', c])[1];
const kindName = k => k === 'B' ? 'Band' : 'Solo artist';

let mode = 'daily', G;
function newDaily() { const d = dayNo(); const s = load('albumle.proto.daily', null); if (s && s.day === d) return s; return { day: d, idx: dailyIndex(d), guesses: [], done: null }; }
function newPractice() { const r = mulberry(Date.now() & 0xffffffff); let idx = Math.floor(r() * A.length); if (idx === load('albumle.proto.last', -1)) idx = (idx + 1) % A.length; return { day: null, idx, guesses: [], done: null }; }
function save() { store(mode === 'daily' ? 'albumle.proto.daily' : 'albumle.proto.practice', G); }

/* ---------- what a guess shares with the answer ---------- */
const shared = (x, y) => x.filter(v => y.includes(v));
function compare(g, a) {
  const dy = a.year - g.year, dr = a.rank - g.rank, dv = +(a.rating - g.rating).toFixed(2);
  return {
    rating: { cls: dv === 0 ? 'g' : 'n', text: g.rating.toFixed(2), sub: dv === 0 ? 'same rating' : dv > 0 ? 'rated higher' : 'rated lower', arrow: dv === 0 ? '' : dv > 0 ? '▲' : '▼' },
    year: { cls: dy === 0 ? 'g' : 'n', text: `${g.year}`, sub: dy === 0 ? 'same year' : dy > 0 ? 'later than this' : 'earlier than this', arrow: dy === 0 ? '' : dy > 0 ? '▲' : '▼' },
    rank: { cls: dr === 0 ? 'g' : 'n', text: `#${g.rank}`, sub: dr === 0 ? 'the one' : dr < 0 ? 'higher up the chart' : 'lower down the chart', arrow: dr === 0 ? '' : dr < 0 ? '▲' : '▼' },
    kind: g.kind === a.kind ? kindName(g.kind) : null,
    lang: g.lang === a.lang ? g.lang : null,
    country: g.country === a.country ? g.country : null,
    genres: shared(g.genres, a.genres),
    descriptors: shared(g.descriptors, a.descriptors),
  };
}
// everything the guesses so far have established about the answer
function deduce(a) {
  const k = { ylo: -Infinity, yhi: Infinity, rlo: -Infinity, rhi: Infinity, vlo: -Infinity, vhi: Infinity, kind: null, lang: null, country: null, genres: [], descriptors: [], notGenres: [], notDesc: [] };
  for (const gi of G.guesses) {
    const g = A[gi], f = compare(g, a);
    if (a.year === g.year) k.ylo = k.yhi = g.year; else if (a.year > g.year) k.ylo = Math.max(k.ylo, g.year + 1); else k.yhi = Math.min(k.yhi, g.year - 1);
    if (a.rank === g.rank) k.rlo = k.rhi = g.rank; else if (a.rank > g.rank) k.rlo = Math.max(k.rlo, g.rank + 1); else k.rhi = Math.min(k.rhi, g.rank - 1);
    if (a.rating === g.rating) k.vlo = k.vhi = g.rating; else if (a.rating > g.rating) k.vlo = Math.max(k.vlo, g.rating); else k.vhi = Math.min(k.vhi, g.rating);
    if (f.kind) k.kind = f.kind; if (f.lang) k.lang = f.lang; if (f.country) k.country = f.country;
    for (const x of f.genres) if (!k.genres.includes(x)) k.genres.push(x);
    for (const x of f.descriptors) if (!k.descriptors.includes(x)) k.descriptors.push(x);
    for (const x of g.genres) if (!a.genres.includes(x) && !k.notGenres.includes(x)) k.notGenres.push(x);
    for (const x of g.descriptors) if (!a.descriptors.includes(x) && !k.notDesc.includes(x)) k.notDesc.push(x);
  }
  return k;
}
const span = (lo, hi, fmt) => lo === hi ? fmt(lo) : isFinite(lo) && isFinite(hi) ? `${fmt(lo)} – ${fmt(hi)}` : isFinite(lo) ? `${fmt(lo)} or later` : isFinite(hi) ? `${fmt(hi)} or earlier` : '?';
const rspan = (lo, hi) => lo === hi ? '#' + lo : isFinite(lo) && isFinite(hi) ? `#${lo} – #${hi}` : isFinite(lo) ? `#${lo} or lower` : isFinite(hi) ? `#${hi} or higher` : '?';
const vspan = (lo, hi) => lo === hi ? lo.toFixed(2) : isFinite(lo) && isFinite(hi) ? `between ${lo.toFixed(2)} and ${hi.toFixed(2)}` : isFinite(lo) ? `above ${lo.toFixed(2)}` : isFinite(hi) ? `below ${hi.toFixed(2)}` : '?';
const chips = (list, cls, fresh = []) => list.map(x => `<span class="chip ${cls}${fresh.includes(x) ? ' new' : ''}">${esc(x)}</span>`).join('');

/* ---------- the page ---------- */
function render() {
  const a = A[G.idx], n = G.guesses.length, over = !!G.done, k = deduce(a);
  const hints = [];
  if (n >= 3 || over) hints.push(`The artist's name starts with <b>${esc(a.artist[0])}</b>`);
  if (n >= 5 || over) hints.push(`The title starts with <b>${esc(a.title[0])}</b>`);
  const last = n ? compare(A[G.guesses[n - 1]], a) : null;   // what the latest guess added is marked
  const fresh = last ? [...last.genres, ...last.descriptors] : [];
  const unk = `<span class="v unknown">?</span>`;
  const line = (key, val) => `<div class="line"><span class="k">${key}</span>${val}</div>`;
  const v = (text, cls) => `<span class="v ${cls}">${text}</span>`;
  const yearV = over ? v(esc(a.date), 'got') : k.ylo === k.yhi ? v(String(k.ylo), 'got') : isFinite(k.ylo) || isFinite(k.yhi) ? v(span(k.ylo, k.yhi, String), 'part') : unk;
  const rateV = over ? v(`<b>${a.rating.toFixed(2)}</b> / 5.0`, 'got') : k.vlo === k.vhi ? v(k.vlo.toFixed(2), 'got') : isFinite(k.vlo) || isFinite(k.vhi) ? v(vspan(k.vlo, k.vhi), 'part') : unk;
  const rankV = over ? v(`<b>#${a.rank}</b> overall`, 'got') : k.rlo === k.rhi ? v('#' + k.rlo, 'got') : isFinite(k.rlo) || isFinite(k.rhi) ? v(rspan(k.rlo, k.rhi), 'part') : unk;
  const genresV = over ? `<span class="v">${chips(a.genres, 'g')}</span>` : k.genres.length ? `<span class="v">${chips(k.genres, 'g', fresh)}</span>` : unk;
  const descV = over ? `<span class="v">${chips(a.descriptors, 'd')}</span>` : k.descriptors.length ? `<span class="v">${chips(k.descriptors, 'd', fresh)}</span>` : unk;
  const title = over ? esc(a.title) : n >= 5 ? `${esc(a.title[0])}… <span class="unknown">(mystery album)</span>` : 'Mystery album';
  const by = over ? `By <b>${esc(a.artist)}</b>` : n >= 3 ? `By <b>${esc(a.artist[0])}…</b>` : 'By <b>?</b>';
  const page = `<div class="page">
    <div class="cover" id="coverbox">?</div>
    <h2>${title}</h2><div class="by">${by}</div>
    ${line('Type', v('Album', ''))}
    ${line('Released', yearV)}
    ${line('RYM Rating', rateV)}
    ${line('Ranked', rankV)}
    ${line('Genres', genresV)}
    ${line('Descriptors', descV)}
    ${line('Language', over ? v(esc(a.lang), 'got') : k.lang ? v(esc(k.lang), 'got') : unk)}
    ${line('Act', over ? v(kindName(a.kind), 'got') : k.kind ? v(esc(k.kind), 'got') : unk)}
    ${!over && (k.notGenres.length || k.notDesc.length) ? `<details class="ruled"><summary>Not this album: ${k.notGenres.length + k.notDesc.length} ruled out</summary>${chips(k.notGenres, 'x')} ${chips(k.notDesc, 'x')}</details>` : ''}
    ${hints.map(h => `<div class="hint">${h}</div>`).join('')}
    ${over ? result(a) : ''}</div>`;
  const rows = G.guesses.slice().reverse().map(gi => {   // newest guess at the top, nearest the page
    const g = A[gi], f = compare(g, a), got = [...f.genres.map(x => ['g', x]), ...f.descriptors.map(x => ['d', x])];
    const extra = [f.lang, f.kind, f.country && (flag(f.country) + ' ' + cname(f.country))].filter(Boolean);
    return `<div class="row"><div class="who">${esc(g.title)} <span>— ${esc(g.artist)}</span></div>
      <div class="nums"><div class="num ${f.year.cls}">${f.year.text} ${f.year.arrow}<small>${f.year.sub}</small></div><div class="num ${f.rating.cls}">${f.rating.text} ${f.rating.arrow}<small>${f.rating.sub}</small></div><div class="num ${f.rank.cls}">${f.rank.text} ${f.rank.arrow}<small>${f.rank.sub}</small></div></div>
      <div class="common">${got.length || extra.length ? `<span class="k">In common</span>${extra.map(x => `<span class="chip d">${esc(x)}</span>`).join('')}${got.map(([c, x]) => `<span class="chip ${c}">${esc(x)}</span>`).join('')}` : '<span class="none">nothing in common</span>'}</div></div>`;
  }).join('');
  $('#app').innerHTML = `
    <div class="sub">${mode === 'daily' ? `Albumle #${G.day + 1}` : 'Practice'} · ${over ? `solved in ${n}` : n ? `${n} guess${n === 1 ? '' : 'es'} so far` : 'guess away'} · prototype</div>
    ${page}
    <div class="rows">${rows}</div>
    ${over ? '' : `<div class="guessbox"><input id="q" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type an album or artist…" enterkeyhint="go"><div class="sugg" id="sugg" hidden></div></div>`}
    <div class="foot">${mode === 'daily' ? `<button class="linkbtn" id="practice">Play a practice game</button>` : `<button class="linkbtn" id="daily">Back to today's album</button>`}<br><a href="../">The main game</a> · prototype ${APP_VERSION} · facts as on each album's RateYourMusic page</div>`;
  if (!over) wireInput(a); else showCover(a);
  const p = $('#practice'); if (p) p.onclick = () => { mode = 'practice'; G = load('albumle.proto.practice', null); if (!G || G.done) G = newPractice(); save(); render(); };
  const d = $('#daily'); if (d) d.onclick = () => { mode = 'daily'; G = newDaily(); save(); render(); };
  const sh = $('#share'); if (sh) sh.onclick = share;
  const ag = $('#again'); if (ag) ag.onclick = () => { mode = 'practice'; G = newPractice(); store('albumle.proto.last', G.idx); save(); render(); };
}
function result(a) {
  const n = G.guesses.length;
  return `<div class="result"><div class="sub">${n === 1 ? 'Genius!' : n <= 3 ? 'Magnificent!' : n <= 6 ? 'Splendid!' : n <= 10 ? 'Great!' : 'Got there!'} · solved in ${n}</div>
    <button class="btn" id="share">Share</button>${mode === 'daily' ? '' : `<button class="btn ghost" id="again">Another one</button>`}
    ${mode === 'daily' ? `<div class="next" id="next"></div>` : ''}</div>`;
}
async function showCover(a) {
  const box = $('#coverbox'); if (!box) return;
  try {
    const key = 'albumle.cover.' + a.i; let url = load(key, null);
    if (url === null) { const r = await fetch(`${SITE}/api/cover?title=${encodeURIComponent(a.title)}&artist=${encodeURIComponent(a.artist)}`); const j = await r.json(); url = j.url || ''; store(key, url); }
    if (!url || !$('#coverbox')) return;
    const img = new Image(); img.alt = `${a.title} — ${a.artist}`;
    img.onload = () => { const b = $('#coverbox'); if (b) { b.innerHTML = ''; b.appendChild(img); } };
    img.src = url;
  } catch (e) {}
}
function wireInput(a) {
  const q = $('#q'), box = $('#sugg'); let list = [];
  const show = () => {
    const t = fold(q.value); list = [];
    if (t.length >= 2) list = A.filter(x => !G.guesses.includes(x.i) && (fold(x.title).includes(t) || fold(x.artist).includes(t) || fold(x.title + ' ' + x.artist).includes(t))).slice(0, 5);
    box.hidden = !list.length;
    box.innerHTML = list.map(x => `<button data-i="${x.i}"><b>${esc(x.title)}</b><span>${esc(x.artist)} · ${x.year}</span></button>`).join('');
    box.querySelectorAll('button').forEach(b => { b.onclick = () => guess(+b.dataset.i); });
  };
  q.oninput = show;
  q.onfocus = () => setTimeout(() => q.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
  q.onkeydown = e => { if (e.key === 'Enter' && list.length) { e.preventDefault(); guess(list[0].i); } };
  q.focus();
}
function guess(i) {
  const a = A[G.idx];
  G.guesses.push(i);
  if (i === G.idx) G.done = 'won';
  if (mode === 'practice') store('albumle.proto.last', G.idx);
  save(); render();
  if (G.done) setTimeout(() => toast('🎉 ' + a.title), 300);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}
function shareText() {
  const a = A[G.idx];
  const lines = G.guesses.map(gi => { const f = compare(A[gi], a), c = f.genres.length + f.descriptors.length + (f.kind ? 1 : 0) + (f.lang ? 1 : 0); return `${f.year.cls === 'g' ? '🟩' : '🟥'}${f.rating.cls === 'g' ? '🟩' : '🟥'}${f.rank.cls === 'g' ? '🟩' : '🟥'} ${'🟨'.repeat(Math.min(c, 8))}${c > 8 ? '+' : ''} ${c} in common`; });
  return `Albumle${mode === 'daily' ? ` #${G.day + 1}` : ' practice'} · solved in ${G.guesses.length}\n${lines.join('\n')}\n${SITE}/proto/`;
}
async function share() {
  const text = shareText();
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } catch (e) { prompt('Copy your result', text); }
}
function help() {
  sheet(`<h2>How to play</h2>
    <p>This is a <b>prototype</b> of a new way to play. The album of the day is one of the ${A.length} best albums of all time on RateYourMusic, and the screen is the album's RateYourMusic page with everything hidden: the year, the RYM rating, its rank, all of its genres, its descriptors, its language, and whether it is a band or a solo artist.</p>
    <p>Each guess shows you <b>only what it has in common with the answer</b>. Guess <i>Unknown Pleasures</i> when the answer is <i>Remain in Light</i> and you learn that the answer is post-punk, male vocals, anxious, existential… and that it came out later, is rated higher and sits higher up the chart. Guess <i>Disintegration</i> next and you learn nothing new about the genre, but the year is now boxed in between the two.</p>
    <p>Everything you learn piles up in the panel at the top, and everything in it is true of the answer. The guesses that share nothing tell you something too: open <b>Ruled out</b> to see what the answer is not.</p>
    <p>As many guesses as you need. The artist's initial comes after three misses, the title's after five.</p>`);
}
function sheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; }
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2200); }
function tickNext() {
  const el = $('#next'); if (!el) return;
  const next = dayStart(); next.setDate(next.getDate() + 1); const ms = next - Date.now(), h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
  el.textContent = `Next album at 9am · in ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (ms < 1000 || load('albumle.proto.daily', G).day !== dayNo()) { G = newDaily(); save(); render(); }
}
function main() {
  G = newDaily(); save(); render();
  $('#helpBtn').onclick = help;
  $('#closeSheet').onclick = () => { $('#sheet').hidden = true; }; $('#sheet').onclick = e => { if (e.target === $('#sheet')) $('#sheet').hidden = true; };
  if (!load('albumle.proto.seen', false)) { help(); store('albumle.proto.seen', true); }
  setInterval(tickNext, 1000);
}
main();
