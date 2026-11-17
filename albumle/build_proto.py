#!/usr/bin/env python3
"""Albumle prototype data (the owner's son's design, 17 Nov 2026): proto/albums.js holds, for each of the 250,
every RYM fact the game reveals by overlap — genres (all of them), descriptors, language, band/solo — plus the
year, rank and country. Facts come from albums.old.js (genres + descriptors) where that list had the album, and
from rym.txt for the rest; the language is English unless LANG below or rym.txt says otherwise."""
import re, json, unicodedata
def fold(s): return ' '.join(re.sub(r'[^a-z0-9 ]', ' ', unicodedata.normalize('NFD', s.lower())).split())
cur = json.loads(re.sub(r",\s*\]$", "]", re.search(r"const ALBUMS = (\[.*?\n\]);", open("albums.js").read(), re.S).group(1)))
old = open('albums.old.js').read()
Q = r"(?:'((?:[^'\\]|\\.)*)'|\"([^\"]*)\")"
oldrows = {}
for m in re.finditer(r"^\[(\d+),\s*" + Q + r",\s*" + Q + r",(\d+),'(\w+)',(\[[^\]]*\]),(\[[^\]]*\])", old, re.M):
    t = (m.group(2) or m.group(3)).replace("\\'", "'"); a = (m.group(4) or m.group(5)).replace("\\'", "'")
    oldrows[(fold(t), fold(a))] = (eval(m.group(8)), eval(m.group(9)))
rym = {}
for line in open('rym.txt'):
    if not line.strip() or line.startswith('#'): continue
    t, a, lang, g, d = [x.strip() for x in line.split('|')]
    rym[(fold(t), fold(a))] = ([x.strip() for x in g.split(';')], [x.strip() for x in d.split(';')], lang)
# languages for the albums the old list already held (everything else is sung in English)
LANG = {'long season': 'Japanese', '98 12 28': 'Japanese', 'clube da esquina': 'Portuguese', 'agaetis byrjun': 'Icelandic',
        'transilvanian hunger': 'Norwegian', 'filosofem': 'Norwegian', 'hvis lyset tar oss': 'Norwegian', 'in the nightside eclipse': 'English',
        'neu': 'Instrumental', 'tri repetae': 'Instrumental', 'selected ambient works 85 92': 'Instrumental', 'selected ambient works volume ii': 'Instrumental',
        'music has the right to children': 'Instrumental', 'geogaddi': 'Instrumental', 'endtroducing': 'Instrumental', 'in a silent way': 'Instrumental',
        'kind of blue': 'Instrumental', 'bitches brew': 'Instrumental', 'a love supreme': 'Instrumental', 'mingus ah um': 'Instrumental',
        'the black saint and the sinner lady': 'Instrumental', 'f a': 'Instrumental', 'lift yr skinny fists like antennas to heaven': 'Instrumental',
        'untrue': 'English', 'spiderland': 'English', 'discipline': 'English', 'hot rats': 'Instrumental', 'drukqs': 'Instrumental',
        'cosmogramma': 'Instrumental', 'moon safari': 'English', 'the glow pt 2': 'English', 'another green world': 'English', 'a moon shaped pool': 'English',
        'time out': 'Instrumental', 'head hunters': 'Instrumental', 'the koln concert': 'Instrumental', 'discovery': 'English', 'random access memories': 'English',
        'ambient 1 music for airports': 'Instrumental', 'in rainbows': 'English'}
ALIAS = {'sgt peppers lonely hearts club band': 'sgt pepper s lonely hearts club band', 'the beatles white album': 'the beatles the white album',
         'lift yr skinny fists like antennas to heaven': 'lift your skinny fists like antennas to heaven', 'twin fantasy': 'twin fantasy face to face', 'f a': 'fa'}
out, missing = [], []
for rank, title, artist, year, country, genres, typ, ph in cur:
    k = (fold(title), fold(artist)); k2 = (ALIAS.get(k[0], k[0]), k[1])
    src = oldrows.get(k) or oldrows.get(k2) or oldrows.get((k[0], ALIAS.get(k[1], k[1])))
    lang = LANG.get(k[0], 'English')
    if k in rym or k2 in rym: g, d, lang = rym.get(k) or rym.get(k2)   # a line in rym.txt wins over the first list's facts
    elif src: g, d = src
    else: missing.append(title); g, d = genres, []
    out.append([rank, title, artist, year, country, g, d, typ, lang])
if missing: print('NO FACTS:', missing)
js = "// Albumle prototype data, written by build_proto.py — never edit by hand.\n// [rank, title, artist, year, country, genres, descriptors, 'B' band / 'S' solo / 'D' duo, language]\nconst ALBUMS = [\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in out) + "\n];\n"
js += "const COUNTRY = " + re.search(r'const COUNTRY = (\{.*?\});', open('albums.js').read(), re.S).group(1) + ";\n"
open('proto/albums.js', 'w').write(js)
from collections import Counter
print(len(out), 'albums;', sum(1 for r in out if not r[6]), 'without descriptors;', Counter(r[8] for r in out).most_common(6))
print('genres:', len({g for r in out for g in r[5]}), 'descriptors:', len({d for r in out for d in r[6]}))
