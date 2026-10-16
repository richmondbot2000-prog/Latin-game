// Runs the Tunisian converter on sentences: node tounsi/tests/run.js "The boy goes to school." …
const fs = require('fs'), vm = require('vm'), path = require('path'), dir = path.join(__dirname, '..');
const c = { console, document: { baseURI: 'http://x/' } }; vm.createContext(c);
for (const f of ['vocab.js', 'forms.js', 'snap.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^const (\w+) =/m, 'var $1 ='), c);
const words = c.VOCAB.map(w => ({ ...w, id: w.word }));
module.exports = { Snap: c.Snap, words };
if (require.main === module) for (const s of process.argv.slice(2)) console.log(c.Snap.latinise(s, words).flat().map(t => t.skip ? null : t.la ? `[${t.la}]` : t.en).filter(Boolean).join(' '));
