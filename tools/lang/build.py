# Builds every generated file of a language game: python3 tools/lang/build.py <lang folder>   (e.g. tounsi)
# Order matters: the word list, then the app (the sentence builder reads its English helpers), then sentences and the converter.
# A game whose lang.json says "noread": true (music) has no sentences: read.js, phrases.js, synonyms.js and snap.js are stubs.
import subprocess, sys, pathlib, json
root = pathlib.Path(__file__).resolve().parents[2]
lang = sys.argv[1].strip('/')
noread = json.loads((root / lang / 'lang.json').read_text()).get('noread')
steps = [['python3', 'tools/lang/build_vocab.py', lang], ['python3', 'tools/lang/build_app.py', lang], ['python3', 'tools/lang/build_memory.py', lang]]
if not noread: steps += [['node', 'tools/lang/build_read.js', lang], ['python3', 'tools/lang/build_snap.py', lang]]
for cmd in steps:
    r = subprocess.run(cmd, cwd=root)
    if r.returncode: sys.exit(r.returncode)
if noread:
    stub = '// No sentences in this game (lang.json "noread"). Written by tools/lang/build.py.\n'
    for f, body in [('read.js', 'const SENTENCES = [];'), ('phrases.js', 'const PHRASES = {};'), ('synonyms.js', 'const SYNONYMS = {};'), ('snap.js', 'const Snap = {};')]:
        (root / lang / f).write_text(stub + body + '\n')
    print('wrote stub read.js, phrases.js, synonyms.js, snap.js')
