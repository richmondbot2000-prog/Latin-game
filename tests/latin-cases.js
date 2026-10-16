// Regression tests for the English → Latin converter (snap.js), used by Snap a page and the Library.
// Every mistake found in a real book becomes a case here, so it can never quietly come back.
// Run: node tests/latin-cases.js   (from the repo root; prints each failure and exits 1 if any)
// A case: [English sentence, the English word (or phrase) to look at, what it must become].
// The expectation is the Latin form, or null for "stays English"; a gloss check is { la, gloss }.
const CASES = [
  // double meanings
  ['It means he had the name over the door in gold letters, and lived under it.', 'letters', null],
  ['The king wrote a letter to the queen.', 'letter', 'epistulam'],
  ['He learnt his letters at school.', 'letters', null],
  ['But his arms were so stiff from holding on to the string.', 'arms', null],
  ['The soldiers took up their arms and went to war.', 'arms', 'arma'],
  ['Pooh made his preparations for bed.', 'bed', null],
  ['Then he ran straight off home to bed.', 'bed', null],
  ['He bounced twenty feet on to the next branch.', 'next', null],
  ['Next he went into the garden.', 'Next', 'Deinde'],
  ['Well, you both went out with the blue balloon, and you took your gun with you.', 'took', 'cepisti'],
  ['The general led the soldiers into the city.', 'led', 'duxit'],
  ['And I hope you do too.', 'hope', null],
  ['There was no hope.', 'hope', 'spes'],
  ['He was very cross with the bear.', 'cross', null],
  ['The soldiers will cross the river.', 'cross', 'transibunt'],
  ['These sounds made the little girl\'s heart beat fast.', 'beat', null],
  ['There was no "One, two, three, and away," but they began running when they liked; it was a race.', 'race', null],
  ['Alice had come to the general conclusion that the sea was near.', 'general', null],
  ['What do I look like?', 'look', null],
  ['Look at the ship!', 'Look at', 'Specta'],
  ['There was a piece of wood that laughed and cried.', 'wood', null],
  ['Pooh lived in a forest all by himself.', 'forest', 'silva'],
  ['It is the only way of coming downstairs.', 'only', 'solus'],
  ['If only I had not gone.', 'only', null],
  ['Oh dear!', 'dear', null],
  ['My dear father came home.', 'dear', 'carus'],
  ['Once upon a time, a very long time ago now, Pooh lived in a forest.', 'long', 'longus'],
  ['It happened long ago.', 'long', null],
  ['She went to the country with her mother.', 'country', null],
  ['The soldiers fought bravely for their country.', 'country', 'patriae'],
  ['Keep quiet!', 'Keep', null],
  ['Light blue flowers grew there.', 'Light', null],
  ['A light burned all night.', 'light', 'lux'],
  // verbs used as nouns stay English
  ['Now it only remained to carry out the doctor\'s orders.', 'orders', null],
  ['She went in without knocking, in great fear that she should meet the real Mary Ann.', 'fear', null],
  ['She went back to the table, half hoping she might find the rules.', 'rules', null],
  ['That made him laugh.', 'made', 'fecit'],
  ['That made him laugh.', 'laugh', null],
  ['Let her go to the garden.', 'go', null],
  ['The things that go bump in the night.', 'go', 'eunt'],
  ['Some went home.', 'went', 'ierunt'],
  ['Many of the soldiers fought.', 'Many', 'Multi'],
  // what each Latin word stands for (the answer the reader must pick)
  ['Every morning she went out and gathered roots.', 'and', { la: 'et', gloss: 'and' }],
  ['"Look at me," said Bagheera.', 'me', { la: 'me', gloss: 'me' }],
  // the earlier checks of the converter itself
  ['The boy loves the girl.', 'girl', 'puellam'],
  ['The girls were walking to the town with their father.', 'walking', { la: 'ambulabant', gloss: 'were walking' }],
  ['Marcus gave a gift to his friend.', 'friend', 'amico'],
  ['The king of the Romans was a brave man.', 'brave', 'fortis'],
  ['Do not fear the storm!', 'storm', 'tempestatem'],
  ['Our teacher gave the boys a big prize.', 'boys', 'pueris'],
  ['Once upon a time there was a little girl who lived in a village.', 'Once upon a time', 'Olim'],
  ['IN WHICH WE ARE INTRODUCED TO WINNIE-THE-POOH', 'WE', null],
];

const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'vocab.js'), 'utf8') + fs.readFileSync(path.join(root, 'snap.js'), 'utf8') + ';globalThis.__V = VOCAB; globalThis.__S = Snap;', ctx);
let bad = 0;
for (const [en, word, want] of CASES) {
  const toks = ctx.__S.latinise(en, ctx.__V).flat();
  const wl = word.toLowerCase().split(/\s+/);
  const k = toks.findIndex((t, i) => wl.every((w, j) => toks[i + j] && toks[i + j].en.toLowerCase() === w));
  if (k < 0) { console.log('✗ word not found:', word, '|', en); bad++; continue; }
  const t = toks[k], got = t.la || null;
  const ok = want === null ? got === null : typeof want === 'string' ? got === want : got === want.la && (t.gloss || t.en).toLowerCase() === want.gloss;
  if (!ok) { bad++; console.log(`✗ "${word}" → ${got}${t.gloss ? ' (' + t.gloss + ')' : ''}, wanted ${JSON.stringify(want)} | ${en}`); }
}
console.log(bad ? `${bad} of ${CASES.length} cases wrong` : `all ${CASES.length} cases right`);
process.exit(bad ? 1 : 0);
