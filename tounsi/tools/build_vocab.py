# Builds ../vocab.js from approved.tsv (the 500 words, in theme order) and words.txt (grammar: gender, plurals,
# verb stems, levels). Run from tounsi/tools: python3 build_vocab.py
import json, re, collections
gram={}
for l in open('words.txt').read().splitlines():
    if not l or l.startswith('#') or '|x|x|' in l: continue
    lv,w,en,pos,opt=l.split('|'); gram.setdefault(w.split(' (')[0],[]).append((int(lv),w,en,pos,opt))
SEC_POS={'Question words':'qu','Pronouns':'pro','Numbers':'num','Verbs (he did / he does)':'V','Adjectives':'Adj','Greetings and politeness':'phrase','Having':'phrase','Little words':'adv'}
EXTRA={'enehi':('qu',''),'hedhi':('pro',''),'hedhika':('pro',''),'hedhoukom':('pro',''),'okhra':('Adj','f=okhra;pl=okhrin'),'wled':('N','g=m;pl=-'),'bnet':('N','g=f;pl=-'),
 'dhayya3':('V','pres=ydhayya3'),'kbar':('V','pres=yekbar'),'3ach':('V','pres=y3ich;p1=3echt'),'met':('V','pres=ymout;p1=mott'),'dhrab':('V','pres=yodhrob;ps=dharb'),
 'ksar':('V','pres=yeksar'),'7lem':('V','pres=ya7lem'),'ghanna':('V','pres=yghanni'),'chta7':('V','pres=yochta7'),'zed':('V','pres=yzid'),'rbe7':('V','pres=yerba7'),'khsar':('V','pres=yekhsar')}
LEVEL_OF_SEC={'Greetings and politeness':1,'Question words':1,'Pronouns':1,'Having':1,'Little words':2,'Numbers':2,'Days and time':2,'Family and people':2,'Body':2,'Home and things':3,'Nature and weather':3,'Animals':3,'Food and drink':3,'Clothes':3,'Places and transport':3,'Verbs (he did / he does)':2,'Adjectives':2,'More useful nouns':3}
words=[]
for l in open('approved.tsv').read().splitlines():
    w,m,sec=l.split('\t'); base=w.split(' / ')[0]
    cands=gram.get(base,[])
    pick=None
    if len(cands)==1: pick=cands[0]
    elif cands:
        for c in cands:
            if any(t in c[2] for t in re.findall(r'[a-z]{3,}',m)): pick=c; break
        pick=pick or cands[0]
    if pick: lv,gw,gen,pos,opt=pick
    else:
        pos,opt=EXTRA.get(base,(None,''))
        if not pos: pos=SEC_POS.get(sec,'N')
        if pos=='N' and not opt: opt='g=%s;pl=-'%('f' if base.endswith('a') else 'm')
        lv=LEVEL_OF_SEC.get(sec,3)
    if ' / ' in w and pos=='V' and 'pres=' not in opt: opt=('pres=%s;'%w.split(' / ')[1])+opt
    if pos=='Adj' and 'f=' not in opt: opt+=';f=%sa;pl=%sin'%(base,base)
    o={}
    for kv in opt.split(';'):
        if '=' in kv: k,v=kv.split('=',1); o[k]=v
    en=gen if pick else m   # the grammar file may add a sense (mum, mother)
    if pos=='V': en=re.sub(r'(^|, )to ',r'\1',en)
    en=en.replace('; ',', ')
    words.append(dict(word=base,english=en,pos=pos,level=lv,sec=sec,**o))
# duplicate headwords get a tag so ids stay unique: 3am (uncle) / 3am (year) / 3am (swim)
cnt=collections.Counter(x['word'] for x in words)
TAG={'N':'noun','V':'verb','Adj':'adj'}
for x in words:
    if cnt[x['word']]>1:
        tag=x['english'].split(',')[0].split(' (')[0].strip() if x['pos']!='V' else 'verb'
        x['word']=f"{x['word']} ({tag})"
assert len(set(x['word'] for x in words))==500, [k for k,v in collections.Counter(x['word'] for x in words).items() if v>1]
# five levels of 100: order by the draft level, and within it by how early the word comes in its theme (the themes
# were written roughly in order of usefulness), so every level mixes greetings, family, verbs and so on
secpos={}; seclen=collections.Counter(x['sec'] for x in words)
for x in words: secpos[id(x)]=secpos.get(x['sec'],-1)+1; secpos[x['sec']]=secpos[id(x)]
order=sorted(words,key=lambda x:(x['level'],secpos[id(x)]/seclen[x['sec']]))
by={L:order[L*100:(L+1)*100] for L in range(5)}
for L in range(5):
    for x in by[L]: x['level']=L
print({L:len(by[L]) for L in range(5)})
out=[]
for x in words:
    e={'word':x['word'],'english':x['english'],'pos':x['pos'],'level':x['level']}
    for k in ('g','pl','f','pres','p1','ps','pp','sense','stem'):
        if k in x and x[k] and x[k]!='-': e[k]=x[k].split(',') if k=='sense' else x[k]
    out.append(e)
js='// Tunisian Arabic (Derja) vocabulary: 500 words in five levels (0 Basic, 1 top 200, 2 top 300, 3 top 400, 4 top 500).\n// Built by tounsi/tools/build_vocab.py from words.txt. pos: N (g, pl), V (pres = he does; p1 = I did, ps = past stem\n// for she/they, pp = they do, where the regular rule fails), Adj (f, pl), adv, prep, conj, pro, qu, num, phrase.\nconst VOCAB = [\n'+',\n'.join('  '+json.dumps(e,ensure_ascii=False) for e in out)+'\n];\n'
open('../vocab.js','w').write(js)
print(len(out),'words written')
