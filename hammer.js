const NS_H = (typeof APP_NS !== 'undefined' ? APP_NS : 'latin');   // storage namespace: 'latin', or 'tounsi' for the Tunisian game
'use strict';

/* ---------- Jacques Hammer: a runner. Signs show a Latin word with a right or wrong meaning.
   Tap to smash the wrong ones; let the right ones pass. Get it wrong and the evil guy comes out. ---------- */
const Hammer = (() => {
  const MISTAKES = 3;   // wrong signs allowed in a level; one more and the level starts again
  // levels alternate between the scenes the artist made; what Jacques wears is up to the player (see the shop)
  // the artist's fifteen scenes (art/jh/scenes, cut from the Background Assets sheets), one per level, round and round
  // signs: how many boards the place has — a short stroll through town, a long haul under the sea
  const SCENES = [{ scene: 'Town road', key: 'Road', signs: 10 }, { scene: 'Fish pier', key: 'Pier', signs: 12 }, { scene: 'The park', key: 'Default', signs: 12 }, { scene: 'The beach', key: 'Beach', signs: 14 },
    { scene: 'The forest', key: 'Forest', signs: 16 }, { scene: 'Blossom lane', key: 'Blossom', signs: 14 }, { scene: 'Ancient Greece', key: 'Greek', signs: 18 }, { scene: 'The canyon', key: 'Canyon', signs: 20 },
    { scene: 'The temple', key: 'Temple', signs: 18 }, { scene: 'Snowy peaks', key: 'SnowyPeaks', signs: 22 }, { scene: 'The cave', key: 'Cave', signs: 24 }, { scene: 'Spooky hollow', key: 'Spooky', signs: 24 },
    { scene: 'Arabian night', key: 'ArabianNight', signs: 20 }, { scene: 'Under the sea', key: 'UnderWater', signs: 26 }, { scene: 'Future wave', key: 'FutureWave', signs: 30 }];
  const levelOf = n => SCENES[(n - 1) % SCENES.length];
  let SCENE_DATA = null, sceneReq = null;   // art/jh/scenes.json: for each scene the sky block, the ground strip and the props by layer
  const sceneImg = f => img('scenes/' + f.replace(/\.png$/, ''));
  function preloadScene(L) {
    if (!SCENE_DATA) { if (!sceneReq) sceneReq = fetch(ART + 'scenes.json').then(r => r.json()).then(j => { SCENE_DATA = j; preloadScene(L); }).catch(() => { sceneReq = null; setTimeout(() => preloadScene(L), 4000); }); return; }
    const d = SCENE_DATA[L.key]; if (!d) return; sceneImg(d.sky); if (d.ground) sceneImg(d.ground); for (const l of ['far', 'mid', 'near']) for (const p of d[l]) sceneImg(p.f);
  }
  // a repeating row of props along the run: piece i sits at a steady spacing with a little wobble, chosen by a hash so each level looks the same every time
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263 + 1013904223) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const quota = n => levelOf(n).signs;                       // signs to get through: set per place, so some backgrounds are tougher
  // the shop: everything the artist drew, bought with coins earned by clearing levels; owned for ever
  const COSTUMES = [['standard', 'Jacques', 0], ['beach', 'Beach', 120], ['coolbeach', 'Cool beach', 120], ['coolbeachyellow', 'Yellow beach', 120], ['farmer', 'Farmer', 120], ['farmerdenim', 'Denim farmer', 120],
    ['lumberjacque', 'Lumberjacque', 140], ['lumberjacquebearded', 'Bearded Jacque', 160], ['biker', 'Biker', 150], ['greek', 'Roman', 150], ['suit', 'Secret agent', 160], ['cowboy', 'Cowboy', 160], ['karate', 'Karate', 160],
    ['disco', 'Disco', 180], ['turban', 'Wise man', 180], ['dragqueen', 'Glamour', 180], ['hotdog', 'Hot dog', 200], ['bunny', 'Bunny', 200], ['peapod', 'Pea pod', 200], ['banana', 'Banana', 200], ['monkey', 'Monkey', 220],
    ['dino', 'Dino', 240], ['samurai', 'Samurai', 260], ['astronaut', 'Astronaut', 280], ['standardred', 'Red Jacques', 300], ['standardgold', 'Gold Jacques', 400]];
  const HAMMERS = [['hammer', 'Stone hammer', 0], ['spoon', 'Spoon', 60], ['spatula', 'Spatula', 60], ['carrot', 'Carrot', 70], ['banana', 'Banana', 70], ['hoe', 'Hoe', 80], ['pitchfork', 'Pitchfork', 90], ['bat', 'Spiked bat', 100],
    ['brushblue', 'Blue brush', 100], ['brushyellow', 'Yellow brush', 100], ['brushpink', 'Pink brush', 100], ['axe', 'Axe', 120], ['spear', 'Spear', 120], ['legmeat', 'Leg of meat', 130], ['monkeystick', 'Monkey stick', 140],
    ['scythebanana', 'Banana scythe', 150], ['tree', 'Whole tree', 180], ['shark', 'Shark', 200], ['whale', 'Whale', 220], ['whaleshark', 'Whale shark', 240], ['hammersilver', 'Silver hammer', 260], ['hammerred', 'Red hammer', 300], ['hammergold', 'Gold hammer', 400]];
  const PUPS = [['g', 'Pup', 0], ['gc', 'Cream pup', 150], ['gb', 'Black pup', 150], ['gg', 'Grey pup', 150], ['gp', 'Pink pup', 200]];
  const CATALOGUE = { costume: COSTUMES, hammer: HAMMERS, pup: PUPS };
  const saved = () => store.get(saveKey, { best: 0 });
  const owns = (kind, id) => { const it = CATALOGUE[kind].find(x => x[0] === id); return !!it && (it[2] === 0 || (saved().owned || []).includes(kind + ':' + id)); };
  const wear = () => { const sv = saved(), w = sv.wear || {}; return { skin: owns('costume', w.skin || 'standard') ? (w.skin || 'standard') : 'standard', weapon: owns('hammer', w.weapon || 'hammer') ? (w.weapon || 'hammer') : 'hammer', pup: owns('pup', w.pup || 'g') ? (w.pup || 'g') : 'g' }; };
  const COIN = 3;                                                  // coins for every sign judged right, paid on the spot
  const coinsFor = (right, wrong) => 10 + (wrong === 0 ? 15 : 0);  // the bonus on top at the end of a level (perfect: no wrong)
  // a coin pops out behind Jacques, spins once and flies to the counter at the top right; the total ticks up when it lands
  function earnCoin() { S.coins += COIN; S.bits.push({ kind: 'coin', t: 0, n: COIN }); }
  let S = null, ui = null, user = null, saveKey = '';
  let cv, ctx, W = 0, H = 0, stage = null, raf = 0, last = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const JX = .3; const recentS = [];                      // where Jacques stands (fraction of width)
  const boardW = () => Math.min(W * .8, H * .9);

  function newGame(level = 1, score = 0) {
    S = { level, made: 0, right0: 0, wrong0: 0, coins: 0, coinsShown: 0, t: 0, dist: 0, speed: Math.min(.4, .22 + .015 * (level - 1)), score, lives: 0, signs: [], bits: [], phase: 'ready', nextSign: 2.2, lastWord: null,
      swing: -1, hitDone: false, ouch: -1, vil: null, invuln: 0, right: 0, wrong: 0, flashRed: 0, combo: 0, bestCombo: 0, taps: 0, dustT: 0, dogX: null, dogHop: 0, shake: 0, card: null,
      clouds: makeClouds() };
  }

  /* ---------- words on signs ---------- */
  function makeSign() {
    const p = getProg(user), all = activeWords(user), due = all.filter(w => !resting(p[w.id])), words = due.length >= 8 ? due : all;   // spaced repetition: words that are resting stay out while enough are due
    let total = 0; const wts = words.map(w => { const t = weightOf(p[w.id]); total += t; return t; });
    let r = Math.random() * total, w = words[words.length - 1];
    for (let i = 0; i < words.length; i++) { r -= wts[i]; if (r <= 0) { w = words[i]; break; } }
    if (words.length > 1 && recentS.slice(-Math.min(20, words.length - 2)).includes(w.id)) return makeSign();   // a long gap before a word repeats
    recentS.push(w.id); if (recentS.length > 20) recentS.shift();
    const correct = Math.random() < .5;
    const ds = distractors(w, words);
    const shown = correct ? w.english : ds[Math.floor(Math.random() * ds.length)].english;
    S.signs.push({ w, shown, correct, x: 1.05, state: 'up', wob: 0, seen: false, at: Date.now() }); S.made++;
  }

  /* ---------- update ---------- */
  const INTRO = ['Oh Jacque...', 'I have been busy. Some of the signs in this town now say the WRONG thing. Heh heh heh.', 'Smash the wrong ones with that hammer of yours. But hit a right one, or let a wrong one past...', '...and I will be back. With THIS.'];
  // nothing moves until the scene, Jacques, the dog and the signs are all in: the clock stays at zero and no sign is
  // made, so a slow connection shows "Loading the scene…" over a still picture instead of a game already running.
  // After 12 s of waiting it starts anyway (a picture that never arrives keeps retrying on its own).
  function loaded() {
    const L = lev(), d = SCENE_DATA && SCENE_DATA[L.key];
    if (!d || !ok(sceneImg(d.sky)) || (d.ground && !ok(sceneImg(d.ground)))) return false;
    if (!META || !ok(img('sign' + (S.level - 1) % 6))) return false;
    if (RIG_SKIN[WEAR.skin]) { if (!jacqueRig(WEAR.skin)) return false; }
    else if (!Object.keys(IMG).some(n => n.startsWith('j_' + WEAR.skin + '_') && ok(IMG[n]))) return false;
    if (!dogRig(WEAR.pup) && !Object.keys(IMG).some(n => n.startsWith(WEAR.pup + '_') && ok(IMG[n]))) return false;
    if (S.level === 1 && S.phase === 'intro' && !Rig.ok(rigOf('decoy'))) return false;
    return true;
  }
  function update(dt) {
    if (!S.ready) { if (loaded()) S.ready = true; else { S.waitT = (S.waitT || 0) + dt; if (S.waitT < 12) { preload(S.level); return; } S.ready = true; } }
    S.t += dt;
    if (S.phase === 'intro') {
      const v = S.vil; v.t += dt; v.typed += dt * 28;
      if (!v.leaving && v.t > .56) v.t = .56;                      // stands and talks until tapped through
      if (v.leaving && v.t > 2.05) { S.vil = null; S.phase = 'play'; S.t = 0; refreshUI(); }
      return;
    }
    if (S.phase !== 'play') return;
    // once a sign is fully on screen the world holds still for a second, Jacques running on the spot, so it can be read
    if (S.hold > 0) S.hold -= dt;
    const slow = S.vil ? 0 : S.hold > 0 ? 0 : S.ouch > 0 ? .35 : 1;
    S.speed = Math.min(.5, S.speed + .003 * dt);
    const v = S.speed * slow;
    S.dist += v * dt;
    if (S.vil) {   // the evil guy's visit: everything else waits while he clubs Jacques
      const was = S.vil.t; S.vil.t += dt;
      if (was < .83 && S.vil.t >= .83) { S.ouch = .9; S.flashRed = .4; S.bits.push({ kind: 'ouch', t: 0 }); }
      if (S.vil.t > 2.05) {
        S.vil = null;
        const after = () => { if (S.lives > MISTAKES) { S.phase = 'over'; setTimeout(gameOver, 300); } else S.phase = 'play'; };
        if (S.card && typeof openMemo === 'function') {   // the game waits while the word's memory card is read
          const c = S.card; S.card = null; S.phase = 'card';
          const p = getProg(user)[c.w.id];
          openMemo(c.w, p ? p.s || 0 : 0, c.why, () => { if (S) after(); }, 'Got it — keep running!');
        } else after();
      }
    }
    for (const c of S.clouds) { c.x -= (c.drift + v * c.par) * dt; if (c.x < -.4) { c.x = 1.1 + Math.random() * .3; c.y = c.layer === 0 ? rnd(.02, .3) : c.layer === 1 ? rnd(.15, .55) : rnd(.35, .8); } }
    if (slow || (S.hold > 0 && !S.vil)) { S.dustT -= dt; if (S.dustT <= 0) { S.dustT = .22; S.bits.push({ kind: 'dust', i: [0, 1, 2, 4, 5][Math.floor(Math.random() * 5)], x: JX - .04 - Math.random() * .02, t: 0 }); } }
    if (S.invuln > 0) S.invuln -= dt; if (S.flashRed > 0) S.flashRed -= dt;
    if (S.ouch > 0) S.ouch -= dt; if (S.shake > 0) S.shake -= dt;
    // signs
    S.nextSign -= dt;
    const gap = Math.max(1.2, 2.6 - S.t * .02);
    const bw = boardW() / W, lastX = S.signs.length ? Math.max(...S.signs.map(s => s.x)) : -9;
    if (S.nextSign <= 0 && lastX + bw < .55 && !S.vil && S.made < quota(S.level)) { makeSign(); S.nextSign = gap; }
    if (S.made >= quota(S.level) && !S.vil && !S.signs.some(x => x.state === 'up') && S.swing < 0) { S.phase = 'won'; setTimeout(levelClear, 500); return; }
    const CX = JX;
    for (const s of S.signs) {
      s.x -= v * dt; s.wob += dt;
      if (s.state === 'up' && !s.seen && s.x + bw <= 1) { s.seen = true; S.hold = 1; if (typeof Speak !== 'undefined') Speak.say(s.w.show); }
      if (s.state === 'up' && s.x + bw < CX - .02) {   // it has passed him only once the whole board is behind him
        // it got past Jacques
        s.state = 'passed';
        if (s.correct) { S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); S.score += 10; S.right++; earnCoin(); recordAnswer(user, s.w, true); S.bits.push({ kind: 'tick', x: Math.max(.2, s.x + bw / 2), t: 0 }); }
        else { S.wrong++; recordAnswer(user, s.w, false); hurt(s.w.pic ? `That note is ${s.w.english}, not ${s.shown} — you let it past!` : `“${s.w.show}” doesn’t mean “${s.shown}” — you let it past!`, s.w); }
      }
    }
    S.signs = S.signs.filter(s => s.x > -(bw + .5));   // kept until judged: a board is 80% of a phone's width, so it is well off the left edge before it is wholly behind Jacques
    // hammer swing: impact a moment after the tap
    if (S.swing >= 0) {
      S.swing += dt;
      if (!S.hitDone && S.swing >= .32) {
        S.hitDone = true; S.shake = .22;
        for (let i = 0; i < 4; i++) S.bits.push({ kind: 'dust', i: [0, 1, 2, 4, 5][i], x: JX + .08 + i * .04, t: 0 });
        const target = S.signs.find(s => s.state === 'up' && s.x < CX + .3 && s.x + bw > CX - .02);
        if (target) {
          target.state = 'smashed'; target.smashT = 0;
          const hx = Math.max(target.x, CX + .05); smashSign(target);
          if (!target.correct) { S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); earnCoin(); const pts = 25 + 5 * Math.min(10, S.combo - 1); S.score += pts; S.right++; recordAnswer(user, target.w, true, Date.now() - target.at); S.bits.push({ kind: 'pop', x: hx, t: 0, text: '' }); }
          else { S.wrong++; recordAnswer(user, target.w, false); hurt(target.w.pic ? `That note really is ${target.shown} — don’t smash the right ones!` : `“${target.w.show}” really does mean “${target.shown}” — don’t smash the right ones!`, target.w); }
        }
      }
      if (S.swing > .55) S.swing = -1;
    }
    for (const b of S.bits) { b.t += dt; if (b.kind === 'coin') { if (b.t >= 1 && !b.landed) { b.landed = true; S.coinsShown += b.n; refreshUI(); const el = ui.score; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } } else if (b.kind === 'plank') { b.x += b.vx * dt; b.vy += 2.2 * dt; b.y += b.vy * dt; b.r += 3 * dt; } else if (b.kind === 'dust') b.x -= v * dt * .6; else if (b.kind === 'half') { b.x += b.vx * dt; b.vy += H * 2.2 * dt; b.y += b.vy * dt; b.rot += b.vr * dt; } }
    S.bits = S.bits.filter(b => b.t < (b.kind === 'plank' || b.kind === 'half' ? 1.2 : b.kind === 'dust' ? .6 : b.kind === 'coin' ? 1 : .9));
    for (const s of S.signs) if (s.state === 'smashed') s.smashT += dt;
    S.signs = S.signs.filter(s => !(s.state === 'smashed' && s.smashT > .1));
    refreshUI();
  }
  function hurt(why, w) {
    if (S.invuln > 0 || S.vil) return;
    S.lives++; S.invuln = 3; S.combo = 0; S.vil = { t: 0 }; S.swing = -1; S.card = { w, why };
    ui.why.textContent = why; ui.why.classList.remove('show'); void ui.why.offsetWidth; ui.why.classList.add('show');
  }
  // the run's coins are banked into the save the moment a level ends, and the counter reads the save: the overlay and
  // the counter then always agree (before, coins still flying to the counter, or a sync that had changed the save
  // meanwhile, left the two apart)
  function bank() { S.won = S.coins; S.coins = 0; S.coinsShown = 0; S.bits = S.bits.filter(b => b.kind !== 'coin'); refreshUI(); }
  function levelClear() {
    const sv = store.get(saveKey, { best: 0 });
    const next = S.level + 1, L = levelOf(next), r = S.right - S.right0, w = S.wrong - S.wrong0, coins = coinsFor(r, w);
    store.set(saveKey, { ...sv, best: Math.max(sv.best || 0, S.score), level: Math.max(sv.level || 1, next), cleared: Math.max(sv.cleared || 0, S.level), coins: (sv.coins || 0) + S.coins + coins, earned: (sv.earned || 0) + S.coins + coins });
    bank();
    Celebrate(innerWidth / 2, innerHeight / 3, 2);
    const go = () => { const sc = S.score; newGame(next, sc); preload(next); start(); };
    showOverlay(`⭐ ${levelOf(S.level).scene} cleared!`, `<b class="hcoin">+${S.won} coins</b> on the way, <b class="hcoin">+${coins}</b> for the level${w === 0 ? ' (perfect!)' : ''} · you have ${saved().coins || 0}<br>${r} right, ${w} wrong<br><br>Next stop: <b>${L.scene}</b> — dress Jacques for it in Items`, `On to ${L.scene}`, go, `<button class="btn ghost ovbtn" id="hvShop">🛍️ Items</button>`);
    ui.overlay.querySelector('#hvShop').onclick = () => { ui.overlay.hidden = true; openItems(go, 'Next: ' + L.scene); };
  }
  function gameOver() {
    const sv = store.get(saveKey, { best: 0 });
    const best = Math.max(sv.best || 0, S.score); const isBest = S.score > (sv.best || 0);
    store.set(saveKey, { ...sv, best, plays: (sv.plays || 0) + 1, coins: (sv.coins || 0) + S.coins });   // the coins picked up on the way are kept
    bank();
    const lv = S.level;
    showOverlay('Too many wrong!', `More than ${MISTAKES} signs wrong, so it's back to the start of <b>${levelOf(lv).scene}</b>.<br><b class="hcoin">+${S.won} coins</b> kept · you have ${saved().coins || 0}<br>${S.right} right, ${S.wrong} wrong`, `${levelOf(lv).scene} from the start`, () => { newGame(lv); start(); }, `<button class="btn ghost ovbtn" id="hvShop">🛍️ Items</button>`);
    ui.overlay.querySelector('#hvShop').onclick = () => { ui.overlay.hidden = true; openItems(() => { newGame(lv); start(); }, levelOf(lv).scene); };
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
  let WEAR = { skin: 'standard', weapon: 'hammer', pup: 'g' };
  const img = n => { if (!IMG[n]) { const i = new Image(); i.onerror = () => setTimeout(() => { if (IMG[n] === i) delete IMG[n]; }, 4000); i.src = ART + n + '.png'; IMG[n] = i; } return IMG[n]; };   // a picture that fails to load is asked for again a few seconds later
  const ok = i => i.complete && i.naturalWidth > 0;
  // part boxes in the rig's own pixel space [x0, y0, x1, y1]
  const JPIV = [57, 125], HAND = [79, 72];                                        // feet centre and right hand, in rig pixels
  const DEC = { body: [7, 102, 162, 221], head: [29, 62, 106, 142], eyes: [40, 101, 71, 107], smile2: [44, 110, 68, 115], leftarm: [20, 128, 61, 214], lefthand: [32, 150, 62, 215], rightarm: [75, 121, 123, 201], weapon: [44, 4, 177, 211], righthand: [62, 151, 103, 213] };
  const DHAND = [82, 182], DENTER = { 1: [24, 74, 149, 106], 2: [4, 43, 149, 106], 3: [11, 50, 149, 106], 4: [25, 55, 147, 106], 5: [28, 29, 139, 106], 6: [28, 8, 123, 106], 7: [29, 1, 123, 106] };
  const DOG = { sitting2: [17, 26, 73, 68], tail: [8, 21, 29, 43], run1: [8, 26, 74, 68], run2: [3, 26, 73, 68], run3: [13, 26, 79, 68], run4: [2, 26, 74, 68], legs: [12, 26, 72, 68], head: [42, 13, 83, 39], leftear: [47, 8, 63, 18], rightear: [65, 7, 77, 19],
    chin: [65, 36, 80, 44], inside: [65, 31, 79, 41], tongue: [72, 36, 80, 47], openlefteye: [65, 26, 68, 31], openrighteye: [76, 25, 79, 29], lefteyebrow: [63, 21, 69, 26], righteyebrow: [75, 21, 79, 26] };
  const PRELOAD = ['fx_ready', 'fx_tap1', 'fx_tap2', 'fx_star2', 'fx_redstar', 'fx_smallstar', 'ui_combo', ...Object.keys(DEC).map(p => 'd_' + p),
    ...[1, 2, 3, 4, 5, 6, 7].map(n => 'd_enter' + n), ...Object.keys(DOG).map(p => 'g_' + p), ...[0, 1, 2, 4, 5].map(n => 'fx_dust' + n)];
  const SKIP = /^layer /;
  function preload(n) {
    const L = levelOf(n); preloadScene(L); WEAR = wear(); img('w_' + WEAR.weapon); rigOf('jacque'); rigOf('decoy'); rigOf(WEAR.pup === 'g' ? 'dog' : 'dog_' + WEAR.pup);
    for (const st of [(n - 1) % 6, 6, 7]) { img('sign' + st); img('sign' + st + '_l'); img('sign' + st + '_r'); }
    if (META) for (const p in META.jacque[WEAR.skin]) if (!SKIP.test(p)) img(`j_${WEAR.skin}_${p}`);
    for (const p in DOG) img(WEAR.pup + '_' + p);
  }
  // draw one rig part: box is in rig pixels, (px,py) the rig point that sits at screen (sx,sy), k the scale
  function part(name, box, px, py, sx, sy, k) {
    const i = img(name); if (!ok(i)) return;
    ctx.drawImage(i, sx + (box[0] - px) * k, sy + (box[1] - py) * k, (box[2] - box[0]) * k, (box[3] - box[1]) * k);
  }
  const GROUND = .93;
  // parallax clouds: three layers. Far clouds are small, pale and slow; near ones big, bright and quick.
  // Each layer scrolls at a fraction of the run speed, plus a little drift of its own so the sky moves even when Jacques stops.
  const CLOUD_SHAPES = [[[0, 8, 7], [8, 4, 9], [17, 6, 8], [24, 10, 6], [12, 11, 7]], [[0, 6, 5], [6, 2, 7], [14, 4, 6], [20, 7, 5]], [[0, 10, 8], [9, 5, 10], [20, 3, 9], [30, 8, 7], [16, 12, 8], [36, 11, 5]], [[0, 5, 5], [5, 2, 6], [11, 5, 5]]];
  const jScale = () => Math.min(H * .24, W * .5) / 116;
  // the artist's Spine rigs (art/rigs/jacque, decoy, dog): Jacque's skins are the costumes; seven costumes came only as flat pictures and keep the old part-by-part drawing
  const RIG_SKIN = { standard: 'Basic', standardred: 'BasicRed', standardgold: 'BasicGold', beach: 'Beach', coolbeach: 'CoolBeach', coolbeachyellow: 'CoolBeachYellow', farmer: 'Farmer', farmerdenim: 'FarmerDenim',
    lumberjacque: 'LumberJacque', lumberjacquebearded: 'LumberJacqueBearded', biker: 'Biker', greek: 'Greek', dragqueen: 'DragQueen', hotdog: 'Hotdog', bunny: 'Bunny', peapod: 'Peapod', banana: 'Banana', monkey: 'Monkey', dino: 'Dino' };
  const rigOf = key => typeof Rig !== 'undefined' ? Rig.load(key) : null;
  const jacqueRig = skin => { const r = RIG_SKIN[skin] && rigOf('jacque'); return r && Rig.ok(r) ? r : null; };
  const dogRig = pup => { const r = rigOf(pup === 'g' ? 'dog' : 'dog_' + pup); return r && Rig.ok(r) ? r : null; };
  // our weapon pictures are held where the artist's hammer sits in the rig: same pixel scale, same bottom-right corner in the hand
  const weaponHook = im => (c) => { if (!ok(im)) return; c.translate(48.03, -3.62); c.rotate(-139.89 * Math.PI / 180); c.scale(1, -1); c.drawImage(im, 64 - im.naturalWidth, 59 - im.naturalHeight, im.naturalWidth, im.naturalHeight); };
  const CLOUD_SPR = [];
  function cloudSprite(i) {
    if (CLOUD_SPR[i]) return CLOUD_SPR[i];
    const sh = CLOUD_SHAPES[i], px = 3;   // drawn chunky, then scaled with no smoothing, to match the pixel art
    let x1 = 0, y1 = 0; for (const [x, y, r] of sh) { x1 = Math.max(x1, x + r * 2); y1 = Math.max(y1, y + r * 2); }
    const c = document.createElement('canvas'); c.width = (x1 + 2) * px; c.height = (y1 + 3) * px; const g = c.getContext('2d');
    const blob = (col, dy) => { g.fillStyle = col; for (const [x, y, r] of sh) { g.beginPath(); g.arc((x + r + 1) * px, (y + r + 1 + dy) * px, r * px, 0, 7); g.fill(); } };
    blob('#C9DCF0', 1.2); blob('#FFFFFF', 0);                         // soft shadow underneath, white top
    g.fillStyle = '#E8F2FC'; for (const [x, y, r] of sh) { g.beginPath(); g.arc((x + r + 1) * px, (y + r + 1) * px, r * px, 0.1, Math.PI - .1); g.fill(); }   // lower half a touch blue
    return CLOUD_SPR[i] = c;
  }
  function makeClouds() {
    const out = [];
    const add = (layer, n) => { for (let i = 0; i < n; i++) out.push({ layer, i: Math.floor(Math.random() * CLOUD_SHAPES.length), x: Math.random() * 1.5 - .3,
      y: layer === 0 ? rnd(.02, .3) : layer === 1 ? rnd(.15, .55) : rnd(.35, .8),
      s: layer === 0 ? rnd(.5, .7) : layer === 1 ? rnd(.85, 1.1) : rnd(1.3, 1.7), par: [.08, .2, .45][layer], drift: [.004, .008, .014][layer], alpha: [.55, .8, 1][layer] }); };
    add(0, 5); add(1, 4); add(2, 3);
    return out;
  }
  function drawBackground() {
    const g = ctx, L = lev(), d = SCENE_DATA && SCENE_DATA[L.key], ground = H * GROUND;
    const bh = Math.min(H * .6, W * .9), k = bh / 289;   // the artist composed these at 512x289: k maps sheet pixels to the screen
    if (!d || !ok(sceneImg(d.sky))) {   // the scene is still on its way: plain sky and ground, and a word to say so
      if (!d) preloadScene(L); else { sceneImg(d.sky); if (d.ground) sceneImg(d.ground); }
      g.fillStyle = '#8FD3FF'; g.fillRect(0, 0, W, H); g.fillStyle = '#9a9a9a'; g.fillRect(0, ground, W, H - ground);
      if (S.ready) { g.fillStyle = 'rgba(0,0,0,.35)'; g.font = `600 ${Math.round(W * .04)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('Loading the scene…', W / 2, ground * .5); } return;
    }
    // the sky: stretched over the whole width, its bottom on the ground line; above it the sky's own top colour
    const sky = sceneImg(d.sky), skyH = Math.max(d.skyh * k, ground * .8), skyTop = ground - skyH;   // on a tall phone the sky block is stretched up to fill most of the screen
    g.drawImage(sky, 0, 0, 1, 1, 0, 0, W, Math.max(0, skyTop) + 1); g.drawImage(sky, 0, skyTop, W, skyH + 1);
    const run = S.dist * W * .9;   // how far the run has scrolled, in pixels
    const row = (pieces, speed, spacing, place) => {   // draw a layer's props: index i covers world x = i*spacing (+ wobble), scrolled at `speed` of the run
      if (!pieces.length) return;
      const span = spacing * k, first = Math.floor((run * speed - W) / span) - 1, last = Math.floor((run * speed + W) / span) + 1;
      for (let i = first; i <= last; i++) {
        const p = pieces[Math.floor(hash(i, L.key.length) * pieces.length)], im = sceneImg(p.f); if (!ok(im)) continue;
        const x = i * span + hash(i, 7) * span * .5 - run * speed, w = p.w * k, h = p.h * k;
        place(im, x, w, h, p, i);
      }
    };
    // hills, clouds, suns, moons: barely move. Each far piece is classed by hand in scenes.json (kind): 'ground' pieces
    // (hills, mountains, a distant castle) stand on the horizon behind the ground strip; 'sky' pieces (clouds, suns, moons)
    // float in the upper sky at a height picked by their index, so a tall phone's stretched sky has them high up, not on
    // the hilltops; 'top' pieces (a cave's stalactites) hang from the top edge; 'skyrot' are clouds the sheet had on
    // their side, drawn turned upright
    const horizon = d.ground ? ground - d.gh * k * .45 : ground;
    row(d.far, .12, 300, (im, x, w, h, p, i) => {
      if (p.kind === 'ground' || !p.kind) g.drawImage(im, x, horizon - h, w, h);
      else if (p.kind === 'top') g.drawImage(im, x, 0, w, h);
      else if (p.kind === 'skyrot') { const fy = skyTop + (.08 + .32 * hash(i, 11)) * skyH; g.save(); g.translate(x + h / 2, fy + w / 2); g.rotate(-Math.PI / 2); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); }
      else { const fy = skyTop + (.06 + .34 * hash(i, 13)) * skyH; g.drawImage(im, x, Math.min(fy, horizon - h - 40 * k), w, h); }
    });
    row(d.mid, .45, 420, (im, x, w, h) => g.drawImage(im, x, ground + 4 * k - h, w, h));         // trees, pillars, buildings: half speed, standing on the ground
    if (d.ground && ok(sceneImg(d.ground))) {   // the ground strip, at run speed
      const gi = sceneImg(d.ground), gh = d.gh * k, gw = d.gw * k, off = run % gw;
      for (let x = -off; x < W; x += gw - .5) g.drawImage(gi, x, ground - gh + 6 * k, gw + 1, gh);
      g.fillStyle = '#9a9a9a'; g.fillRect(0, ground + 6 * k - 1, W, H - ground + 1);
    } else { g.fillStyle = '#9a9a9a'; g.fillRect(0, ground, W, H - ground); }
    row(d.near, 1, 260, (im, x, w, h) => g.drawImage(im, x, ground + 6 * k - h, w, h));          // bushes, benches, grass: at run speed, in front of the ground strip
  }
  function drawJacques() {
    const g = ctx, k = jScale(), x = W * JX, ground = H * GROUND;
    const running = S.phase === 'play' && S.vil == null;
    const cyc = running ? S.t * 10 : 0, bob = running ? Math.abs(Math.sin(cyc * Math.PI / 2)) * 2.5 : 0;
    const stumble = S.ouch > 0 ? Math.sin(S.ouch * 12) * .14 : 0;
    // the swing: he leaps up, winds the hammer back over his head, then brings it down with all his weight as he lands
    const sw = S.swing, swinging = sw >= 0;
    const jump = !swinging ? 0 : sw < .2 ? Math.sin(sw / .2 * Math.PI / 2) * 38 : sw < .32 ? 38 * (1 - (sw - .2) / .12) : 0;
    const squash = swinging && sw >= .32 && sw < .45 ? 1 - .12 * Math.sin((sw - .32) / .13 * Math.PI) : 1;
    if (swinging && sw >= .2 && sw < .36) {   // speed lines down the hammer's path
      g.strokeStyle = 'rgba(40,20,20,.55)'; g.lineWidth = Math.max(1.5, k * 1.2);
      for (let i = 0; i < 5; i++) { const lx = x + (70 + i * 14) * k, top = ground - (150 - i * 12) * k; g.beginPath(); g.moveTo(lx, top); g.lineTo(lx - 10 * k, top + (60 + i * 10) * k); g.stroke(); }
    }
    const skin = WEAR.skin, jr = jacqueRig(skin);
    if (jr) {   // the artist's rig: Walk while running, Attack for the swing (its own leap), Hit when clubbed, Idle while the evil guy talks
      g.save(); g.translate(x, ground); g.rotate(stumble);
      if (S.invuln > 0 && Math.floor(S.t * 12) % 2) g.globalAlpha = .45;
      let anim = 'Idle', t = S.t % 2;
      if (swinging) { anim = 'Attack'; t = Math.min(1.6, sw / .55 * 1.67); }
      else if (S.ouch > 0) { anim = 'Hit'; t = Math.min(2.6, (.9 - S.ouch) * 2.2); }
      else if (running) { anim = 'Walk'; }
      Rig.draw(g, jr, anim, t, 0, 0, k, { skin: RIG_SKIN[skin], hooks: { Weapon: weaponHook(img('w_' + WEAR.weapon)) } });
      g.restore(); return;
    }
    g.save(); g.translate(x, ground - jump * k); g.scale(1 / squash, squash); g.rotate(stumble);
    if (S.invuln > 0 && Math.floor(S.t * 12) % 2) g.globalAlpha = .45;
    const RIG = META && META.jacque[skin];
    if (!RIG) { g.restore(); return; }
    const legs = swinging ? (sw < .3 && RIG.jumplegs ? 'jumplegs' : 'hittinglegs') : running ? 'run' + (1 + Math.floor(cyc) % 4) : 'legs';
    const P = (n, dy = 0) => { if (RIG[n]) part(`j_${skin}_${n}`, RIG[n], JPIV[0], JPIV[1], 0, -bob + dy, k); };
    const L = RIG[legs], lw = (L[2] - L[0]) * k, lh = (L[3] - L[1]) * k;       // leg frames are centred under him
    if (RIG.tail) P('tail'); if (RIG.tails) P('tails');
    const li = img(`j_${skin}_${legs}`); if (ok(li)) g.drawImage(li, -lw / 2, -lh, lw, lh);
    if (RIG.body) P('body');                                                   // costumes that came as one picture
    else { P('leftarm'); P('lefthand'); P('chest'); P('head'); P((S.t % 3.3) < .14 ? 'eyesclosed' : 'eyesopen'); P('rightarm'); }
    // the hammer swings about his right hand: resting over the shoulder, then whipped down in front
    const a = !swinging ? Math.sin(S.t * 10) * .04 : sw < .2 ? -sw / .2 * .9 : sw < .32 ? -.9 + (sw - .2) / .12 * 3.2 : Math.max(0, 2.3 - (sw - .32) / .23 * 2.3);
    const hx = (HAND[0] - JPIV[0]) * k, hy = (HAND[1] - JPIV[1]) * k - bob;
    g.save(); g.translate(hx + (HAND[0] - HAND[0]) * k + 2 * k, hy + 4 * k); g.rotate(a);
    const hm = img('w_' + WEAR.weapon); if (ok(hm)) g.drawImage(hm, -(hm.naturalWidth - 9) * k, -(hm.naturalHeight - 11) * k, hm.naturalWidth * k, hm.naturalHeight * k);   // every weapon is held by its bottom-right corner
    g.restore();
    P('righthand');
    g.restore();
  }
  // the dog follows Jacques: trots behind him, drops back and catches up, hops when he swings, sits when he stops
  function drawDog() {
    const g = ctx, k = jScale() * .95, ground = H * GROUND;
    const running = S.phase === 'play' && S.vil == null;
    const want = running ? -72 + Math.sin(S.t * .6) * 9 + Math.sin(S.t * 1.7) * 3 : -66;
    S.dogX = S.dogX == null ? want : S.dogX + (want - S.dogX) * .04;
    if (S.swing >= 0 && S.swing < .02 && S.dogHop <= 0) S.dogHop = .4;
    if (S.dogHop > 0) S.dogHop -= 1 / 60;
    const hop = S.dogHop > 0 ? Math.sin((1 - S.dogHop / .4) * Math.PI) * 14 : 0;
    const x = W * JX + S.dogX * jScale();
    const cyc = running ? S.t * 10 + 1.5 : 0, bob = running ? Math.abs(Math.sin(cyc * Math.PI / 2)) * 2 : 0;
    const dr = dogRig(WEAR.pup);
    if (dr) {   // the artist's rig: trots, sits when Jacques stops, hops with the swing
      g.save(); g.translate(x, ground - hop * k);
      const anim = running || S.dogHop > 0 ? 'Walk' : S.vil && S.vil.talk ? 'Talk' : 'Sit', t = anim === 'Sit' ? Math.min(2.6, (S.dogSit = (S.dogSit || 0) + 1 / 60) * 1.4) : (S.t + 1) % 2.67;
      if (anim !== 'Sit') S.dogSit = 0;
      Rig.draw(g, dr, anim, t, 0, 0, k * .9); g.restore(); return;
    }
    g.save(); g.translate(x, ground - (bob + hop) * k);
    const P = n => part(WEAR.pup + '_' + n, DOG[n], 43, 68, 0, 0, k);
    P('tail'); P(running ? 'run' + (1 + Math.floor(cyc) % 4) : S.dogHop > 0 ? 'run2' : 'sitting2'); P('head'); P('leftear'); P('rightear'); P('chin'); P('inside'); P('tongue');
    if ((S.t % 4) > .12) { P('openlefteye'); P('openrighteye'); }
    P('lefteyebrow'); P('righteyebrow');
    g.restore();
  }
  // still pictures for the items screen: Jacques in a costume, a hammer, or a pup
  function thumb(kind, id, size = 96) {
    const c = document.createElement('canvas'); c.width = c.height = size * 2; const g = c.getContext('2d'); g.scale(2, 2); g.imageSmoothingEnabled = false;
    const saveCtx = ctx; ctx = g;
    try {
      const jr = kind === 'costume' && jacqueRig(id), dr = kind === 'pup' && dogRig(id);
      if (jr) { g.imageSmoothingEnabled = false; Rig.draw(g, jr, 'Idle', 0, size * .5, size * .96, size * .68 / 116, { skin: RIG_SKIN[id], hooks: { Weapon: () => {} } }); }
      else if (dr) { Rig.draw(g, dr, 'Idle', 0, size * .5, size * .9, size * .8 / 70); }
      else if (kind === 'costume' && META && META.jacque[id]) {
        const RIG = META.jacque[id], k = size * .72 / 116, x = size * .46, y = size * .96;
        const P = n => { if (RIG[n]) part(`j_${id}_${n}`, RIG[n], JPIV[0], JPIV[1], x, y, k); };
        if (RIG.tail) P('tail'); if (RIG.tails) P('tails'); P('legs');
        if (RIG.body) P('body'); else { P('leftarm'); P('lefthand'); P('chest'); P('head'); P('eyesopen'); P('rightarm'); }
        P('righthand');
      } else if (kind === 'hammer') {
        const i = img('w_' + id); if (ok(i)) { const k = size * .8 / Math.max(i.naturalWidth, i.naturalHeight); g.drawImage(i, (size - i.naturalWidth * k) / 2, (size - i.naturalHeight * k) / 2, i.naturalWidth * k, i.naturalHeight * k); }
      } else if (kind === 'pup') {
        const k = size * .8 / 80, x = size * .5, y = size * .9;
        const P = n => part(id + '_' + n, DOG[n], 43, 68, x, y, k);
        P('tail'); P('legs'); P('head'); P('leftear'); P('rightear'); P('chin'); P('inside'); P('tongue'); P('openlefteye'); P('openrighteye'); P('lefteyebrow'); P('righteyebrow');
      }
    } finally { ctx = saveCtx; }
    return c;
  }
  // the evil guy: rises out of the ground to the right, clubs Jacques with his signpost, sinks back
  function drawVillain() {
    const v = S.vil; if (!v) return;
    const g = ctx, kd = jScale() * .82, ground = H * GROUND, vx = W * JX + 62 * jScale();
    const t = v.t, vr = rigOf('decoy');
    if (vr && Rig.ok(vr)) {   // the artist's rig: rises (Spawn), laughs while talking, swings (Attack), sinks away (Death)
      g.save(); g.translate(vx, ground);
      let anim = 'Idle', tt = S.t % 2.67;
      if (v.leaving || t > 1.5) { anim = 'Death'; tt = Math.min(.5, Math.max(0, (t - 1.5) / .55 * .5)); }
      else if (t < .56) { anim = 'Spawn'; tt = t / .56 * .67; }
      else if (v.talk) { anim = Math.floor(S.t / 2.67) % 2 ? 'Laugh' : 'Idle'; tt = S.t % 2.67; }
      else { anim = 'Attack'; tt = Math.min(2, (t - .56) / .94 * 2); }
      Rig.draw(g, vr, anim, tt, 0, 0, kd); g.restore();
      if (v.talk && !v.leaving) drawBubble(v, vx + 40 * kd, ground - 150 * kd);
      return;
    }
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
  /* ---------- signs: the artist's boards, one style per level; green/red once judged; split in two when smashed ---------- */
  const SIGN_TOP = 14, SIGN_BOT = 100;                 // image rows: top edge | stretchable face | bottom edge and posts
  const signStyle = s => s.state === 'passed' ? (s.correct ? 6 : 7) : (S.level - 1) % 6;
  const signGeom = () => { const sw = boardW(), sh = Math.min(sw * .42, H * .2); return { sw, sh, top: H * GROUND - 100 * jScale() - sh * .5 }; };
  // draw a board image (whole or a half) with its face stretched to make the board `sh` tall; posts run on down to the ground
  function drawBoard(name, sg, posts, x, top, f, sh, ground, rot) {
    const i = img(name); if (!ok(i)) return false;
    const g = ctx, iw = i.naturalWidth, ih = i.naturalHeight, faceH = Math.max(1, sh - (SIGN_TOP + 15) * f), w = iw * f;
    g.save();
    if (rot) { g.translate(x + w / 2, top + sh / 2); g.rotate(rot); g.translate(-(x + w / 2), -(top + sh / 2)); }
    g.drawImage(i, 0, 0, iw, SIGN_TOP, x, top, w, SIGN_TOP * f);
    g.drawImage(i, 0, SIGN_TOP, iw, SIGN_BOT - SIGN_TOP, x, top + SIGN_TOP * f, w, faceH);
    const by = top + SIGN_TOP * f + faceH, bh = (ih - SIGN_BOT) * f;
    g.drawImage(i, 0, SIGN_BOT, iw, ih - SIGN_BOT, x, by, w, bh);
    if (ground != null && posts) { g.fillStyle = sg.post; for (const p of posts) g.fillRect(x + p[0] * f, by + bh - 1, (p[1] - p[0]) * f, ground - by - bh + 1); }
    g.restore(); return true;
  }
  const PICS = {};
  const wordPic = w => { let i = PICS[w.pic]; if (!i) { i = PICS[w.pic] = new Image(); i.src = w.pic; } return i; };
  function drawSign(s) {
    if (s.state === 'smashed') return;
    const g = ctx, x = s.x * W, ground = H * GROUND, { sw, sh, top } = signGeom();
    const st = signStyle(s), sg = META && META.signs && META.signs[st];
    const f = sg ? sw / sg.w : 0;
    if (!sg || !drawBoard('sign' + st, sg, sg.posts, x, top, f, sh, ground, 0)) {   // plain board until the art arrives
      g.fillStyle = '#2a1a10'; g.fillRect(x - 3, top - 3, sw + 6, sh + 6); g.fillStyle = '#e8c27a'; g.fillRect(x, top, sw, sh);
      g.fillStyle = '#8a5a2a'; g.fillRect(x + sw * .15, top + sh, sw * .06, ground - top - sh); g.fillRect(x + sw * .79, top + sh, sw * .06, ground - top - sh);
    }
    const faceTop = top + SIGN_TOP * f, faceH = sh - (SIGN_TOP + 15) * f;
    g.save(); g.translate(x, 0);
    g.fillStyle = st === 7 ? '#5a1010' : st === 6 ? '#143d14' : '#2B1A3A'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (s.w.pic) {   // a word that is a picture (a note on a stave) is drawn on a pale card on the sign
      const im = wordPic(s.w), pw = Math.min(sw * .8, faceH * .62 * 4 / 3), ph = pw * .75, px = (sw - pw) / 2, py = faceTop + faceH * .02;
      g.fillStyle = 'rgba(255,252,240,.95)'; g.beginPath(); if (g.roundRect) g.roundRect(px, py, pw, ph, 6); else g.rect(px, py, pw, ph); g.fill();
      if (im.complete && im.naturalWidth) g.drawImage(im, px, py, pw, ph);
      g.fillStyle = st === 7 ? '#5a1010' : st === 6 ? '#143d14' : '#2B1A3A';
    } else {
    let fs = Math.round(faceH * .42); g.font = `700 ${fs}px Georgia, serif`;
    while (g.measureText(s.w.show).width > sw * .84 && fs > 10) { fs--; g.font = `700 ${fs}px Georgia, serif`; }
    g.fillText(s.w.show, sw / 2, faceTop + faceH * .3);
    }
    let f2 = Math.round(faceH * .3); g.font = `700 ${f2}px system-ui, sans-serif`;
    while (g.measureText(s.shown).width > sw * .86 && f2 > 9) { f2--; g.font = `700 ${f2}px system-ui, sans-serif`; }
    g.fillText(s.shown, sw / 2, faceTop + faceH * .74);
    g.restore();
  }
  // the two halves fly apart
  function smashSign(s) {
    const st = (S.level - 1) % 6, sg = META && META.signs && META.signs[st], { sw, sh, top } = signGeom();
    if (!sg) { for (let i = 0; i < 9; i++) S.bits.push({ kind: 'plank', x: s.x + .2, y: GROUND - .22, vx: rnd(-.25, .35), vy: rnd(-.9, -.3), r: rnd(0, 6), t: 0 }); return; }
    const f = sw / sg.w;
    S.bits.push({ kind: 'half', name: 'sign' + st + '_l', sg, posts: sg.lposts, x: s.x * W + sg.l[0] * f, y: top, f, sh, vx: -W * .25, vy: -H * .5, rot: 0, vr: -2.5, t: 0 });
    S.bits.push({ kind: 'half', name: 'sign' + st + '_r', sg, posts: sg.rposts, x: s.x * W + sg.r[0] * f, y: top, f, sh, vx: W * .3, vy: -H * .6, rot: 0, vr: 3, t: 0 });
  }
  function drawCoin(b) {
    const g = ctx, k = jScale(), t = b.t, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x0 = W * JX - 10 * k, y0 = H * GROUND - 150 * k, x1 = W - 26, y1 = 18;
    const x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - Math.sin(t * Math.PI) * 90 * k;   // up, over and down to the counter
    const r = 18 * Math.min(k, 1.6) * (1 - .45 * e), sx = Math.cos(t * Math.PI * 2);            // one full turn on the way: the face narrows to an edge and back
    g.save(); g.translate(x, y); g.scale(Math.max(.08, Math.abs(sx)), 1);
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = '#F2C230'; g.fill(); g.lineWidth = Math.max(1.5, r * .22); g.strokeStyle = '#B8860B'; g.stroke();
    g.beginPath(); g.arc(0, 0, r * .62, 0, Math.PI * 2); g.strokeStyle = '#D9A520'; g.lineWidth = Math.max(1, r * .12); g.stroke();
    g.fillStyle = '#FFF4B0'; g.beginPath(); g.ellipse(-r * .3, -r * .35, r * .22, r * .14, -.6, 0, Math.PI * 2); g.fill();
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
    ctx.save();
    if (S.shake > 0) ctx.translate(rnd(-4, 4) * S.shake / .22, rnd(-3, 3) * S.shake / .22);
    drawBackground();
    if (!S.ready) {   // still waiting for the pictures: the scene (or plain sky) with a word, nothing else moving yet
      const g = ctx, ground = H * GROUND; g.fillStyle = 'rgba(0,0,0,.4)'; g.font = `600 ${Math.round(W * .045)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('Loading the scene…', W / 2, ground * .5);
      ctx.restore(); return;
    }
    for (const s of S.signs) drawSign(s);
    const k = jScale() * .8;
    for (const b of S.bits) if (b.kind === 'dust') sprite('fx_dust' + b.i, b.x * W, H * GROUND - 6 * k, k * (.6 + b.t), .7 * (1 - b.t / .6));
    drawDog(); drawJacques(); drawVillain();
    for (const b of S.bits) {
      if (b.kind === 'half') { ctx.save(); ctx.globalAlpha = Math.min(1, 2 * (1.2 - b.t)); drawBoard(b.name, b.sg, null, b.x, b.y, b.f, b.sh, null, b.rot); ctx.restore(); }
      else if (b.kind === 'plank') { ctx.save(); ctx.translate(b.x * W, b.y * H); ctx.rotate(b.r); ctx.globalAlpha = 1 - b.t / 1.2; ctx.fillStyle = '#E8C27A'; ctx.fillRect(-W * .03, -H * .012, W * .06, H * .024); ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.strokeRect(-W * .03, -H * .012, W * .06, H * .024); ctx.restore(); }
      else if (b.kind === 'pop') { sprite('fx_star2', b.x * W, H * GROUND - 120 * jScale(), k * (1 + b.t * .6), 1 - b.t, b.t * 2); ctx.globalAlpha = 1 - b.t; ctx.fillStyle = '#FFD23F'; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 4; ctx.font = `900 ${jScale() * 44}px system-ui, sans-serif`; ctx.textAlign = 'center'; const py = H * GROUND - 170 * jScale() - b.t * H * .1; if (b.text) { ctx.strokeText(b.text, b.x * W, py); ctx.fillText(b.text, b.x * W, py); } ctx.globalAlpha = 1; }
      else if (b.kind === 'tick') { const ty = H * GROUND - 170 * jScale() - b.t * H * .1; sprite('fx_smallstar', b.x * W, ty, k * 1.2, 1 - b.t, b.t * 3); ctx.globalAlpha = 1 - b.t; ctx.fillStyle = '#2E7D4F'; ctx.font = `900 ${jScale() * 40}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✓', b.x * W + jScale() * 36, ty); ctx.globalAlpha = 1; }
      else if (b.kind === 'coin') drawCoin(b);
      else if (b.kind === 'ouch') sprite('fx_redstar', W * JX + 10, H * GROUND - jScale() * 70, k * (1.2 + b.t), 1 - b.t / .9, -b.t);
    }
    ctx.restore();
    drawHud();
    if (S.flashRed > 0) { ctx.fillStyle = `rgba(255,40,40,${S.flashRed * .6})`; ctx.fillRect(0, 0, W, H); }
  }

  /* ---------- DOM ---------- */
  function refreshUI() {
    ui.score.textContent = (saved().coins || 0) + S.coinsShown;
    if (ui.lev) ui.lev.textContent = `${S.made}/${quota(S.level)}`;
    const pl = stage && stage.querySelector('#hplace'); if (pl) pl.textContent = levelOf(S.level).scene;   // the place is named in the bar below (the top bar has no room on a phone)
    ui.lives.textContent = S.lives ? `✗ ${Math.min(S.lives, MISTAKES)}/${MISTAKES}` : ''; ui.lives.classList.toggle('warn', S.lives >= MISTAKES);
  }
  function showOverlay(title, sub, btn, fn, extra = '') {
    ui.overlay.hidden = false;
    ui.overlay.innerHTML = `<div class="ovbox"><h3>${title}</h3><p>${sub}</p><button class="btn ovbtn" id="hvBtn">${btn}</button>${extra}</div>`;
    ui.overlay.querySelector('#hvBtn').onclick = () => { ui.overlay.hidden = true; fn(); };
  }
  /* ---------- items: wear what you own, buy what you don't ---------- */
  let itemsTab = 'costume';
  function openItems(onClose, where) {
    const sv = saved(); WEAR = wear();
    img('ui_frame');
    for (const kind in CATALOGUE) for (const [id] of CATALOGUE[kind]) { if (kind === 'hammer') img('w_' + id); else if (kind === 'pup') for (const p in DOG) img(id + '_' + p); else if (META) for (const p in META.jacque[id] || {}) if (!SKIP.test(p)) img(`j_${id}_${p}`); }
    ui.overlay.hidden = false;
    ui.overlay.innerHTML = `<div class="hitems">
      <div class="hihead"><span class="hititle">ITEMS</span><span class="hicoins">🪙 <b id="hiCoins">${sv.coins || 0}</b></span><button class="hiclose" id="hiClose">close</button></div>
      <div class="hiframe"><canvas class="hiframebg"></canvas>
        <div class="hitabs">${['costume', 'hammer', 'pup', 'shop'].map(t => `<button data-t="${t}" class="${t === itemsTab ? 'on' : ''}">${{ costume: 'JACQUE', hammer: 'HAMMER', pup: 'PUP', shop: 'SHOP' }[t]}</button>`).join('')}</div>
        <div class="hibody"><div class="hiwho"><span class="hilv">${esc(where || (S ? levelOf(S.level).scene : ''))}</span><canvas id="hiMe"></canvas></div><div class="higrid" id="hiGrid"></div></div>
        <div class="hibar"><i id="hiBar"></i></div>
      </div>
      <div class="hinote" id="hiNote"></div></div>`;
    // the big frame, painted as a nine-slice so it stretches to any size
    const paintFrame = () => {
      const fr = ui.overlay.querySelector('.hiframe'), c = fr && fr.querySelector('.hiframebg'), i = img('ui_frame'); if (!c || !ok(i)) return;
      const w = fr.clientWidth, h = fr.clientHeight, d = Math.min(devicePixelRatio || 1, 2); if (!w || !h) return;
      if (c.width === Math.round(w * d) && c.height === Math.round(h * d) && c.dataset.ok) return;
      c.width = Math.round(w * d); c.height = Math.round(h * d); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.imageSmoothingEnabled = false;
      const iw = i.naturalWidth, ih = i.naturalHeight, L = 34, R = 34, T = 60, B = 36, sL = 30, sR = 30, sT = 50, sB = 30;
      const xs = [0, L, iw - R, iw], ys = [0, T, ih - B, ih], dx = [0, sL, w - sR, w], dy = [0, sT, h - sB, h];
      for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) g.drawImage(i, xs[q], ys[r], xs[q + 1] - xs[q], ys[r + 1] - ys[r], dx[q], dy[r], dx[q + 1] - dx[q] + .5, dy[r + 1] - dy[r] + .5);
      c.dataset.ok = '1';
    };
    const paint = () => {
      paintFrame();
      const sv = saved(); WEAR = wear();
      ui.overlay.querySelector('#hiCoins').textContent = sv.coins || 0;
      const me = ui.overlay.querySelector('#hiMe'), th = thumb('costume', WEAR.skin, 120); me.width = th.width; me.height = th.height; me.getContext('2d').drawImage(th, 0, 0);
      const total = COSTUMES.length + HAMMERS.length + PUPS.length - 3, got = (sv.owned || []).length;
      ui.overlay.querySelector('#hiBar').style.width = Math.round(100 * got / total) + '%';
      ui.overlay.querySelectorAll('.hitabs button').forEach(b => b.classList.toggle('on', b.dataset.t === itemsTab));
      const grid = ui.overlay.querySelector('#hiGrid'); grid.innerHTML = '';
      const list = itemsTab === 'shop' ? [].concat(...Object.keys(CATALOGUE).map(k => CATALOGUE[k].filter(x => !owns(k, x[0])).map(x => [k, ...x]))) : CATALOGUE[itemsTab].filter(x => owns(itemsTab, x[0])).map(x => [itemsTab, ...x]);
      ui.overlay.querySelector('#hiNote').textContent = itemsTab === 'shop' ? (list.length ? 'Tap something to buy it. Coins come from clearing levels.' : 'You own everything! 🎉') : 'Tap to wear it.';
      for (const [kind, id, name, price] of list) {
        const worn = (kind === 'costume' ? WEAR.skin : kind === 'hammer' ? WEAR.weapon : WEAR.pup) === id;
        const d = document.createElement('button'); d.className = 'hislot' + (worn ? ' worn' : '') + (itemsTab === 'shop' && (sv.coins || 0) < price ? ' poor' : '');
        d.appendChild(thumb(kind, id, 72));
        d.insertAdjacentHTML('beforeend', `<span class="hiname">${name}</span>${itemsTab === 'shop' ? `<span class="hiprice">🪙 ${price}</span>` : worn ? '<span class="hiprice">wearing</span>' : ''}`);
        d.onclick = () => {
          const sv = saved(), slot = kind === 'costume' ? 'skin' : kind === 'hammer' ? 'weapon' : 'pup';
          if (itemsTab === 'shop') {
            if ((sv.coins || 0) < price) { ui.overlay.querySelector('#hiNote').textContent = `You need ${price - (sv.coins || 0)} more coins for the ${name}.`; return; }
            const w = { ...(sv.wear || {}) }; w[slot] = id;
            store.set(saveKey, { ...sv, coins: (sv.coins || 0) - price, owned: [...(sv.owned || []), kind + ':' + id], wear: w });
            Celebrate(innerWidth / 2, innerHeight / 2, 1); itemsTab = kind;
          } else { const w = { ...(sv.wear || {}) }; w[slot] = id; store.set(saveKey, { ...sv, wear: w }); }
          preload(S ? S.level : 1); paint();
        };
        grid.appendChild(d);
      }
    };
    ui.overlay.querySelector('.hitabs').onclick = e => { const b = e.target.closest('button'); if (b) { itemsTab = b.dataset.t; paint(); } };
    ui.overlay.querySelector('#hiClose').onclick = () => { ui.overlay.hidden = true; preload(S ? S.level : 1); if (onClose) onClose(); };
    paint();
    if (!META) fetch(ART + 'meta.json').then(r => r.json()).then(m => { META = m; paint(); });
    let lastN = -1;   // repaint as pictures finish loading
    const tick = setInterval(() => { if (ui == null || ui.overlay.hidden || !ui.overlay.querySelector('.hitems')) { clearInterval(tick); return; } const n = Object.values(IMG).filter(ok).length; if (n !== lastN) { lastN = n; paint(); } else paintFrame(); }, 250);
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
    user = u; saveKey = NS_H + '.hammer.' + u.id; stage = root;
    const sv = store.get(saveKey, { best: 0 });
    root.className = 'pstage hstage';
    root.innerHTML = `
      <div class="ptop">
        <button class="iconbtn" id="hhome">← Home</button>
        <span class="plev">Jacques Hammer</span><span class="hlev" id="hlev"></span>
        <span class="ptag">${esc(opts.tag || '')}</span>
        <span class="hlives" id="hlives"></span>
        <div class="pcash"><span class="lbl">🪙</span><b id="hscore">0</b></div>
      </div>
      <div class="hbox" id="hbox"><canvas id="hcv"></canvas><div class="hwhy" id="hwhy"></div><div class="overlay" id="hover" hidden></div></div>
      <div class="hbar"><span class="small">Tap to swing. Smash <b>wrong</b> meanings, let <b>right</b> ones past.</span><span class="small">📍 <b id="hplace"></b></span></div>`;
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
    // the artist's start screen: tap anywhere on it to begin
    ui.overlay.hidden = false;
    const title = () => {
      ui.overlay.hidden = false;
      ui.overlay.innerHTML = `<div class="htitle"><div class="htsub">Next stop: <b>${levelOf(lv).scene}</b> — dress Jacques for it<br><span>🪙 ${saved().coins || 0} coins</span></div><button class="btn hiopen" id="hiOpen">🛍️ Items</button></div>`;
      ui.overlay.querySelector('.htitle').onclick = () => { ui.overlay.hidden = true; start(); };
      ui.overlay.querySelector('#hiOpen').onclick = e => { e.stopPropagation(); ui.overlay.hidden = true; openItems(title); };
    };
    title();
    if (opts.items) { ui.overlay.hidden = true; openItems(title); }
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
  return { mount, unmount, openItems, CATALOGUE, debug: { step, state: () => S, tap, makeSign } };
})();
