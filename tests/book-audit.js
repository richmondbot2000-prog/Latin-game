// The converter over real books: runs Snap.latinise over the first ~60,000 characters of each Library shelf book
// (fetched from the live worker) and lists every English → Latin pair with how often it happens and an example
// sentence, most frequent first. Review the top of the list after any change to snap.js; a wrong pair becomes a
// rule in snap.js and a case in tests/latin-cases.js.
// Run: node tests/book-audit.js [out.json]   (Node 18+; needs the network)
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'vocab.js'), 'utf8') + fs.readFileSync(path.join(root, 'snap.js'), 'utf8') + ';globalThis.__V = VOCAB; globalThis.__S = Snap;', ctx);
const BOOKS = [67098, 14838, 11757, 28885, 43936, 32488, 27805, 236, 26999, 16, 16865, 902, 52521, 17314, 46409, 120, 64365, 113, 1874, 271];
(async () => {
  const tally = {}, ex = {}; let total = 0;
  for (const id of BOOKS) {
    const j = await (await fetch('https://sync.musicalmagic.uk/book/' + id)).json();
    const text = j.text.split('\n\n').filter(p => !p.startsWith('[[')).join('\n\n').slice(0, 60000);
    for (const s of ctx.__S.latinise(text, ctx.__V)) for (const t of s) if (t.la && !t.skip) {
      const k = (t.gloss || t.en).toLowerCase().replace(/[^a-z' ]/g, '') + ' → ' + t.id; tally[k] = (tally[k] || 0) + 1; total++;
      if (!ex[k]) ex[k] = s.map(x => x.en).join(' ').replace(/ ([,.;:!?])/g, '$1').slice(0, 140);
    }
  }
  const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, n, ex: ex[k] }));
  console.log(`${total} Latin words, ${rows.length} different English → Latin pairs`);
  rows.forEach(r => console.log(String(r.n).padStart(5), r.k.padEnd(34), '|', r.ex));
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
})();
