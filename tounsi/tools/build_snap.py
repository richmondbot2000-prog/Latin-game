# Builds ../snap.js: the English → Tunisian converter. The English analysis (tokens, the word tables, the photo
# reader, the option shaper) is taken verbatim from the Latin game's snap.js, so fixes there carry across; the
# Tunisian grammar and the sentence rules are in snap_tn.js here. Run from tounsi/tools: python3 build_snap.py
import re, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
la = (root / 'snap.js').read_text()
tn = (pathlib.Path(__file__).parent / 'snap_tn.js').read_text()

def between(a, b):
    i = la.index(a); j = la.index(b, i)
    return la[i:j]
def line(startswith):
    for l in la.splitlines():
        if l.startswith(startswith): return l + '\n'
    raise KeyError(startswith)

shared_consts = ''.join(line(x) for x in [
    '  const BLOCK = ', '  const PRON = ', '  const DET = ', '  const MOTION = ', '  const PASTPART = ', '  const PAST = ', '  const IRRPL = ',
    '  const sfx = ', '  const ing = ', '  const past = '])
tokens = between('  // split text into sentences of tokens', '  // one sentence: decide for each word')
ocr = between('  // ---------- reading the photo on the phone ----------', '  // an English meaning of another word')
ocr = ocr.replace("new URL('ocr', location.href)", "new URL('ocr', document.baseURI)")
shape = between('  // an English meaning of another word', '  return { latinise, ocr')

out = tn.replace('/*SHARED_CONSTS*/', shared_consts).replace('/*TOKENS*/', tokens).replace('/*OCR*/', ocr).replace('/*SHAPE*/', shape)
assert '/*' not in out.replace('/* ', '').replace('/**', ''), 'unfilled marker'
(root / 'tounsi' / 'snap.js').write_text(out)
print('built tounsi/snap.js', len(out.splitlines()), 'lines')
