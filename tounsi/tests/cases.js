// Regression tests for the English → Tunisian converter. Run: node tounsi/tests/cases.js
// A case: [English sentence, the English word to look at, what it must become (null = stays English)].
const { Snap, words } = require('./run.js');
const CASES = [
  ['The boy goes to school.', 'boy', 'El-weld'], ['The boy goes to school.', 'goes', 'yemchi'], ['The boy goes to school.', 'school', 'mdrasa'],
  ['She ate the bread and drank the milk.', 'drank', 'chorbet'], ['She ate the bread and drank the milk.', 'bread', 'el-khobz'],
  ['I want to go to the market tomorrow.', 'go', 'nemchi'], ['I want to go to the market tomorrow.', 'market', 'les-souk'],
  ['We did not find the key.', 'find', 'ma l9inach'],
  ['The woman saw the dog.', 'saw', 'chafet'],
  ['They will come to the house on Friday.', 'come', 'bech yjiw'], ['They will come to the house on Friday.', 'house', 'led-dar'],
  ['You must eat the vegetables.', 'must', 'lezem'], ['You must eat the vegetables.', 'eat', 'tekel'],
  ['Can you help me?', 'Can', 'Tnajjem'], ['Can you help me?', 'help', 't3awen'],
  ['The boys were playing football in the street.', 'playing', 'kanou yel3bou'],
  ['The girls are happy.', 'happy', 'far7anin'], ['The red car is fast.', 'red', '7amra'],
  ['The old man was sad.', 'was', 'kan'], ['The old man was sad.', 'man', 'er-rajel'],
  ['He has two sisters.', 'has', '3andou'], ['He has two sisters.', 'sisters', 'khwat'],
  ['There is a book on the table.', 'There', 'Famma'],
  ["Don't eat the fish!", 'eat', 'Ma tekelch'],
  ['The children are not at school.', 'not', 'mouch'],
  ['A little more, please.', 'little', null], ['He looked tired.', 'looked', null],
  ['The work was hard.', 'work', 'El-khedma'], ['They work every day.', 'work', 'yekhdmou'],
  ['My house is big.', 'house', 'Dari'], ['He went with his mother.', 'mother', 'ommou'], ['Once upon a time there was a king.', 'Once', null], ['Her car is new.', 'car', 'Karhba mte3ha'],
];
let bad = 0;
for (const [sent, word, want] of CASES) {
  const toks = Snap.latinise(sent, words).flat();
  const t = toks.find(x => x.en === word || (x.gloss && x.gloss.split(' ').includes(word)) || (x.la && x.en.toLowerCase() === word.toLowerCase()));
  const got = t && t.la ? t.la : null;
  if (got !== want) { bad++; console.log(`✗ "${word}" → ${got} wanted ${want} | ${sent}`); }
}
console.log(bad ? `${bad} of ${CASES.length} cases wrong` : `all ${CASES.length} cases right`);
process.exit(bad ? 1 : 0);
