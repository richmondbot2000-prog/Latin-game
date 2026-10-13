'use strict';

/* ---------- decorative card borders, one style per kind of word ----------
   Each style draws one edge in local coordinates: x runs along the edge (0..L),
   y points into the card. The same drawing is rotated onto all four sides. */

const FRAME_INSET = 9;

function fit(L, unit) { const n = Math.max(2, Math.round(L / unit)); return { n, s: L / n }; }
function rectLine(w, h, d, r = 0) {
  return `<rect x="${d}" y="${d}" width="${w - 2 * d}" height="${h - 2 * d}" rx="${r}" fill="none"/>`;
}

const FRAMES = {
  // nouns: square "Greek key" band between two lines
  noun: {
    edge(L) {
      const { n, s } = fit(L, 14); let d = 'M0 3';
      for (let i = 0; i < n; i++) { const x = i * s; d += ` L${x + s / 2} 3 L${x + s / 2} 11 L${x + s} 11 L${x + s} 3`; }
      return `<path d="${d}" fill="none" stroke-width="1.6"/>`;
    },
    extra: (w, h, m) => rectLine(w, h, m - 3) + rectLine(w, h, m + 14),
  },
  // verbs: bold double zigzag (full of action)
  verb: {
    edge(L) {
      const { n, s } = fit(L, 12); let a = 'M0 0', b = 'M0 6';
      for (let i = 0; i < n; i++) { const x = i * s; a += ` L${x + s / 2} 7 L${x + s} 0`; b += ` L${x + s / 2} 13 L${x + s} 6`; }
      return `<path d="${a}" fill="none" stroke-width="2"/><path d="${b}" fill="none" stroke-width="1.2"/>`;
    },
    extra: () => '',
  },
  // adjectives: scalloped edge with a fine inner line
  adjective: {
    edge(L) {
      const { n, s } = fit(L, 18); let d = 'M0 4';
      for (let i = 0; i < n; i++) d += ` A${s / 2} ${s / 2.4} 0 0 1 ${(i + 1) * s} 4`;
      return `<path d="${d}" fill="none" stroke-width="1.8"/>`;
    },
    extra: (w, h, m) => rectLine(w, h, m + 10, 6),
  },
  // adverbs: two flowing waves
  adverb: {
    edge(L) {
      const { n, s } = fit(L, 26); let a = 'M0 3', b = 'M0 9';
      for (let i = 0; i < n; i++) {
        const x = i * s;
        a += ` Q${x + s / 4} -2 ${x + s / 2} 3 T${x + s} 3`;
        b += ` Q${x + s / 4} 14 ${x + s / 2} 9 T${x + s} 9`;
      }
      return `<path d="${a}" fill="none" stroke-width="1.8"/><path d="${b}" fill="none" stroke-width="1.2"/>`;
    },
    extra: () => '',
  },
  // prepositions: a chain of diamonds between two lines
  preposition: {
    edge(L) {
      const { n, s } = fit(L, 15); let d = '';
      for (let i = 0; i < n; i++) { const c = i * s + s / 2; d += `M${c} 1 L${c + 5} 7 L${c} 13 L${c - 5} 7 Z `; }
      return `<path d="${d}" stroke="none" fill="currentColor"/>`;
    },
    extra: (w, h, m) => rectLine(w, h, m - 3) + rectLine(w, h, m + 17),
  },
  // joining words: interlinked chain
  'joining word': {
    edge(L) {
      const { n, s } = fit(L, 14); let d = '';
      for (let i = 0; i < n; i++) d += `<ellipse cx="${i * s + s / 2}" cy="6" rx="${s * 0.62}" ry="4.2" fill="none" stroke-width="1.5"/>`;
      return d;
    },
    extra: (w, h, m) => rectLine(w, h, m + 15, 4),
  },
  // pronouns: dotted frame with rings at the corners
  pronoun: {
    edge(L) {
      const { n, s } = fit(L, 10); let d = '';
      for (let i = 1; i < n; i++) d += `<circle cx="${i * s}" cy="6" r="2.1" stroke="none" fill="currentColor"/>`;
      return d;
    },
    extra: (w, h, m) => {
      let c = rectLine(w, h, m - 2, 10) + rectLine(w, h, m + 14, 6);
      for (const [x, y] of [[m + 6, m + 6], [w - m - 6, m + 6], [m + 6, h - m - 6], [w - m - 6, h - m - 6]])
        c += `<circle cx="${x}" cy="${y}" r="9" fill="var(--card)" stroke-width="2"/><circle cx="${x}" cy="${y}" r="4" stroke="none" fill="currentColor"/>`;
      return c;
    },
  },
  // question words: curly swirls in each corner
  'question word': {
    edge: () => '',
    extra: (w, h, m) => {
      // a corner arc that curls into a spiral, like a scroll
      const curl = 'M54 0 C24 0 0 8 0 40 M0 54 C0 24 8 0 40 0' +
        ' M22 22 m-9 0 a9 9 0 1 1 18 0 a6.5 6.5 0 1 1 -13 0 a4 4 0 1 1 8 0';
      let c = rectLine(w, h, m + 6, 16);
      const corners = [[m - 2, m - 2, 0], [w - m + 2, m - 2, 90], [w - m + 2, h - m + 2, 180], [m - 2, h - m + 2, 270]];
      for (const [x, y, r] of corners)
        c += `<g transform="translate(${x} ${y}) rotate(${r})"><path d="${curl}" fill="none" stroke-width="2.6" stroke-linecap="round"/></g>`;
      return c;
    },
  },
  // numbers: art-deco double frame with stepped corners
  number: {
    edge: () => '',
    extra: (w, h, m) => {
      let c = rectLine(w, h, m) + rectLine(w, h, m + 6);
      const step = 'M0 34 L12 34 L12 24 L24 24 L24 12 L34 12 L34 0';
      const step2 = 'M0 44 L20 44 L20 32 L32 32 L32 20 L44 20 L44 0';
      const corners = [[m + 6, m + 6, 0], [w - m - 6, m + 6, 90], [w - m - 6, h - m - 6, 180], [m + 6, h - m - 6, 270]];
      for (const [x, y, r] of corners)
        c += `<g transform="translate(${x} ${y}) rotate(${r})"><path d="${step}" fill="none" stroke-width="1.6"/><path d="${step2}" fill="none" stroke-width="1"/></g>`;
      return c;
    },
  },
};

function frameSVG(kind, w, h) {
  const f = FRAMES[kind] || FRAMES.noun, m = FRAME_INSET;
  const e = f.edge(w - 2 * m), e2 = f.edge(h - 2 * m);
  const sides = e ? [
    `<g transform="translate(${m} ${m})">${e}</g>`,
    `<g transform="translate(${w - m} ${m}) rotate(90)">${e2}</g>`,
    `<g transform="translate(${w - m} ${h - m}) rotate(180)">${e}</g>`,
    `<g transform="translate(${m} ${h - m}) rotate(270)">${e2}</g>`].join('') : '';
  return `<svg class="frame" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" stroke="currentColor">${f.extra(w, h, m)}${sides}</svg>`;
}

/* ---------- fireworks + glitter ---------- */

const Celebrate = (() => {
  let cv, ctx, parts = [], raf = 0, W = 0, H = 0, dpr = 1, timers = [];
  const COLORS = ['#FFD23F', '#FF5D8F', '#5BC0EB', '#9BE564', '#FF8C42', '#C77DFF', '#FFFFFF', '#F72585', '#4CC9F0', '#FFE66D'];
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup() {
    if (!cv) {
      cv = document.createElement('canvas'); cv.className = 'fx';
      document.body.appendChild(cv); ctx = cv.getContext('2d');
    }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function burst(x, y, n, speed) {
    const hue = pick(COLORS), hue2 = pick(COLORS);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-.08, .08), v = speed * rnd(.55, 1.05);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .07, drag: .975, life: rnd(60, 95), age: 0,
        size: rnd(2.2, 3.6), color: Math.random() < .7 ? hue : hue2, kind: 'spark', trail: [] });
    }
    // a flash of white at the centre
    parts.push({ x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 14, age: 0, size: 26, color: '#FFFFFF', kind: 'flash' });
  }
  function glitter(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd(-Math.PI, 0), v = rnd(4, 12);
      parts.push({ x, y, vx: Math.cos(a) * v * 1.2, vy: Math.sin(a) * v, g: .22, drag: .985, life: rnd(70, 120), age: 0,
        size: rnd(3, 7), color: pick(COLORS), kind: Math.random() < .5 ? 'star' : 'chip', rot: rnd(0, 6), vr: rnd(-.3, .3) });
    }
  }
  function star(x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * .42 : r, a = rot + i * Math.PI / 4;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.age < p.life);
    for (const p of parts) {
      p.age++; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy;
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
      ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      if (p.kind === 'spark') {
        p.trail.push(p.x, p.y); if (p.trail.length > 10) p.trail.splice(0, 2);
        ctx.lineWidth = p.size * .8; ctx.beginPath(); ctx.moveTo(p.trail[0], p.trail[1]);
        for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]);
        ctx.stroke();
        if (Math.random() < .25) { ctx.globalAlpha *= .9; ctx.fillRect(p.x + rnd(-2, 2), p.y + rnd(-2, 2), 1.5, 1.5); }
      } else if (p.kind === 'flash') {
        const r = p.size * (1 + p.age / 4);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      } else {
        p.rot += p.vr;
        const tw = .55 + .45 * Math.sin(p.age * .5 + p.size);   // twinkle
        ctx.globalAlpha *= tw;
        if (p.kind === 'star') star(p.x, p.y, p.size, p.rot);
        else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
      }
    }
    ctx.globalAlpha = 1;
    if (parts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }
  function go() { if (!raf) raf = requestAnimationFrame(frame); }

  // power: 1 = normal right answer, bigger for streak milestones
  function celebrate(fromX, fromY, power = 1) {
    setup();
    if (reduce()) { glitter(fromX, fromY, 40); go(); return; }
    glitter(fromX, fromY, Math.round(140 * power));
    const shots = Math.round(4 + 2.5 * (power - 1));
    for (let i = 0; i < shots; i++) {
      timers.push(setTimeout(() => {
        burst(rnd(W * .12, W * .88), rnd(H * .1, H * .55), Math.round(rnd(90, 130)), rnd(9, 13) * Math.min(1.4, .9 + power * .15));
        go();
      }, i * rnd(110, 190)));
    }
    go();
  }
  // stop everything at once (used when leaving the game screen)
  celebrate.stop = () => {
    timers.forEach(clearTimeout); timers = []; parts = [];
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (ctx) ctx.clearRect(0, 0, W, H);
  };
  return celebrate;
})();
