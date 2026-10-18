// Grade 5 theory: home page, practice rounds, results. Progress lives in localStorage only.
const APP_VERSION = 'g5-v4';
const KEY = 'grade5.progress';
const ROUND = 10;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function load() {
  let p; try { p = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  p = p || {};
  p.topics = p.topics || {}; p.items = p.items || {}; p.days = p.days || {};
  if (p.sound === undefined) p.sound = true;
  // progress from before the grades were added was Grade 5
  for (const k of Object.keys(p.topics)) if (!k.includes('.')) { p.topics['5.' + k] = p.topics[k]; delete p.topics[k]; p.grade = p.grade || 5; }
  p.grade = p.grade || 1;
  return p;
}
function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { } }
let prog = load();
Sound.on = prog.sound;

const today = () => new Date().toISOString().slice(0, 10);
function streak() {
  let n = 0; const d = new Date();
  if (!prog.days[today()]) d.setDate(d.getDate() - 1);
  while (prog.days[d.toISOString().slice(0, 10)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const topics = () => Theory.topicsFor(prog.grade);
function tstat(id, g = prog.grade) { return prog.topics[g + '.' + id] || { n: 0, r: 0, a: 0 }; }
function stars(s) { return s.n < 10 ? 0 : s.a >= .9 ? 3 : s.a >= .75 ? 2 : s.a >= .5 ? 1 : 0; }
function record(q, ok) {
  const s = tstat(q.topic);
  s.n++; if (ok) s.r++;
  s.a = s.a * .85 + (ok ? .15 : 0);
  prog.topics[prog.grade + '.' + q.topic] = s;
  if (q.item) {
    const it = prog.items[q.item] || { r: 0, w: 0 };
    ok ? it.r++ : (it.w++, it.r = Math.max(0, it.r - 2));
    it.last = ok ? 1 : 0; it.t = Date.now();
    prog.items[q.item] = it;
  }
  prog.days[today()] = (prog.days[today()] || 0) + 1;
  save(prog);
}
// mixed practice: weaker and newer topics come up more
function mixTopic() {
  const list = topics().map(t => { const s = tstat(t.id); return [t.id, s.n < 5 ? 1.5 : Math.max(.25, 1.2 - s.a)]; });
  let tot = list.reduce((a, b) => a + b[1], 0), r = Math.random() * tot;
  for (const [id, w] of list) if ((r -= w) < 0) return id;
  return list[0][0];
}

// ---------- home ----------
function home() {
  document.body.className = 'home';
  const st = streak();
  const total = Object.values(prog.topics).reduce((a, s) => a + s.n, 0);
  const gstars = g => Theory.topicsFor(g).reduce((a, t) => a + stars(tstat(t.id, g)), 0);
  $('#app').innerHTML = `
    <div class="grades" role="tablist" aria-label="Choose your grade">
      <span>Grade</span>
      ${[1, 2, 3, 4, 5].map(g => `<button role="tab" class="gr${g === prog.grade ? ' on' : ''}" data-g="${g}" aria-selected="${g === prog.grade}">${g}${gstars(g) ? '<i>★</i>' : ''}</button>`).join('')}
    </div>
    <header class="hero">
      <div class="clef">𝄞</div>
      <h1>Grade ${prog.grade} Theory</h1>
      <p>ABRSM music theory, one question at a time</p>
    </header>
    <div class="stats">
      <div><b>${st}</b><span>day${st === 1 ? '' : 's'} in a row</span></div>
      <div><b>${prog.days[today()] || 0}</b><span>today</span></div>
      <div><b>${total}</b><span>answered</span></div>
    </div>
    <a class="notes" href="../music/"><span>🎵</span> Learn the notes<small>cards, beasts, Jacques Hammer and Squishygeddon</small></a>
    <a class="big" href="#play/mix"><span>▶</span> Mixed practice<small>${ROUND} questions from everything</small></a>
    <h2>Topics</h2>
    <div class="topics">
      ${topics().map(t => {
        const s = tstat(t.id), k = stars(s);
        return `<a class="topic" href="#play/${t.id}">
          <span class="ti">${t.icon}</span>
          <span class="tn">${esc(t.name)}</span>
          <span class="bar"><i style="width:${Math.round(s.a * 100)}%"></i></span>
          <span class="st">${'★'.repeat(k)}<em>${'★'.repeat(3 - k)}</em></span>
        </a>`;
      }).join('')}
    </div>
    <footer>
      <button id="snd" class="pill">${prog.sound ? '🔊 Sound on' : '🔇 Sound off'}</button>
      <p>No sign-in. Your progress stays on this phone.</p>
      <p class="ver">${APP_VERSION}</p>
    </footer>`;
  document.querySelectorAll('.gr').forEach(b => b.onclick = () => { prog.grade = +b.dataset.g; save(prog); home(); });
  $('#snd').onclick = () => { prog.sound = Sound.on = !prog.sound; save(prog); if (Sound.on) Sound.play([[72], [76], [79]], .12); home(); };
}

// ---------- play ----------
let round = null;
function play(topic) {
  round = { topic, i: 0, right: 0, best: 0, run: 0, marks: [] };
  next();
}
function next() {
  if (round.i >= ROUND) return results();
  const tid = round.topic === 'mix' ? mixTopic() : round.topic;
  const q = Theory.make(tid, prog, prog.grade);
  round.q = q; round.done = false;
  const t = topics().find(x => x.id === q.topic);
  document.body.className = 'playing';
  $('#app').innerHTML = `
    <div class="top">
      <a class="back" href="#" aria-label="Home">←</a>
      <div class="dots">${Array.from({ length: ROUND }, (_, i) => `<i class="${i < round.i ? (round.marks[i] ? 'ok' : 'no') : i === round.i ? 'now' : ''}"></i>`).join('')}</div>
      <div class="run">${round.run >= 2 ? '🔥' + round.run : ''}</div>
    </div>
    <div class="qcard">
      <div class="tag">Grade ${prog.grade} · ${t.icon} ${esc(t.name)}</div>
      <h3>${esc(q.prompt)}</h3>
      ${q.stave ? '<div class="stave" id="qs"></div>' : ''}
      ${q.play || q.say ? '<button class="hear" id="hear">🔊 Hear it</button>' : ''}
    </div>
    <div class="opts ${q.options[0].stave ? 'grid' : ''}">
      ${q.options.map((o, i) => `<button class="opt" data-i="${i}">${o.stave ? `<div class="mini" id="o${i}"></div>` : esc(o.text)}</button>`).join('')}
    </div>
    <div id="fb"></div>`;
  if (q.stave) Stave.draw($('#qs'), q.stave);
  q.options.forEach((o, i) => o.stave && Stave.draw($('#o' + i), o.stave));
  const hear = $('#hear');
  if (hear) hear.onclick = () => { Sound.unlock(); q.say ? Sound.say(q.say.text, q.say.lang) : Sound.play(q.play, q.gap); };
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.i));
}
function answer(i) {
  const q = round.q;
  if (round.done) return;
  round.done = true;
  const ok = i === q.answer;
  record(q, ok);
  round.marks = round.marks || [];
  round.marks[round.i] = ok;
  if (ok) { round.right++; round.run++; round.best = Math.max(round.best, round.run); } else round.run = 0;
  const btns = document.querySelectorAll('.opt');
  btns.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); else b.classList.add('dim'); });
  Sound.blip(ok);
  setTimeout(() => { q.say ? Sound.say(q.say.text, q.say.lang) : Sound.play(q.play, q.gap); }, ok ? 350 : 500);
  const praise = ['Yes!', 'Right!', 'Spot on!', 'Brilliant!', 'Correct!'];
  round.i++;
  $('#fb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}">
      <b>${ok ? praise[Math.floor(Math.random() * praise.length)] : 'Not quite.'}</b>
      <p>${esc(q.explain)}</p>
      <button class="next" id="next">${round.i >= ROUND ? 'See how you did' : 'Next'} →</button>
    </div>`;
  $('#next').onclick = next;
  $('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function results() {
  const r = round.right;
  const k = r >= 10 ? 3 : r >= 8 ? 2 : r >= 6 ? 1 : 0;
  const t = round.topic === 'mix' ? { name: 'Mixed practice', icon: '▶' } : topics().find(x => x.id === round.topic);
  document.body.className = 'playing';
  $('#app').innerHTML = `
    <div class="result">
      <div class="tag">Grade ${prog.grade} · ${t.icon} ${esc(t.name)}</div>
      <div class="score">${r}<small>/ ${ROUND}</small></div>
      <div class="rstars">${'★'.repeat(k)}<em>${'★'.repeat(3 - k)}</em></div>
      <p>${r === 10 ? 'Perfect round!' : r >= 8 ? 'Excellent work.' : r >= 6 ? 'Good — keep going.' : 'Every round makes it stick. Try another!'}</p>
      ${round.best >= 3 ? `<p class="small">Best run: ${round.best} in a row</p>` : ''}
      <a class="big" href="#play/${round.topic}" id="again">Play again</a>
      <a class="pill" href="#">Home</a>
    </div>`;
  $('#again').onclick = e => { e.preventDefault(); play(round.topic); };
  if (k >= 2) Sound.play([[72], [76], [79], [84, 76, 79]], .14);
}

function route() {
  const h = location.hash.slice(1);
  if (h.startsWith('play/')) { const t = h.slice(5); if (t === 'mix' || topics().some(x => x.id === t)) return play(t); }
  home();
}
window.addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('sw.js');
