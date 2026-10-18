// Draws a stave with VexFlow into an element, scaled to its width.
// spec = { clef, key, time, notes: [{ keys, acc, dur }], rhythm: [[dur…]…], small }
(function () {
  const VF = Vex.Flow;
  function draw(el, spec) {
    el.innerHTML = '';
    const small = !!spec.small;
    const W = small ? 170 : 330, H = small ? 125 : 150;
    const r = new VF.Renderer(el, VF.Renderer.Backends.SVG);
    r.resize(W, H);
    const ctx = r.getContext();
    const st = new VF.Stave(small ? 4 : 8, small ? 10 : 22, W - (small ? 10 : 18));
    if (spec.clef && !spec.rhythm) st.addClef(spec.clef);
    if (spec.key) st.addKeySignature(spec.key);
    if (spec.time) st.addTimeSignature(spec.time);
    if (spec.rhythm) st.setEndBarType(VF.Barline.type.SINGLE);
    st.setContext(ctx).draw();
    let notes = [], beams = [];
    if (spec.rhythm) {
      for (const g of spec.rhythm) {
        const run = [];
        const flush = () => { if (run.length > 1) beams.push(new VF.Beam(run.slice())); run.length = 0; };
        for (const d of g) {
          const rest = d.endsWith('r');
          const n = new VF.StaveNote({ keys: ['b/4'], duration: d, stem_direction: 1, auto_stem: false });
          if (d.includes('d')) VF.Dot.buildAndAttach([n], { all: true });
          notes.push(n);
          if (!rest && /^(8|16)/.test(d)) run.push(n); else flush();
        }
        flush();
      }
    } else if (spec.notes) {
      notes = spec.notes.map(n => {
        const sn = new VF.StaveNote({ clef: spec.clef, keys: n.keys, duration: n.dur || 'w', auto_stem: true });
        (n.acc || []).forEach((a, i) => { if (a) sn.addModifier(new VF.Accidental(a), i); });
        return sn;
      });
    }
    if (notes.length) {
      // a lone note or chord sits in the middle: ghost notes either side
      const ticks = notes.length === 1 ? [new VF.GhostNote('w'), notes[0], new VF.GhostNote('w')] : notes;
      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables(ticks);
      const room = st.getNoteEndX() - st.getNoteStartX() - (small ? 12 : 20);
      new VF.Formatter().joinVoices([voice]).format([voice], Math.max(40, room));
      voice.draw(ctx, st);
      beams.forEach(b => b.setContext(ctx).draw());
    }
    const svg = el.querySelector('svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.style.width = '100%'; svg.style.height = 'auto';
  }
  window.Stave = { draw };
})();
