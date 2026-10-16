// Builds <lang>/read.js, phrases.js and synonyms.js from sentences.txt, words.txt and synonyms.txt.
// Run from the repo root: node tools/lang/build_read.js <lang folder>
// sentences.txt: one sentence per line — "lv | Tunisian | English"; a story line adds "| story-id | Story title".
// Each Tunisian word is looked up in the forms of vocab.js (headwords, el- forms, plurals, verb persons); a form the
// table does not have, or an ambiguous one, is written form=headword, with an optional |gloss: "khouk=khouya|your brother".
// A name, or a word outside the list, is form=-|gloss. Every headword must be at the sentence's level or below.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..', '..'), dir = path.join(root, process.argv[2]);
const c = { console }; vm.createContext(c);
for (const f of ['vocab.js', 'forms.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^const (\w+) =/m, 'var $1 ='), c);
// the English shaping helpers, from the Latin app.js (the Tunisian app.js adds the nd / ndp shapes the same way)
const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
const lines = app.split('\n');
const grab = p => { const i = lines.findIndex(l => l.startsWith(p)); if (i < 0) throw new Error('no ' + p); if (p.startsWith('function')) { let j = i; while (!/^}/.test(lines[j])) j++; return lines.slice(i, j + 1).join('\n'); } return lines[i]; };
vm.runInContext(['const IRREG = ', 'const PRON = ', 'const PAST = ', 'const pastOf = ', 'function inflect('].map(grab).join('\n').replace(/^const /gm, 'var '), c);
const VOCAB = c.VOCAB, Forms = c.Forms, inflect = c.inflect;
const show = w => w.replace(/\s*\(.*\)$/, '');
const WORDS = VOCAB.map(v => ({ ...v, id: v.word, show: show(v.word) }));
const byId = Object.fromEntries(WORDS.map(w => [w.id, w]));
// every form → [{ id, shape }]
const table = {};
const addForm = (f, id, shape) => { const k = f.toLowerCase().replace(/ /g, '_'); (table[k] = table[k] || []).push({ id, shape }); };
for (const w of WORDS) for (const f of Forms.of(w)) addForm(f.la, w.id, f.shape);
for (const w of WORDS) if (w.pos === 'Adj') for (const f of Forms.of(w)) addForm(Forms.definite(f.la), w.id, f.shape);
const english = (w, shape) => {
  const base = w.english.split(',')[0].trim().replace(/\s*\(.*\)$/, '');
  if (shape === 'o' || shape === 'adj' || shape === 'adjp' || shape === 'n1') return base;
  return inflect(w.english, shape, /^[vp]/.test(shape));
};
const out = [];
let lineNo = 0, bad = 0;
for (const raw of fs.readFileSync(path.join(dir, 'sentences.txt'), 'utf8').split('\n')) {
  lineNo++;
  const line = raw.trim(); if (!line || line.startsWith('#')) continue;
  const parts = line.split(' | ').map(x => x.trim());   // fields are separated by ' | '; a gloss's '|' has no spaces
  const lv = +parts[0], la = parts[1], en = parts[2], p = parts[3], pt = parts[4];
  const toks = [];
  for (const m of la.matchAll(/[^\s"“”.,;:!?]+|["“”.,;:!?]/g)) {
    const t = m[0];
    if (/^["“”.,;:!?()]$/.test(t)) { toks.push([t, null]); continue; }
    let form = t, id = null, gloss = null, shape = 'o';
    const eq = t.indexOf('=');
    if (eq >= 0) {
      form = t.slice(0, eq); const rest = t.slice(eq + 1); const bar = rest.indexOf('|');
      id = (bar >= 0 ? rest.slice(0, bar) : rest).replace(/_/g, ' '); gloss = bar >= 0 ? rest.slice(bar + 1).replace(/_/g, ' ') : null;
      if (id === '-') { toks.push(gloss ? [form.replace(/_/g, ' '), null, gloss, 'o'] : [form.replace(/_/g, ' '), null]); continue; }
      if (!byId[id]) { console.log(`line ${lineNo}: no word "${id}"`); bad++; continue; }
      const hit = (table[form.toLowerCase()] || []).find(x => x.id === id); shape = hit ? hit.shape : 'o';
    } else {
      const hits = table[form.toLowerCase()] || [];
      if (!hits.length) { console.log(`line ${lineNo}: unknown form "${form}"`); bad++; continue; }
      const ids = [...new Set(hits.map(h => h.id))];
      if (ids.length > 1) { console.log(`line ${lineNo}: "${form}" could be ${ids.join(' / ')} — write form=headword`); bad++; continue; }
      id = hits[0].id; shape = hits[0].shape;
    }
    const w = byId[id];
    if (lv < 0 ? !w.top : w.level > lv) { console.log(`line ${lineNo}: "${form}" (${id}) is ${lv < 0 ? 'not a Beginner word' : 'level ' + w.level}, sentence is level ${lv}`); bad++; }
    toks.push([form.replace(/_/g, ' '), id, gloss || english(w, shape), shape]);
  }
  const e = { la: toks, en, lv };
  if (p) { e.p = p; e.pt = pt; }
  out.push(e);
}
if (bad) { console.log(bad + ' problems'); process.exit(1); }
const stories = new Set(out.filter(x => x.p).map(x => x.p));
const js = `// Read: Tunisian sentences by level (lv -1 Beginner, the 50 top words; 0 Basic … 4) and short stories (p, pt). Each token is [form, headword, English in
// this form, shape] (headword = the id in vocab.js; shape nd = definite noun, n2 = plural, v3s… = verb person, p1s… = past,
// adj, o = other); punctuation and names are [text, null]. Built by tools/lang/build_read.js from sentences.txt.
const SENTENCES = [
${out.map(e => '  ' + JSON.stringify(e)).join(',\n')}
];
`;
fs.writeFileSync(path.join(dir, 'read.js'), js);
const PHRASES = {};
// one sentence per level for each word (the first at that level, levels ascending), so the card can show one whose
// every word is within the player's setting
for (const e of out) for (const t of e.la) { if (t[1]) { const list = PHRASES[t[1]] || (PHRASES[t[1]] = []); if (list.some(x => x.lv === e.lv)) continue; const la = e.la.map(x => x === t ? '*' + x[0] + '*' : x[0]).join(' ').replace(/ ([,.;:?!])/g, '$1').replace(/" (.*?) "/g, '"$1"'); list.push({ la, en: e.en, lv: e.lv }); } }
for (const k in PHRASES) PHRASES[k].sort((a, b) => a.lv - b.lv);
fs.writeFileSync(path.join(dir, 'phrases.js'), '// Example sentences for the cards: for each word, the first sentence of read.js that holds it at each level (lv ascending). Built by tools/lang/build_read.js.\nconst PHRASES = ' + JSON.stringify(PHRASES, null, 0).replace(/\],"/g, '],\n  "') + ';\n');
console.log(Object.keys(PHRASES).length + ' words have an example sentence');
console.log(`${out.length} sentences, ${stories.size} stories; by level: ${[-1, 0, 1, 2, 3, 4].map(l => out.filter(x => x.lv === l).length).join(' / ')} (Beginner first)`);

// spoken alternatives: the dictionary senses beyond the first, plus synonyms.txt ("word: alt, alt")
const SYN = {};
for (const w of WORDS) { const senses = w.english.replace(/\(.*?\)/g, '').split(',').map(x => x.trim()).filter(Boolean); if (senses.length > 1) SYN[w.id] = senses.slice(1); }
const synFile = path.join(dir, 'synonyms.txt');
if (fs.existsSync(synFile)) for (const l of fs.readFileSync(synFile, 'utf8').split('\n')) { if (!l.trim() || l.startsWith('#')) continue; const i = l.indexOf(':'); const k = l.slice(0, i).trim(), alts = l.slice(i + 1).split(',').map(x => x.trim()).filter(Boolean); if (!byId[k]) { console.log('synonyms.txt: no word "' + k + '"'); continue; } SYN[k] = [...new Set([...(SYN[k] || []), ...alts])]; }
fs.writeFileSync(path.join(dir, 'synonyms.js'), '// Spoken alternatives for the words, used by Passages and the readers: any of these said or typed counts (as well as the\n// dictionary meanings and their -s / -ing / -ed forms). Built by tools/lang/build_read.js from words.txt and synonyms.txt.\nconst SYNONYMS = {\n' + Object.entries(SYN).map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n};\n');
console.log(Object.keys(SYN).length + ' words have spoken alternatives');
