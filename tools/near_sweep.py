#!/usr/bin/env python3
"""Sweep a vocabulary for pairs of words whose meanings are too close to be each other's wrong answer.

    python3 tools/near_sweep.py            # the Latin game (vocab.js + synonyms.js)
    python3 tools/near_sweep.py tounsi     # a language folder (words.txt + synonyms.txt)

For every pair of words of the same kind (noun / verb / adjective / other) it looks at every meaning —
the dictionary senses and the spoken alternatives — and reports the pair when
  * a meaning word of one is a form of a meaning word of the other (walk / walked, child / children), or
  * WordNet puts a meaning of one in the same synset as a meaning of the other (say / tell, big / large),
    counting only each meaning's two commonest senses (TOP).
Pairs the game already blocks (a shared meaning word, a shared `sense` group, an `avoid` pairing) are left out.
The output is a list to check by hand, one pair per line with the meanings that matched; it is not applied
automatically — put the pairs that really are too close into sense groups (words.txt `sense=`, vocab.js "sense").
Needs nltk with the WordNet corpus (pip install nltk; the corpus unzipped into ~/nltk_data/corpora).
"""
import json, re, sys, subprocess, os
from itertools import combinations
from nltk.corpus import wordnet as wn

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
STOP = set('a an the of to be is it i he she they his her their its one my your our self s and or on in by as at for with not no'.split())

def kind(pos):
    p = pos.lower()
    if p.startswith('n') or p in ('pron', 'pro'): return 'noun'
    if p.startswith('v'): return 'verb'
    if p.startswith('adj'): return 'adj'
    return 'other'

def load(folder):
    if folder is None:
        js = open(os.path.join(ROOT, 'vocab.js')).read()
        vocab = json.loads(js[js.index('['):js.rindex(']') + 1])
        synonyms = json.loads(subprocess.check_output(['node', '-e',
            "const fs=require('fs');eval(fs.readFileSync('synonyms.js','utf8').replace('const SYNONYMS','global.SYNONYMS'));console.log(JSON.stringify(SYNONYMS))"], cwd=ROOT))
    else:
        vocab = []
        for line in open(os.path.join(ROOT, folder, 'words.txt')):
            line = line.strip()
            if not line or line.startswith('#'): continue
            f = [x.strip() for x in line.split('|')]
            e = {'word': f[1], 'english': f[2], 'pos': f[3], 'level': f[0]}
            for kv in (f[4].split(';') if len(f) > 4 and f[4] else []):
                if '=' in kv:
                    k, v = kv.split('=', 1); e[k] = v.split(',') if k == 'sense' else v
            vocab.append(e)
        synonyms = {}
        for line in open(os.path.join(ROOT, folder, 'synonyms.txt')):
            line = line.strip()
            if not line or line.startswith('#') or ':' not in line: continue
            k, v = line.split(':', 1); synonyms[k.strip()] = [x.strip() for x in v.split(',') if x.strip()]
    return vocab, synonyms

def meanings(w, synonyms):
    ms = re.split(r'\s*[,;]\s*', w['english']) + synonyms.get(w['word'], [])
    return [re.sub(r'\s*\(.*?\)', '', m).strip().lower() for m in ms if m.strip()]

def words_of(ms):
    return {t for m in ms for t in re.split(r'[^a-z]+', m) if t and t not in STOP}

def lemmas(word, pos):
    out = set()
    for p in ([pos] if pos else ['n', 'v', 'a', 'r']):
        l = wn.morphy(word, p)
        if l: out.add(l)
    return out or {word}

TOP = 2
WNPOS = {'noun': 'n', 'verb': 'v', 'adj': 'a', 'other': None}

def synsets(word, pos):
    p = WNPOS[pos]
    if p == 'a': return wn.synsets(word, 'a') + wn.synsets(word, 's')
    return wn.synsets(word, p) if p else wn.synsets(word)

def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else None
    vocab, synonyms = load(folder)
    rows = []
    for w in vocab:
        ms = meanings(w, synonyms); k = kind(w['pos'])
        toks = words_of(ms)
        # each meaning as a WordNet lemma ("give up" -> give_up), its two commonest senses only: WordNet lists
        # senses by frequency, and the rarer ones of a word like "run" make everything look like everything
        lem = {l for t in toks for l in lemmas(t, WNPOS[k])}
        ss = set()
        for m in ms:
            m = re.sub(r'^(to|be) ', '', m)
            ss.update(synsets(m.replace(' ', '_'), k)[:TOP])
        rows.append((w, k, ms, toks, lem, ss))
    found = []
    for (a, ka, ma, ta, la, sa), (b, kb, mb, tb, lb, sb) in combinations(rows, 2):
        if ka != kb: continue
        if a['english'] == b['english'] or ta & tb or set(ma) & set(mb): continue   # already blocked by the game
        if set(a.get('sense') or []) & set(b.get('sense') or []): continue
        if b['word'] in (a.get('avoid') or []) or a['word'] in (b.get('avoid') or []): continue
        why = []
        if la & lb: why.append('form: ' + ', '.join(sorted(la & lb)))
        if sa & sb: why.append('synset: ' + ', '.join(sorted({s.name() for s in sa & sb})[:3]))
        if why: found.append((a, b, ma, mb, why))
    found.sort(key=lambda f: (f[4][0].split(':')[0], f[0]['word']))
    for a, b, ma, mb, why in found:
        print(f"{a['word']} ({'; '.join(ma)})  ~  {b['word']} ({'; '.join(mb)})   [{' | '.join(why)}]")
    print(f"\n{len(found)} pairs", file=sys.stderr)

if __name__ == '__main__': main()
