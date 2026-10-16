# Derives the Tunisian game's app.js, sw.js and manifest from the Latin game's files, so that fixes to the Latin
# game carry across: every change is a checked text replacement. Run from tounsi/tools: python3 build_app.py
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
VERSION = (root / 'tounsi' / 'VERSION').read_text().strip()

def rep(s, old, new, count=1, where='app.js'):
    n = s.count(old)
    assert n == count, f'{where}: expected {count} of {old[:70]!r}, found {n}'
    return s.replace(old, new)

# ---------- app.js ----------
s = (root / 'app.js').read_text()
s = rep(s, "/^latin\\.(progress|streak|level|practice|stats|hammer|read|beasts|passages|book)\\./", "/^tounsi\\.(progress|streak|level|practice|stats|hammer|read|beasts|passages|book)\\./")
# storage keys of this game's own; the player list, the chosen player and a few settings are shared with the Latin game
s = re.sub(r"'latin\.(?!users|current|tipHidden|syncUrl)", "'tounsi.", s)
s = rep(s, "const APP_VERSION = '" + re.search(r"const APP_VERSION = '(\d+)'", s).group(1) + "';", f"const APP_VERSION = '{VERSION}';")
s = rep(s, "const m = t.match(/latin-v(\\d+)/);", "const m = t.match(/tounsi-v(\\d+)/);")
s = rep(s, "fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })", "fetch('tounsi/sw.js?v=' + Date.now(), { cache: 'no-store' })")
# levels: Basic, then the top 200 / 300 / 400 / 500
s = rep(s, "const LEVELS = [['beginner', 'Beginner'], ['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3']];",
        "const LEVELS = [['0', 'Basic'], ['1', 'Top 200'], ['2', 'Top 300'], ['3', 'Top 400'], ['4', 'Top 500']];")
s = rep(s, "const inLevel = (w, l) => l === 'beginner' ? !!w.beginner : w.level <= +l;", "const inLevel = (w, l) => w.level <= +l;")
s = rep(s, "const levelOf = u => { const l = store.get(levelKey(u), 'beginner'); return LEVELS.some(x => x[0] === l) ? l : 'beginner'; };",
        "const levelOf = u => { const l = store.get(levelKey(u), '0'); return LEVELS.some(x => x[0] === l) ? l : '0'; };")
s = rep(s, "const L = ['beginner', '1', '2', '3'].indexOf(levelOf(u));", "const L = +levelOf(u);")
# words: a verb shows both its forms (mcha / yemchi); the "(uncle)" tags that keep ids unique are not shown
s = rep(s, "const showWord = w => w.replace(/\\s*\\+\\s*(abl|acc)\\.?$/, '').replace(/\\s*\\((verb|adverb|noun)\\)$/, '').split('/').join(', ');",
        "const showWord = w => w.replace(/\\s*\\(.*\\)$/, '');")
s = rep(s, "show: showWord(v.word), kind: KIND(v.pos)", "show: v.pos === 'V' && v.pres ? showWord(v.word) + ' / ' + v.pres : showWord(v.word), kind: KIND(v.pos)")
s = rep(s, "  if (/^num/.test(pos)) return 'number';\n  return 'word';", "  if (/^num/.test(pos)) return 'number';\n  if (pos === 'phrase') return 'phrase';\n  return 'word';")
# English shapes the Tunisian forms need: the definite noun ("the house"), and the past with its pronoun
s = rep(s, "  if (shape === 'inf') return 'to ' + base;", "  if (shape === 'nd') return 'the ' + base;\n  if (shape === 'ndp') return 'the ' + inflect(english, 'n2');\n  if (shape === 'inf') return 'to ' + base;")
s = rep(s, "  if (shape === 'o' || shape === 'adj' || shape === 'adjp' || shape === 'n1') return base;\n  const words = base.split(' ')",
        "  if (shape === 'o' || shape === 'adj' || shape === 'adjp' || shape === 'n1') return base;\n  if (shape === 'v3s' && /^(am|is|are)\\b/.test(base)) return base;\n  const words = base.split(' ')")
s = rep(s, "  const isVerb = /^v/.test(shape);\n  const forms = parts.map(x => inflect(x, shape, false));\n  return (isVerb ? PRON[shape] + ' ' : '') + forms.join(', ');",
        "  const isVerb = /^[vp]/.test(shape);\n  const forms = parts.map(x => inflect(x, shape, false));\n  return (isVerb ? (PRON[shape] || PRON['v' + shape.slice(1)]) + ' ' : '') + forms.join(', ');")
# the home page: no Latin book
s = rep(s, "<div class=\"small\">Salve,</div>", "<div class=\"small\">3aslema,</div>")
s = re.sub(r"\n      <button class=\"gamebanner\$\{levelOf\(u\) === '3' \? '' : ' locked'\}\" id=\"bookGo\".*?</button>", "", s, count=1, flags=re.S)
assert 'id="bookGo"' not in s
s = rep(s, "  $('#bookGo').onclick = () => { if (levelOf(u) === '3') location.hash = 'book'; else flashHome('📖 The book opens at Level 3 — choose Level 3 above to read it.'); };\n", "")
s = rep(s, "  if (h === 'book') return levelOf(u) === '3' ? renderPassages(u, true) : renderHome(u);", "  if (h === 'book') return renderHome(u);")
# wording
s = rep(s, "Learn every Latin word, one card at a time.", "Learn Tunisian Arabic (Derja), one card at a time.")
s = rep(s, "`My Latin game sync code is ${code}. Keep it safe: it brings my stars and beasts to any device at https://latin.musicalmagic.uk`",
        "`My Tounsi game sync code is ${code}. Keep it safe: it brings my stars and beasts to any device at https://latin.musicalmagic.uk/tounsi/`")
s = rep(s, "Join the Latin game to open it: https://latin.musicalmagic.uk/#gift/${code}", "Join the Tounsi game to open it: https://latin.musicalmagic.uk/tounsi/#gift/${code}")
s = rep(s, "Every word from your Latin list turns into Latin.", "Every word from your Tunisian list turns into Tunisian.")
s = rep(s, 'placeholder="Search Latin or English…"', 'placeholder="Search Tunisian or English…"')
s = rep(s, "<span class=\"small\">· ${w.kind} · Level ${w.level}</span>", "<span class=\"small\">· ${w.kind} · ${levelName(String(w.level))}</span>")
s = "// Tounsi: the Tunisian Arabic game. DERIVED FILE — built from ../app.js by tools/build_app.py; edit the Latin app.js (or build_app.py), not this.\n" + s
(root / 'tounsi' / 'app.js').write_text(s)

# ---------- sw.js ----------
w = (root / 'sw.js').read_text()
w = rep(w, "const CACHE = 'latin-v" + re.search(r"const CACHE = 'latin-v(\d+)'", w).group(1) + "';", f"const CACHE = 'tounsi-v{VERSION}';", where='sw.js')
own = {'app.js', 'vocab.js', 'forms.js', 'read.js', 'synonyms.js', 'snap.js', 'manifest.webmanifest', 'index.html', './'}
drop = {'memory.js', 'phrases.js', 'book.js'}
def fix_list(m):
    items = re.findall(r"'([^']+)'", m.group(0))
    out = []
    for f in items:
        if f in drop: continue
        out.append(f if f in own else '../' + f)
    return "[" + ", ".join(f"'{x}'" for x in out) + ","
w = re.sub(r"\['\./', 'index\.html'(?:, '[^']+')*,", fix_list, w, count=2)
assert "'../practice.js'" in w and "'../app.css'" in w, 'sw list'
w = w.replace("'art/", "'../art/").replace("=> 'art/", "=> '../art/").replace('"art/', '"../art/').replace("'ocr/", "'../ocr/")
w = w.replace("`art/", "`../art/")
w = rep(w, "const core = req.mode === 'navigate' || CORE.includes(path) || path === 'sw.js';", "const core = req.mode === 'navigate' || CORE_NAMES.includes(path) || path === 'sw.js';", where='sw.js')
w = rep(w, "const FILES = [", "const CORE_NAMES = CORE.map(f => f.replace(/^.*\\//, ''));\nconst FILES = [", where='sw.js')
w = rep(w, "const path = new URL(req.url).pathname.replace(/^.*\\//, '') || 'index.html';", "const path = new URL(req.url).pathname.replace(/^.*\\//, '') || 'index.html';\n  if (/\\/tounsi\\/?$/.test(new URL(req.url).pathname) === false && path === 'index.html' && !/\\/tounsi\\//.test(new URL(req.url).pathname)) return;   // the Latin game's own page is not ours", where='sw.js')
w = "// Tounsi service worker. DERIVED FILE — built from ../sw.js by tools/build_app.py.\n" + w
(root / 'tounsi' / 'sw.js').write_text(w)

# ---------- manifest ----------
m = (root / 'manifest.webmanifest').read_text()
m = rep(m, '"name": "Latin"', '"name": "Tounsi"', where='manifest').replace('"short_name": "Latin"', '"short_name": "Tounsi"')
m = rep(m, '"description": "Learn every ISEB Latin word with swipe cards."', '"description": "Learn Tunisian Arabic with swipe cards."', where='manifest')
m = m.replace('"src": "icons/', '"src": "../icons/').replace('"theme_color": "#8E2F4A"', '"theme_color": "#C9541E"')
(root / 'tounsi' / 'manifest.webmanifest').write_text(m)
print('built app.js, sw.js, manifest for tounsi v' + VERSION)
