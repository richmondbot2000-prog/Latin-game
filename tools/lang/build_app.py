# Derives a language game's index.html, app.js, sw.js and manifest from the Latin game's files, so fixes to the Latin
# game carry across: every change is a checked text replacement driven by <lang>/lang.json.
# Run from the repo root: python3 tools/lang/build_app.py <lang folder>
import re, sys, json, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
lang = root / sys.argv[1]
L = json.loads((lang / 'lang.json').read_text())
code = L['code']
VERSION = (lang / 'VERSION').read_text().strip()

def rep(s, old, new, count=1, where='app.js'):
    n = s.count(old)
    assert n == count, f'{where}: expected {count} of {old[:70]!r}, found {n}'
    return s.replace(old, new)

# ---------- app.js ----------
s = (root / 'app.js').read_text()
s = rep(s, "/^latin\\.(progress|streak|level|practice|stats|hammer|read|beasts|passages|book)\\./", f"/^{code}\\.(progress|streak|level|practice|stats|hammer|read|beasts|passages|book)\\./")
# storage keys of this game's own; the player list, the chosen player and a few settings are shared with the Latin game
s = re.sub(r"'latin\.(?!users|current|tipHidden|syncUrl|speak)", f"'{code}.", s)
s = rep(s, "const APP_VERSION = '" + re.search(r"const APP_VERSION = '(\d+)'", s).group(1) + "';", f"const APP_VERSION = '{VERSION}';")
s = rep(s, "const m = t.match(/latin-v(\\d+)/);", f"const m = t.match(/{code}-v(\\d+)/);")
s = rep(s, "fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })", f"fetch('{code}/sw.js?v=' + Date.now(), {{ cache: 'no-store' }})")
# levels
levels = json.dumps(L['levels']).replace('"', "'")
levels = "[['top', 'Beginner'], " + levels[1:]   # the 50-word setting (words marked top=1 in words.txt) comes first, called Beginner (the Latin game's 'Top 50': there Beginner is the 100-word setting)
s = rep(s, "const LEVELS = [['top', 'Top 50'], ['beginner', 'Beginner'], ['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3']];", f"const LEVELS = {levels};")
s = rep(s, "const inLevel = (w, l) => l === 'top' ? !!w.top : l === 'beginner' ? !!w.beginner : w.level <= +l;", "const inLevel = (w, l) => l === 'top' ? !!w.top : /p$/.test(l) ? (w.level <= parseInt(l) || w.level === 10) : w.level <= +l;")   # '4p' / '9p': the words up to that level plus the phrases (level 10)
s = rep(s, "const levelName = l => LEVELS.find(x => x[0] === l)[1];", "const levelName = l => { const x = LEVELS.find(x => x[0] === l); return x ? x[1] : l === '10' ? 'Phrases' : l; };")
s = rep(s, "const levelOf = u => { const l = store.get(levelKey(u), 'beginner'); return LEVELS.some(x => x[0] === l) ? l : 'beginner'; };",
        "const levelOf = u => { const l = store.get(levelKey(u), '0'); return LEVELS.some(x => x[0] === l) ? l : '0'; };")
s = rep(s, "const L = levelOf(u) === 'top' && topSentences() ? -1 : Math.max(0, ['beginner', '1', '2', '3'].indexOf(levelOf(u)));", "const L = levelOf(u) === 'top' && topSentences() ? -1 : Math.max(0, parseInt(levelOf(u)) || 0);")   # '4p' reads as level 4
# words: a verb shows both its forms (mcha / yemchi); the "(uncle)" tags that keep ids unique are not shown
s = rep(s, "const showWord = w => w.replace(/\\s*\\+\\s*(abl|acc)\\.?$/, '').replace(/\\s*\\((verb|adverb|noun)\\)$/, '').split('/').join(', ');",
        "const showWord = w => w.replace(/\\s*\\(.*\\)$/, '');")
s = rep(s, "show: showWord(v.word), kind: KIND(v.pos)", "show: v.pos === 'V' && v.pres ? showWord(v.word) + ' / ' + v.pres : showWord(v.word), kind: KIND(v.pos)")
s = rep(s, "  if (/^num/.test(pos)) return 'number';\n  return 'word';", "  if (/^num/.test(pos)) return 'number';\n  if (pos === 'phrase') return 'phrase';\n  return 'word';")
# English shapes the forms need: the definite noun ("the house"), and the past with its pronoun
s = rep(s, "  if (shape === 'inf') return 'to ' + base;", "  if (shape === 'nd') return 'the ' + base;\n  if (shape === 'ndp') return 'the ' + inflect(english, 'n2');\n  if (shape === 'inf') return 'to ' + base;")
s = rep(s, "  if (shape === 'o' || shape === 'adj' || shape === 'adjp' || shape === 'n1') return base;\n  const words = base.split(' ')",
        "  if (shape === 'o' || shape === 'adj' || shape === 'adjp' || shape === 'n1') return base;\n  if (shape === 'v3s' && /^(am|is|are)\\b/.test(base)) return base;\n  const words = base.split(' ')")
s = rep(s, "  const isVerb = /^v/.test(shape);\n  const forms = parts.map(x => inflect(x, shape, false));\n  return (isVerb ? PRON[shape] + ' ' : '') + forms.join(', ');",
        "  const isVerb = /^[vp]/.test(shape);\n  const forms = parts.map(x => inflect(x, shape, false));\n  return (isVerb ? (PRON[shape] || PRON['v' + shape.slice(1)]) + ' ' : '') + forms.join(', ');")
# the home page: no Latin book; the language's greeting
s = rep(s, "<div class=\"small\">Salve,</div>", f"<div class=\"small\">{L['greeting']}</div>")
s = re.sub(r"\n      <button class=\"gamebanner\$\{levelOf\(u\) === '3' \? '' : ' locked'\}\" id=\"bookGo\".*?</button>", "", s, count=1, flags=re.S)
assert 'id="bookGo"' not in s
s = rep(s, "  $('#bookGo').onclick = () => { if (levelOf(u) === '3') location.hash = 'book'; else flashHome('📖 The book opens at Level 3 — choose Level 3 above to read it.'); };\n", "")
s = rep(s, "  if (h === 'book') return levelOf(u) === '3' ? renderPassages(u, true) : renderHome(u);", "  if (h === 'book') return renderHome(u);")
# wording
name, langname = L['name'], L['language']
s = rep(s, "Learn every Latin word, one card at a time.", L['tagline'])
s = rep(s, "`My Latin game sync code is ${code}. Keep it safe: it brings my stars and beasts to any device at https://latin.musicalmagic.uk`",
        f"`My {name} game sync code is ${{code}}. Keep it safe: it brings my stars and beasts to any device at https://latin.musicalmagic.uk/{code}/`")
s = rep(s, "Join the Latin game to open it: https://latin.musicalmagic.uk/#gift/${code}", f"Join the {name} game to open it: https://latin.musicalmagic.uk/{code}/#gift/${{code}}")
s = rep(s, "Every word from your Latin list turns into Latin.", f"Every word from your {langname} list turns into {langname}.")
s = rep(s, 'placeholder="Search Latin or English…"', f'placeholder="Search {langname} or English…"')
s = rep(s, "<span class=\"small\">· ${w.kind} · Level ${w.level}</span>", "<span class=\"small\">· ${w.kind} · ${levelName(String(w.level))}</span>")
s = f"// {name}: the {langname} game. DERIVED FILE — built from ../app.js by tools/lang/build_app.py; edit the Latin app.js (or build_app.py), not this.\n" + s
(lang / 'app.js').write_text(s)

# ---------- sw.js ----------
w = (root / 'sw.js').read_text()
w = rep(w, "const CACHE = 'latin-v" + re.search(r"const CACHE = 'latin-v(\d+)'", w).group(1) + "';", f"const CACHE = '{code}-v{VERSION}';", where='sw.js')
own = {'app.js', 'vocab.js', 'memory.js', 'forms.js', 'read.js', 'phrases.js', 'synonyms.js', 'snap.js', 'manifest.webmanifest', 'index.html', './', 'theme.css'}
drop = {'book.js'}
def fix_list(m):
    items = re.findall(r"'([^']+)'", m.group(0))
    out = []
    for f in items:
        if f in drop: continue
        out.append(f if f in own else '../' + f)
    if 'theme.css' not in out: out.append('theme.css')
    return "[" + ", ".join(f"'{x}'" for x in out) + ","
w = re.sub(r"\['\./', 'index\.html'(?:, '[^']+')*,", fix_list, w, count=2)
assert "'../practice.js'" in w and "'../app.css'" in w, 'sw list'
w = w.replace("'art/", "'../art/").replace("=> 'art/", "=> '../art/").replace('"art/', '"../art/').replace("'ocr/", "'../ocr/")
w = w.replace("`art/", "`../art/")
w = rep(w, "const core = req.mode === 'navigate' || CORE.includes(path) || path === 'sw.js';", "const core = req.mode === 'navigate' || CORE_NAMES.includes(path) || path === 'sw.js';", where='sw.js')
w = rep(w, "const FILES = [", "const CORE_NAMES = CORE.map(f => f.replace(/^.*\\//, ''));\nconst FILES = [", where='sw.js')
w = f"// {name} service worker. DERIVED FILE — built from ../sw.js by tools/lang/build_app.py.\n" + w
(lang / 'sw.js').write_text(w)

# ---------- manifest ----------
m = (root / 'manifest.webmanifest').read_text()
m = rep(m, '"name": "Latin"', f'"name": "{name}"', where='manifest').replace('"short_name": "Latin"', f'"short_name": "{name}"')
m = rep(m, '"description": "Learn every ISEB Latin word with swipe cards."', f'"description": "{L["description"]}"', where='manifest')
own_icons = (lang / 'icons' / 'icon-512.png').exists()   # a language with its own icons (tools/lang/make_icon.py) uses them; else the Latin ones
m = m.replace('"src": "icons/', '"src": "icons/' if own_icons else '"src": "../icons/').replace('"theme_color": "#8E2F4A"', f'"theme_color": "{L["theme"]}"')
(lang / 'manifest.webmanifest').write_text(m)

# ---------- index.html ----------
t = (root / 'tools' / 'lang' / 'index.template.html').read_text()
t = t.replace('href="icons/', f'href="{code}/icons/') if own_icons else t
t = t.replace('{{CODE}}', code).replace('{{NAME}}', name).replace('{{DESCRIPTION}}', L['description']).replace('{{LANG_JSON}}', json.dumps({ 'code': code, 'name': name, 'tts': L.get('tts', {}) }))
(lang / 'index.html').write_text(t)
print(f'built index.html, app.js, sw.js, manifest for {code} v{VERSION}')
