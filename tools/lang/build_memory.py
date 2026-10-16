# Builds <lang>/memory.js ("How do we remember this?" cards) from memory.txt: id | picture | hook. Any language.
# Run from the repo root: python3 tools/lang/build_memory.py <lang folder>
import json, pathlib, sys
here = pathlib.Path(__file__).resolve().parents[2] / sys.argv[1]
ids = [l.split('|')[1].strip() for l in (here / 'words.txt').read_text().splitlines() if l.strip() and not l.startswith('#')]
m = {}
for l in (here / 'memory.txt').read_text().splitlines():
    if not l.strip() or l.startswith('#'): continue
    f = [x.strip() for x in l.split('|')]
    assert len(f) == 3, l
    m[f[0]] = {'pic': f[1], 'hook': f[2]}
missing = [i for i in ids if i not in m]
assert not missing, 'no memory hook for ' + ', '.join(missing)
js = '// "How do we remember this?" cards, one per word. Built by tools/lang/build_memory.py from memory.txt — edit that, not this.\nconst MEMORY = {\n' + ',\n'.join('  ' + json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False) for k, v in m.items()) + '\n};\n'
(here / 'memory.js').write_text(js)
print(len(m), 'memory hooks')
