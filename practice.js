'use strict';

/* ---------- Practice: defend the garden from squishies; earn coins by matching words ----------
   Positions are in cells: squishies walk from x = COLS (right) towards x = 0 (left). */
const Practice = (() => {
  const ROWS = 6, COLS = 9, PADL = .75, PADR = .6, PADB = .34;   // mowers' path left, bushes right, picket fence below   // a strip for the lawnmowers on the left, bushes on the right
  const START_MONEY = 150, MATCH_COINS = 25, FREEZE_SECS = 5;
  // the artist's weapon set (art/weapons). kind: shoot = bullets along the row; beam = slows everything in front; ring = a sonic ring
  // that knocks the whole row back; lob = lobbed shells (Solar Blast anywhere, Miner along its row); mine = explodes when touched;
  // bomb = explodes after a fuse; brain = turns the squishy that bites it; wall = just soaks up bites. tiers[1..2] carry the upgrade cost.
  const GUNS = {
    shooter:      { name: 'Blaster', cost: 100, hp: 100, recharge: 5, art: 'blaster', kind: 'shoot', proj: 'bullet', dmg: 20, speed: 7, tiers: [{ every: 2, shots: 1 }, { every: 2, shots: 2, cost: 150 }, { every: 1 / 3, shots: 1, cost: 250 }], blurb: 'a bullet every 2 s; upgrades add barrels' },
    handy:        { name: 'Handy Turret', cost: 150, hp: 100, recharge: 8, art: 'handy', kind: 'shoot', proj: 'bullet', small: true, dmg: 7, speed: 9, tiers: [{ every: .5, shots: 1 }, { every: .33, shots: 1, cost: 150 }, { every: .2, shots: 1, cost: 250 }], blurb: 'sprays little bullets' },
    freezeturret: { name: 'Freeze Turret', cost: 175, hp: 100, recharge: 10, art: 'freezeturret', kind: 'shoot', proj: 'ice', dmg: 15, speed: 8, tiers: [{ every: 3, shots: 1, freeze: 1.5 }, { every: 2.2, shots: 1, freeze: 2, cost: 150 }, { every: 1.5, shots: 1, freeze: 2.5, cost: 250 }], blurb: 'ice shards freeze a squishy on the spot' },
    freezeray:    { name: 'Freeze Ray', cost: 150, hp: 100, recharge: 8, art: 'freezeray', kind: 'beam', range: 3.5, dmg: 6, tiers: [{}], blurb: 'a cold beam: everything in front crawls at half speed' },
    sonic:        { name: 'Sonic Boom', cost: 200, hp: 100, recharge: 12, art: 'sonic', kind: 'ring', tiers: [{ every: 5, push: .8, dmg: 25 }, { every: 4, push: 1.2, dmg: 35, cost: 150 }, { every: 3, push: 1.6, dmg: 45, cost: 250 }], blurb: 'a ring that knocks the whole row back' },
    mortar:       { name: 'Solar Blast', cost: 225, hp: 100, recharge: 12, art: 'solar', kind: 'lob', proj: 'lava', tiers: [{ every: 7, dmg: 90, splash: 1.4 }], blurb: 'lobs a fireball at the squishy nearest your mowers' },
    miner:        { name: 'Miner Shoot', cost: 150, hp: 100, recharge: 8, art: 'miner', kind: 'lob', lane: true, proj: 'rock', tiers: [{ every: 4, dmg: 45, splash: .8 }, { every: 3, dmg: 55, splash: .9, cost: 150 }, { every: 2.2, dmg: 70, splash: 1, cost: 250 }], blurb: 'flings rocks along its row' },
    mine:         { name: 'Detonate Bomb', cost: 125, hp: 60, recharge: 14, art: 'mine', kind: 'mine', arm: 4, tiers: [{ dmg: 300, splash: 1 }, { dmg: 420, splash: 1.4, cost: 120 }, { dmg: 600, splash: 1.8, cost: 200 }], blurb: 'arms in 4 s, then blows up the first squishy to touch it' },
    plasma:       { name: 'Plasma Bomb', cost: 150, hp: 9999, recharge: 20, art: 'plasma', kind: 'bomb', fuse: 1.5, tiers: [{ dmg: 500, splash: 1.7 }], blurb: 'goes off after 1.5 s and clears the area' },
    brain:        { name: 'Brain Wash', cost: 175, hp: 80, recharge: 15, art: 'brain', kind: 'brain', tiers: [{ uses: 1 }, { uses: 2, cost: 150 }, { uses: 3, cost: 250 }], blurb: 'the squishy that bites it turns round and fights for you' },
    shield:       { name: 'Shield', cost: 50, hp: 400, recharge: 8, art: 'shield', kind: 'wall', tiers: [{ hp: 400 }, { hp: 800, cost: 75 }, { hp: 1400, cost: 125 }], blurb: 'a tough wall that keeps them busy' },
  };
  const tierOf = g => GUNS[g.type].tiers[(g.tier || 1) - 1] || GUNS[g.type].tiers[0];
  const tierCost = g => { if (!g) return 0; const t = GUNS[g.type].tiers[g.tier || 1]; return t ? t.cost : 0; };
  const gunHp = g => tierOf(g).hp || GUNS[g.type].hp;
  // the squishies (art in art/squishies, drawn facing left as supplied). size is relative to a cell;
  // 'from' is the first level they appear; look.hurt shows once they are below half health; the Kings, the Queen and Sharky are bosses
  const SQUISHIES = {
    chomp:      { name: 'Chomp',      hp: 100, speed: .10, chomp: 25, size: 1.0,  from: 1, look: { ok: 'chomp1', hurt: 'chomp2' }, motion: 'waddle', color: '#b8d0a8' },
    skitter:    { name: 'Skitter',    hp: 60,  speed: .21, chomp: 25, size: .74,  from: 2, look: { ok: 'skitter1', hurt: 'skitter2' }, motion: 'hop', color: '#d49496' },
    antbun:     { name: 'Antbun',     hp: 200, speed: .13, chomp: 25, size: 1.05, from: 3, look: { ok: 'antbun1' }, motion: 'hop', rig: true, color: '#bda7cd' },
    kamikaze:   { name: 'Kamikaze',   hp: 90,  speed: .15, chomp: 0,  size: .92,  from: 5, look: { ok: 'kamikaze1', hurt: 'kamikaze2' }, motion: 'roll', color: '#ddb8a4', boom: true },
    ghost:      { name: 'Ghost',      hp: 80,  speed: .15, chomp: 25, size: 1.0,  from: 7, look: { ok: 'ghost1', hurt: 'ghost2' }, motion: 'float', color: '#a6a0aa', pass: 1, alpha: .88 },
    flying:     { name: 'Flyer',      hp: 70,  speed: .18, chomp: 0,  size: .9,   from: 9, look: { ok: 'flying1', hurt: 'flying2' }, motion: 'fly', color: '#b9bcc5', pass: 99, fly: true },
    moley:      { name: 'Mole King',  hp: 220, speed: .11, chomp: 30, size: .95,  from: 11, look: { ok: 'moley' }, motion: 'waddle', color: '#e0c888', digs: true, dig: .17 },
    chompking:  { name: 'ChompKing',  hp: 600, speed: .07, chomp: 50, size: 1.4,  from: 6, look: { ok: 'chompking1', hurt: 'chompking2' }, motion: 'stomp', color: '#9ec9c0', boss: true },
    broodqueen: { name: 'Brood Queen', hp: 900, speed: .05, chomp: 40, size: 1.4, from: 10, look: { ok: 'broodqueen1', hurt: 'broodqueen2' }, motion: 'stomp', color: '#c0acb6', boss: true, brood: 9 },
    ghostking:  { name: 'Ghost King', hp: 800, speed: .08, chomp: 35, size: 1.35, from: 14, look: { ok: 'ghostking' }, motion: 'float', color: '#aca9a2', boss: true, pass: 2, alpha: .88 },
    sharky:     { name: 'Sharky',     hp: 1100, speed: .055, chomp: 90, size: 1.5, from: 18, look: { ok: 'sharky' }, motion: 'float', color: '#d9c48a', boss: true },
  };
  // the worlds, as the planet trophies name them; each ends with a boss level
  const WORLDS = [
    { key: 'tutorial', name: 'Tutorial', from: 1, to: 2, lanes: ['#7DBE50', '#8CCB5E'], soil: ['#9C7D4F', '#A98A5B'], boss: null, deco: 'flowers' },
    { key: 'earth', name: 'Earth', from: 3, to: 6, lanes: ['#6FB54A', '#7FC45A'], soil: ['#8E6E42', '#9B7A4D'], boss: 'chompking', deco: 'flowers' },
    { key: 'moon', name: 'the Moon', from: 7, to: 10, lanes: ['#A3A3B0', '#B3B3C0'], soil: ['#6E6E7C', '#7B7B8A'], boss: 'broodqueen', deco: 'craters' },
    { key: 'mars', name: 'Mars', from: 11, to: 14, lanes: ['#C86A3C', '#D47A4C'], soil: ['#8A4224', '#984B2B'], boss: 'ghostking', deco: 'rocks' },
    { key: 'saturn', name: 'Saturn', from: 15, to: 18, lanes: ['#D9B86A', '#E3C57D'], soil: ['#A3823F', '#B08E49'], boss: 'sharky', deco: 'rocks' },
    { key: 'neptune', name: 'Neptune', from: 19, to: 22, lanes: ['#4A6FB5', '#5A80C8'], soil: ['#2E4A80', '#38568E'], boss: 'all', deco: 'craters' },
  ];
  const worldOf = n => WORLDS.find(w => n >= w.from && n <= w.to) || { ...WORLDS[WORLDS.length - 1], name: 'Deep space', key: 'deep', from: 23, to: 1e9, boss: 'all' };
  function levelSpec(n) {
    const world = worldOf(n);
    const weights = {};
    for (const k in SQUISHIES) { const s = SQUISHIES[k]; if (s.boss || n < s.from) continue; weights[k] = k === 'chomp' ? 1 : .22 + .04 * (n - s.from); }
    const last = n === world.to || (world.key === 'deep' && (n - 23) % 4 === 3);
    const bossOf = world.boss === 'all' ? ['chompking', 'broodqueen', 'ghostking', 'sharky'][n % 4] : world.boss;
    const boss = last ? bossOf : null;
    // early levels use fewer rows, like the original's first lawns
    const rows = n === 1 ? [2, 3] : n === 2 ? [1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
    return { count: 16 + 5 * (n - 1), rows, grace: n === 1 ? 12 : 8, gap0: Math.max(4, 10 - n), gap1: Math.max(2.2, 6.5 - .45 * (n - 1)), weights, huge: n >= 2, boss, world, last };
  }
  // the Antbun is a rigged character: separate parts in a 320-wide box, positions from the artist's PSD
  const ANTBUN = {"parts": {"dead_leftarm": [65, 18, 88, 116], "dead_body": [0, 43, 242, 210], "dead_skull": [16, 91, 177, 127], "dead_arm": [155, 189, 46, 40], "dead_rightear": [153, 31, 167, 106], "hurt_leftear": [65, 20, 88, 116], "hurt_body": [0, 43, 243, 210], "hurt_righteyeclose": [98, 161, 31, 10], "hurt_righteyeopen": [98, 154, 30, 30], "hurt_arm": [165, 170, 48, 53], "hurt_rightear": [140, 31, 177, 131], "leftear": [68, 0, 132, 131], "body": [0, 55, 250, 198], "body2": [10, 87, 239, 179], "body3": [10, 87, 242, 176], "eyesopen": [31, 149, 98, 36], "rightear": [140, 31, 177, 131], "eyepopping": [96, 141, 58, 58], "eyesclose": [32, 155, 98, 15], "arm": [166, 171, 45, 52]}, "box": [320, 266], "death": {"w": 320, "h": 322, "body": [50, 95, 234, 187]}};
  const ANTBUN_PARTS = Object.keys(ANTBUN.parts);
  const SPRITES = {};   // art key -> Image
  const UI = {};        // art/ui pieces: guns, projectiles, screens, the spaceman
  const UI_NAMES = ['blaster1', 'blaster2', 'blaster3', 'bullet', 'planet', 'bolt', 'bolt2', 'ice', 'title_gameover', 'title_youwin', 'laurel_l', 'laurel_r', 'spaceman_sad', 'star', 'star_dark',
    'pose_stand', 'pose_wave', 'pose_arms', 'pose_hips', 'pose_thumbs', 'pose_facepalm', 'emo_neutral', 'emo_xx', 'emo_happy', 'emo_sleepy', 'emo_shock', 'emo_sad', 'emo_confused', 'emo_qqq', 'emo_v', 'emo_bear', 'emo_stare', 'emo_love', 'emo_grin', 'wave1', 'wave2', 'wave3', 'wave4'];
  const uiImg = n => { const im = UI[n]; return im && im.complete && im.naturalWidth ? im : null; };
  const WEAPONS = {};   // art/weapons: every gun tier and the projectiles
  const LAWN = {};      // art/lawn: grass and soil textures, the mower, bushes, the path
  // the weapons that have an animation rig (art/rigs): they fire with the artist's recoil and idle between shots
  const RIG_KEYS = ['blaster1', 'blaster3', 'mine1', 'mine2', 'mine3', 'freezeray1', 'freezeturret2', 'freezeturret3', 'handy1', 'handy3', 'miner1', 'miner2', 'miner3', 'solar1', 'sonic1', 'sonic2', 'sonic3'];
  const rigFor = g => { const n = GUNS[g.type].art + (g.tier || 1); return RIG_KEYS.includes(n) && typeof Rig !== 'undefined' ? Rig.load(n) : null; };
  const lawnImg = n => { const im = LAWN[n]; return im && im.complete && im.naturalWidth ? im : null; };
  const wImg = n => { const im = WEAPONS[n]; return im && im.complete && im.naturalWidth ? im : null; };
  const gunArt = g => { const k = GUNS[g.type]; return wImg(k.art + (g.tier || 1)) ? k.art + (g.tier || 1) : k.art + '1'; };
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
      sel: null, recharge: Object.fromEntries(Object.keys(GUNS).map(k => [k, 0])), rings: [], lastRows: [], shake: 0, kills: 0, correct: 0, asked: 0, streak: 0, power: null, frozen: 0 };
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
      sq.dead = true; S.kills++; tally('kills', 1); tally('by_' + sq.type, 1);
      if (sq.k.boss) buddy('pose_thumbs', 'emo_grin', 2.5); else if (Math.random() < .15) buddy('pose_thumbs', 'emo_happy', 1.2);
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
    if (S.frozen > 0) S.frozen -= dt;

    // spawning
    const sp = S.spec;
    // level 1 waits for the first gun, like the original's first lawn
    const anyGun = S.grid.some(row => row.some(Boolean));
    if (S.spawned < sp.count && (S.level > 1 || anyGun || S.spawned > 0)) {
      S.nextSpawn -= dt;
      const hugeAt = Math.floor(sp.count * .7);
      if (sp.huge && !S.hugeDone && S.spawned >= hugeAt) {
        S.hugeDone = true;
        S.banner = { text: 'A huge wave of squishies is coming!', t: 2.4, wave: true };
        S.nextSpawn = 2.4;
        S.hugeLeft = Math.min(sp.count - S.spawned, 4 + Math.floor(S.level / 2));
      }
      if (S.nextSpawn <= 0) {
        if (S.hugeLeft > 0) {
          if (sp.boss && !S.bossDone) { S.bossDone = true; spawn(sp.boss); } else spawn(pickWeighted(sp.weights));
          S.hugeLeft--; S.nextSpawn = .45; if (!S.hugeLeft) S.banner = { text: 'Final wave!', t: 1.6, wave: true };
        }
        else {
          spawn(pickWeighted(sp.weights));
          const p = S.spawned / sp.count;
          S.nextSpawn = sp.gap0 + (sp.gap1 - sp.gap0) * p;
        }
      }
    }
    if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }

    // squishies move / chomp (not while the lawn is frozen)
    for (const sq of S.squishies) {
      if (S.frozen > 0) { sq.eating = null; continue; }
      if (sq.frozenT > 0) { sq.frozenT -= dt; sq.eating = null; if (sq.flash > 0) sq.flash -= dt; continue; }   // iced by a Freeze Turret
      if (sq.stun > 0) { sq.stun -= dt; continue; }
      sq.wob += dt; if (sq.flash > 0) sq.flash -= dt; if (sq.rise > 0) sq.rise -= dt;
      if (sq.hypno) {                  // brain-washed: walks back the way it came, biting the others
        sq.eating = null; sq.x += sq.k.speed * 1.4 * dt;
        for (const o of S.squishies) if (o !== sq && !o.hypno && !o.dead && o.row === sq.row && Math.abs(o.x - sq.x) < .5) { hurt(o, 60 * dt); sq.hp -= 10 * dt; }
        if (sq.x > COLS + 1.2 || sq.hp <= 0) { sq.dead = true; if (sq.hp <= 0) S.fx.push({ kind: 'splat', x: sq.x, row: sq.row, t: 0, color: sq.k.color, size: sq.k.size }); }
        continue;
      }
      const slow = sq.slowT > 0 ? .5 : 1; if (sq.slowT > 0) sq.slowT -= dt;
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
        sq.hp = 0; sq.dead = true; S.shake = .5; buddy('pose_arms', 'emo_shock', 1.6);
        S.fx.push({ kind: 'boom', x: col + .5, row: sq.row, t: 0, r: 1.8 });
        continue;
      }
      if (g && sq.pass > 0 && sq.passedCol !== col) { sq.pass--; sq.passedCol = col; }   // ghosts and flyers float over guns
      if (g && GUNS[g.type].kind === 'brain' && !sq.k.boss && sq.passedCol !== col) {   // Brain Wash: one bite and the squishy is yours
        sq.hypno = true; sq.eating = null; sq.flash = .3; g.uses--; S.fx.push({ kind: 'boom', x: col + .5, row: sq.row, t: 0, r: .4 }); S.floats.push({ x: col + .5, row: sq.row, t: 0, text: 'Brainwashed!' });
        buddy('pose_thumbs', 'emo_grin', 1.5);
        if (g.uses <= 0) { S.grid[sq.row][col] = null; S.fx.push({ kind: 'crunch', x: col + .5, row: sq.row, t: 0 }); }
        continue;
      }
      if (g && GUNS[g.type].kind === 'mine' && g.armed && sq.passedCol !== col) {   // Detonate Bomb: boom
        const t = tierOf(g); S.grid[sq.row][col] = null; S.shake = .4;
        S.fx.push({ kind: 'boom', x: col + .5, row: sq.row, t: 0, r: t.splash });
        for (const o of S.squishies) if (!o.dead && Math.hypot(o.x - (col + .5), (o.row - sq.row) * 1.15) < t.splash) hurt(o, t.dmg);
        continue;
      }
      if (g && sq.passedCol !== col) {
        sq.eating = g; g.hp -= sq.k.chomp * dt; g.bitten = .25;
        if (g.hp <= 0) { S.grid[sq.row][col] = null; S.fx.push({ kind: 'crunch', x: col + .5, row: sq.row, t: 0 }); sq.eating = null; buddy('pose_arms', 'emo_shock', 1.6); }
      } else {
        sq.eating = null;
        if (sq.rise <= 0) sq.x -= sq.k.speed * slow * dt;
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

    // guns act
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const g = S.grid[r][c]; if (!g) continue;
      const k = GUNS[g.type], tier = tierOf(g);
      if (g.bitten > 0) g.bitten -= dt;
      if (k.kind === 'wall') continue;
      if (k.kind === 'mine') { if (!g.armed) { g.arm -= dt; if (g.arm <= 0) { g.armed = true; S.floats.push({ x: c + .5, row: r, t: 0, text: 'Armed!' }); } } continue; }
      if (k.kind === 'bomb') {
        g.fuse -= dt;
        if (g.fuse <= 0) {
          S.grid[r][c] = null; S.shake = .6; S.fx.push({ kind: 'boom', x: c + .5, row: r, t: 0, r: tier.splash });
          for (const o of S.squishies) if (!o.dead && Math.hypot(o.x - (c + .5), (o.row - r) * 1.15) < tier.splash) hurt(o, tier.dmg);
        }
        continue;
      }
      if (k.kind === 'brain') continue;
      if (k.kind === 'beam') {   // everything in front crawls, and takes a little cold damage
        let any = false;
        for (const sq of S.squishies) if (!sq.dead && !sq.hypno && !sq.under && sq.row === r && sq.x > c + .3 && sq.x < c + .3 + k.range) { sq.slowT = .25; hurt(sq, k.dmg * dt); any = true; }
        g.beam = any; continue;
      }
      g.cool -= dt;
      if (g.cool > 0) continue;
      // bullets, rings and rocks fly along the gun's own row; the Solar Blast lobs at the most advanced squishy on the whole lawn
      const targets = S.squishies.filter(s => !s.dead && !s.hypno && s.x < COLS + .6 && (k.kind === 'lob' && !k.lane ? s.x > .5 : s.row === r && s.x > c + .2 && !s.under));
      if (!targets.length) continue;
      const first = targets.reduce((a, b) => a.x < b.x ? a : b);
      g.cool = tier.every; g.kick = .12; g.fired = S.t;
      if (k.kind === 'lob') S.shells.push({ x0: c + .5, row0: r, x1: first.x, row: first.row, t: 0, dur: Math.max(.6, Math.hypot(first.x - c, first.row - r) / 6 + .4), dmg: tier.dmg, splash: tier.splash, proj: k.proj });
      else if (k.kind === 'ring') S.rings.push({ x: c + .6, row: r, speed: 4.5, push: tier.push, dmg: tier.dmg, hit: new Set(), t: 0 });
      else for (let i = 0; i < tier.shots; i++) S.bullets.push({ x: c + .75 - i * .22, row: r, speed: k.speed, dmg: k.dmg, proj: k.proj, small: !!k.small, freeze: tier.freeze || 0, big: g.type === 'shooter' && (g.tier || 1) < 3 });
    }
    // sonic rings: pass through every squishy in the row, knocking it back
    for (const rg of S.rings) {
      rg.x += rg.speed * dt; rg.t += dt;
      for (const sq of S.squishies) if (!sq.dead && !sq.hypno && !sq.under && sq.row === rg.row && !rg.hit.has(sq) && sq.x < rg.x + .2 && sq.x > rg.x - .6) {
        rg.hit.add(sq); hurt(sq, rg.dmg); sq.stun = .25; sq.x = Math.min(COLS + .4, sq.x + rg.push * (sq.k.boss ? .3 : 1)); sq.eating = null;
      }
      if (rg.x > COLS + 1) rg.gone = true;
    }
    S.rings = S.rings.filter(r => !r.gone);
    // bullets
    for (const b of S.bullets) {
      b.x += b.speed * dt;
      const hit = S.squishies.find(s => s.row === b.row && !s.dead && !s.hypno && !s.under && Math.abs(s.x - b.x) < s.k.size * .45);
      if (hit) { hurt(hit, b.dmg); b.gone = true; if (b.freeze && !hit.k.boss) { hit.frozenT = b.freeze; hit.eating = null; } else if (b.freeze) hit.slowT = 1; }
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
    S.fx = S.fx.filter(f => f.t < (f.kind === 'boom' ? .5 : f.kind === 'splat' || f.kind === 'melt' ? .6 : f.kind === 'abdeath' ? 1.4 : f.kind === 'icewave' ? .9 : .8));
    for (const f of S.floats) f.t += dt;
    S.floats = S.floats.filter(f => f.t < 1);
    S.squishies = S.squishies.filter(s => !s.dead);

    if (S.spawned >= sp.count && !S.squishies.length && !S.shells.length) win();
  }
  function tally(key, n) {   // persistent counters for the player (also feed the trophies)
    const sv = store.get(saveKey, { best: 1, level: 1 });
    sv[key] = (sv[key] || 0) + n; store.set(saveKey, sv);
  }
  function statsHTML() {
    return `<div class="ovstats"><div><span>Squishies killed</span><b>${S.kills}</b></div><div><span>Correct answers</span><b>${S.correct}/${S.asked}</b></div></div>`;
  }
  function win() {
    S.phase = 'won';
    const ratio = S.asked ? S.correct / S.asked : 0, stars = ratio >= .9 ? 3 : ratio >= .7 ? 2 : 1;
    const sv = store.get(saveKey, { best: 1, level: 1 });
    sv.level = S.level + 1; sv.best = Math.max(sv.best || 1, S.level + 1); sv.won = (sv.won || 0) + 1;
    sv.stars = sv.stars || {}; sv.stars[S.level] = Math.max(sv.stars[S.level] || 0, stars); store.set(saveKey, sv);
    buddy('pose_wave', 'emo_grin', 8);
    const w = S.spec.world, next = worldOf(S.level + 1);
    const sub = `Level ${S.level} done!` + (S.spec.last && w.key !== 'deep' ? ` ${w.name === 'the Moon' ? 'The Moon is' : w.name + ' is'} safe — next stop ${next.name}!` : '');
    showOverlay({ kind: 'won', title: 'You win', sub, btn: 'Next level', stars }, () => { newLevel(S.level + 1); start(); });
    Celebrate(innerWidth / 2, innerHeight / 3, stars >= 3 ? 2.6 : 2);
  }
  function lose() {
    S.phase = 'lost';
    buddy('pose_facepalm', 'emo_sad', 8);
    showOverlay({ kind: 'lost', title: 'Game over', sub: `The squishies ate your garden on level ${S.level}`, btn: 'Try again' }, () => { S.money = START_MONEY; newLevel(S.level); start(); });
  }

  /* ---------- drawing ---------- */
  let cv, ctx, cell = 40, W = 0, H = 0, OX = 0, bg = null, stage = null;
  const rotated = () => stage && stage.classList.contains('rot');
  function layout() {
    if (!stage) return;
    // portrait phone: turn the whole stage sideways so the game is always landscape
    const rot = innerHeight > innerWidth;
    stage.classList.toggle('rot', rot);
    stage.style.width = (rot ? innerHeight : innerWidth) + 'px';
    stage.style.height = (rot ? innerWidth : innerHeight) + 'px';
    const box = ui.garden;
    cell = Math.max(24, Math.floor(Math.min(box.clientWidth / (COLS + PADL + PADR), box.clientHeight / (ROWS + PADB))));
    OX = Math.round(cell * PADL); W = OX + cell * COLS + Math.round(cell * PADR); H = cell * ROWS + Math.round(cell * PADB);
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
    const pt = rotated() ? { x: e.clientY - r.top, y: r.right - e.clientX } : { x: e.clientX - r.left, y: e.clientY - r.top };
    pt.x -= OX; return pt;
  }
  // the lawn: textured grass in mown stripes, a flagstone path for the mowers on the left, bushes on the right
  function drawBackground() {
    bg = document.createElement('canvas');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    bg.width = cv.width; bg.height = cv.height;
    const g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wd = S.spec.world, grass = lawnImg('grass'), soil = lawnImg('soil'), path = lawnImg('path'), bush = lawnImg('bush');
    const texture = (im, x, y, w, h, scale) => {   // multiply a tileable luminance texture over what is already there
      if (!im) return;
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalCompositeOperation = 'multiply';
      g.translate(x, y); g.scale(scale, scale); g.fillStyle = g.createPattern(im, 'repeat'); g.fillRect(0, 0, w / scale + 1, h / scale + 1);
      g.restore();
    };
    const gs = (cell * 2.4) / 256, LH = cell * ROWS;   // one grass tile spans a couple of cells; LH = the lawn's height
    const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = sh => Math.max(0, Math.min(255, Math.round(((n >> sh) & 255) * f))); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
    // the lawn: a soft checkerboard of cells, like a mown lawn
    for (let r = 0; r < ROWS; r++) {
      const on = S.spec.rows.includes(r);
      for (let c = 0; c < COLS; c++) {
        const base = on ? wd.lanes[0] : wd.soil[0];
        g.fillStyle = shade(base, (r + c) % 2 ? 1 : .93);
        g.fillRect(OX + c * cell, r * cell, cell, cell);
      }
    }
    texture(grass, OX, 0, cell * COLS, LH, gs);
    for (let r = 0; r < ROWS; r++) if (!S.spec.rows.includes(r)) { g.fillStyle = 'rgba(80,50,20,.28)'; g.fillRect(OX, r * cell, cell * COLS, cell); texture(soil, OX, r * cell, cell * COLS, cell, gs); }
    // light from the top, a little darker at the bottom
    const lg = g.createLinearGradient(0, 0, 0, LH); lg.addColorStop(0, 'rgba(255,255,255,.10)'); lg.addColorStop(.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,.10)');
    g.fillStyle = lg; g.fillRect(OX, 0, cell * COLS, LH);
    // the path on the left, with its own shadow edge
    g.fillStyle = wd.key === 'tutorial' || wd.key === 'earth' ? '#D9D2C4' : shade(wd.soil[0], 1.05); g.fillRect(0, 0, OX, LH);
    texture(path, 0, 0, OX, LH, cell / 128);
    const pg = g.createLinearGradient(OX - cell * .18, 0, OX, 0); pg.addColorStop(0, 'rgba(0,0,0,0)'); pg.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = pg; g.fillRect(OX - cell * .18, 0, cell * .18, LH);
    // bushes on the right, where the squishies come from, with a shadow they cast on the lawn
    const right = OX + cell * COLS;
    g.fillStyle = shade(wd.lanes[0], .8); g.fillRect(right, 0, W - right, LH);
    const bg2 = g.createLinearGradient(right - cell * .5, 0, right, 0); bg2.addColorStop(0, 'rgba(0,0,0,0)'); bg2.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = bg2; g.fillRect(right - cell * .5, 0, cell * .5, LH);
    let seed = 11; const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    if (bush) {
      for (let y = -cell * .4; y < LH + cell * .2; y += cell * .55) { const w = cell * (1.35 + rand() * .5); g.drawImage(bush, right - cell * .3 + rand() * cell * .25, y - w * .2, w, w); }
      for (let y = -cell * .2; y < LH; y += cell * .7) { const w = cell * (1.1 + rand() * .4); g.drawImage(bush, right + cell * .05 + rand() * cell * .2, y - w * .2, w, w); }
      if (wd.key !== 'tutorial' && wd.key !== 'earth') { g.save(); g.beginPath(); g.rect(right - cell * .3, 0, W - right + cell * .3, LH); g.clip(); g.globalCompositeOperation = 'color'; g.fillStyle = wd.lanes[0]; g.fillRect(0, 0, W, H); g.restore(); }
    }
    // the picket fence along the bottom
    const fence = lawnImg('fence');
    g.fillStyle = shade(wd.soil[1], .9); g.fillRect(0, LH, W, H - LH);
    if (fence) { const fh = H - LH + cell * .22, fw = fh * fence.naturalWidth / fence.naturalHeight; g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, LH, W, cell * .1); for (let x = -fw * .3; x < W; x += fw) g.drawImage(fence, x, LH - cell * .22, fw, fh); }
    const vg = g.createLinearGradient(0, LH - cell * .15, 0, LH); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.14)'); g.fillStyle = vg; g.fillRect(OX, LH - cell * .15, cell * COLS, cell * .15);
    // little flowers, same places every time
    seed = 7;
    for (let i = 0; i < 40; i++) {
      const x = OX + rand() * cell * COLS, y = rand() * LH, col = ['#FFF0F5', '#FFE066', '#FFFFFF', '#FFB3C6'][i % 4];
      if (!S.spec.rows.includes(Math.floor(y / cell))) continue;
      if (wd.deco === 'flowers') { g.fillStyle = col; g.beginPath(); g.arc(x, y, cell * .05, 0, 7); g.fill(); g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(x, y, cell * .02, 0, 7); g.fill(); }
      else if (wd.deco === 'craters') { g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x, y, cell * .12, cell * .07, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x, y - cell * .02, cell * .1, cell * .05, 0, 0, 7); g.fill(); }
      else { g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(x, y, cell * .07, cell * .045, rand(), 0, 7); g.fill(); }
    }
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function drawGun(g, type, x, y, s, kick = 0, hp = 1) {
    // x,y = centre; s = cell size
    const gun = typeof type === 'object' ? type : { type, tier: 1 };
    const im = wImg(gunArt(gun)), k = GUNS[gun.type];
    type = gun.type;
    const rig = rigFor(gun), bounds = rig && Rig.bounds(rig);
    if (bounds) {   // the artist's rig: Fire after a shot, then Idle
      const bw = bounds[2] - bounds[0], bh = bounds[3] - bounds[1], sc = Math.min(s * 1.14 / bw, s * 1.32 / bh);
      const bottom = y + s * .42, ox = x - (bounds[0] + bounds[2]) / 2 * sc, oy = bottom + bounds[1] * sc;
      let anim = null, t = 0;
      const since = gun.fired != null ? S.t - gun.fired : 1e9, fireDur = Rig.duration(rig, 'Fire');
      if (fireDur && since < fireDur) { anim = 'Fire'; t = since; }
      else { const idle = Rig.has(rig, 'Idle') ? 'Idle' : Rig.has(rig, 'ReadyIdle') ? 'ReadyIdle' : null; if (idle) { anim = idle; const d = Rig.duration(rig, idle); t = d ? (S.t + (gun.seed || 0)) % d : 0; } }
      if (k.kind === 'mine' && !gun.armed) g.globalAlpha = .55;
      g.save();
      if (k.kind === 'bomb') { const p = gun.fuse != null ? Math.max(0, gun.fuse) / k.fuse : 1; g.translate(x, bottom); g.scale(1 + .15 * Math.sin(S.t * 25) * (1 - p), 1 + .15 * Math.sin(S.t * 25) * (1 - p)); g.translate(-x, -bottom); }
      Rig.draw(g, rig, anim, t, ox, oy, sc);
      g.restore(); g.globalAlpha = 1;
      if (k.kind === 'beam' && gun.beam) {
        const bx = x + s * .35, by = y + s * .1;
        const gr = g.createLinearGradient(bx, 0, bx + k.range * s, 0); gr.addColorStop(0, 'rgba(180,240,255,.85)'); gr.addColorStop(1, 'rgba(180,240,255,0)');
        g.fillStyle = gr; g.fillRect(bx, by - s * .07 * (1 + .3 * Math.sin(S.t * 30)), k.range * s, s * .14 * (1 + .3 * Math.sin(S.t * 30)));
      }
      if (hp < 1) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - s * .25, y + s * .38, s * .5, s * .06); g.fillStyle = hp > .4 ? '#9BE564' : '#FF5D8F'; g.fillRect(x - s * .25, y + s * .38, s * .5 * hp, s * .06); }
      return;
    }
    if (im) {
      const w = s * (k.kind === 'wall' ? .96 : 1.1), h = w * im.naturalHeight / im.naturalWidth;
      if (k.kind === 'mine' && !gun.armed) g.globalAlpha = .55;
      if (k.kind === 'bomb') { const p = gun.fuse != null ? Math.max(0, gun.fuse) / k.fuse : 1; g.save(); g.translate(x, y + s * .42); g.scale(1 + .15 * Math.sin(S.t * 25) * (1 - p), 1 + .15 * Math.sin(S.t * 25) * (1 - p)); g.translate(-x, -(y + s * .42)); }
      g.drawImage(im, x - w / 2 - kick * s * .6, y + s * .42 - h, w, h);
      if (k.kind === 'bomb') g.restore();
      g.globalAlpha = 1;
      if (k.kind === 'beam' && gun.beam) {   // the cold beam, flickering
        const bx = x + s * .35, by = y + s * .1;
        const gr = g.createLinearGradient(bx, 0, bx + k.range * s, 0); gr.addColorStop(0, 'rgba(180,240,255,.85)'); gr.addColorStop(1, 'rgba(180,240,255,0)');
        g.fillStyle = gr; g.fillRect(bx, by - s * .07 * (1 + .3 * Math.sin(S.t * 30)), k.range * s, s * .14 * (1 + .3 * Math.sin(S.t * 30)));
      }
      if (hp < 1) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - s * .25, y + s * .38, s * .5, s * .06); g.fillStyle = hp > .4 ? '#9BE564' : '#FF5D8F'; g.fillRect(x - s * .25, y + s * .38, s * .5 * hp, s * .06); }
      return;
    }
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
    const k = sq.k, w = s * k.size * 1.2, mo = motionOf(sq);
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
    if (sq.hypno) g.scale(-1, 1);   // brain-washed squishies face the other way
    if (k.motion === 'roll') { g.translate(0, -w * .45); g.rotate(mo.rot); g.translate(0, w * .45); } else g.rotate(mo.rot);
    g.scale(mo.sx, mo.sy);
    if (k.alpha) g.globalAlpha = k.alpha;
    if (k.rig) drawAntbun(g, sq, w, mo);
    else if (!drawSprite(g, lookOf(sq), 0, 0, w, k.alpha || 1)) { g.fillStyle = k.color; g.beginPath(); g.ellipse(0, -w * .4, w * .4, w * .4, 0, 0, 7); g.fill(); }
    if (sq.flash > 0 && !k.rig) { g.globalCompositeOperation = 'lighter'; drawSprite(g, lookOf(sq), 0, 0, w, .7); g.globalCompositeOperation = 'source-over'; }
    g.restore();
    if (S.frozen > 0 || sq.frozenT > 0) { g.fillStyle = 'rgba(160,220,255,.45)'; g.beginPath(); g.ellipse(x, foot - w * .4 + mo.dy * s, w * .42, w * .45, 0, 0, 7); g.fill(); }
    const crown = uiImg('crown');
    if (k.boss && crown) { const cw = s * .4, ch = cw * crown.naturalHeight / crown.naturalWidth; g.drawImage(crown, x - cw / 2, foot - w * .95 - ch + Math.sin(sq.wob * 3) * s * .04 + mo.dy * s, cw, ch); }
    if (k.boss) {   // boss health bar
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - w * .35, foot + s * .08, w * .7, s * .07);
      g.fillStyle = '#FF5D8F'; g.fillRect(x - w * .35, foot + s * .08, w * .7 * Math.max(0, sq.hp / k.hp), s * .07);
    }
  }
  function drawGnome(g, x, y, s, running) {   // the lawnmower (kept the old name inside the code)
    const im = lawnImg('mower');
    g.save(); g.translate(x, y);
    if (running) { g.rotate(Math.sin(S.t * 40) * .06); g.translate(0, Math.sin(S.t * 60) * 1.5); }
    if (im) { const w = s * .98, h = w * im.naturalHeight / im.naturalWidth; g.drawImage(im, -w * .55, s * .34 - h, w, h); }
    else { g.fillStyle = '#C4242E'; rr(g, -s * .3, -s * .1, s * .5, s * .25, s * .06); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(-s * .2, s * .18, s * .09, 0, 7); g.arc(s * .12, s * .18, s * .09, 0, 7); g.fill(); }
    g.restore();
  }
  function draw() {
    if (!bg) drawBackground();
    ctx.save();
    if (S.shake > 0) ctx.translate(rnd(-3, 3), rnd(-3, 3));
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.translate(OX, 0);   // everything else is drawn in lawn cells
    // selected gun: show where it can go
    if (S.sel && S.sel !== 'shovel') { ctx.fillStyle = 'rgba(255,255,255,.14)'; for (const r of S.spec.rows) for (let c = 0; c < COLS; c++) if (!S.grid[r][c]) ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4); }
    // gnomes
    for (const r of S.spec.rows) if (S.gnomes[r]) drawGnome(ctx, -cell * .38, r * cell + cell * .62, cell, false);
    for (const gr of S.gnomeRuns) drawGnome(ctx, gr.x * cell + cell * .5, gr.row * cell + cell * .62, cell, true);
    // guns
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const g = S.grid[r][c]; if (!g) continue;
      if (g.kick > 0) g.kick -= .016;
      drawGun(ctx, g, c * cell + cell / 2 + (g.bitten > 0 ? rnd(-1.5, 1.5) : 0), r * cell + cell * .5, cell, Math.max(0, g.kick), g.hp / gunHp(g));
    }
    // bullets
    for (const b of S.bullets) {
      const bul = wImg('proj_' + (b.proj || 'bullet')) || uiImg('bullet');
      if (bul) { const w = cell * (b.proj === 'ice' ? .55 : b.small ? .18 : b.big ? .34 : .22), h = w * bul.naturalHeight / bul.naturalWidth; ctx.drawImage(bul, b.x * cell - w / 2, b.row * cell + cell * .42 - h / 2, w, h); continue; }
      ctx.fillStyle = b.big ? '#2F5F2C' : '#FFB347';
      ctx.beginPath(); ctx.arc(b.x * cell, b.row * cell + cell * .42, b.big ? cell * .09 : cell * .055, 0, 7); ctx.fill();
    }
    // shells in the air
    for (const sh of S.shells) {
      const p = sh.t / sh.dur, x = sh.x0 + (sh.x1 - sh.x0) * p, rowY = (sh.row0 + (sh.row - sh.row0) * p) * cell;
      const y = rowY + cell * .5 - Math.sin(p * Math.PI) * cell * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x * cell, rowY + cell * .8, cell * .12, cell * .05, 0, 0, 7); ctx.fill();
      const pl = wImg('proj_' + (sh.proj || 'lava')) || uiImg('planet');
      if (pl) { const w = cell * (sh.proj === 'rock' ? .3 : .36); ctx.save(); ctx.translate(x * cell, y); ctx.rotate(p * 6); ctx.drawImage(pl, -w / 2, -w / 2, w, w); ctx.restore(); }
      else { ctx.fillStyle = '#2C2C36'; ctx.beginPath(); ctx.arc(x * cell, y, cell * .13, 0, 7); ctx.fill(); }
    }
    // sonic rings
    const ringIm = wImg('proj_ring');
    for (const rg of S.rings) { const w = cell * (.5 + rg.t * .4); ctx.globalAlpha = .9; if (ringIm) ctx.drawImage(ringIm, rg.x * cell - w / 2, rg.row * cell + cell * .42 - w / 2, w, w); else { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(rg.x * cell, rg.row * cell + cell * .42, w / 2, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1; }
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
        const bolt = uiImg(p < .5 ? 'bolt' : 'bolt2');
        if (bolt) { const w = f.r * cell * (.6 + p * .8), h = w * bolt.naturalHeight / bolt.naturalWidth; ctx.globalAlpha = 1 - p; ctx.save(); ctx.translate(x, y); ctx.rotate(f.x * 3); ctx.drawImage(bolt, -w / 2, -h / 2, w, h); ctx.restore(); ctx.globalAlpha = 1; }
      } else if (f.kind === 'splat') {
        const p = f.t / .6;
        ctx.fillStyle = f.color; ctx.globalAlpha = 1 - p;
        for (let i = 0; i < 7; i++) { const a = i * .9 + f.x, d = cell * f.size * (.2 + p * .6); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .6, cell * .08 * (1 - p) + 1, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
      } else if (f.kind === 'melt') {
        const p = f.t / .6, w = cell * f.size * 1.2, foot = y + cell * .42 - (f.fly ? cell * .28 : 0);
        ctx.save(); ctx.translate(x, foot);
        if (f.bones) { drawSprite(ctx, f.art, 0, 0, w, 1 - p); }
        else { ctx.scale(1 + p * .5, Math.max(.05, 1 - p)); drawSprite(ctx, f.art, 0, 0, w, 1 - p * .7); }
        ctx.restore();
      } else if (f.kind === 'abdeath') {
        // nine frames from the artist's death animation, then the puddle fades
        const n = Math.min(9, 1 + Math.floor(f.t / .1)), im = SPRITES['antbun/death' + n];
        if (im && im.complete) {
          const w = cell * f.size * 1.2, fd = w / ANTBUN.death.body[2], bb = ANTBUN.death.body, foot = y + cell * .42;
          ctx.globalAlpha = f.t > 1 ? Math.max(0, 1 - (f.t - 1) / .4) : 1;
          ctx.drawImage(im, x - (bb[0] + bb[2] / 2) * fd, foot - (bb[1] + bb[3]) * fd, ANTBUN.death.w * fd, ANTBUN.death.h * fd);
          ctx.globalAlpha = 1;
        }
      } else if (f.kind === 'icewave') {
        const pr = f.t / .9, ice = uiImg('ice');
        if (ice) { const w = cell * 3, h = w * ice.naturalHeight / ice.naturalWidth; ctx.globalAlpha = 1 - pr; for (let r = 0; r < ROWS; r++) ctx.drawImage(ice, W * pr - w / 2, r * cell + cell * .5 - h / 2, w, h); ctx.globalAlpha = 1; }
        ctx.fillStyle = `rgba(190,230,255,${.35 * (1 - pr)})`; ctx.fillRect(0, 0, W * pr, H);
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
    for (const f of S.floats) { ctx.fillStyle = `rgba(255,255,255,${1 - f.t})`; ctx.font = `800 ${cell * .32}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x * cell, f.row * cell + cell * .3 - f.t * cell * .5); }
    if (S.frozen > 0) { ctx.fillStyle = `rgba(170,215,255,${Math.min(.25, S.frozen * .1)})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    // banner
    if (S.banner) {
      const wv = S.banner.wave ? uiImg('wave' + (1 + Math.floor(S.t * 6) % 4)) : null;
      if (wv) { const h = cell * 2.2, w = h * wv.naturalWidth / wv.naturalHeight; ctx.globalAlpha = .9; ctx.drawImage(wv, W * .5 - w / 2 + Math.sin(S.t * 8) * 6, H * .4 + cell * .55 - h * .8, w, h); ctx.globalAlpha = 1; }
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
      b.innerHTML = `<div class="ico"><img src="art/weapons/${k.art}1.png" alt=""></div><b>${k.name}</b><span class="cost"><i class="coin"></i>${k.cost}</span><div class="cool"></div>`;
      b.title = k.blurb;
      shop.appendChild(b);
    }
    const up = document.createElement('button'); up.className = 'gun'; up.dataset.g = 'upgrade';
    up.innerHTML = '<div class="ico"><img src="art/weapons/blaster3.png" alt=""></div><b>Upgrade</b><span class="cost"><i class="coin"></i>75+</span>';
    up.title = 'tap a gun to upgrade it'; shop.appendChild(up);
    const sh = document.createElement('button'); sh.className = 'gun shovel'; sh.dataset.g = 'shovel';
    sh.innerHTML = '<div class="ico">⛏️</div><b>Dig up</b><span class="cost">½ back</span>';
    shop.appendChild(sh);
    const pw = document.createElement('button'); pw.className = 'gun power'; pw.dataset.g = 'power'; pw.hidden = true; shop.appendChild(pw);
    shop.onclick = e => {
      const b = e.target.closest('button'); if (!b || S.phase !== 'play') return;
      const key = b.dataset.g;
      if (key === 'power') return usePower();
      if (GUNS[key] && (S.money < GUNS[key].cost || S.recharge[key] > 0)) { b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); return; }
      S.sel = S.sel === key ? null : key; refreshShop();
    };
  }
  function flashShop(key) { const b = ui.shop.querySelector(`[data-g=${key}]`); if (b) { b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); } }
  function refreshShop() {
    for (const b of ui.shop.querySelectorAll('button')) {
      const key = b.dataset.g; b.classList.toggle('sel', S.sel === key);
      if (key === 'power') {
        b.hidden = !S.power;
        if (S.power) b.innerHTML = S.power === 'freeze' ? '<div class="ico"><img src="art/ui/ice.png" alt=""></div><b>Freeze!</b><span class="cost">tap to use</span>' : '<div class="ico"><img src="art/ui/bolt.png" alt=""></div><b>Storm!</b><span class="cost">tap to use</span>';
        continue;
      }
      if (key === 'shovel' || key === 'upgrade') continue;
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
    if (S.sel === 'upgrade') {
      const g = S.grid[r][c]; const cost = tierCost(g);
      if (!cost) { if (g) flashShop('upgrade'); return; }
      if (S.money < cost) { flashShop('upgrade'); return; }
      S.money -= cost; g.tier = (g.tier || 1) + 1; g.hp = gunHp(g); if (GUNS[g.type].kind === 'brain') g.uses = tierOf(g).uses; S.sel = null;
      S.fx.push({ kind: 'boom', x: c + .5, row: r, t: 0, r: .5 }); S.floats.push({ x: c + .5, row: r, t: 0, text: 'Tier ' + g.tier });
      refreshShop(); return;
    }
    if (S.sel === 'shovel') {
      const g = S.grid[r][c]; if (!g) return;
      S.grid[r][c] = null; S.money += Math.floor(GUNS[g.type].cost / 2); S.sel = null;
      S.fx.push({ kind: 'crunch', x: c + .5, row: r, t: 0 });
    } else {
      if (S.grid[r][c] || !S.spec.rows.includes(r)) return;
      const k = GUNS[S.sel]; if (S.money < k.cost || S.recharge[S.sel] > 0) return;
      S.grid[r][c] = { type: S.sel, hp: k.tiers[0].hp || k.hp, cool: .3, kick: 0, bitten: 0, tier: 1, seed: Math.random() * 3, arm: k.arm || 0, armed: false, fuse: k.fuse != null ? k.fuse : null, uses: k.tiers[0].uses || 0, beam: false };
      S.money -= k.cost; S.recharge[S.sel] = k.recharge; S.sel = null;
    }
    refreshShop();
  }

  /* power-ups earned by answer streaks: 5 in a row freezes the lawn, 10 calls a lightning storm */
  function usePower() {
    if (!S.power || S.phase !== 'play') return;
    if (S.power === 'freeze') {
      S.frozen = 6; S.fx.push({ kind: 'icewave', t: 0 }); buddy('pose_hips', 'emo_grin', 2);
    } else {
      S.shake = .6; buddy('pose_thumbs', 'emo_grin', 2);
      for (const sq of S.squishies) if (!sq.dead) { hurt(sq, 150); S.fx.push({ kind: 'boom', x: sq.x, row: sq.row, t: 0, r: .7 }); }
    }
    S.power = null; refreshShop();
  }

  /* the spaceman in the top bar reacts to what happens */
  let buddyTimer = 0;
  function buddy(pose, emo, secs) {
    if (!ui || !ui.buddyPose) return;
    ui.buddyPose.src = 'art/ui/' + pose + '.png'; ui.buddyEmo.src = 'art/ui/' + emo + '.png';
    ui.buddyEmo.classList.remove('pop'); void ui.buddyEmo.offsetWidth; ui.buddyEmo.classList.add('pop');
    clearTimeout(buddyTimer);
    buddyTimer = setTimeout(() => { if (ui && ui.buddyPose) { ui.buddyPose.src = 'art/ui/pose_stand.png'; ui.buddyEmo.src = 'art/ui/emo_neutral.png'; } }, secs * 1000);
  }

  /* word matching: the only way to earn coins */
  let quiz = null; const recentQ = [];
  function askWord() {
    const p = getProg(user), all = activeWords(user), due = all.filter(w => !resting(p[w.id])), words = due.length >= 8 ? due : all;   // spaced repetition: words that are resting stay out while enough are due
    let total = 0; const wts = words.map(w => { const t = weightOf(p[w.id]); total += t; return t; });
    let r = Math.random() * total, w = words[words.length - 1];
    for (let i = 0; i < words.length; i++) { r -= wts[i]; if (r <= 0) { w = words[i]; break; } }
    if (words.length > 1 && recentQ.slice(-Math.min(20, words.length - 2)).includes(w.id)) return askWord();   // a long gap before a word repeats
    recentQ.push(w.id); if (recentQ.length > 20) recentQ.shift();
    const ds = distractors(w, words).slice().sort(() => Math.random() - .5);
    const opts = [w.english, ds[0].english, ds[1] ? ds[1].english : ds[0].english].sort(() => Math.random() - .5);
    quiz = { w, opts, frozen: 0 };
    ui.qword.textContent = w.show;
    ui.qopts.innerHTML = opts.map((o, i) => `<button data-i="${i}">${esc(o)}</button>`).join('');
  }
  function answer(i) {
    if (!quiz || quiz.frozen > 0 || S.phase !== 'play') return;
    const ok = quiz.opts[i] === quiz.w.english;
    recordAnswer(user, quiz.w, ok);   // the same star rule as Organise
    const btns = ui.qopts.querySelectorAll('button');
    S.asked++; tally('asked', 1);
    if (ok) {
      btns[i].classList.add('good');
      S.correct++; tally('correct', 1); buddy('pose_thumbs', ['emo_happy', 'emo_love', 'emo_grin'][Math.floor(Math.random() * 3)], 1.4);
      S.streak++;
      if (S.streak === 5 && !S.power) { S.power = 'freeze'; S.banner = { text: '5 in a row — Freeze ready!', t: 2 }; }
      if (S.streak === 10) { S.power = 'storm'; S.banner = { text: '10 in a row — Lightning storm ready!', t: 2 }; S.streak = 0; }
      S.money += MATCH_COINS; refreshShop();
      ui.coinPop.textContent = '+' + MATCH_COINS; ui.coinPop.classList.remove('go'); void ui.coinPop.offsetWidth; ui.coinPop.classList.add('go');
      setTimeout(askWord, 220);
    } else {
      btns[i].classList.add('bad'); buddy('pose_facepalm', 'emo_xx', FREEZE_SECS); S.streak = 0;
      btns.forEach((b, j) => { if (quiz.opts[j] === quiz.w.english) b.classList.add('good'); });
      quiz.frozen = FREEZE_SECS;
      ui.ice.hidden = false; ui.iceN.textContent = FREEZE_SECS;
      const tick = setInterval(() => {
        quiz.frozen -= 1; ui.iceN.textContent = Math.max(0, quiz.frozen);
        if (quiz.frozen <= 0) { clearInterval(tick); ui.ice.hidden = true; askWord(); }
      }, 1000);
    }
  }

  function showOverlay(o, fn) {
    ui.overlay.hidden = false;
    const art = o.kind === 'won' ? `<div class="ovart won"><img src="art/ui/laurel_l.png" alt=""><img class="ttl" src="art/ui/title_youwin.png" alt="You win"><img src="art/ui/laurel_r.png" alt=""></div>`
      : o.kind === 'lost' ? `<div class="ovart lost"><img class="ttl" src="art/ui/title_gameover.png" alt="Game over"><img class="sad" src="art/ui/spaceman_sad.png" alt=""></div>`
      : `<h3>${o.title}</h3>`;
    const starsRow = o.stars ? `<div class="ovstars">${[1, 2, 3].map(i => `<img src="art/ui/${i <= o.stars ? 'star' : 'star_dark'}.png" alt="${i <= o.stars ? 'star' : ''}">`).join('')}</div>` : '';
    ui.overlay.innerHTML = `<div class="ovbox ${o.kind || ''}">${art}${starsRow}<p>${o.sub}</p>${o.kind === 'won' || o.kind === 'lost' ? statsHTML() : ''}<button class="btn ovbtn" id="ovBtn">${o.btn}</button></div>`;
    ui.overlay.querySelector('#ovBtn').onclick = () => { ui.overlay.hidden = true; fn(); };
  }
  function start() {
    S.phase = 'play'; bg = null; refreshShop(); askWord();
    ui.ice.hidden = true; if (quiz) quiz.frozen = 0;
  }
  function ready() {
    const fresh = Object.keys(SQUISHIES).filter(k => SQUISHIES[k].from === S.level && !SQUISHIES[k].boss).map(k => SQUISHIES[k].name);
    const w = S.spec.world;
    const first = S.level === 1 ? 'Match the words below to earn coins. Buy a Blaster, then tap a square to plant it. Scroll the shop for more weapons. Keep the squishies away from your lawnmowers!'
      : (S.level === w.from ? `Welcome to ${w.name}! ` : '') + `${S.spec.count} squishies are on their way.` + (fresh.length ? ` New: ${fresh.join(', ')}!` : '') + (S.spec.boss ? ` Boss level — ${SQUISHIES[S.spec.boss].name} leads the final wave!` : '');
    showOverlay({ kind: 'ready', title: `${w.name === 'the Moon' ? 'The Moon' : w.name} · Level ${S.level}`, sub: first, btn: S.level === 1 ? "Let's go!" : 'Ready!' }, start);
    const tr = document.createElement('button'); tr.className = 'linkbtn'; tr.textContent = '🏆 Trophy cabinet';
    tr.onclick = () => { location.hash = 'trophies'; };
    ui.overlay.querySelector('.ovbox').appendChild(tr);
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
        <div class="buddy"><img id="buddyPose" src="art/ui/pose_stand.png" alt=""><img id="buddyEmo" class="emo" src="art/ui/emo_neutral.png" alt=""></div>
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
      qopts: root.querySelector('#pqopts'), ice: root.querySelector('#pice'), iceN: root.querySelector('#piceN'), coinPop: root.querySelector('#pcoin'),
      buddyPose: root.querySelector('#buddyPose'), buddyEmo: root.querySelector('#buddyEmo') };
    cv = root.querySelector('#pcv'); ctx = cv.getContext('2d');
    document.body.classList.add('noscroll');
    root.querySelector('#phome').onclick = () => { if (opts.home) opts.home(); };
    const arts = [];
    for (const k in SQUISHIES) arts.push(...Object.values(SQUISHIES[k].look));
    for (const n of ANTBUN_PARTS) arts.push('antbun/' + n);
    for (let i = 1; i <= 9; i++) arts.push('antbun/death' + i);
    for (const a of arts) if (!SPRITES[a]) { const im = new Image(); im.src = 'art/squishies/' + a + '.png'; SPRITES[a] = im; }
    for (const n of UI_NAMES) if (!UI[n]) { const im = new Image(); im.src = 'art/ui/' + n + '.png'; UI[n] = im; }
    for (const key in GUNS) for (let t = 1; t <= GUNS[key].tiers.length; t++) { const n = GUNS[key].art + t; if (!WEAPONS[n]) { const im = new Image(); im.src = 'art/weapons/' + n + '.png'; WEAPONS[n] = im; } }
    for (const n of ['proj_bullet', 'proj_lava', 'proj_ice', 'proj_ring', 'proj_rock']) if (!WEAPONS[n]) { const im = new Image(); im.src = 'art/weapons/' + n + '.png'; WEAPONS[n] = im; }
    if (typeof Rig !== 'undefined') for (const n of RIG_KEYS) Rig.load(n);
    for (const n of ['grass', 'soil', 'path', 'mower', 'bush', 'fence']) if (!LAWN[n]) { const im = new Image(); im.onload = () => { bg = null; }; im.src = 'art/lawn/' + n + '.png'; LAWN[n] = im; }
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
    clearTimeout(buddyTimer);
    S = null; ui = null; quiz = null; stage = null;
  }
  function restartFromOne() { if (!S) return; S.money = START_MONEY; S = null; newLevel(1); ui.overlay.hidden = true; ready(); }
  // the trophy cabinet, as the artist's sheet lays it out: planets for worlds, 3-star planets, kill counts, and one for the lot
  const TROPHIES = [
    { id: 't0', name: 'Tutorial', how: 'Finish the Tutorial', test: sv => (sv.best || 1) > 2 },
    { id: 't1', name: 'Earth', how: 'Save Earth', test: sv => (sv.best || 1) > 6 },
    { id: 't2', name: 'Moon', how: 'Save the Moon', test: sv => (sv.best || 1) > 10 },
    { id: 't3', name: 'Mars', how: 'Save Mars', test: sv => (sv.best || 1) > 14 },
    { id: 't4', name: 'Neptune', how: 'Save Neptune', test: sv => (sv.best || 1) > 22 },
    { id: 't5', name: 'Saturn', how: 'Save Saturn', test: sv => (sv.best || 1) > 18 },
    { id: 't6', name: 'Earth ★★★', how: 'Three stars on every Earth level', test: sv => [3, 4, 5, 6].every(l => (sv.stars || {})[l] === 3) },
    { id: 't7', name: 'Moon ★★★', how: 'Three stars on every Moon level', test: sv => [7, 8, 9, 10].every(l => (sv.stars || {})[l] === 3) },
    { id: 't8', name: 'Mars ★★★', how: 'Three stars on every Mars level', test: sv => [11, 12, 13, 14].every(l => (sv.stars || {})[l] === 3) },
    { id: 't9', name: 'Neptune ★★★', how: 'Three stars on every Neptune level', test: sv => [19, 20, 21, 22].every(l => (sv.stars || {})[l] === 3) },
    { id: 't10', name: 'Saturn ★★★', how: 'Three stars on every Saturn level', test: sv => [15, 16, 17, 18].every(l => (sv.stars || {})[l] === 3) },
    { id: 't11', name: '100 squished', how: 'Squish 100 squishies', test: sv => (sv.kills || 0) >= 100 },
    { id: 't12', name: '500 squished', how: 'Squish 500 squishies', test: sv => (sv.kills || 0) >= 500 },
    { id: 't13', name: '1,000 squished', how: 'Squish 1,000 squishies', test: sv => (sv.kills || 0) >= 1000 },
    { id: 't14', name: '5,000 squished', how: 'Squish 5,000 squishies', test: sv => (sv.kills || 0) >= 5000 },
    { id: 't15', name: '10,000 squished', how: 'Squish 10,000 squishies', test: sv => (sv.kills || 0) >= 10000 },
    { id: 't16', name: '25,000 squished', how: 'Squish 25,000 squishies', test: sv => (sv.kills || 0) >= 25000 },
    { id: 't17', name: '50,000 squished', how: 'Squish 50,000 squishies', test: sv => (sv.kills || 0) >= 50000 },
    { id: 't18', name: '100,000 squished', how: 'Squish 100,000 squishies', test: sv => (sv.kills || 0) >= 100000 },
    { id: 't19', name: 'Squishygeddon', how: 'Earn every other trophy', test: sv => TROPHIES.slice(0, 19).every(t => t.test(sv)) },
  ];
  const trophies = sv => TROPHIES.map(t => ({ ...t, got: !!t.test(sv) }));

  // test hook: run the game forward without waiting
  const step = secs => { for (let t = 0; t < secs; t += 1 / 60) update(1 / 60); refreshShop(); };
  return { mount, unmount, restartFromOne, GUNS, SQUISHIES, WORLDS, worldOf, trophies, debug: { step, state: () => S, answer, quiz: () => quiz, spawn } };
})();
