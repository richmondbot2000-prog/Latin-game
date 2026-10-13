'use strict';

/* ---------- Jamie's Hammer: a runner. Signs show a Latin word with a right or wrong meaning.
   Tap to smash the wrong ones; let the right ones pass. Get it wrong and the evil guy comes out. ---------- */
const Hammer = (() => {
  const LIVES = 3;
  let S = null, ui = null, user = null, saveKey = '';
  let cv, ctx, W = 0, H = 0, stage = null, raf = 0, last = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function newGame() {
    S = { t: 0, dist: 0, speed: .22, score: 0, lives: LIVES, signs: [], bits: [], phase: 'ready', nextSign: 2.2, lastWord: null,
      swing: -1, hitDone: false, ouch: -1, villain: -1, invuln: 0, right: 0, wrong: 0, flashRed: 0, clouds: [...Array(5)].map(() => ({ x: Math.random(), y: rnd(.08, .32), s: rnd(.08, .16), v: rnd(.01, .02) })) };
  }

  /* ---------- words on signs ---------- */
  function makeSign() {
    const words = activeWords(user), p = getProg(user);
    let total = 0; const wts = words.map(w => { const t = 6 - ((p[w.id] && p[w.id].s) || 0); total += t; return t; });
    let r = Math.random() * total, w = words[words.length - 1];
    for (let i = 0; i < words.length; i++) { r -= wts[i]; if (r <= 0) { w = words[i]; break; } }
    if (w === S.lastWord && words.length > 1) return makeSign();
    S.lastWord = w;
    const correct = Math.random() < .5;
    const ds = distractors(w, words);
    const shown = correct ? w.english : ds[Math.floor(Math.random() * ds.length)].english;
    S.signs.push({ w, shown, correct, x: 1.15, state: 'up', wob: 0 });
  }

  /* ---------- update ---------- */
  function update(dt) {
    S.t += dt;
    if (S.phase !== 'play') return;
    const slow = S.ouch > 0 ? .35 : 1;
    S.speed = Math.min(.5, S.speed + .0035 * dt);
    const v = S.speed * slow;
    S.dist += v * dt;
    for (const c of S.clouds) { c.x -= c.v * dt; if (c.x < -.2) { c.x = 1.2; c.y = rnd(.08, .32); } }
    if (S.invuln > 0) S.invuln -= dt; if (S.flashRed > 0) S.flashRed -= dt;
    if (S.ouch > 0) S.ouch -= dt; if (S.villain > 0) S.villain -= dt;
    // signs
    S.nextSign -= dt;
    const gap = Math.max(1.5, 3.2 - S.t * .02);
    const lastX = S.signs.length ? Math.max(...S.signs.map(s => s.x)) : -1;
    if (S.nextSign <= 0 && lastX < .62) { makeSign(); S.nextSign = gap; }
    const CX = .28;
    for (const s of S.signs) {
      s.x -= v * dt; s.wob += dt;
      if (s.state === 'up' && s.x < CX - .09) {
        // it got past Jamie
        s.state = 'passed';
        if (s.correct) { S.score += 10; S.right++; recordAnswer(user, s.w, true); S.bits.push({ kind: 'tick', x: s.x, t: 0 }); }
        else { S.wrong++; recordAnswer(user, s.w, false); hurt(`“${s.w.word}” doesn’t mean “${s.shown}” — you let it past!`); }
      }
    }
    S.signs = S.signs.filter(s => s.x > -.4);
    // hammer swing: impact a moment after the tap
    if (S.swing >= 0) {
      S.swing += dt;
      if (!S.hitDone && S.swing >= .14) {
        S.hitDone = true;
        const target = S.signs.find(s => s.state === 'up' && s.x > CX - .07 && s.x < CX + .22);
        if (target) {
          target.state = 'smashed'; target.smashT = 0;
          for (let i = 0; i < 9; i++) S.bits.push({ kind: 'plank', x: target.x, y: .55, vx: rnd(-.25, .35), vy: rnd(-.9, -.3), r: rnd(0, 6), t: 0 });
          if (!target.correct) { S.score += 25; S.right++; recordAnswer(user, target.w, true); S.bits.push({ kind: 'pop', x: target.x, t: 0, text: '+25' }); }
          else { S.wrong++; recordAnswer(user, target.w, false); hurt(`“${target.w.word}” really does mean “${target.shown}” — don’t smash the right ones!`); }
        }
      }
      if (S.swing > .4) S.swing = -1;
    }
    for (const b of S.bits) { b.t += dt; if (b.kind === 'plank') { b.x += b.vx * dt; b.vy += 2.2 * dt; b.y += b.vy * dt; b.r += 3 * dt; } }
    S.bits = S.bits.filter(b => b.t < (b.kind === 'plank' ? 1.2 : .9));
    for (const s of S.signs) if (s.state === 'smashed') s.smashT += dt;
    S.signs = S.signs.filter(s => !(s.state === 'smashed' && s.smashT > .1));
    refreshUI();
  }
  function hurt(why) {
    if (S.invuln > 0) return;
    S.lives--; S.invuln = 2; S.ouch = .9; S.villain = 1.3; S.flashRed = .4;
    ui.why.textContent = why; ui.why.classList.remove('show'); void ui.why.offsetWidth; ui.why.classList.add('show');
    if (S.lives <= 0) { S.phase = 'over'; setTimeout(gameOver, 900); }
  }
  function gameOver() {
    const sv = store.get(saveKey, { best: 0 });
    const best = Math.max(sv.best || 0, S.score); const isBest = S.score > (sv.best || 0);
    store.set(saveKey, { ...sv, best, plays: (sv.plays || 0) + 1 });
    showOverlay(`${isBest ? '🏆 New best score!' : 'Ouch!'}`, `Score ${S.score} · best ${best}<br>${S.right} right, ${S.wrong} wrong`, 'Run again', () => { newGame(); start(); });
    if (isBest) Celebrate(innerWidth / 2, innerHeight / 3, 2);
  }
  function tap() {
    if (!S || S.phase !== 'play' || S.swing >= 0) return;
    S.swing = 0; S.hitDone = false;
  }

  /* ---------- drawing (stand-in art until the real set arrives) ---------- */
  function drawBackground() {
    const g = ctx;
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8FD3FF'); sky.addColorStop(.7, '#DFF4FF'); sky.addColorStop(.72, '#7DBE50'); sky.addColorStop(1, '#5E9E3A');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // distant hills, scrolling slowly
    g.fillStyle = '#A9D98A';
    g.beginPath(); g.moveTo(0, H * .72);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, H * .62 + Math.sin((x + S.dist * W * .25) / 90) * H * .04 + Math.sin((x + S.dist * W * .25) / 37) * H * .015);
    g.lineTo(W, H * .72); g.closePath(); g.fill();
    // clouds
    g.fillStyle = 'rgba(255,255,255,.9)';
    for (const c of S.clouds) { const x = c.x * W, y = c.y * H, s = c.s * W; g.beginPath(); g.ellipse(x, y, s, s * .45, 0, 0, 7); g.ellipse(x - s * .5, y + s * .1, s * .55, s * .35, 0, 0, 7); g.ellipse(x + s * .5, y + s * .12, s * .5, s * .32, 0, 0, 7); g.fill(); }
    // ground stripes
    const off = (S.dist * W) % (W * .12);
    g.fillStyle = 'rgba(0,0,0,.07)';
    for (let x = -off; x < W; x += W * .12) g.fillRect(x, H * .72, W * .06, H * .28);
    g.fillStyle = '#4C8A2E'; g.fillRect(0, H * .72, W, H * .012);
  }
  function drawJamie() {
    const g = ctx, x = W * .28, ground = H * .72, s = H * .32;
    const run = S.phase === 'play' ? Math.sin(S.t * 14) : 0, bob = Math.abs(run) * s * .06;
    const stumble = S.ouch > 0 ? Math.sin(S.ouch * 12) * .18 : 0;
    g.save(); g.translate(x, ground - bob); g.rotate(stumble);
    if (S.invuln > 0 && Math.floor(S.t * 12) % 2) g.globalAlpha = .45;
    // legs
    g.strokeStyle = '#2B1A3A'; g.lineWidth = s * .09; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s * .06, -s * .32); g.lineTo(-s * .06 + run * s * .18, 0); g.stroke();
    g.beginPath(); g.moveTo(s * .06, -s * .32); g.lineTo(s * .06 - run * s * .18, 0); g.stroke();
    // body
    g.fillStyle = '#E8A0B4'; rr(g, -s * .18, -s * .72, s * .36, s * .44, s * .1); g.fill();
    // head
    g.fillStyle = '#F6C8A0'; g.beginPath(); g.arc(0, -s * .9, s * .19, 0, 7); g.fill();
    g.fillStyle = '#5A3A1E'; g.beginPath(); g.arc(0, -s * .98, s * .19, Math.PI, 0); g.fill();   // hair
    g.fillStyle = '#222'; g.beginPath(); g.arc(s * .07, -s * .9, s * .025, 0, 7); g.fill();
    g.strokeStyle = '#8E2F4A'; g.lineWidth = s * .02; g.beginPath(); g.arc(s * .05, -s * .86, s * .06, .2, Math.PI - .4); g.stroke();  // smile
    // arm + hammer
    const swingA = S.swing >= 0 ? (S.swing < .14 ? -1.6 + S.swing / .14 * 2.4 : .8 - (S.swing - .14) / .26 * 2.4) : -1.2 + Math.sin(S.t * 14) * .08;
    g.save(); g.translate(s * .16, -s * .6); g.rotate(swingA);
    g.strokeStyle = '#F6C8A0'; g.lineWidth = s * .08; g.beginPath(); g.moveTo(0, 0); g.lineTo(s * .3, 0); g.stroke();
    g.fillStyle = '#8B5E34'; rr(g, s * .28, -s * .03, s * .34, s * .06, s * .02); g.fill();            // handle
    g.fillStyle = '#6B6B7E'; rr(g, s * .55, -s * .14, s * .18, s * .28, s * .04); g.fill();            // head
    g.fillStyle = '#9A9AAE'; rr(g, s * .57, -s * .12, s * .06, s * .24, s * .02); g.fill();
    g.restore();
    g.restore();
  }
  function drawVillain() {
    if (S.villain <= 0) return;
    const g = ctx, p = 1 - S.villain / 1.3, ground = H * .72, s = H * .34;
    const x = W * .28 + W * .22 - Math.sin(Math.min(1, p * 3) * Math.PI / 2) * W * .12;   // leaps in, then backs off
    g.save(); g.translate(x, ground);
    g.fillStyle = '#7B3FB5'; g.beginPath(); g.ellipse(0, -s * .4, s * .3, s * .42, 0, 0, 7); g.fill();
    for (let i = 0; i < 6; i++) { const a = -2.6 + i * .5; g.beginPath(); g.moveTo(Math.cos(a) * s * .25, -s * .4 + Math.sin(a) * s * .36); g.lineTo(Math.cos(a) * s * .42, -s * .4 + Math.sin(a) * s * .58); g.lineTo(Math.cos(a + .25) * s * .25, -s * .4 + Math.sin(a + .25) * s * .36); g.fill(); }
    g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(-s * .12, -s * .5, s * .06, 0, 7); g.arc(s * .02, -s * .5, s * .06, 0, 7); g.fill();
    g.fillStyle = '#222'; g.beginPath(); g.arc(-s * .14, -s * .5, s * .03, 0, 7); g.arc(0, -s * .5, s * .03, 0, 7); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = s * .03; g.beginPath(); g.moveTo(-s * .2, -s * .6); g.lineTo(-s * .06, -s * .55); g.moveTo(s * .1, -s * .55); g.lineTo(-s * .02, -s * .6); g.stroke();   // angry brows
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-s * .14, -s * .3); for (let i = 0; i < 5; i++) { g.lineTo(-s * .14 + i * s * .06 + s * .03, -s * .22); g.lineTo(-s * .14 + (i + 1) * s * .06, -s * .3); } g.fill();   // teeth
    // club
    g.save(); g.translate(-s * .2, -s * .5); g.rotate(p < .4 ? -1.2 + p * 5 : .8 - (p - .4) * 1.5);
    g.fillStyle = '#5A3A1E'; rr(g, -s * .04, -s * .4, s * .08, s * .42, s * .03); g.fill(); g.fillStyle = '#4A2A12'; g.beginPath(); g.arc(0, -s * .42, s * .1, 0, 7); g.fill(); g.restore();
    g.restore();
  }
  function wrap(g, text, maxW, size) {
    g.font = `600 ${size}px system-ui, sans-serif`;
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  function drawSign(s) {
    const g = ctx, x = s.x * W, ground = H * .72, sw = Math.min(W * .25, H * .62), sh = sw * .62;
    g.save(); g.translate(x, ground);
    if (s.state === 'smashed') { g.restore(); return; }
    g.fillStyle = '#6B4423'; g.fillRect(-sw * .04, -sh * 1.05, sw * .08, sh * 1.05);                    // post
    g.fillStyle = s.state === 'passed' && s.correct ? '#C9E6A4' : '#E8C27A'; g.strokeStyle = '#6B4423'; g.lineWidth = sw * .025;
    rr(g, -sw / 2, -sh * 1.95, sw, sh, sw * .05); g.fill(); g.stroke();
    g.fillStyle = '#2B1A3A'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lat = Math.round(sw * .17);
    g.font = `700 ${lat}px Georgia, serif`;
    let w0 = s.w.word, f = lat; while (g.measureText(w0).width > sw * .9 && f > 10) { f--; g.font = `700 ${f}px Georgia, serif`; }
    g.fillText(w0, 0, -sh * 1.95 + sh * .3);
    g.fillStyle = '#6B4423'; g.fillRect(-sw * .4, -sh * 1.95 + sh * .5, sw * .8, 1.5);
    const lines = wrap(g, s.shown, sw * .9, Math.round(sw * .11));
    lines.slice(0, 2).forEach((ln, i) => g.fillText(ln, 0, -sh * 1.95 + sh * .68 + i * sw * .12));
    g.restore();
  }
  function draw() {
    drawBackground();
    for (const s of S.signs) drawSign(s);
    drawVillain();
    drawJamie();
    for (const b of S.bits) {
      if (b.kind === 'plank') { ctx.save(); ctx.translate(b.x * W, b.y * H); ctx.rotate(b.r); ctx.globalAlpha = 1 - b.t / 1.2; ctx.fillStyle = '#E8C27A'; ctx.fillRect(-W * .03, -H * .012, W * .06, H * .024); ctx.restore(); }
      else if (b.kind === 'pop') { ctx.globalAlpha = 1 - b.t; ctx.fillStyle = '#2E7D4F'; ctx.font = `800 ${H * .08}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(b.text, b.x * W, H * .3 - b.t * H * .15); ctx.globalAlpha = 1; }
      else if (b.kind === 'tick') { ctx.globalAlpha = 1 - b.t; ctx.fillStyle = '#2E7D4F'; ctx.font = `800 ${H * .09}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✓', b.x * W, H * .3 - b.t * H * .1); ctx.globalAlpha = 1; }
    }
    if (S.flashRed > 0) { ctx.fillStyle = `rgba(255,40,40,${S.flashRed * .6})`; ctx.fillRect(0, 0, W, H); }
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }

  /* ---------- DOM ---------- */
  function refreshUI() {
    ui.score.textContent = S.score;
    ui.lives.textContent = '❤️'.repeat(Math.max(0, S.lives)) + '🖤'.repeat(Math.max(0, LIVES - S.lives));
  }
  function showOverlay(title, sub, btn, fn) {
    ui.overlay.hidden = false;
    ui.overlay.innerHTML = `<div class="ovbox"><h3>${title}</h3><p>${sub}</p><button class="btn ovbtn" id="hvBtn">${btn}</button></div>`;
    ui.overlay.querySelector('#hvBtn').onclick = () => { ui.overlay.hidden = true; fn(); };
  }
  function start() { S.phase = 'play'; refreshUI(); }
  function layout() {
    if (!stage) return;
    const rot = innerHeight > innerWidth;
    stage.classList.toggle('rot', rot);
    stage.style.width = (rot ? innerHeight : innerWidth) + 'px';
    stage.style.height = (rot ? innerWidth : innerHeight) + 'px';
    const box = ui.box;
    W = box.clientWidth; H = box.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
    if (document.hidden || !S) return;
    update(dt); draw();
  }
  function mount(root, u, opts = {}) {
    user = u; saveKey = 'latin.hammer.' + u.id; stage = root;
    const sv = store.get(saveKey, { best: 0 });
    root.className = 'pstage hstage';
    root.innerHTML = `
      <div class="ptop">
        <button class="iconbtn" id="hhome">← Home</button>
        <span class="plev">Jamie's Hammer</span>
        <span class="ptag">${esc(opts.tag || '')}</span>
        <span class="hlives" id="hlives"></span>
        <div class="pcash"><span class="lbl">score</span><b id="hscore">0</b></div>
      </div>
      <div class="hbox" id="hbox"><canvas id="hcv"></canvas><div class="hwhy" id="hwhy"></div><div class="overlay" id="hover" hidden></div></div>
      <div class="hbar"><span class="small">Tap anywhere to swing. Smash the <b>wrong</b> meanings, let the <b>right</b> ones run past.</span><span class="small">Best ${sv.best || 0}</span></div>`;
    ui = { box: root.querySelector('#hbox'), overlay: root.querySelector('#hover'), score: root.querySelector('#hscore'), lives: root.querySelector('#hlives'), why: root.querySelector('#hwhy') };
    cv = root.querySelector('#hcv'); ctx = cv.getContext('2d');
    document.body.classList.add('noscroll');
    root.querySelector('#hhome').onclick = () => { if (opts.home) opts.home(); };
    newGame(); layout(); refreshUI();
    cv.addEventListener('pointerdown', e => { e.preventDefault(); tap(); });
    addEventListener('resize', layout);
    const keys = e => { if (e.code === 'Space' || e.key === 'ArrowUp') tap(); }; document.addEventListener('keydown', keys); ui.keys = keys;
    showOverlay("Jamie's Hammer", 'Signs come running at you with a Latin word and a meaning. If the meaning is <b>wrong</b>, tap to smash it with the hammer. If it’s <b>right</b>, let it go by. Get it wrong and the evil guy comes out!', "Let's run!", start);
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    removeEventListener('resize', layout);
    if (ui && ui.keys) document.removeEventListener('keydown', ui.keys);
    document.body.classList.remove('noscroll');
    S = null; ui = null; stage = null;
  }
  const step = secs => { for (let t = 0; t < secs; t += 1 / 60) update(1 / 60); };
  return { mount, unmount, debug: { step, state: () => S, tap, makeSign } };
})();
