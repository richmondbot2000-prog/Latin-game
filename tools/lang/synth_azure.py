# Records every word, form and sentence of a language with Azure's neural voices, into <lang>/audio/<n>.mp3 plus
# index.json, which speak.js plays instead of the phone's own voice. Two languages so far:
#   Tounsi:  python3 tools/lang/synth_azure.py tounsi ar-TN-HediNeural   (ar-TN-ReemNeural is the female voice)
#            — read in Arabic script: the hand-written spelling of every form (arabic.txt → vocab.js → forms.js), else the
#            chat-alphabet conversion in speak.js
#   Latin:   python3 tools/lang/synth_azure.py . it-IT-IsabellaNeural
#            — Azure has no Latin voice, so an Italian voice reads a CLASSICAL respelling (classical() below): c and g always
#            hard (Cicero → "kikero"), v as w ("uinum"), ae → "ai", oe → "oi", gn → "ghn", ph → f; the word on screen is unchanged
#   Russian: python3 tools/lang/synth_azure.py russian ru-RU-SvetlanaNeural   (lang.json tts.script "plain": the Cyrillic is read; the word on screen is in the English alphabet)
# Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in the environment (never in the repo). Re-runs only record what is missing.
# Then point LANG.tts.audio at the folder (tounsi/lang.json → "audio": "tounsi/audio"; the Latin index.html → "audio").
import sys, os, re, json, pathlib, subprocess, time, urllib.request, html
root = pathlib.Path(__file__).resolve().parents[2]
folder = sys.argv[1].strip('/') or '.'; lang = root / folder
cfg = json.loads((lang / 'lang.json').read_text()).get('tts', {}) if (lang / 'lang.json').exists() else {}
arabic_mode = cfg.get('script') == 'chat-arabic'
plain_mode = cfg.get('script') == 'plain'   # Russian: the voice reads the word's own script (the Cyrillic) as it stands
voice = sys.argv[2] if len(sys.argv) > 2 else ('ar-TN-HediNeural' if arabic_mode else 'it-IT-IsabellaNeural')
xml_lang = cfg.get('lang', 'it-IT') if arabic_mode or plain_mode else 'it-IT'


def classical(text):
    """Latin respelled so an Italian voice reads it the classical way."""
    def word(w):
        m = re.match(r'^([^A-Za-z]*)([A-Za-z]+)(.*)$', w)
        if not m: return w
        a, s, b = m.groups(); s = s.lower()
        s = s.replace('ae', 'ai').replace('ph', 'f').replace('y', 'i')
        if re.match(r'^(poen|proel|moen|foed|coep)', s): s = s.replace('oe', 'oi', 1)   # a true oe diphthong; po-e-ta keeps its syllables
        s = s.replace('ch', 'k').replace('gn', 'ghn')
        s = re.sub(r'sc(?=[ei])', 'sk', s)
        s = re.sub(r'c(?=[ei])', 'k', s)
        s = re.sub(r'g(?=[ei])', 'gh', s)
        s = s.replace('v', 'u')
        return a + s + b
    return ' '.join(word(w) for w in text.split(' '))


NODE_HEAD = "const fs=require('fs'),vm=require('vm');const c={LANG:{tts:{lang:'ar',script:'chat-arabic'}},store:{get:()=>null,set:()=>{}}};vm.createContext(c);"
LOAD = "for (const f of FILES) vm.runInContext(fs.readFileSync(f,'utf8').replace(/^const (\\w+) =/m,'var $1 ='),c);"


def node(script, *args):
    return json.loads(subprocess.check_output(['node', '-e', NODE_HEAD + script, *args], cwd=root))


def main():
    key, region = os.environ.get('AZURE_SPEECH_KEY'), os.environ.get('AZURE_SPEECH_REGION', 'westeurope')
    assert key, 'AZURE_SPEECH_KEY is not set'
    # every form of every word (forms.js), every word of every sentence, the sentences themselves, and the book's lines
    files = [f'{folder}/vocab.js', f'{folder}/forms.js', f'{folder}/read.js', 'speak.js'] + ([f'{folder}/book.js'] if (lang / 'book.js').exists() else [])
    items = node("const FILES=" + json.dumps(files) + ";" + LOAD + """
const ar={}; const out={}; const put=(t,a)=>{ if (t && !(t in out)) out[t]=a; };
for (const w of c.VOCAB) { for (const f of c.Forms.of(w)) { const a=f.ar||null; ar[f.la.toLowerCase()]=a; put(f.la,a); } put(w.show||w.word, null); }
const sents=c.SENTENCES.map(s=>s.la); if (c.BOOK) for (const ch of c.BOOK.chapters) for (const s of ch.sents) sents.push(s.la);
for (const la of sents) { const toks=la.map(x=>Array.isArray(x)?x[0]:x); for (const t of toks) if (/[A-Za-z0-9]/.test(t)) put(t, ar[t.toLowerCase()]||null);
  put(toks.join(' ').replace(/ ([,.;:?!])/g,'$1'), null); }
console.log(JSON.stringify(out));""")
    arab = {re.sub(r'[,.;:?!"]', '', k).lower(): v for k, v in items.items() if v}

    def chat_to_arabic(text):
        return node("const FILES=['speak.js'];" + LOAD + "console.log(JSON.stringify(c.Speak.chatToArabic(process.argv[1])));", text)

    def spoken_for(text, ar):
        if plain_mode: return ar or text   # Russian: the Cyrillic (forms.js ar), whatever alphabet the word is shown in
        if not arabic_mode: return classical(text)
        if ' ' not in text: return ar or chat_to_arabic(text)
        out = []   # a sentence: each word by its own spelling (the hand-written one where there is one)
        for w in text.split(' '):
            core = re.sub(r'[,.;:?!"]', '', w).lower(); m = re.search(r'[,.;:?!]+$', w); tail = m.group(0) if m else ''
            out.append(w if not core else (arab.get(core) or chat_to_arabic(core)) + tail)
        return ' '.join(out)

    outdir = lang / 'audio'; outdir.mkdir(exist_ok=True)
    index = json.loads((outdir / 'index.json').read_text()) if (outdir / 'index.json').exists() else {}
    n = max([int(v.split('.')[0]) for v in index.values()] + [0])
    for text, ar in items.items():
        k = re.sub(r'[.,;:!?"]', '', text.strip().lower())   # the key speak.js looks up: lower case, no punctuation
        if not k or k in index: continue
        spoken = spoken_for(text, ar)
        n += 1; fn = f'{n}.mp3'
        ssml = f'<speak version="1.0" xml:lang="{xml_lang}"><voice name="{voice}"><prosody rate="-10%">{html.escape(spoken)}</prosody></voice></speak>'
        req = urllib.request.Request(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml.encode(), headers={'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'latin-game'})
        for attempt in range(4):
            try: (outdir / fn).write_bytes(urllib.request.urlopen(req, timeout=30).read()); break
            except Exception:
                if attempt == 3: raise
                time.sleep(2 ** attempt)
        index[k] = fn
        (outdir / 'index.json').write_text(json.dumps(index, ensure_ascii=False))
        print(n, text, '→', spoken)
    print(len(index), 'clips')


if __name__ == '__main__':
    main()
