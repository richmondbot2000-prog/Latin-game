# Builds every generated file of a language game: python3 tools/lang/build.py <lang folder>   (e.g. tounsi)
# Order matters: the word list, then the app (the sentence builder reads its English helpers), then sentences and the converter.
import subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
lang = sys.argv[1].strip('/')
for cmd in [['python3', 'tools/lang/build_vocab.py', lang], ['python3', 'tools/lang/build_app.py', lang], ['node', 'tools/lang/build_read.js', lang], ['python3', 'tools/lang/build_snap.py', lang]]:
    r = subprocess.run(cmd, cwd=root)
    if r.returncode: sys.exit(r.returncode)
