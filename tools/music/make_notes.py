# Writes music/words.txt, music/memory.txt and music/notes.json (the list the stave pictures and piano clips are
# made from). Each note in a clef is a "word"; its letter name is the "meaning". Run from the repo root:
#   python3 tools/music/make_notes.py      then  node tools/music/staves.js  and  python3 tools/music/clips.py
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
LET = 'CDEFGAB'
SYM = {0: '', 1: '♯', -1: '♭'}
# the diatonic number (octave * 7 + letter) of each clef's bottom line
CLEFS = {'treble': 30, 'bass': 18, 'alto': 24, 'tenor': 22}
def note(d, a=0): return {'l': d % 7, 'o': d // 7, 'a': a, 'd': d}
def nm(n): return LET[n['l']] + SYM[n['a']]
ORD = ['bottom', '2nd', 'middle', '4th', 'top']
def where(clef, d):
    s = d - CLEFS[clef]
    if 0 <= s <= 8: return (f"on the {ORD[s // 2]} line" if s % 2 == 0 else f"in the {['1st', '2nd', '3rd', '4th'][s // 2]} space") + f" of the {clef} clef"
    if s == -1: return f"just below the {clef} stave, hanging under the bottom line"
    if s == 9: return f"just above the {clef} stave, sitting on the top line"
    if s < 0:
        k = (-s) // 2 - 0
        return f"on the {['', 'first', 'second'][k]} ledger line below the {clef} stave" if s % 2 == 0 else f"just under the {['', 'first', 'second'][(-s - 1) // 2]} ledger line below the {clef} stave"
    k = (s - 8) // 2
    return f"on the {['', 'first', 'second'][k]} ledger line above the {clef} stave" if s % 2 == 0 else f"just above the {['', 'first', 'second'][(s - 9) // 2]} ledger line above the {clef} stave"

LINES = {'treble': ('Every Good Boy Deserves Football', '👍👦⚽'), 'bass': ('Good Boys Deserve Fun Always', '👦🎉'),
         'alto': ('Fat Alligators Can Eat Grapes', '🐊🍇'), 'tenor': ('Dogs Find A Comfy Earth', '🐕🌍')}
SPACES = {'treble': ('F A C E — the spaces spell FACE', '🙂'), 'bass': ('All Cows Eat Grass', '🐄🌱'),
          'alto': ('Green Bananas Don’t Fall', '🍌'), 'tenor': ('Elephants Grow Big Darling Feet', '🐘')}
def hook(clef, n):
    d, s = n['d'], n['d'] - CLEFS[clef]
    L = nm(n)
    base = f"{L} is {where(clef, d)}."
    if n['a']:
        return f"{base} The {'sharp ♯ raises' if n['a'] > 0 else 'flat ♭ lowers'} {LET[n['l']]} by a semitone: the very next key to the {'right' if n['a'] > 0 else 'left'} on the piano.", '♯' if n['a'] > 0 else '♭'
    if d == 28: return base + " It is middle C, right in the middle of the piano." + {'treble': '', 'bass': '', 'alto': ' The alto clef points right at it.', 'tenor': ' The tenor clef points right at it.'}[clef], '🎹🎯'
    if 0 <= s <= 8:
        if s % 2 == 0:
            m, e = LINES[clef]; w = m.split()[s // 2]
            extra = ' The treble clef curls round this line: it is the G clef.' if clef == 'treble' and L == 'G' else ' The two dots of the bass clef sit either side of this line: it is the F clef.' if clef == 'bass' and L == 'F' else ''
            return f"{base} Lines from the bottom: {m} — {w} = {L}.{extra}", '🎼' + e
        m, e = SPACES[clef]
        if clef == 'treble': return f"{base} Spaces from the bottom spell F A C E: this is the {['F', 'A', 'C', 'E'][s // 2]}.", '🎼🙂'
        w = m.split()[s // 2]
        return f"{base} Spaces from the bottom: {m} — {w} = {L}.", '🎼' + e
    step = 'up' if s > 8 else 'down'
    near = nm(note(d - 1)) if s > 8 else nm(note(d + 1))
    return f"{base} Count one step {step} from {near}: line, space, line, space — each step is the next letter.", '🪜'

# level | notes (diatonic numbers, accidental)
T, B, A, TN = CLEFS['treble'], CLEFS['bass'], CLEFS['alto'], CLEFS['tenor']
LEVELS = [
    (0, [('treble', d, 0, d <= T + 8 and d >= T) for d in range(T - 2, T + 10)]),                    # treble stave, middle C, D, G
    (1, [('bass', d, 0, False) for d in range(B - 1, B + 11)]),                                        # bass stave, F below, B, middle C
    (2, [('treble', T - 4, 0, 0), ('treble', T - 3, 0, 0), ('treble', T + 10, 0, 0), ('treble', T + 11, 0, 0), ('treble', T + 12, 0, 0),
         ('bass', B - 4, 0, 0), ('bass', B - 3, 0, 0), ('bass', B - 2, 0, 0), ('bass', B + 11, 0, 0), ('bass', B + 12, 0, 0)]),
    (3, [('treble', 38, 1, 0), ('treble', 35, 1, 0), ('treble', 32, 1, 0), ('treble', 34, -1, 0), ('treble', 37, -1, 0), ('treble', 33, -1, 0), ('treble', 31, 1, 0), ('treble', 36, -1, 0),
         ('bass', 24, 1, 0), ('bass', 20, -1, 0), ('bass', 23, -1, 0), ('bass', 21, 1, 0), ('bass', 18, 1, 0), ('bass', 26, -1, 0)]),
    (4, [('alto', d, 0, 0) for d in range(A - 1, A + 10)]),
    (5, [('tenor', d, 0, 0) for d in range(TN - 1, TN + 10)]),
]
words, memo, notes = [], [], []
for lv, items in LEVELS:
    words.append(f'# ---- level {lv} ----')
    for clef, d, a, top in items:
        n = note(d, a)
        wid = f"{clef} {nm(n)}{n['o']}"
        slug = f"{clef}-{LET[n['l']].lower()}{'s' if a > 0 else 'b' if a < 0 else ''}{n['o']}"
        opts = [f'pic=music/staves/{slug}.svg'] + (['top=1'] if top else [])
        words.append(f"{lv}|{wid}|{nm(n)}|note|{';'.join(opts)}")
        h, pic = hook(clef, n)
        memo.append(f"{wid}|{pic}|{h}")
        notes.append({'id': wid, 'slug': slug, 'clef': clef, 'key': LET[n['l']].lower() + {1: '#', -1: 'b', 0: ''}[a] + '/' + str(n['o']), 'acc': {1: '#', -1: 'b', 0: ''}[a], 'midi': 12 * (n['o'] + 1) + [0, 2, 4, 5, 7, 9, 11][n['l']] + a})
head = """# Learn the notes: one note on one clef per line: level | id | letter name | note | options. GENERATED by
# tools/music/make_notes.py — edit that. Levels: 0 treble (top=1: the nine notes on the treble stave), 1 bass,
# 2 ledger lines, 3 sharps and flats, 4 alto clef (Grade 4), 5 tenor clef (Grade 5). pic = the stave picture.
"""
(root / 'music' / 'words.txt').write_text(head + '\n'.join(words) + '\n')
(root / 'music' / 'memory.txt').write_text("# How do we remember this note? id | picture | hook. GENERATED by tools/music/make_notes.py.\n" + '\n'.join(memo) + '\n')
(root / 'music' / 'notes.json').write_text(json.dumps(notes, indent=0, ensure_ascii=False))
print(len(notes), 'notes')
