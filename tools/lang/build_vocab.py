# Builds ../vocab.js from words.txt (one word per line: level | word | english | pos | options). Any language.
# Run from the repo root: python3 tools/lang/build_vocab.py <lang folder>
import json, collections, pathlib, sys
here = pathlib.Path(__file__).resolve().parents[2] / sys.argv[1]
out = []
for l in (here / 'words.txt').read_text().splitlines():
    if not l.strip() or l.startswith('#'): continue
    lv, w, en, pos, opt = [x.strip() for x in l.split('|')]
    e = {'word': w, 'english': en, 'pos': pos, 'level': int(lv)}
    for kv in opt.split(';'):
        if '=' in kv:
            k, v = kv.split('=', 1); e[k] = v.split(',') if k == 'sense' else True if k == 'top' else v
    out.append(e)
# arabic.txt (optional): the word in the language's own script — id | word | plural | feminine | present | I did | past stem | they do
af = here / 'arabic.txt'
if af.exists():
    keys = ['ar', 'arpl', 'arf', 'arpres', 'arp1', 'arps', 'arpp']
    arab = {}
    for l in af.read_text().splitlines():
        if not l.strip() or l.startswith('#'): continue
        f = [x.strip() for x in l.split('|')]
        arab[f[0]] = {k: v for k, v in zip(keys, f[1:]) if v}
    for e in out:
        a = arab.get(e['word'])
        assert a, 'no arabic for ' + e['word']
        e.update(a)
dup = [k for k, v in collections.Counter(x['word'] for x in out).items() if v > 1]
assert not dup, 'duplicate ids: ' + ', '.join(dup)
js = ('// Vocabulary: %d words in levels 0-%d. Built by tools/lang/build_vocab.py from words.txt — edit that, not this.\n'
      '// pos: N (g, pl, stem), V (pres = he does; p1, ps, pp where the regular rule fails), Adj (f, pl), adv, prep, conj, pro, qu, num, phrase.\n'
      'const VOCAB = [\n' % (len(out), max(x['level'] for x in out))) + ',\n'.join('  ' + json.dumps(e, ensure_ascii=False) for e in out) + '\n];\n'
(here / 'vocab.js').write_text(js)
print(len(out), 'words;', ' / '.join(str(sum(1 for x in out if x['level'] == L)) for L in range(max(x['level'] for x in out) + 1)), 'per level')
