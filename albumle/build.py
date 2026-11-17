# Builds albumle/albums.js from chart.txt (the owner's RateYourMusic chart: rank | title | artist | date) and the facts:
# albums.old.js (the first hand-written list) for albums carried over, facts.txt for the rest. Run: python3 albumle/build.py
import re, json, os, unicodedata
H = os.path.dirname(os.path.abspath(__file__))
fold = lambda s: re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode())).strip()
ALIAS = {'led zeppelin iv': 'led zeppelin iv', 'sgt peppers lonely hearts club band': 'sgt pepper s lonely hearts club band', 'lift yr skinny fists like antennas to heaven': 'lift your skinny fists like antennas to heaven',
  'either or': 'either or', 'the beatles white album': 'the beatles the white album', 'fa': 'f a', 'twin fantasy': 'twin fantasy face to face', 'damn': 'damn', 'enter the wu tang 36 chambers': 'enter the wu tang 36 chambers', 'a love supreme': 'a love supreme'}
old = open(os.path.join(H, 'albums.old.js')).read()
oldrows = {}
Q = r"(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\")"
for m in re.finditer(r"^\[(\d+)," + Q + "," + Q + r",(\d+),'(\w+)',(\[[^\]]*\]),(\[[^\]]*\]),(\d+),(\d+),'(\w)','(\w+)'\],", old, re.M):
    rank, t1, t2, a1, a2, year, country, genres, desc, tracks, minutes, typ, colour = m.groups()
    title, artist = (t1 if t1 is not None else t2).replace("\\'", "'"), (a1 if a1 is not None else a2).replace("\\'", "'")
    oldrows[fold(title)] = dict(title=title, artist=artist, year=int(year), country=country, genres=json.loads(genres.replace("'", '"')), type=typ)
facts = {}
for line in open(os.path.join(H, 'facts.txt')):
    if line.startswith('#') or not line.strip(): continue
    title, artist, year, country, genres, typ = [x.strip() for x in line.split('|')]
    facts[fold(title)] = dict(title=title, artist=artist, year=int(year), country=country, genres=[g.strip() for g in genres.split(',')], type=typ)
DUOS = {'madvillainy', 'discovery', 'music has the right to children', 'geogaddi', 'deathconsciousness', 'aquemini', 'stankonia', 'the infamous', 'paid in full', 'the cold vein', 'pinata', 'tri repetae', 'moon safari', 'neu', 'suicide', 'transilvanian hunger', 'clube da esquina'}
used = set(); spare = None
rows, missing = [], []
for line in open(os.path.join(H, 'chart.txt')):
    if line.startswith('#') or not line.strip(): continue
    rank, title, artist, date = [x.strip() for x in line.split('|')]
    rank = int(rank); placeholder = title == '?' or '(placeholder' in title
    title = re.sub(r'\s*\((unconfirmed|placeholder|half hidden)[^)]*\)', '', title)
    key = fold(title); key = ALIAS.get(key, key)
    if title == '?':   # hidden in the screenshots: a stand-in from the first list, swapped out when the owner sends the rank
        if spare is None:
            chart_keys = set()
            for l2 in open(os.path.join(H, 'chart.txt')):
                if l2.startswith('#') or not l2.strip(): continue
                k2 = fold(re.sub(r'\s*\((unconfirmed|placeholder|half hidden)[^)]*\)', '', l2.split('|')[1].strip())); chart_keys.add(ALIAS.get(k2, k2))
            spare = [r for k, r in oldrows.items() if k not in chart_keys and k not in facts]
        f = spare.pop(0); placeholder = True; title, artist = f['title'], f['artist']; key = fold(title)
    else: f = facts.get(key) or oldrows.get(key)
    if not f:   # try title + artist among the old rows (titles like "Weezer" clash)
        cands = [r for k, r in oldrows.items() if k == key or fold(r['title']) == key]
        f = cands[0] if cands else None
    if not f: missing.append((rank, title, artist)); continue
    typ = 'D' if (f['type'] == 'D' or key in DUOS) else f['type']
    rows.append([rank, title if title != '?' else f['title'], artist if artist != '?' else f['artist'], f['year'], f['country'], f['genres'], typ, 1 if placeholder else 0])
if missing: print('NO FACTS FOR', missing)
assert len(rows) == 250 and [r[0] for r in rows] == list(range(1, 251)), (len(rows), [r[0] for r in rows][:5])
main_src = old[old.index('const MAIN = {'):]
EXTRA = {'Rock': ['Stoner Rock', 'Rap Rock', 'Merseybeat', 'Alternative Dance'], 'Metal': ['Nu Metal'], 'Punk': ['Pop Punk', 'Midwest Emo'], 'Hip Hop': ['Rage', 'Cloud Rap'], 'Pop': ['Electropop', 'Hyperpop', 'Alt-Pop'], 'Electronic': ['Deconstructed Club', 'Chillwave', 'Progressive Electronic', 'Wonky']}
for k, v in EXTRA.items():
    key = ("  '%s': [" % k) if ' ' in k else ("  %s: [" % k)
    assert key in main_src, key
    main_src = main_src.replace(key, key + ''.join("'%s'," % g for g in v), 1)
js = "// Albumle: the 250 albums of the owner's RateYourMusic chart (chart.txt), built by build.py — do not edit by hand.\n// [rank, title, artist, year, country, genres (the first is the subgenre the game scores), 'B' band / 'S' solo / 'D' duo, placeholder]\n// placeholder = 1: that rank was hidden in the owner's screenshots and holds a stand-in from the first list until he sends it.\nconst ALBUMS = [\n"
js += ''.join(json.dumps(r, ensure_ascii=False) + ',\n' for r in rows) + '];\n'
js += "const COUNTRY = { US: ['🇺🇸', 'United States'], GB: ['🇬🇧', 'United Kingdom'], IE: ['🇮🇪', 'Ireland'], JP: ['🇯🇵', 'Japan'], CA: ['🇨🇦', 'Canada'], IS: ['🇮🇸', 'Iceland'], FR: ['🇫🇷', 'France'], DE: ['🇩🇪', 'Germany'], SE: ['🇸🇪', 'Sweden'], NO: ['🇳🇴', 'Norway'], AU: ['🇦🇺', 'Australia'], BR: ['🇧🇷', 'Brazil'], NG: ['🇳🇬', 'Nigeria'], KR: ['🇰🇷', 'South Korea'] };\n"
js += main_src
open(os.path.join(H, 'albums.js'), 'w').write(js)
print(len(rows), 'albums;', sum(r[7] for r in rows), 'placeholders;', sum(1 for r in rows if r[6] == 'D'), 'duos')
