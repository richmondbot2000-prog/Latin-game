'use strict';

/* ---------- Jaques Hammer: a runner. Signs show a Latin word with a right or wrong meaning.
   Tap to smash the wrong ones; let the right ones pass. Get it wrong and the evil guy comes out. ---------- */
const Hammer = (() => {
  const LIVES = 3;
  // each level is a scene with the outfit and 'hammer' that go with it (the artist's sets)
  const LEVELS = [
    { scene: 'Town road', bg: 'bg_road', skin: 'standard', weapon: 'hammer', outfit: 'Jaques and his hammer' },
    { scene: 'Fish pier', bg: 'bg_pier', skin: 'coolbeach', weapon: 'shark', outfit: 'beach gear and a shark' },
    { scene: 'Town road', bg: 'bg_road', skin: 'farmer', weapon: 'pitchfork', outfit: 'farmer with a pitchfork' },
    { scene: 'Fish pier', bg: 'bg_pier', skin: 'beach', weapon: 'whaleshark', outfit: 'swim shorts and a whale shark' },
    { scene: 'Town road', bg: 'bg_road', skin: 'biker', weapon: 'bat', outfit: 'biker with a spiked bat' },
    { scene: 'Fish pier', bg: 'bg_pier', skin: 'coolbeachyellow', weapon: 'whale', outfit: 'yellow beach gear and a whale' },
    { scene: 'Town road', bg: 'bg_road', skin: 'lumberjacque', weapon: 'axe', outfit: 'lumberjack with an axe' },
    { scene: 'Town road', bg: 'bg_road', skin: 'hotdog', weapon: 'spatula', outfit: 'hot dog with a spatula' },
    { scene: 'Town road', bg: 'bg_road', skin: 'bunny', weapon: 'carrot', outfit: 'bunny with a carrot' },
    { scene: 'Town road', bg: 'bg_road', skin: 'greek', weapon: 'spear', outfit: 'Roman with a spear' },
    { scene: 'Town road', bg: 'bg_road', skin: 'monkey', weapon: 'monkeystick', outfit: 'monkey with a monkey stick' },
    { scene: 'Town road', bg: 'bg_road', skin: 'banana', weapon: 'scythebanana', outfit: 'banana with a banana scythe' },
    { scene: 'Town road', bg: 'bg_road', skin: 'dino', weapon: 'legmeat', outfit: 'dinosaur with a leg of meat' },
    { scene: 'Town road', bg: 'bg_road', skin: 'peapod', weapon: 'spoon', outfit: 'pea pod with a spoon' },
    { scene: 'Town road', bg: 'bg_road', skin: 'dragqueen', weapon: 'brushpink', outfit: 'glamour and a pink hairbrush' },
    { scene: 'Town road', bg: 'bg_road', skin: 'farmerdenim', weapon: 'hoe', outfit: 'denim farmer with a hoe' },
    { scene: 'Town road', bg: 'bg_road', skin: 'lumberjacquebearded', weapon: 'tree', outfit: 'bearded lumberjack with a whole tree' },
    { scene: 'Town road', bg: 'bg_road', skin: 'cowboy', weapon: 'banana', outfit: 'cowboy with a banana' },
    { scene: 'Town road', bg: 'bg_road', skin: 'karate', weapon: 'bat', outfit: 'karate kid with a bat' },
    { scene: 'Town road', bg: 'bg_road', skin: 'disco', weapon: 'brushyellow', outfit: 'disco Jaques with a yellow hairbrush' },
    { scene: 'Town road', bg: 'bg_road', skin: 'suit', weapon: 'hammersilver', outfit: 'secret agent with the silver hammer' },
    { scene: 'Town road', bg: 'bg_road', skin: 'samurai', weapon: 'spear', outfit: 'samurai with a spear' },
    { scene: 'Town road', bg: 'bg_road', skin: 'turban', weapon: 'brushblue', outfit: 'wise old Jaques with a blue hairbrush' },
    { scene: 'Town road', bg: 'bg_road', skin: 'astronaut', weapon: 'hammergold', outfit: 'astronaut with the gold hammer' },
    { scene: 'Town road', bg: 'bg_road', skin: 'standardred', weapon: 'hammerred', outfit: 'red Jaques and the red hammer' },
    { scene: 'Town road', bg: 'bg_road', skin: 'standardgold', weapon: 'hammergold', outfit: 'gold Jaques and the gold hammer' }];
  const levelOf = n => LEVELS[(n - 1) % LEVELS.length];
  const quota = n => 10 + 2 * Math.min(10, n - 1);           // signs to get through on level n
  let S = null, ui = null, user = null, saveKey = '';
  let cv, ctx, W = 0, H = 0, stage = null, raf = 0, last = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const JX = .3;                      // where Jaques stands (fraction of width)
  const boardW = () => Math.min(W * .8, H * .9);

  function newGame(level = 1, score = 0) {
    S = { level, made: 0, t: 0, dist: 0, speed: Math.min(.4, .22 + .015 * (level - 1)), score, lives: LIVES, signs: [], bits: [], phase: 'ready', nextSign: 2.2, lastWord: null,
      swing: -1, hitDone: false, ouch: -1, vil: null, invuln: 0, right: 0, wrong: 0, flashRed: 0, combo: 0, bestCombo: 0, taps: 0, dustT: 0,
      clouds: [...Array(6)].map((_, i) => ({ i: i % 5, x: Math.random() * 1.2 - .1, y: rnd(.1, .85), s: rnd(.9, 1.5), v: rnd(.012, .025) })) };
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
    S.signs.push({ w, shown, correct, x: 1.05, state: 'up', wob: 0 }); S.made++;
  }

  /* ---------- update ---------- */
  const INTRO = ['Oh Jacque...', 'I have been busy. Some of the signs in this town now say the WRONG thing. Heh heh heh.', 'Smash the wrong ones with that hammer of yours. But hit a right one, or let a wrong one past...', '...and I will be back. With THIS.'];
  function update(dt) {
    S.t += dt;
    if (S.phase === 'intro') {
      const v = S.vil; v.t += dt; v.typed += dt * 28;
      if (!v.leaving && v.t > .56) v.t = .56;                      // stands and talks until tapped through
      if (v.leaving && v.t > 2.05) { S.vil = null; S.phase = 'play'; S.t = 0; refreshUI(); }
      return;
    }
    if (S.phase !== 'play') return;
    const slow = S.vil ? 0 : S.ouch > 0 ? .35 : 1;
    S.speed = Math.min(.5, S.speed + .003 * dt);
    const v = S.speed * slow;
    S.dist += v * dt;
    if (S.vil) {   // the evil guy's visit: everything else waits while he clubs Jaques
      const was = S.vil.t; S.vil.t += dt;
      if (was < .83 && S.vil.t >= .83) { S.ouch = .9; S.flashRed = .4; S.bits.push({ kind: 'ouch', t: 0 }); }
      if (S.vil.t > 2.05) { S.vil = null; if (S.lives <= 0) { S.phase = 'over'; setTimeout(gameOver, 400); } }
    }
    for (const c of S.clouds) { c.x -= c.v * dt * (slow || .3); if (c.x < -.25) { c.x = 1.05; c.y = rnd(.1, .85); } }
    if (slow) { S.dustT -= dt; if (S.dustT <= 0) { S.dustT = .22; S.bits.push({ kind: 'dust', i: [0, 1, 2, 4, 5][Math.floor(Math.random() * 5)], x: JX - .04 - Math.random() * .02, t: 0 }); } }
    if (S.invuln > 0) S.invuln -= dt; if (S.flashRed > 0) S.flashRed -= dt;
    if (S.ouch > 0) S.ouch -= dt;
    // signs
    S.nextSign -= dt;
    const gap = Math.max(1.2, 2.6 - S.t * .02);
    const bw = boardW() / W, lastX = S.signs.length ? Math.max(...S.signs.map(s => s.x)) : -9;
    if (S.nextSign <= 0 && lastX + bw < .55 && !S.vil && S.made < quota(S.level)) { makeSign(); S.nextSign = gap; }
    if (S.made >= quota(S.level) && !S.vil && !S.signs.some(x => x.state === 'up') && S.swing < 0) { S.phase = 'won'; setTimeout(levelClear, 500); return; }
    const CX = JX;
    for (const s of S.signs) {
      s.x -= v * dt; s.wob += dt;
      if (s.state === 'up' && s.x + bw * .45 < CX) {
        // it got past Jaques
        s.state = 'passed';
        if (s.correct) { S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); S.score += 10; S.right++; recordAnswer(user, s.w, true); S.bits.push({ kind: 'tick', x: Math.max(.2, s.x + bw / 2), t: 0 }); }
        else { S.wrong++; recordAnswer(user, s.w, false); hurt(`“${s.w.word}” doesn’t mean “${s.shown}” — you let it past!`); }
      }
    }
    S.signs = S.signs.filter(s => s.x > -.4);
    // hammer swing: impact a moment after the tap
    if (S.swing >= 0) {
      S.swing += dt;
      if (!S.hitDone && S.swing >= .14) {
        S.hitDone = true;
        const target = S.signs.find(s => s.state === 'up' && s.x < CX + .3 && s.x + bw > CX);
        if (target) {
          target.state = 'smashed'; target.smashT = 0;
          const hx = Math.max(target.x, CX + .05); for (let i = 0; i < 9; i++) S.bits.push({ kind: 'plank', x: hx, y: GROUND - .22, vx: rnd(-.25, .35), vy: rnd(-.9, -.3), r: rnd(0, 6), t: 0 });
          if (!target.correct) { S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); const pts = 25 + 5 * Math.min(10, S.combo - 1); S.score += pts; S.right++; recordAnswer(user, target.w, true); S.bits.push({ kind: 'pop', x: hx, t: 0, text: '+' + pts }); }
          else { S.wrong++; recordAnswer(user, target.w, false); hurt(`“${target.w.word}” really does mean “${target.shown}” — don’t smash the right ones!`); }
        }
      }
      if (S.swing > .4) S.swing = -1;
    }
    for (const b of S.bits) { b.t += dt; if (b.kind === 'plank') { b.x += b.vx * dt; b.vy += 2.2 * dt; b.y += b.vy * dt; b.r += 3 * dt; } else if (b.kind === 'dust') b.x -= v * dt * .6; }
    S.bits = S.bits.filter(b => b.t < (b.kind === 'plank' ? 1.2 : b.kind === 'dust' ? .6 : .9));
    for (const s of S.signs) if (s.state === 'smashed') s.smashT += dt;
    S.signs = S.signs.filter(s => !(s.state === 'smashed' && s.smashT > .1));
    refreshUI();
  }
  function hurt(why) {
    if (S.invuln > 0 || S.vil) return;
    S.lives--; S.invuln = 3; S.combo = 0; S.vil = { t: 0 }; S.swing = -1;
    ui.why.textContent = why; ui.why.classList.remove('show'); void ui.why.offsetWidth; ui.why.classList.add('show');
  }
  function levelClear() {
    const sv = store.get(saveKey, { best: 0 });
    const next = S.level + 1, L = levelOf(next);
    store.set(saveKey, { ...sv, best: Math.max(sv.best || 0, S.score), level: Math.max(sv.level || 1, next), cleared: Math.max(sv.cleared || 0, S.level) });
    Celebrate(innerWidth / 2, innerHeight / 3, 2);
    showOverlay(`⭐ Level ${S.level} clear!`, `Score ${S.score} · ${S.right} right, ${S.wrong} wrong<br><br>Next: <b>Level ${next} — ${L.scene}</b><br>${L.outfit}`, `Level ${next}`, () => { newGame(next, S.score); preload(next); start(); });
  }
  function gameOver() {
    const sv = store.get(saveKey, { best: 0 });
    const best = Math.max(sv.best || 0, S.score); const isBest = S.score > (sv.best || 0);
    store.set(saveKey, { ...sv, best, plays: (sv.plays || 0) + 1 });
    const lv = S.level;
    showOverlay(`${isBest ? '🏆 New best score!' : 'Ouch!'}`, `Score ${S.score} · best ${best}<br>${S.right} right, ${S.wrong} wrong · best combo ×${S.bestCombo}<br><br>Level ${lv} — ${levelOf(lv).scene}`, `Try level ${lv} again`, () => { newGame(lv); start(); });
    if (isBest) Celebrate(innerWidth / 2, innerHeight / 3, 2);
  }
  function tap() {
    if (S && S.phase === 'intro' && !S.vil.leaving) {
      const v = S.vil, line = INTRO[v.line];
      if (v.typed < line.length) { v.typed = line.length; return; }   // first tap finishes the line
      v.line++; v.typed = 0;
      if (v.line >= INTRO.length) { v.leaving = true; v.t = 1.5; }
      return;
    }
    if (!S || S.phase !== 'play' || S.swing >= 0 || S.vil) return;
    S.swing = 0; S.hitDone = false; S.taps++;
  }

  /* ---------- art: the artist's pixel rigs, drawn part by part ---------- */
  const ART = 'art/jh/', IMG = {};
  let META = null;   // art/jh/meta.json: every rig part's box, per outfit
  const lev = () => levelOf(S ? S.level : 1);
  const img = n => { if (!IMG[n]) { const i = new Image(); i.src = ART + n + '.png'; IMG[n] = i; } return IMG[n]; };
  const ok = i => i.complete && i.naturalWidth > 0;
  // part boxes in the rig's own pixel space [x0, y0, x1, y1]
  const JPIV = [57, 125], HAND = [79, 72];                                        // feet centre and right hand, in rig pixels
  const DEC = { body: [7, 102, 162, 221], head: [29, 62, 106, 142], eyes: [40, 101, 71, 107], smile2: [44, 110, 68, 115], leftarm: [20, 128, 61, 214], lefthand: [32, 150, 62, 215], rightarm: [75, 121, 123, 201], weapon: [44, 4, 177, 211], righthand: [62, 151, 103, 213] };
  const DHAND = [82, 182], DENTER = { 1: [24, 74, 149, 106], 2: [4, 43, 149, 106], 3: [11, 50, 149, 106], 4: [25, 55, 147, 106], 5: [28, 29, 139, 106], 6: [28, 8, 123, 106], 7: [29, 1, 123, 106] };
  const DOG = { tail: [8, 21, 29, 43], run1: [8, 26, 74, 68], run2: [3, 26, 73, 68], run3: [13, 26, 79, 68], run4: [2, 26, 74, 68], legs: [12, 26, 72, 68], head: [42, 13, 83, 39], leftear: [47, 8, 63, 18], rightear: [65, 7, 77, 19],
    chin: [65, 36, 80, 44], inside: [65, 31, 79, 41], tongue: [72, 36, 80, 47], openlefteye: [65, 26, 68, 31], openrighteye: [76, 25, 79, 29], lefteyebrow: [63, 21, 69, 26], righteyebrow: [75, 21, 79, 26] };
  const PRELOAD = ['bg_road', 'fx_ready', 'fx_tap1', 'fx_tap2', 'fx_star2', 'fx_redstar', 'fx_smallstar', 'ui_combo', ...Object.keys(DEC).map(p => 'd_' + p),
    ...[1, 2, 3, 4, 5, 6, 7].map(n => 'd_enter' + n), ...Object.keys(DOG).map(p => 'g_' + p), ...[0, 1, 2, 4, 5].map(n => 'fx_dust' + n)];
  const SKIP = /^layer /;
  function preload(n) {
    const L = levelOf(n); img(L.bg); img('w_' + L.weapon);
    if (META) for (const p in META.jacque[L.skin]) if (!SKIP.test(p)) img(`j_${L.skin}_${p}`);
  }
  // draw one rig part: box is in rig pixels, (px,py) the rig point that sits at screen (sx,sy), k the scale
  function part(name, box, px, py, sx, sy, k) {
    const i = img(name); if (!ok(i)) return;
    ctx.drawImage(i, sx + (box[0] - px) * k, sy + (box[1] - py) * k, (box[2] - box[0]) * k, (box[3] - box[1]) * k);
  }
  const GROUND = .93;
  const CLOUDS = [[38, 52, 113, 97], [128, 20, 178, 77], [300, 27, 366, 79], [353, 42, 408, 76], [412, 66, 485, 90]];
  let CLOUD_SPR = null;
  // the clouds are cut out of the road picture with its sky made transparent, so they sit on any sky
  function cloudSprites(road) {
    if (CLOUD_SPR || !ok(road)) return CLOUD_SPR;
    try {
      CLOUD_SPR = CLOUDS.map(b => {
        const c = document.createElement('canvas'); c.width = b[2] - b[0]; c.height = b[3] - b[1];
        const x = c.getContext('2d'); x.drawImage(road, b[0], b[1], c.width, c.height, 0, 0, c.width, c.height);
        const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
        for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], bl = p[i + 2]; if (bl > 200 && r < 160 && g < 215) p[i + 3] = 0; }   // sky blues go
        x.putImageData(d, 0, 0); return c;
      });
    } catch (e) { CLOUD_SPR = []; }
    return CLOUD_SPR;
  }
  const jScale = () => Math.min(H * .24, W * .5) / 116;

  function drawBackground() {
    const g = ctx, bg = img(lev().bg), road = img('bg_road');
    if (!ok(bg)) { g.fillStyle = '#8FD3FF'; g.fillRect(0, 0, W, H); return; }
    g.fillStyle = lev().bg === 'bg_pier' ? '#8ED4F8' : '#58BAF6'; g.fillRect(0, 0, W, H);
    const bh = Math.min(H * .6, W * .9), sb = bh / bg.naturalHeight, tw = bg.naturalWidth * sb, top = H * GROUND + 14 * sb - bh;
    const off = (S.dist * W * .9) % tw;
    for (let x = -off; x < W; x += tw - .5) g.drawImage(bg, x, top, tw + 1, bh);
    g.fillStyle = '#9a9a9a'; g.fillRect(0, top + bh - 1, W, H - top - bh + 1);
    const cl = cloudSprites(road);
    if (cl) for (const c of S.clouds) { const ci = cl[c.i], cw = ci.width * sb * c.s, ch = ci.height * sb * c.s; g.drawImage(ci, c.x * W, c.y * top - ch / 2, cw, ch); }
  }
  function drawJaques() {
    const g = ctx, k = jScale(), x = W * JX, ground = H * GROUND;
    const running = S.phase === 'play' && S.vil == null;
    const cyc = running ? S.t * 10 : 0, bob = running ? Math.abs(Math.sin(cyc * Math.PI / 2)) * 2.5 : 0;
    const stumble = S.ouch > 0 ? Math.sin(S.ouch * 12) * .14 : 0;
    g.save(); g.translate(x, ground); g.rotate(stumble);
    if (S.invuln > 0 && Math.floor(S.t * 12) % 2) g.globalAlpha = .45;
    const swinging = S.swing >= 0, skin = lev().skin, RIG = META && META.jacque[skin];
    if (!RIG) { g.restore(); return; }
    const legs = swinging ? 'hittinglegs' : running ? 'run' + (1 + Math.floor(cyc) % 4) : 'legs';
    const P = (n, dy = 0) => { if (RIG[n]) part(`j_${skin}_${n}`, RIG[n], JPIV[0], JPIV[1], 0, -bob + dy, k); };
    const L = RIG[legs], lw = (L[2] - L[0]) * k, lh = (L[3] - L[1]) * k;       // leg frames are centred under him
    if (RIG.tail) P('tail'); if (RIG.tails) P('tails');
    const li = img(`j_${skin}_${legs}`); if (ok(li)) g.drawImage(li, -lw / 2, -lh, lw, lh);
    if (RIG.body) P('body');                                                   // costumes that came as one picture
    else { P('leftarm'); P('lefthand'); P('chest'); P('head'); P((S.t % 3.3) < .14 ? 'eyesclosed' : 'eyesopen'); P('rightarm'); }
    // the hammer swings about his right hand: resting over the shoulder, then whipped down in front
    const a = swinging ? (S.swing < .14 ? S.swing / .14 * 2.05 : Math.max(0, 2.05 - (S.swing - .14) / .26 * 2.05)) : Math.sin(S.t * 10) * .04;
    const hx = (HAND[0] - JPIV[0]) * k, hy = (HAND[1] - JPIV[1]) * k - bob;
    g.save(); g.translate(hx + (HAND[0] - HAND[0]) * k + 2 * k, hy + 4 * k); g.rotate(a);
    const hm = img('w_' + lev().weapon); if (ok(hm)) g.drawImage(hm, -(hm.naturalWidth - 9) * k, -(hm.naturalHeight - 11) * k, hm.naturalWidth * k, hm.naturalHeight * k);   // every weapon is held by its bottom-right corner
    g.restore();
    P('righthand');
    g.restore();
  }
  function drawDog() {
    const g = ctx, k = jScale() * .95, x = W * JX - 70 * jScale(), ground = H * GROUND;
    const running = S.phase === 'play' && S.vil == null;
    const cyc = running ? S.t * 10 + 1.5 : 0, bob = running ? Math.abs(Math.sin(cyc * Math.PI / 2)) * 2 : 0;
    g.save(); g.translate(x, ground - bob);
    const P = n => part('g_' + n, DOG[n], 43, 68, 0, 0, k);
    P('tail'); P(running ? 'run' + (1 + Math.floor(cyc) % 4) : 'legs'); P('head'); P('leftear'); P('rightear'); P('chin'); P('inside'); P('tongue');
    P('openlefteye'); P('openrighteye'); P('lefteyebrow'); P('righteyebrow');
    g.restore();
  }
  // the evil guy: rises out of the ground to the right, clubs Jaques with his signpost, sinks back
  function drawVillain() {
    const v = S.vil; if (!v) return;
    const g = ctx, kd = jScale() * .82, ground = H * GROUND, vx = W * JX + 62 * jScale();
    const t = v.t;
    if (t < .56 || t > 1.5) {
      const f = t < .56 ? 1 + Math.min(6, Math.floor(t / .08)) : 7 - Math.min(6, Math.floor((t - 1.5) / .08));
      const b = DENTER[f], i = img('d_enter' + f); if (!ok(i)) return;
      const k2 = kd * 2;
      g.drawImage(i, vx + (b[0] * 2 - 50) * kd, ground - (106 - b[1]) * k2, (b[2] - b[0]) * k2, (b[3] - b[1]) * k2);
      return;
    }
    g.save(); g.translate(vx, ground);
    const P = n => part('d_' + n, DEC[n], 0, 221, 0, 0, kd);
    P('leftarm'); P('lefthand'); P('body'); P('head'); P('eyes'); P('smile2'); P('rightarm');
    // swing: wind up, whack, recover
    const u = t - .56, a = v.talk ? Math.sin(S.t * 3) * .04 : u < .12 ? u / .12 * .35 : u < .27 ? .35 - (u - .12) / .15 * 2.35 : u < .6 ? -2 : -2 + (u - .6) / .34 * 2;
    g.save(); g.translate(DHAND[0] * kd, (DHAND[1] - 221) * kd); g.rotate(a);
    part('d_weapon', DEC.weapon, DHAND[0], DHAND[1], 0, 0, kd); part('d_righthand', DEC.righthand, DHAND[0], DHAND[1], 0, 0, kd);
    g.restore();
    g.restore();
    if (v.talk && !v.leaving) drawBubble(v, vx + 40 * kd, ground - 150 * kd);
  }
  // pixel speech bubble, text typed out letter by letter
  function drawBubble(v, tx, ty) {
    const g = ctx, k = jScale(), fs = Math.max(12, Math.round(k * 9)), pad = fs * .9;
    const bw = Math.min(W * .86, 420), lines = wrap(g, INTRO[v.line], bw - pad * 2, fs, `700 ${fs}px "Courier New", monospace`);
    const bh = lines.length * fs * 1.3 + pad * 2, bx = Math.max(6, Math.min(W - bw - 6, tx - bw * .7)), by = Math.max(6, ty - bh - fs * 1.4);
    g.save();
    g.fillStyle = '#2a1a10'; rr(g, bx - 3, by - 3, bw + 6, bh + 6, fs); g.fill();
    g.fillStyle = '#fff'; rr(g, bx, by, bw, bh, fs * .8); g.fill();
    const px = Math.max(bx + fs * 2, Math.min(bx + bw - fs * 2, tx));
    g.fillStyle = '#2a1a10'; g.beginPath(); g.moveTo(px - fs * .9, by + bh - 2); g.lineTo(px + fs * .9, by + bh - 2); g.lineTo(px + fs * .2, by + bh + fs * 1.1); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(px - fs * .6, by + bh - 4); g.lineTo(px + fs * .6, by + bh - 4); g.lineTo(px + fs * .2, by + bh + fs * .7); g.fill();
    g.fillStyle = '#1a1a1a'; g.font = `700 ${fs}px "Courier New", monospace`; g.textAlign = 'left'; g.textBaseline = 'top';
    let left = Math.floor(v.typed);
    lines.forEach((ln, i) => { const show = ln.slice(0, Math.max(0, left)); left -= ln.length + 1; g.fillText(show, bx + pad, by + pad + i * fs * 1.3); });
    if (v.typed >= INTRO[v.line].length && Math.floor(S.t * 2) % 2) { g.font = `700 ${fs * .8}px system-ui, sans-serif`; g.textAlign = 'right'; g.fillStyle = '#8a5a2a'; g.fillText('tap ▶', bx + bw - pad * .6, by + bh - pad * .9); }
    g.restore();
  }
  function wrap(g, text, maxW, size, font) {
    g.font = font || `700 ${size}px system-ui, sans-serif`;
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  function drawSign(s) {
    if (s.state === 'smashed') return;
    const g = ctx, k = jScale(), sw = boardW(), sh = Math.min(sw * .42, H * .2), x = s.x * W, ground = H * GROUND;
    const top = ground - 100 * k - sh * .5, px = Math.max(3, Math.round(k * 2));
    g.save(); g.translate(x, 0);
    const post = (px0) => { g.fillStyle = '#2a1a10'; g.fillRect(px0 - px, top + sh * .6, sw * .07 + px * 2, ground - top - sh * .6); g.fillStyle = '#8a5a2a'; g.fillRect(px0, top + sh * .6, sw * .07, ground - top - sh * .6); g.fillStyle = '#5a3a1a'; g.fillRect(px0 + sw * .045, top + sh * .6, sw * .02, ground - top - sh * .6); };
    post(sw * .12); post(sw * .81);
    g.fillStyle = '#2a1a10'; g.fillRect(-px, top - px, sw + px * 2, sh + px * 2);
    g.fillStyle = s.state === 'passed' && s.correct ? '#b9e08c' : '#e8c27a'; g.fillRect(0, top, sw, sh);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, top + sh * .5, sw, px);
    g.fillStyle = '#fff3cf'; g.fillRect(0, top, sw, px); g.fillStyle = '#b48a4a'; g.fillRect(0, top + sh - px * 2, sw, px * 2);
    g.fillStyle = '#2B1A3A'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let f = Math.round(sh * .36); g.font = `700 ${f}px Georgia, serif`;
    while (g.measureText(s.w.word).width > sw * .9 && f > 10) { f--; g.font = `700 ${f}px Georgia, serif`; }
    g.fillText(s.w.word, sw / 2, top + sh * .27);
    let f2 = Math.round(sh * .24); g.font = `700 ${f2}px system-ui, sans-serif`;
    while (g.measureText(s.shown).width > sw * .92 && f2 > 9) { f2--; g.font = `700 ${f2}px system-ui, sans-serif`; }
    g.fillText(s.shown, sw / 2, top + sh * .74);
    g.restore();
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function sprite(n, x, y, k, alpha = 1, rot = 0) {
    const i = img(n); if (!ok(i)) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(i, -i.naturalWidth * k / 2, -i.naturalHeight * k / 2, i.naturalWidth * k, i.naturalHeight * k); ctx.restore();
  }
  function drawHud() {
    const g = ctx;
    if (S.phase === 'intro') return;
    if (S.phase === 'play' && S.t < 1.2) sprite('fx_ready', W / 2, H * .2, Math.min(W / 300, H / 400), S.t < 1 ? 1 : (1.2 - S.t) / .2);
    else if (S.phase === 'play' && !S.taps && S.signs.length) sprite(Math.floor(S.t * 3) % 2 ? 'fx_tap1' : 'fx_tap2', W / 2, H * .2, Math.min(W / 300, H / 400) * .8);
    if (S.combo >= 3) {
      const i = img('ui_combo'), k = Math.min(W * .3 / 227, H * .06 / 58);
      if (ok(i)) {
        const w = i.naturalWidth * k, h = i.naturalHeight * k, x = W - w - 10 - h * 2.3, y = 6;
        g.drawImage(i, x, y, w, h);
        g.font = `900 ${h * .95}px system-ui, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = h * .14; g.strokeStyle = '#2a1a10'; g.fillStyle = '#FFD23F';
        g.strokeText('×' + S.combo, x + w + 6, y + h / 2); g.fillText('×' + S.combo, x + w + 6, y + h / 2);
      }
    }
  }
  function draw() {
    ctx.imageSmoothingEnabled = false;
    drawBackground();
    for (const s of S.signs) drawSign(s);
    const k = jScale() * .8;
    for (const b of S.bits) if (b.kind === 'dust') sprite('fx_dust' + b.i, b.x * W, H * GROUND - 6 * k, k * (.6 + b.t), .7 * (1 - b.t / .6));
    drawDog(); drawJaques(); drawVillain();
    for (const b of S.bits) {
      if (b.kind === 'plank') { ctx.save(); ctx.translate(b.x * W, b.y * H); ctx.rotate(b.r); ctx.globalAlpha = 1 - b.t / 1.2; ctx.fillStyle = '#E8C27A'; ctx.fillRect(-W * .03, -H * .012, W * .06, H * .024); ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.strokeRect(-W * .03, -H * .012, W * .06, H * .024); ctx.restore(); }
      else if (b.kind === 'pop') { sprite('fx_star2', b.x * W, H * GROUND - 120 * jScale(), k * (1 + b.t * .6), 1 - b.t, b.t * 2); ctx.globalAlpha = 1 - b.t; ctx.fillStyle = '#FFD23F'; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 4; ctx.font = `900 ${jScale() * 44}px system-ui, sans-serif`; ctx.textAlign = 'center'; const py = H * GROUND - 170 * jScale() - b.t * H * .1; ctx.strokeText(b.text, b.x * W, py); ctx.fillText(b.text, b.x * W, py); ctx.globalAlpha = 1; }
      else if (b.kind === 'tick') { const ty = H * GROUND - 170 * jScale() - b.t * H * .1; sprite('fx_smallstar', b.x * W, ty, k * 1.2, 1 - b.t, b.t * 3); ctx.globalAlpha = 1 - b.t; ctx.fillStyle = '#2E7D4F'; ctx.font = `900 ${jScale() * 40}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✓', b.x * W + jScale() * 36, ty); ctx.globalAlpha = 1; }
      else if (b.kind === 'ouch') sprite('fx_redstar', W * JX + 10, H * GROUND - jScale() * 70, k * (1.2 + b.t), 1 - b.t / .9, -b.t);
    }
    drawHud();
    if (S.flashRed > 0) { ctx.fillStyle = `rgba(255,40,40,${S.flashRed * .6})`; ctx.fillRect(0, 0, W, H); }
  }

  /* ---------- DOM ---------- */
  function refreshUI() {
    ui.score.textContent = S.score;
    if (ui.lev) ui.lev.textContent = `L${S.level} · ${S.made}/${quota(S.level)}`;
    ui.lives.textContent = '❤️'.repeat(Math.max(0, S.lives)) + '🖤'.repeat(Math.max(0, LIVES - S.lives));
  }
  function showOverlay(title, sub, btn, fn) {
    ui.overlay.hidden = false;
    ui.overlay.innerHTML = `<div class="ovbox"><h3>${title}</h3><p>${sub}</p><button class="btn ovbtn" id="hvBtn">${btn}</button></div>`;
    ui.overlay.querySelector('#hvBtn').onclick = () => { ui.overlay.hidden = true; fn(); };
  }
  function start() { S.t = 0; refreshUI(); if (S.level === 1) { S.phase = 'intro'; S.vil = { t: 0, line: 0, typed: 0, talk: true }; } else S.phase = 'play'; }
  function layout() {
    if (!stage) return;
    stage.classList.remove('rot');
    stage.style.width = innerWidth + 'px';
    stage.style.height = innerHeight + 'px';
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
        <span class="plev">Jaques Hammer</span><span class="hlev" id="hlev"></span>
        <span class="ptag">${esc(opts.tag || '')}</span>
        <span class="hlives" id="hlives"></span>
        <div class="pcash"><span class="lbl">score</span><b id="hscore">0</b></div>
      </div>
      <div class="hbox" id="hbox"><canvas id="hcv"></canvas><div class="hwhy" id="hwhy"></div><div class="overlay" id="hover" hidden></div></div>
      <div class="hbar"><span class="small">Tap to swing. Smash <b>wrong</b> meanings, let <b>right</b> ones past.</span><span class="small">Best ${sv.best || 0}</span></div>`;
    ui = { box: root.querySelector('#hbox'), overlay: root.querySelector('#hover'), score: root.querySelector('#hscore'), lives: root.querySelector('#hlives'), why: root.querySelector('#hwhy'), lev: root.querySelector('#hlev') };
    cv = root.querySelector('#hcv'); ctx = cv.getContext('2d');
    document.body.classList.add('noscroll');
    root.querySelector('#hhome').onclick = () => { if (opts.home) opts.home(); };
    PRELOAD.forEach(img);
    const lv = Math.max(1, sv.level || 1);
    fetch(ART + 'meta.json').then(r => r.json()).then(m => { META = m; preload(lv); if (S) preload(S.level); });
    newGame(lv); layout(); refreshUI();
    cv.addEventListener('pointerdown', e => { e.preventDefault(); tap(); });
    addEventListener('resize', layout);
    const keys = e => { if (e.code === 'Space' || e.key === 'ArrowUp') tap(); }; document.addEventListener('keydown', keys); ui.keys = keys;
    showOverlay(`<img src="${ART}icon.png" alt="" style="width:64px;height:64px;border-radius:14px;vertical-align:middle;margin-right:8px">Jaques Hammer`, `<b>Level ${lv} — ${levelOf(lv).scene}</b> · ${levelOf(lv).outfit}<br><br>Each sign shows a Latin word and a meaning. If the meaning is <b>wrong</b>, tap to smash it. If it’s <b>right</b>, let it go by. Get through ${quota(lv)} signs to clear the level.`, "Let's run!", start);
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
