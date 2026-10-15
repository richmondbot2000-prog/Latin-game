'use strict';

/* ---------- Rig: a small player for the artist's Spine rigs (art/rigs/<key>.json + .png) ----------
   Bones with rotate / translate / scale / shear timelines, slot attachment + colour (alpha) timelines, draw-order timelines,
   region attachments, named skins (draw(..., { skin }) falls back to the default skin), and per-slot hooks
   (draw(..., { hooks: { Weapon: (ctx, slot) => ... } }) draws your own thing in that slot's bone frame instead).
   Coordinates are Spine's (y up); draw() maps the skeleton origin to a canvas point with a scale. */
const Rig = (() => {
  const rigs = {};
  function load(key) {
    if (rigs[key]) return rigs[key];
    const r = rigs[key] = { key, ready: false, failed: false, json: null, img: new Image() };
    r.img.src = 'art/rigs/' + key + '.png';
    fetch('art/rigs/' + key + '.json').then(x => x.json()).then(j => { r.json = j; prep(r); }).catch(() => { r.failed = true; });
    return r;
  }
  function prep(r) {
    const j = r.json;
    j.boneIndex = {}; j.bones.forEach((b, i) => { j.boneIndex[b.name] = i; });
    for (const n in j.animations) {
      const a = j.animations[n]; let d = 0;
      for (const b in a.bones) for (const k in a.bones[b]) for (const f of a.bones[b][k]) d = Math.max(d, f.time || 0);
      for (const s in a.slots) { for (const f of a.slots[s].attachment || []) d = Math.max(d, f.time || 0); for (const f of a.slots[s].color || []) d = Math.max(d, f.time || 0); }
      for (const f of a.drawOrder || []) d = Math.max(d, f.time || 0);
      a.duration = d;
    }
    r.ready = true;
  }
  const ok = r => r && r.ready && r.img.complete && r.img.naturalWidth > 0;
  // curve handling: linear, stepped, or a cubic bezier given as [cx1, cy1, cx2, cy2]
  function ease(f, p) {
    const c = f.curve;
    if (c === 'stepped') return 0;
    if (!Array.isArray(c)) return p;
    // find t for x = p on the bezier (0,0)-(cx1,cy1)-(cx2,cy2)-(1,1), then return y
    let lo = 0, hi = 1, t = p;
    for (let i = 0; i < 12; i++) { t = (lo + hi) / 2; const mt = 1 - t, x = 3 * mt * mt * t * c[0] + 3 * mt * t * t * c[2] + t * t * t; if (x < p) lo = t; else hi = t; }
    const mt = 1 - t; return 3 * mt * mt * t * c[1] + 3 * mt * t * t * c[3] + t * t * t;
  }
  function frameAt(frames, t) {
    if (!frames || !frames.length) return null;
    if (t <= frames[0].time) return [frames[0], frames[0], 0];
    const last = frames[frames.length - 1];
    if (t >= last.time) return [last, last, 0];
    let i = 0; while (frames[i + 1].time <= t) i++;
    const a = frames[i], b = frames[i + 1]; return [a, b, ease(a, (t - a.time) / (b.time - a.time))];
  }
  const lerp = (a, b, p) => a + (b - a) * p;
  const lerpAngle = (a, b, p) => { let d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return a + d * p; };
  // world transforms for every bone at time t of an animation (or the setup pose when anim is null)
  function pose(j, anim, t) {
    const A = anim && j.animations[anim], W = new Array(j.bones.length);
    for (let i = 0; i < j.bones.length; i++) {
      const b = j.bones[i];
      let rot = b.rotation || 0, x = b.x || 0, y = b.y || 0, sx = b.scaleX == null ? 1 : b.scaleX, sy = b.scaleY == null ? 1 : b.scaleY, shx = b.shearX || 0, shy = b.shearY || 0;
      const tl = A && (A.bones || {})[b.name];
      if (tl) {
        let f;
        if ((f = frameAt(tl.rotate, t))) rot += lerpAngle(f[0].angle || 0, f[1].angle || 0, f[2]);
        if ((f = frameAt(tl.translate, t))) { x += lerp(f[0].x || 0, f[1].x || 0, f[2]); y += lerp(f[0].y || 0, f[1].y || 0, f[2]); }
        if ((f = frameAt(tl.scale, t))) { sx *= lerp(f[0].x == null ? 1 : f[0].x, f[1].x == null ? 1 : f[1].x, f[2]); sy *= lerp(f[0].y == null ? 1 : f[0].y, f[1].y == null ? 1 : f[1].y, f[2]); }
        if ((f = frameAt(tl.shear, t))) { shx += lerp(f[0].x || 0, f[1].x || 0, f[2]); shy += lerp(f[0].y || 0, f[1].y || 0, f[2]); }
      }
      const rx = (rot + shx) * Math.PI / 180, ry = (rot + 90 + shy) * Math.PI / 180;
      const la = Math.cos(rx) * sx, lb = Math.cos(ry) * sy, lc = Math.sin(rx) * sx, ld = Math.sin(ry) * sy;
      if (b.parent != null) {
        const p = W[j.boneIndex[b.parent]];
        W[i] = [p[0] * la + p[1] * lc, p[0] * lb + p[1] * ld, p[2] * la + p[3] * lc, p[2] * lb + p[3] * ld, p[0] * x + p[1] * y + p[4], p[2] * x + p[3] * y + p[5]];
      } else W[i] = [la, lb, lc, ld, x, y];
    }
    return W;
  }
  // draw the rig with its origin at canvas (x, y), skeleton units scaled by s
  // slot order at time t: the setup order, shifted by the animation's draw-order keys
  function orderAt(j, A, t) {
    const base = j.slots, tl = A && j.animations[A].drawOrder;
    if (!tl || !tl.length) return base;
    let cur = null; for (const f of tl) { if (f.time <= t) cur = f; else break; }
    if (!cur || !cur.offsets) return base;
    const n = base.length, out = new Array(n).fill(null), unchanged = [];
    const idx = {}; base.forEach((sl, i) => { idx[sl.name] = i; });
    const moved = new Set(cur.offsets.map(o => o.slot));
    for (const sl of base) if (!moved.has(sl.name)) unchanged.push(sl);
    for (const o of cur.offsets) { const i = idx[o.slot]; if (i == null) continue; let p = i + o.offset; p = Math.max(0, Math.min(n - 1, p)); while (out[p]) p = (p + 1) % n; out[p] = base[i]; }
    let u = 0; for (let i = 0; i < n; i++) if (!out[i]) out[i] = unchanged[u++];
    return out;
  }
  const alphaOf = (frames, t) => { const f = frameAt(frames, t); if (!f) return 1; const a0 = parseInt(f[0].color.slice(6, 8), 16) / 255, a1 = parseInt(f[1].color.slice(6, 8), 16) / 255; return a0 + (a1 - a0) * f[2]; };
  function draw(ctx, r, anim, t, x, y, s, opts) {
    if (!ok(r)) return false;
    const j = r.json, A = anim && j.animations[anim] ? anim : null, W = pose(j, A, t), at = j.atlas, k = j.scale;
    const skinName = opts && opts.skin, skinAtt = skinName && j.skins && j.skins[skinName], hooks = (opts && opts.hooks) || null, baseAlpha = ctx.globalAlpha;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, -s);
    for (const slot of orderAt(j, A, t)) {
      let attName = slot.attachment;
      const stl = A && (j.animations[A].slots || {})[slot.name];
      if (stl && stl.attachment && stl.attachment.length) { let cur = null; for (const f of stl.attachment) { if (f.time <= t) cur = f; else break; } if (cur) attName = cur.name; }
      const B = W[j.boneIndex[slot.bone]];
      if (hooks && hooks[slot.name]) { ctx.save(); ctx.transform(B[0], B[2], B[1], B[3], B[4], B[5]); hooks[slot.name](ctx, slot, attName); ctx.restore(); continue; }
      if (!attName) continue;
      const alpha = stl && stl.color ? alphaOf(stl.color, t) : 1; if (alpha <= 0) continue;
      const att = (skinAtt && skinAtt[slot.name] && skinAtt[slot.name][attName]) || (j.skin[slot.name] && j.skin[slot.name][attName]); if (!att) continue;
      const reg = at[att.path || att.name || attName]; if (!reg) continue;
      ctx.save(); if (alpha < 1) ctx.globalAlpha = baseAlpha * alpha;
      ctx.transform(B[0], B[2], B[1], B[3], B[4], B[5]);
      const ar = (att.rotation || 0) * Math.PI / 180, asx = att.scaleX == null ? 1 : att.scaleX, asy = att.scaleY == null ? 1 : att.scaleY;
      ctx.transform(Math.cos(ar) * asx, Math.sin(ar) * asx, -Math.sin(ar) * asy, Math.cos(ar) * asy, att.x || 0, att.y || 0);
      ctx.scale(att.width / reg.ow, att.height / reg.oh);   // attachment size in skeleton units vs the picture's own pixels
      ctx.scale(1, -1);
      const rw = reg.w / k, rh = reg.h / k;                  // the trimmed picture, back in original pixels
      ctx.drawImage(r.img, reg.x, reg.y, reg.w, reg.h, -reg.ow / 2 + reg.ox, -(-reg.oh / 2 + reg.oy + rh), rw, rh);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }
  const duration = (r, anim) => ok(r) && r.json.animations[anim] ? r.json.animations[anim].duration : 0;
  const has = (r, anim) => ok(r) && !!r.json.animations[anim];
  const skins = r => ok(r) && r.json.skins ? Object.keys(r.json.skins) : [];
  return { load, ok, draw, duration, has, skins, bounds: r => ok(r) ? r.json.bounds : null };
})();
