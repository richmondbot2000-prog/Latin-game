'use strict';

/* ---------- Practice: defend the garden from squishies; earn coins by matching words ----------
   Positions are in cells: squishies walk from x = COLS (right) towards x = 0 (left). */
const Practice = (() => {
  const ROWS = 6, COLS = 9;
  const START_MONEY = 150, MATCH_COINS = 25, FREEZE_SECS = 5;
  const GUNS = {
    shooter: { name: 'Shooter', cost: 100, every: 2, dmg: 20, speed: 7, recharge: 5, hp: 100, blurb: 'a bullet every 2 s' },
    mortar:  { name: 'Mortar', cost: 225, every: 7, dmg: 90, splash: 1.4, recharge: 12, hp: 100, blurb: 'big blast every 7 s' },
    mg:      { name: 'Machine gun', cost: 300, every: 1 / 3, dmg: 10, speed: 9, recharge: 12, hp: 100, blurb: '3 bullets a second' },
  };
  // the squishies (art in art/squishies, drawn facing left as supplied). size is relative to a cell;
  // 'from' is the first level they appear; look.hurt shows once they are below half health
  const SQUISHIES = {
    chomp:      { name: 'Chomp',      hp: 100, speed: .1, chomp: 25, size: 1.0,  from: 1, look: { ok: 'chomp1', hurt: 'chomp2' }, motion: 'waddle', color: '#b8d0a8' },
    skitter:    { name: 'Skitter',    hp: 60,  speed: .21, chomp: 25, size: .74,  from: 2, look: { ok: 'skitter1', hurt: 'skitter2' }, motion: 'hop', color: '#d49496' },
    chompking:  { name: 'ChompKing',  hp: 320, speed: .07, chomp: 35, size: 1.3,  from: 3, look: { ok: 'chompking1', hurt: 'chompking2' }, motion: 'stomp', color: '#9ec9c0' },
    antbun:     { name: 'Antbun',     hp: 200, speed: .13, chomp: 25, size: 1.05, from: 4, look: { ok: 'antbun1' }, motion: 'hop', rig: true, color: '#bda7cd' },
    kamikaze:   { name: 'Kamikaze',   hp: 90,  speed: .15, chomp: 0,  size: .92,  from: 5, look: { ok: 'kamikaze1', hurt: 'kamikaze2' }, motion: 'roll', color: '#ddb8a4', boom: true },
    ghost:      { name: 'Ghost',      hp: 80,  speed: .15, chomp: 25, size: 1.0,  from: 6, look: { ok: 'ghost1', hurt: 'ghost2' }, motion: 'float', color: '#a6a0aa', pass: 1, alpha: .88 },
    flying:     { name: 'Flyer',      hp: 70,  speed: .18, chomp: 0,  size: .9,   from: 7, look: { ok: 'flying1', hurt: 'flying2' }, motion: 'fly', color: '#b9bcc5', pass: 99, fly: true },
    moley:      { name: 'Mole King',  hp: 220, speed: .11, chomp: 30, size: .95,  from: 8, look: { ok: 'moley' }, motion: 'waddle', color: '#e0c888', digs: true, dig: .17 },
    broodqueen: { name: 'Brood Queen', hp: 900, speed: .05, chomp: 40, size: 1.4, from: 6, look: { ok: 'broodqueen1', hurt: 'broodqueen2' }, motion: 'stomp', color: '#c0acb6', boss: true, brood: 9 },
    ghostking:  { name: 'Ghost King', hp: 700, speed: .08, chomp: 35, size: 1.35, from: 9, look: { ok: 'ghostking' }, motion: 'float', color: '#aca9a2', boss: true, pass: 2, alpha: .88 },
  };
  // the Antbun is a rigged character: separate parts in a 320-wide box, positions from the artist's PSD
  const ANTBUN = {"parts": {"dead_leftarm": [65, 18, 88, 116], "dead_body": [0, 43, 242, 210], "dead_skull": [16, 91, 177, 127], "dead_arm": [155, 189, 46, 40], "dead_rightear": [153, 31, 167, 106], "hurt_leftear": [65, 20, 88, 116], "hurt_body": [0, 43, 243, 210], "hurt_righteyeclose": [98, 161, 31, 10], "hurt_righteyeopen": [98, 154, 30, 30], "hurt_arm": [165, 170, 48, 53], "hurt_rightear": [140, 31, 177, 131], "leftear": [68, 0, 132, 131], "body": [0, 55, 250, 198], "body2": [10, 87, 239, 179], "body3": [10, 87, 242, 176], "eyesopen": [31, 149, 98, 36], "rightear": [140, 31, 177, 131], "eyepopping": [96, 141, 58, 58], "eyesclose": [32, 155, 98, 15], "arm": [166, 171, 45, 52]}, "box": [320, 266], "death": {"w": 320, "h": 322, "body": [50, 95, 234, 187]}};
  const ANTBUN_PARTS = Object.keys(ANTBUN.parts);
  const SPRITES = {};   // art key -> Image
  function levelSpec(n) {
    const weights = {};
    for (const k in SQUISHIES) { const s = SQUISHIES[k]; if (s.boss || n < s.from) continue; weights[k] = k === 'chomp' ? 1 : .22 + .04 * (n - s.from); }
    const boss = n >= 9 ? (n % 2 ? 'ghostking' : 'broodqueen') : n >= 6 ? 'broodqueen' : null;
    // early levels use fewer rows, like the original's first lawns
    const rows = n === 1 ? [2, 3] : n === 2 ? [1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
    return { count: 16 + 5 * (n - 1), rows, grace: n === 1 ? 12 : 8, gap0: Math.max(4, 10 - n), gap1: Math.max(2.2, 6.5 - .45 * (n - 1)), weights, huge: n >= 2, boss };
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickWeighted = w => { let t = 0; for (const k in w) t += w[k]; let r = Math.random() * t; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return Object.keys(w)[0]; };

  let S = null;          // game state
  let ui = null;         // DOM pieces
  let raf = 0, last = 0;
  let user = null, saveKey = '';

  /* ---------- state ---------- */
  function newLevel(n) {
    const spec = levelSpec(n);
    // every level starts with the same purse, so matching words stays the way to get guns
    S = { level: n, spec, money: START_MONEY, t: 0, phase: 'ready',   // ready | play | won | lost
      grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
      gnomes: Array(ROWS).fill(true), gnomeRuns: [],
      squishies: [], bullets: [], shells: [], fx: [], floats: [],
      spawned: 0, nextSpawn: spec.grace, hugeDone: false, banner: null,
      sel: null, recharge: { shooter: 0, mortar: 0, mg: 0 }, lastRows: [], shake: 0 };
  }

  /* ---------- squishies ---------- */
  function spawn(type, row, opts = {}) {
    const k = SQUISHIES[type];
    if (row == null) {
      // avoid the two most recent rows so the pressure spreads out
      let rows = S.spec.rows.filter(r => !S.lastRows.includes(r));
      if (rows.length < 2) rows = S.spec.rows;
      row = rows[Math.floor(Math.random() * rows.length)];
      S.lastRows.push(row); if (S.lastRows.length > 2) S.lastRows.shift();
    }
    const x = opts.x != null ? opts.x : COLS + .4 + Math.random() * .3;
    const sq = { type, k, row, x, hp: k.hp, phase: Math.random() * 7, blink: 2 + Math.random() * 3,
      eating: null, flash: 0, wob: 0, pass: k.pass || 0, passedCol: -1, brood: k.brood || 0, rise: 0,
      under: !!k.digs, target: 2.5 + Math.random() * 3.5 };   // the Mole King drills underground until he reaches his target column
    S.squishies.push(sq);
    if (!opts.extra) S.spawned++;
    return sq;
  }
  function hurt(sq, dmg) {
    if (sq.helmet > 0) { sq.helmet -= dmg; if (sq.helmet < 0) { sq.hp += sq.helmet; sq.helmet = 0; S.fx.push({ kind: 'pot', x: sq.x, row: sq.row, t: 0 }); } }
    else sq.hp -= dmg;
    sq.flash = .12;
    if (sq.hp <= 0 && !sq.dead) {
      sq.dead = true;
      S.fx.push({ kind: 'splat', x: sq.x, row: sq.row, t: 0, color: sq.k.color, size: sq.k.size });
      if (sq.k.rig) S.fx.push({ kind: 'abdeath', x: sq.x, row: sq.row, t: 0, size: sq.k.size });
      else S.fx.push({ kind: 'melt', x: sq.x, row: sq.row, t: 0, art: lookOf(sq), size: sq.k.size, fly: !!sq.k.fly });
    }
  }

  /* ---------- update ---------- */
  function update(dt) {
    S.t += dt;
    if (S.phase !== 'play') return;
    for (const k in S.recharge) S.recharge[k] = Math.max(0, S.recharge[k] - dt);
    if (S.shake > 0) S.shake -= dt;

    // spawning
    const sp = S.spec;
    // level 1 waits for the first gun, like the original's first lawn
    const anyGun = S.grid.some(row => row.some(Boolean));
    if (S.spawned < sp.count && (S.level > 1 || anyGun || S.spawned > 0)) {
      S.nextSpawn -= dt;
      const hugeAt = Math.floor(sp.count * .7);
      if (sp.huge && !S.hugeDone && S.spawned >= hugeAt) {
        S.hugeDone = true;
        S.banner = { text: 'A huge wave of squishies is coming!', t: 2.4 };
        S.nextSpawn = 2.4;
        S.hugeLeft = Math.min(sp.count - S.spawned, 4 + Math.floor(S.level / 2));
      }
      if (S.nextSpawn <= 0) {
        if (S.hugeLeft > 0) {
          if (sp.boss && !S.bossDone) { S.bossDone = true; spawn(sp.boss); } else spawn(pickWeighted(sp.weights));
          S.hugeLeft--; S.nextSpawn = .45; if (!S.hugeLeft) S.banner = { text: 'Final wave!', t: 1.6 };
        }
        else {
          spawn(pickWeighted(sp.weights));
          const p = S.spawned / sp.count;
          S.nextSpawn = sp.gap0 + (sp.gap1 - sp.gap0) * p;
        }
      }
    }
    if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }

    // squishies move / chomp
    for (const sq of S.squishies) {
      sq.wob += dt; if (sq.flash > 0) sq.flash -= dt; if (sq.rise > 0) sq.rise -= dt;
      if (sq.under) {                  // drilling: only a moving mound shows; bullets pass over, mortar blasts still hurt
        sq.x -= sq.k.dig * dt;
        sq.dirtT = (sq.dirtT || 0) - dt;
        if (sq.dirtT <= 0) { sq.dirtT = .28; S.fx.push({ kind: 'dirt', x: sq.x, row: sq.row, t: 0, small: true }); }
        if (sq.x <= sq.target) { sq.under = false; sq.rise = 1; S.fx.push({ kind: 'dirt', x: sq.x, row: sq.row, t: 0 }); S.shake = .2; }
        continue;
      }
      if (sq.brood) { sq.broodT = (sq.broodT || 4) - dt; if (sq.broodT <= 0) { sq.broodT = sq.brood; spawn('skitter', sq.row, { x: sq.x + .5, extra: true }); } }
      const col = Math.floor(sq.x - .35);
      const g = col >= 0 && col < COLS ? S.grid[sq.row][col] : null;
      if (g && sq.k.boom) {            // kamikaze: explodes, taking out every gun in the 3x3 block around the one it hit
        for (let r = sq.row - 1; r <= sq.row + 1; r++) for (let c = col - 1; c <= col + 1; c++) {
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS || !S.grid[r][c]) continue;
          S.grid[r][c] = null; S.fx.push({ kind: 'crunch', x: c + .5, row: r, t: 0 });
        }
        sq.hp = 0; sq.dead = true; S.shake = .5;
        S.fx.push({ kind: 'boom', x: col + .5, row: sq.row, t: 0, r: 1.8 });
        continue;
      }
      if (g && sq.pass > 0 && sq.passedCol !== col) { sq.pass--; sq.passedCol = col; }   // ghosts and flyers float over guns
      if (g && sq.passedCol !== col) {
        sq.eating = g; g.hp -= sq.k.chomp * dt; g.bitten = .25;
        if (g.hp <= 0) { S.grid[sq.row][col] = null; S.fx.push({ kind: 'crunch', x: col + .5, row: sq.row, t: 0 }); sq.eating = null; }
      } else {
        sq.eating = null;
        if (sq.rise <= 0) sq.x -= sq.k.speed * dt;
        if (sq.x < -.25) {
          if (S.gnomes[sq.row]) { S.gnomes[sq.row] = false; S.gnomeRuns.push({ row: sq.row, x: -.6 }); S.shake = .3; }
          else if (!S.gnomeRuns.some(r => r.row === sq.row)) { lose(); return; }
        }
      }
    }
    // gnomes charge across their row and flatten everything
    for (const gr of S.gnomeRuns) {
      gr.x += 4.5 * dt;
      for (const sq of S.squishies) if (sq.row === gr.row && !sq.dead && Math.abs(sq.x - gr.x) < .5) hurt(sq, 9999);
    }
    S.gnomeRuns = S.gnomeRuns.filter(gr => gr.x < COLS + 1);

    // guns fire
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const g = S.grid[r][c]; if (!g) continue;
      if (g.bitten > 0) g.bitten -= dt;
      g.cool -= dt;
      if (g.cool > 0) continue;
      // bullets only fly along the gun's own row; the mortar lobs at the most advanced squishy on the whole lawn
      const targets = S.squishies.filter(s => !s.dead && s.x < COLS + .6 && (g.type === 'mortar' ? s.x > .5 : s.row === r && s.x > c + .2 && !s.under));
      if (!targets.length) continue;
      const first = targets.reduce((a, b) => a.x < b.x ? a : b);
      const k = GUNS[g.type];
      g.cool = k.every; g.kick = .12;
      if (g.type === 'mortar') S.shells.push({ x0: c + .5, row0: r, x1: first.x, row: first.row, t: 0, dur: Math.max(.7, Math.hypot(first.x - c, first.row - r) / 6 + .4), dmg: k.dmg, splash: k.splash });
      else S.bullets.push({ x: c + .75, row: r, speed: k.speed, dmg: k.dmg, big: g.type === 'shooter' });
    }
    // bullets
    for (const b of S.bullets) {
      b.x += b.speed * dt;
      const hit = S.squishies.find(s => s.row === b.row && !s.dead && !s.under && Math.abs(s.x - b.x) < s.k.size * .45);
      if (hit) { hurt(hit, b.dmg); b.gone = true; }
      if (b.x > COLS + 1) b.gone = true;
    }
    S.bullets = S.bullets.filter(b => !b.gone);
    // mortar shells
    for (const sh of S.shells) {
      sh.t += dt;
      if (sh.t >= sh.dur) {
        sh.gone = true; S.shake = .25;
        S.fx.push({ kind: 'boom', x: sh.x1, row: sh.row, t: 0, r: sh.splash });
        for (const s of S.squishies) if (!s.dead && Math.hypot(s.x - sh.x1, (s.row - sh.row) * 1.15) < sh.splash) hurt(s, sh.dmg);
      }
    }
    S.shells = S.shells.filter(s => !s.gone);
    // effects
    for (const f of S.fx) f.t += dt;
    S.fx = S.fx.filter(f => f.t < (f.kind === 'boom' ? .5 : f.kind === 'splat' || f.kind === 'melt' ? .6 : f.kind === 'abdeath' ? 1.4 : .8));
    for (const f of S.floats) f.t += dt;
    S.floats = S.floats.filter(f => f.t < 1);
    S.squishies = S.squishies.filter(s => !s.dead);

    if (S.spawned >= sp.count && !S.squishies.length && !S.shells.length) win();
  }
  function win() {
    S.phase = 'won';
    const sv = store.get(saveKey, { best: 1, level: 1 });
    sv.level = S.level + 1; sv.best = Math.max(sv.best || 1, S.level + 1); store.set(saveKey, sv);
    showOverlay(`🏆 Garden saved!`, `Level ${S.level} done!`, 'Next level', () => { newLevel(S.level + 1); start(); });
    Celebrate(innerWidth / 2, innerHeight / 3, 2.4);
  }
  function lose() {
    S.phase = 'lost';
    showOverlay('😱 The squishies ate your garden!', `You reached level ${S.level}`, 'Try again', () => { S.money = START_MONEY; newLevel(S.level); start(); });
  }

  /* ---------- drawing ---------- */
  let cv, ctx, cell = 40, W = 0, H = 0, bg = null, stage = null;
  const rotated = () => stage && stage.classList.contains('rot');
  function layout() {
    if (!stage) return;
    // portrait phone: turn the whole stage sideways so the game is always landscape
    const rot = innerHeight > innerWidth;
    stage.classList.toggle('rot', rot);
    stage.style.width = (rot ? innerHeight : innerWidth) + 'px';
    stage.style.height = (rot ? innerWidth : innerHeight) + 'px';
    const box = ui.garden;
    cell = Math.max(24, Math.floor(Math.min(box.clientWidth / COLS, box.clientHeight / ROWS)));
    W = cell * COLS; H = cell * ROWS;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ui.canvasWrap.style.width = W + 'px'; ui.canvasWrap.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bg = null;
  }
  // pointer position in canvas pixels, allowing for the rotated stage
  function canvasPoint(e) {
    const r = cv.getBoundingClientRect();
    return rotated() ? { x: e.clientY - r.top, y: r.right - e.clientX } : { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function drawBackground() {
    bg = document.createElement('canvas');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    bg.width = cv.width; bg.height = cv.height;
    const g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let r = 0; r < ROWS; r++) {
      const on = S.spec.rows.includes(r);
      g.fillStyle = on ? (r % 2 ? '#8CCB5E' : '#7DBE50') : (r % 2 ? '#A98A5B' : '#9C7D4F');   // bare soil where squishies never come
      g.fillRect(0, r * cell, W, cell);
      if (!on) continue;
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
      for (let c = 1; c < COLS; c++) { g.beginPath(); g.moveTo(c * cell, r * cell + 4); g.lineTo(c * cell, r * cell + cell - 4); g.stroke(); }
    }
    // little flowers, same places every time
    let seed = 7;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 40; i++) {
      const x = rand() * W, y = rand() * H, col = ['#FFF0F5', '#FFE066', '#FFFFFF', '#FFB3C6'][i % 4];
      if (!S.spec.rows.includes(Math.floor(y / cell))) continue;
      g.fillStyle = col; g.beginPath(); g.arc(x, y, cell * .05, 0, 7); g.fill();
      g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(x, y, cell * .02, 0, 7); g.fill();
    }
    // path on the left where the gnomes stand
    g.fillStyle = 'rgba(120,80,40,.18)'; g.fillRect(0, 0, cell * .22, H);
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function drawGun(g, type, x, y, s, kick = 0, hp = 1) {
    // x,y = centre; s = cell size
    g.save(); g.translate(x, y);
    if (type === 'shooter') {
      g.fillStyle = '#3E7D3A'; rr(g, -s * .18, s * .05, s * .36, s * .3, s * .08); g.fill();            // base
      g.fillStyle = '#5BAF4E'; g.beginPath(); g.arc(-s * .05, -s * .1, s * .24, 0, 7); g.fill();       // body
      g.fillStyle = '#2F5F2C'; rr(g, s * .1 - kick * s, -s * .18, s * .32, s * .16, s * .06); g.fill(); // barrel
      g.fillStyle = '#9BE564'; g.beginPath(); g.ellipse(-s * .22, -s * .28, s * .1, s * .06, -.6, 0, 7); g.fill(); // leaf
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * .1, -s * .16, s * .06, 0, 7); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(-s * .08, -s * .16, s * .03, 0, 7); g.fill();
    } else if (type === 'mortar') {
      g.fillStyle = '#4A4A58'; rr(g, -s * .26, s * .08, s * .52, s * .26, s * .08); g.fill();          // base
      g.fillStyle = '#6B6B7E'; g.beginPath(); g.arc(0, s * .1, s * .12, 0, 7); g.fill();
      g.save(); g.rotate(-.95 + kick * .5); g.fillStyle = '#2C2C36'; rr(g, -s * .09, -s * .42, s * .18, s * .5, s * .05); g.fill();
      g.fillStyle = '#8E2F4A'; rr(g, -s * .1, -s * .44, s * .2, s * .07, s * .03); g.fill(); g.restore();
    } else {
      g.fillStyle = '#6D6B3A'; rr(g, -s * .24, -s * .02, s * .48, s * .3, s * .07); g.fill();           // body
      g.fillStyle = '#8A8750'; rr(g, -s * .2, -s * .2, s * .3, s * .22, s * .05); g.fill();            // top
      g.fillStyle = '#2C2C36';
      for (let i = 0; i < 3; i++) rr(g, s * .08 - kick * s, -s * .16 + i * s * .09, s * .34, s * .05, s * .02), g.fill();
      g.fillStyle = '#C62E2E'; g.beginPath(); g.arc(-s * .12, -s * .1, s * .04, 0, 7); g.fill();
    }
    g.restore();
    if (hp < 1) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - s * .25, y + s * .38, s * .5, s * .06); g.fillStyle = hp > .4 ? '#9BE564' : '#FF5D8F'; g.fillRect(x - s * .25, y + s * .38, s * .5 * hp, s * .06); }
  }
  function drawSprite(g, art, x, y, w, alpha = 1) {
    // draw an art image with its bottom-centre at (x, y), scaled so its larger side is w
    const im = SPRITES[art]; if (!im || !im.complete || !im.naturalWidth) return false;
    const sc = w / Math.max(im.naturalWidth, im.naturalHeight), iw = im.naturalWidth * sc, ih = im.naturalHeight * sc;
    g.globalAlpha = alpha; g.drawImage(im, x - iw / 2, y - ih, iw, ih); g.globalAlpha = 1;
    return true;
  }
  const lookOf = sq => (sq.k.look.hurt && sq.hp < sq.k.hp * .5) ? sq.k.look.hurt : sq.k.look.ok;
  // how each kind of squishy moves: returns {dy (cells), rot, sx, sy}
  function motionOf(sq) {
    const t = sq.wob, k = sq.k, m = k.motion;
    if (sq.eating) return { dy: 0, rot: Math.sin(t * 16) * .06, sx: 1, sy: 1 };
    if (m === 'hop' || m === 'stomp') {
      const P = m === 'hop' ? (k.rig ? .55 : .42) : 1.1, hopH = m === 'hop' ? .2 : .12;
      const ph = ((t + sq.phase) / P) % 1, land = Math.max(0, 1 - ph * 5), air = Math.sin(ph * Math.PI);
      return { dy: -air * hopH, rot: 0, sx: 1 + .14 * land - .05 * air, sy: 1 - .18 * land + .07 * air, ph };
    }
    if (m === 'waddle') { const s = Math.sin(t * 7 + sq.phase); return { dy: -Math.abs(s) * .04, rot: s * .07, sx: 1 + .03 * Math.abs(s), sy: 1 - .03 * Math.abs(s) }; }
    if (m === 'float') return { dy: -.1 - .1 * Math.sin(t * 2.5 + sq.phase), rot: .05 * Math.sin(t * 1.7 + sq.phase), sx: 1, sy: 1 };
    if (m === 'fly') return { dy: -.28 - .08 * Math.sin(t * 5 + sq.phase), rot: -.08, sx: 1, sy: 1 };
    if (m === 'roll') return { dy: -Math.abs(Math.sin(t * 6)) * .03, rot: -(COLS - sq.x) * 3.2, sx: 1, sy: 1 };
    return { dy: 0, rot: 0, sx: 1, sy: 1 };
  }
  // the rigged Antbun: parts drawn in order, ears flopping with the hop, blinking, hit reaction, hurt set below half health
  function drawAntbun(g, sq, w, mo) {
    const f = w / ANTBUN.box[0], hurt = sq.hp < sq.k.hp * .5, hit = sq.flash > 0;
    const part = (name, rot = 0, px = 0, py = 0) => {
      const b = ANTBUN.parts[name], im = SPRITES['antbun/' + name]; if (!b || !im || !im.complete) return;
      g.save(); g.translate((b[0] + px) * f, (b[1] + py) * f); g.rotate(rot); g.drawImage(im, -px * f, -py * f, b[2] * f, b[3] * f); g.restore();
    };
    const flop = mo.ph == null ? 0 : Math.sin(mo.ph * Math.PI * 2 - .8) * .18;
    g.save(); g.translate(-ANTBUN.box[0] * f / 2, -ANTBUN.box[1] * f);   // parts are placed from the box's top-left; we draw from the feet
    if (hurt) {
      part('hurt_rightear', -flop * .8, 12, 118); part('hurt_body'); part('hurt_leftear', flop, 20, 112); part('hurt_arm');
      part(sq.blink < .15 ? 'hurt_righteyeclose' : 'hurt_righteyeopen');
    } else {
      part('rightear', -flop * .8, 12, 118);
      part(hit ? 'body3' : mo.ph != null && mo.ph < .2 ? 'body2' : 'body');
      part('leftear', flop, 20, 128); part('arm');
      if (hit) part('eyepopping'); else part(sq.blink < .15 ? 'eyesclose' : 'eyesopen');
    }
    g.restore();
  }
  function drawSquishy(g, sq, x, y, s) {
    const k = sq.k, w = s * k.size, mo = motionOf(sq);
    if (sq.rise <= 0) sq.blink -= 1 / 60; if (sq.blink < 0) sq.blink = 2 + Math.random() * 3;
    const foot = y + s * .42;
    if (sq.under) {   // a mound of earth travelling along the row
      const bump = 1 + .08 * Math.sin(sq.wob * 12);
      g.fillStyle = '#8B5E34'; g.beginPath(); g.ellipse(x, foot - s * .02, s * .34, s * .17 * bump, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#A97A4A'; g.beginPath(); g.ellipse(x - s * .04, foot - s * .06, s * .2, s * .1 * bump, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#6E4526'; g.beginPath(); g.ellipse(x, foot, s * .36, s * .05, 0, 0, 7); g.fill();
      return;
    }
    g.save();
    // shadow stays on the ground; smaller when the squishy is in the air
    const air = Math.max(0, -mo.dy); g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(x, foot, w * .38 * (1 - air * .4), w * .1 * (1 - air * .4), 0, 0, 7); g.fill();
    g.translate(x, foot + mo.dy * s);
    if (sq.rise > 0) { g.beginPath(); g.rect(-w, -w * 2, w * 2, w * 2 * (1 - sq.rise)); g.clip(); g.translate(0, w * sq.rise); }   // moley rising out of the ground
    if (k.motion === 'roll') { g.translate(0, -w * .45); g.rotate(mo.rot); g.translate(0, w * .45); } else g.rotate(mo.rot);
    g.scale(mo.sx, mo.sy);
    if (k.alpha) g.globalAlpha = k.alpha;
    if (k.rig) drawAntbun(g, sq, w, mo);
    else if (!drawSprite(g, lookOf(sq), 0, 0, w, k.alpha || 1)) { g.fillStyle = k.color; g.beginPath(); g.ellipse(0, -w * .4, w * .4, w * .4, 0, 0, 7); g.fill(); }
    if (sq.flash > 0 && !k.rig) { g.globalCompositeOperation = 'lighter'; drawSprite(g, lookOf(sq), 0, 0, w, .7); g.globalCompositeOperation = 'source-over'; }
    g.restore();
    if (k.boss) {   // boss health bar
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - w * .35, foot + s * .08, w * .7, s * .07);
      g.fillStyle = '#FF5D8F'; g.fillRect(x - w * .35, foot + s * .08, w * .7 * Math.max(0, sq.hp / k.hp), s * .07);
    }
  }
  function drawGnome(g, x, y, s, running) {
    g.save(); g.translate(x, y);
    if (running) g.rotate(Math.sin(S.t * 30) * .15);
    g.fillStyle = '#3E6FD0'; rr(g, -s * .13, -s * .05, s * .26, s * .3, s * .06); g.fill();     // coat
    g.fillStyle = '#F6C8A0'; g.beginPath(); g.arc(0, -s * .12, s * .12, 0, 7); g.fill();          // face
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -s * .02, s * .1, s * .09, 0, 0, Math.PI); g.fill(); // beard
    g.fillStyle = '#D33'; g.beginPath(); g.moveTo(-s * .14, -s * .18); g.lineTo(s * .14, -s * .18); g.lineTo(0, -s * .48); g.closePath(); g.fill(); // hat
    g.restore();
  }
  function draw() {
    if (!bg) drawBackground();
    ctx.save();
    if (S.shake > 0) ctx.translate(rnd(-3, 3), rnd(-3, 3));
    ctx.drawImage(bg, 0, 0, W, H);
    // selected gun: show where it can go
    if (S.sel && S.sel !== 'shovel') { ctx.fillStyle = 'rgba(255,255,255,.14)'; for (const r of S.spec.rows) for (let c = 0; c < COLS; c++) if (!S.grid[r][c]) ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4); }
    // gnomes
    for (const r of S.spec.rows) if (S.gnomes[r]) drawGnome(ctx, cell * .12, r * cell + cell * .62, cell, false);
    for (const gr of S.gnomeRuns) drawGnome(ctx, gr.x * cell + cell * .5, gr.row * cell + cell * .62, cell, true);
    // guns
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const g = S.grid[r][c]; if (!g) continue;
      if (g.kick > 0) g.kick -= .016;
      drawGun(ctx, g.type, c * cell + cell / 2 + (g.bitten > 0 ? rnd(-1.5, 1.5) : 0), r * cell + cell * .5, cell, Math.max(0, g.kick), g.hp / GUNS[g.type].hp);
    }
    // bullets
    for (const b of S.bullets) {
      ctx.fillStyle = b.big ? '#2F5F2C' : '#FFB347';
      ctx.beginPath(); ctx.arc(b.x * cell, b.row * cell + cell * .42, b.big ? cell * .09 : cell * .055, 0, 7); ctx.fill();
    }
    // shells in the air
    for (const sh of S.shells) {
      const p = sh.t / sh.dur, x = sh.x0 + (sh.x1 - sh.x0) * p, rowY = (sh.row0 + (sh.row - sh.row0) * p) * cell;
      const y = rowY + cell * .5 - Math.sin(p * Math.PI) * cell * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x * cell, rowY + cell * .8, cell * .12, cell * .05, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2C2C36'; ctx.beginPath(); ctx.arc(x * cell, y, cell * .13, 0, 7); ctx.fill();
      ctx.fillStyle = '#FF5D8F'; ctx.beginPath(); ctx.arc(x * cell + cell * .05, y - cell * .05, cell * .04, 0, 7); ctx.fill();
    }
    // squishies, lower rows drawn later so they overlap properly
    for (const sq of S.squishies.slice().sort((a, b) => a.row - b.row)) drawSquishy(ctx, sq, sq.x * cell, sq.row * cell + cell * .5, cell);
    // effects
    for (const f of S.fx) {
      const x = f.x * cell, y = f.row * cell + cell * .5;
      if (f.kind === 'boom') {
        const p = f.t / .5;
        ctx.strokeStyle = `rgba(255,120,40,${1 - p})`; ctx.lineWidth = cell * .12 * (1 - p) + 1;
        ctx.beginPath(); ctx.arc(x, y, f.r * cell * p, 0, 7); ctx.stroke();
        ctx.fillStyle = `rgba(255,220,80,${.7 * (1 - p)})`; ctx.beginPath(); ctx.arc(x, y, f.r * cell * p * .6, 0, 7); ctx.fill();
      } else if (f.kind === 'splat') {
        const p = f.t / .6;
        ctx.fillStyle = f.color; ctx.globalAlpha = 1 - p;
        for (let i = 0; i < 7; i++) { const a = i * .9 + f.x, d = cell * f.size * (.2 + p * .6); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .6, cell * .08 * (1 - p) + 1, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
      } else if (f.kind === 'melt') {
        const p = f.t / .6, w = cell * f.size, foot = y + cell * .42 - (f.fly ? cell * .28 : 0);
        ctx.save(); ctx.translate(x, foot);
        if (f.bones) { drawSprite(ctx, f.art, 0, 0, w, 1 - p); }
        else { ctx.scale(1 + p * .5, Math.max(.05, 1 - p)); drawSprite(ctx, f.art, 0, 0, w, 1 - p * .7); }
        ctx.restore();
      } else if (f.kind === 'abdeath') {
        // nine frames from the artist's death animation, then the puddle fades
        const n = Math.min(9, 1 + Math.floor(f.t / .1)), im = SPRITES['antbun/death' + n];
        if (im && im.complete) {
          const w = cell * f.size, fd = w / ANTBUN.death.body[2], bb = ANTBUN.death.body, foot = y + cell * .42;
          ctx.globalAlpha = f.t > 1 ? Math.max(0, 1 - (f.t - 1) / .4) : 1;
          ctx.drawImage(im, x - (bb[0] + bb[2] / 2) * fd, foot - (bb[1] + bb[3]) * fd, ANTBUN.death.w * fd, ANTBUN.death.h * fd);
          ctx.globalAlpha = 1;
        }
      } else if (f.kind === 'dirt') {
        const p = f.t / .8; ctx.fillStyle = `rgba(110,75,40,${1 - p})`;
        for (let i = 0; i < (f.small ? 3 : 8); i++) { const a = i * .8 + .3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * p * cell * .7, y + cell * .3 - Math.sin(a) * p * cell * .9 + p * p * cell * .8, cell * .07, 0, 7); ctx.fill(); }
      } else if (f.kind === 'pot') {
        const p = f.t / .8; ctx.fillStyle = `rgba(184,102,58,${1 - p})`; ctx.beginPath(); ctx.arc(x + p * cell * .6, y - cell * .6 - Math.sin(p * Math.PI) * cell * .8 + p * cell, cell * .12, 0, 7); ctx.fill();
      } else if (f.kind === 'crunch') {
        const p = f.t / .8; ctx.fillStyle = `rgba(80,110,40,${1 - p})`;
        for (let i = 0; i < 5; i++) { const a = i * 1.3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * p * cell * .5, y + Math.sin(a) * p * cell * .5 - p * cell * .3, cell * .06, 0, 7); ctx.fill(); }
      }
    }
    ctx.restore();
    // banner
    if (S.banner) {
      ctx.fillStyle = 'rgba(60,20,40,.75)'; rr(ctx, W * .08, H * .4, W * .84, cell * 1.1, 12); ctx.fill();
      ctx.fillStyle = '#FFD23F'; ctx.font = `700 ${Math.max(14, cell * .4)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(S.banner.text, W / 2, H * .4 + cell * .55);
    }
  }

  /* ---------- DOM: status, shop, quiz, overlay ---------- */
  function iconCanvas(type) {
    const c = document.createElement('canvas'); const s = 38, dpr = 2; c.width = s * dpr; c.height = s * dpr; c.style.width = c.style.height = s + 'px';
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGun(g, type, s / 2, s / 2 + 2, s * 1.3); return c;
  }
  function renderShop() {
    const shop = ui.shop; shop.innerHTML = '';
    for (const key of Object.keys(GUNS)) {
      const k = GUNS[key];
      const b = document.createElement('button'); b.className = 'gun'; b.dataset.g = key;
      b.innerHTML = `<div class="ico"></div><b>${k.name}</b><span class="cost"><i class="coin"></i>${k.cost}</span><div class="cool"></div>`;
      b.querySelector('.ico').appendChild(iconCanvas(key));
      b.title = k.blurb;
      shop.appendChild(b);
    }
    const sh = document.createElement('button'); sh.className = 'gun shovel'; sh.dataset.g = 'shovel';
    sh.innerHTML = '<div class="ico">⛏️</div><b>Dig up</b><span class="cost">½ back</span>';
    shop.appendChild(sh);
    shop.onclick = e => {
      const b = e.target.closest('button'); if (!b || S.phase !== 'play') return;
      const key = b.dataset.g;
      if (key !== 'shovel' && (S.money < GUNS[key].cost || S.recharge[key] > 0)) { b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); return; }
      S.sel = S.sel === key ? null : key; refreshShop();
    };
  }
  function refreshShop() {
    for (const b of ui.shop.querySelectorAll('button')) {
      const key = b.dataset.g; b.classList.toggle('sel', S.sel === key);
      if (key === 'shovel') continue;
      const k = GUNS[key];
      b.classList.toggle('poor', S.money < k.cost);
      const cool = b.querySelector('.cool'); cool.style.height = (100 * S.recharge[key] / k.recharge) + '%';
    }
    ui.money.textContent = S.money;
    ui.level.textContent = 'Level ' + S.level;
    const p = Math.min(1, S.spawned / S.spec.count);
    ui.prog.style.width = (100 * p) + '%';
  }
  function onCanvasTap(e) {
    if (S.phase !== 'play' || !S.sel) return;
    const pt = canvasPoint(e);
    const c = Math.floor(pt.x / cell), r = Math.floor(pt.y / cell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (S.sel === 'shovel') {
      const g = S.grid[r][c]; if (!g) return;
      S.grid[r][c] = null; S.money += Math.floor(GUNS[g.type].cost / 2); S.sel = null;
      S.fx.push({ kind: 'crunch', x: c + .5, row: r, t: 0 });
    } else {
      if (S.grid[r][c] || !S.spec.rows.includes(r)) return;
      const k = GUNS[S.sel]; if (S.money < k.cost || S.recharge[S.sel] > 0) return;
      S.grid[r][c] = { type: S.sel, hp: k.hp, cool: .3, kick: 0, bitten: 0 };
      S.money -= k.cost; S.recharge[S.sel] = k.recharge; S.sel = null;
    }
    refreshShop();
  }

  /* word matching: the only way to earn coins */
  let quiz = null;
  function askWord() {
    const words = activeWords(user), p = getProg(user);
    let total = 0; const wts = words.map(w => { const t = 6 - ((p[w.id] && p[w.id].s) || 0); total += t; return t; });
    let r = Math.random() * total, w = words[words.length - 1];
    for (let i = 0; i < words.length; i++) { r -= wts[i]; if (r <= 0) { w = words[i]; break; } }
    if (quiz && quiz.w === w && words.length > 1) return askWord();
    const ds = distractors(w, words).slice().sort(() => Math.random() - .5);
    const opts = [w.english, ds[0].english, ds[1] ? ds[1].english : ds[0].english].sort(() => Math.random() - .5);
    quiz = { w, opts, frozen: 0 };
    ui.qword.textContent = w.word;
    ui.qopts.innerHTML = opts.map((o, i) => `<button data-i="${i}">${esc(o)}</button>`).join('');
  }
  function answer(i) {
    if (!quiz || quiz.frozen > 0 || S.phase !== 'play') return;
    const ok = quiz.opts[i] === quiz.w.english;
    const btns = ui.qopts.querySelectorAll('button');
    if (ok) {
      btns[i].classList.add('good');
      S.money += MATCH_COINS; refreshShop();
      ui.coinPop.textContent = '+' + MATCH_COINS; ui.coinPop.classList.remove('go'); void ui.coinPop.offsetWidth; ui.coinPop.classList.add('go');
      setTimeout(askWord, 220);
    } else {
      btns[i].classList.add('bad');
      btns.forEach((b, j) => { if (quiz.opts[j] === quiz.w.english) b.classList.add('good'); });
      quiz.frozen = FREEZE_SECS;
      ui.ice.hidden = false; ui.iceN.textContent = FREEZE_SECS;
      const tick = setInterval(() => {
        quiz.frozen -= 1; ui.iceN.textContent = Math.max(0, quiz.frozen);
        if (quiz.frozen <= 0) { clearInterval(tick); ui.ice.hidden = true; askWord(); }
      }, 1000);
    }
  }

  function showOverlay(title, sub, btn, fn) {
    ui.overlay.hidden = false;
    ui.overlay.innerHTML = `<div class="ovbox"><h3>${title}</h3><p>${sub}</p><button class="btn" id="ovBtn">${btn}</button></div>`;
    ui.overlay.querySelector('#ovBtn').onclick = () => { ui.overlay.hidden = true; fn(); };
  }
  function start() {
    S.phase = 'play'; bg = null; refreshShop(); askWord();
    ui.ice.hidden = true; if (quiz) quiz.frozen = 0;
  }
  function ready() {
    const fresh = Object.keys(SQUISHIES).filter(k => SQUISHIES[k].from === S.level && !SQUISHIES[k].boss).map(k => SQUISHIES[k].name);
    const first = S.level === 1 ? 'Match the words below to earn coins. Buy a Shooter, then tap a square to plant it. Keep the squishies away from your gnomes!'
      : `${S.spec.count} squishies are on their way.` + (fresh.length ? ` New: ${fresh.join(', ')}!` : '') + (S.spec.boss && S.level === SQUISHIES[S.spec.boss].from ? ` Watch out for the ${SQUISHIES[S.spec.boss].name}…` : '');
    showOverlay(`Level ${S.level}`, first, S.level === 1 ? "Let's go!" : 'Ready!', start);
    if (S.level > 1) {
      const a = document.createElement('button'); a.className = 'linkbtn'; a.textContent = 'start again from level 1';
      a.onclick = () => { if (confirm('Go back to level 1? Your best level is kept.')) restartFromOne(); };
      ui.overlay.querySelector('.ovbox').appendChild(a);
    }
  }

  /* ---------- loop ---------- */
  let shopAcc = 0;
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
    if (document.hidden || !S) return;
    update(dt); draw();
    shopAcc += dt; if (shopAcc > .25) { shopAcc = 0; if (S.phase === 'play') refreshShop(); }
  }

  /* ---------- mount / unmount ---------- */
  function mount(root, u, opts = {}) {
    user = u; saveKey = 'latin.practice.' + u.id; stage = root;
    const sv = store.get(saveKey, { best: 1, level: 1 });
    root.className = 'pstage';
    root.innerHTML = `
      <div class="ptop">
        <button class="iconbtn" id="phome">← Home</button>
        <span class="plev" id="plevel"></span>
        <div class="pbar"><div id="pprog"></div><span class="flag">🚩</span></div>
        <span class="ptag">${esc(opts.tag || '')}</span>
        <div class="pcash"><i class="coin big"></i><span class="lbl">cash</span><b id="pmoney">0</b><span class="coinpop" id="pcoin"></span></div>
      </div>
      <div class="pmain">
        <div class="pgarden" id="pgarden"><div class="pcanvas" id="pwrap"><canvas id="pcv"></canvas><div class="overlay" id="pover" hidden></div></div></div>
        <div class="pshop" id="pshop"></div>
      </div>
      <div class="pquiz" id="pquiz">
        <div class="qword" id="pqword">…</div>
        <div class="qopts" id="pqopts"></div>
        <div class="ice" id="pice" hidden><div>❄️ Frozen! <b id="piceN">5</b></div></div>
      </div>`;
    ui = { garden: root.querySelector('#pgarden'), canvasWrap: root.querySelector('#pwrap'), shop: root.querySelector('#pshop'), money: root.querySelector('#pmoney'),
      level: root.querySelector('#plevel'), prog: root.querySelector('#pprog'), overlay: root.querySelector('#pover'), qword: root.querySelector('#pqword'),
      qopts: root.querySelector('#pqopts'), ice: root.querySelector('#pice'), iceN: root.querySelector('#piceN'), coinPop: root.querySelector('#pcoin') };
    cv = root.querySelector('#pcv'); ctx = cv.getContext('2d');
    document.body.classList.add('noscroll');
    root.querySelector('#phome').onclick = () => { if (opts.home) opts.home(); };
    const arts = [];
    for (const k in SQUISHIES) arts.push(...Object.values(SQUISHIES[k].look));
    for (const n of ANTBUN_PARTS) arts.push('antbun/' + n);
    for (let i = 1; i <= 9; i++) arts.push('antbun/death' + i);
    for (const a of arts) if (!SPRITES[a]) { const im = new Image(); im.src = 'art/squishies/' + a + '.png'; SPRITES[a] = im; }
    S = null; newLevel(sv.level || 1);
    renderShop(); layout(); refreshShop();
    cv.addEventListener('pointerdown', onCanvasTap);
    ui.qopts.addEventListener('click', e => { const b = e.target.closest('button'); if (b) answer(+b.dataset.i); });
    addEventListener('resize', layout);
    ready();
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    removeEventListener('resize', layout);
    document.body.classList.remove('noscroll');
    S = null; ui = null; quiz = null; stage = null;
  }
  function restartFromOne() { if (!S) return; S.money = START_MONEY; S = null; newLevel(1); ui.overlay.hidden = true; ready(); }
  // test hook: run the game forward without waiting
  const step = secs => { for (let t = 0; t < secs; t += 1 / 60) update(1 / 60); refreshShop(); };
  return { mount, unmount, restartFromOne, GUNS, SQUISHIES, debug: { step, state: () => S, answer, quiz: () => quiz, spawn } };
})();
