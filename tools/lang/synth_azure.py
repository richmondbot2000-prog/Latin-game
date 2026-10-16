# Records every word and form of a language with Azure's neural voices (Tunisian Arabic has ar-TN-HediNeural and
# ar-TN-ReemNeural), into <lang>/audio/<n>.mp3 plus index.json, which speak.js plays instead of the phone's own voice.
# Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in the environment (never in the repo). Run from the repo root:
#   python3 tools/lang/synth_azure.py tounsi ar-TN-HediNeural
# Then set "audio": "tounsi/audio" in tounsi/lang.json's tts and rebuild. Re-runs only record what is missing.
import sys, os, re, json, pathlib, subprocess, time, urllib.request, html
root = pathlib.Path(__file__).resolve().parents[2]
lang = root / sys.argv[1]; voice = sys.argv[2] if len(sys.argv) > 2 else 'ar-TN-HediNeural'
key, region = os.environ.get('AZURE_SPEECH_KEY'), os.environ.get('AZURE_SPEECH_REGION', 'westeurope')
assert key, 'AZURE_SPEECH_KEY is not set'
# every form of every word, from forms.js, plus the sentences; in Arabic script via speak.js's conversion
forms = json.loads(subprocess.check_output(['node', '-e', '''
const fs=require('fs'),vm=require('vm');const c={LANG:{tts:{lang:'ar',script:'chat-arabic'}},store:{get:()=>null,set:()=>{}}};vm.createContext(c);
for (const f of ['%s/vocab.js','%s/forms.js','%s/read.js','speak.js']) vm.runInContext(fs.readFileSync(f,'utf8').replace(/^const (\\w+) =/m,'var $1 ='),c);
// the hand-written Arabic spelling of every form where there is one (arabic.txt → vocab.js → forms.js), else the chat-alphabet conversion
const ar={}; const out={}; for (const w of c.VOCAB) for (const f of c.Forms.of(w)) { const a=f.ar||c.Speak.chatToArabic(f.la); ar[f.la.toLowerCase()]=a; out[f.la]=a; }
const word=t=>{ const k=t.toLowerCase().replace(/[,.;:?!"]/g,''); return ar[k]||c.Speak.chatToArabic(k); };
for (const s of c.SENTENCES) { const t=s.la.map(x=>x[0]).join(' ').replace(/ ([,.;:?!])/g,'$1'); out[t]=t.split(' ').map(x=>/^[,.;:?!"]+$/.test(x)?x:word(x)+(x.match(/[,.;:?!]+$/)||[''])[0]).join(' '); }
console.log(JSON.stringify(out));
''' % (sys.argv[1], sys.argv[1], sys.argv[1])], cwd=root))
outdir = lang / 'audio'; outdir.mkdir(exist_ok=True)
index = json.loads((outdir / 'index.json').read_text()) if (outdir / 'index.json').exists() else {}
n = max([int(v.split('.')[0]) for v in index.values()] + [0])
for text, arabic in forms.items():
    k = re.sub(r'[.,;:!?"]', '', text.strip().lower())   # the key speak.js looks up: lower case, no punctuation
    if k in index: continue
    n += 1; fn = f'{n}.mp3'
    ssml = f'<speak version="1.0" xml:lang="ar-TN"><voice name="{voice}"><prosody rate="-10%">{html.escape(arabic)}</prosody></voice></speak>'
    req = urllib.request.Request(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml.encode(), headers={'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'latin-game'})
    for attempt in range(4):
        try: (outdir / fn).write_bytes(urllib.request.urlopen(req, timeout=30).read()); break
        except Exception as e:
            if attempt == 3: raise
            time.sleep(2 ** attempt)
    index[k] = fn
    (outdir / 'index.json').write_text(json.dumps(index, ensure_ascii=False))
    print(n, text, '→', arabic)
print(len(index), 'clips')
