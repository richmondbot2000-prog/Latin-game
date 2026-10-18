// Draws music/staves/<slug>.svg for every note in music/notes.json with VexFlow (grade5/lib) in headless Chromium:
// a clef and one whole note, the same size for every picture. Run from the repo root: node tools/music/staves.js
// (needs the playwright package: NODE_PATH=/opt/node22/lib/node_modules in the cloud container)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const notes = JSON.parse(fs.readFileSync(path.join(root, 'music', 'notes.json'), 'utf8'));
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  await pg.setContent('<div id="d"></div>');
  await pg.addScriptTag({ path: path.join(root, 'grade5', 'lib', 'vexflow.js') });
  const out = await pg.evaluate(notes => {
    const VF = Vex.Flow, res = {};
    for (const n of notes) {
      const d = document.getElementById('d'); d.innerHTML = '';
      const W = 200, H = 150;
      const r = new VF.Renderer(d, VF.Renderer.Backends.SVG); r.resize(W, H);
      const ctx = r.getContext();
      const st = new VF.Stave(6, 25, W - 12).addClef(n.clef);
      st.setStyle({ strokeStyle: '#3a3a3a', fillStyle: '#3a3a3a' });
      st.setContext(ctx).draw();
      const sn = new VF.StaveNote({ clef: n.clef, keys: [n.key], duration: 'w' });
      if (n.acc) sn.addModifier(new VF.Accidental(n.acc), 0);
      const v = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables([new VF.GhostNote('w'), sn, new VF.GhostNote('w')]);
      new VF.Formatter().joinVoices([v]).format([v], st.getNoteEndX() - st.getNoteStartX() - 10);
      v.draw(ctx, st);
      const svg = d.querySelector('svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W * 2); svg.setAttribute('height', H * 2);
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.removeAttribute('style');
      res[n.slug] = svg.outerHTML;
    }
    return res;
  }, notes);
  const dir = path.join(root, 'music', 'staves'); fs.mkdirSync(dir, { recursive: true });
  for (const [slug, svg] of Object.entries(out)) fs.writeFileSync(path.join(dir, slug + '.svg'), '<?xml version="1.0" encoding="UTF-8"?>\n' + svg + '\n');
  console.log(Object.keys(out).length, 'staves');
  await b.close();
})();
