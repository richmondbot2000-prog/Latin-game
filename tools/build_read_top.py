import json, re, sys
# Sentences and short passages for Level 1 / 2 / 3 of the Sentences game, written in a compact notation and
# turned into read.js entries: each token is  form[=headword][/shape][:gloss]  ; punctuation stands alone.
# Default shape: noun n1 (singular), verb v3s, adjective adj, anything else o. Default gloss: the headword's
# first meaning put into that shape (the same rules as inflect() in app.js, plus past / imperative / infinitive).

rows = [json.loads(l.strip().rstrip(',')) for l in open('/home/user/Latin-game/vocab.js').read().splitlines() if l.strip().startswith('{"word"')]
BY = {r['word']: r for r in rows}
def norm(w): return re.sub(r'\s*\+\s*(abl|acc|dat)\w*\.?$', lambda m: '+' + m.group(1), w).replace(' ', '').lower()
ALIAS = {}
for r in rows:
    ALIAS[norm(r['word'])] = r['word']
    base = re.sub(r'\s*\+.*$', '', r['word']).replace(' (noun)', '').replace(' (verb)', '').replace(' (adverb)', '').strip()
    ALIAS.setdefault(base.lower(), r['word'])
    ALIAS.setdefault(base.lower().rstrip('?').lstrip('-').replace('...', ''), r['word'])
ALIAS['hicp'] = 'hic, haec, hoc'; ALIAS['hic'] = 'hic (adverb)'; ALIAS['eo'] = 'eo (verb)'; ALIAS['liber'] = 'liber (noun)'
ALIAS['inquit'] = 'inquit/inquiunt'; ALIAS['noli'] = 'noli/nolite'; ALIAS['nolite'] = 'noli/nolite'; ALIAS['nec'] = 'nec/neque'; ALIAS['neque'] = 'nec/neque'
ALIAS['ex'] = 'e/ex + abl.'; ALIAS['e'] = 'e/ex + abl.'; ALIAS['a'] = 'a/ab + abl.'; ALIAS['ab'] = 'a/ab + abl.'; ALIAS['in'] = 'in + abl.'; ALIAS['inacc'] = 'in + acc.'
ALIAS['et...et'] = 'et … et …'
LEVEL = {r['word']: (0 if r.get('beginner') else r['level']) for r in rows}

# stems from the dictionary forms, so an inflected form finds its headword (horto -> hortus, militum -> miles)
STEMS = []
def stem_of(r):
    d = r['dict']; parts = [p.strip() for p in d.split(',')]
    if len(parts) < 2: return None
    nom, second = parts[0], parts[1]
    second = re.sub(r'\s.*$', '', second)
    pos = r['pos']
    if pos.startswith('V'):
        return nom[:-1] if nom.endswith('o') else None
    if second.startswith('-'):
        for e in ('us', 'um', 'a', 'er', 'is', 'es', 'e', 'i'):
            if nom.endswith(e): return nom[:-len(e)]
        return None
    for e in ('orum', 'arum', 'ium', 'is', 'ae', 'i', 'a', 'e'):
        if second.endswith(e) and len(second) > len(e) + 1: return second[:-len(e)]
    return None
for r in rows:
    st = stem_of(r)
    if st and len(st) >= 2 and not r['pos'].startswith(('prep', 'conj', 'adv', 'pro', 'numc', 'qu')): STEMS.append((st.lower(), r['word']))
# the irregular verbs (sum, eo and their compounds) by their forms
for base, w in (('ab', 'absum'), ('ad', 'adsum')):
    for f in ('est', 'sunt', 'es', 'sum', 'sumus', 'estis', 'esse'): ALIAS[base + f] = w
for base, w in (('red', 'redeo'), ('ad', 'adeo'), ('ex', 'exeo'), ('in', 'ineo'), ('trans', 'transeo'), ('per', 'pereo'), ('', 'eo (verb)')):
    for f in ('eo', 'is', 'it', 'imus', 'itis', 'eunt', 'ire', 'i', 'ite'): ALIAS.setdefault(base + f, w)
NEND = set('a ae am as arum is us um i o os orum em es ibus ium e u ei ebus erum'.split())
VEND = set('o s t mus tis nt at et it ant ent unt iunt amus emus imus atis etis itis are ere ire ite'.split())
for r in rows:   # short possessive stems (me-, tu-, su-) get their forms listed outright rather than stem-matched
    st = stem_of(r)
    if st and len(st) < 3 and r['pos'].startswith(('Adj', 'pro')):
        for e in ('us', 'a', 'um', 'i', 'ae', 'o', 'am', 'os', 'as', 'orum', 'arum', 'is', 'e'): ALIAS.setdefault(st.lower() + e, r['word'])
def lemma(form, shape=None):
    f = form.lower()
    cands = [(st, w) for st, w in STEMS if f.startswith(st) and 0 < len(f) - len(st) <= 5]
    if not cands: return []
    def fits(st, w):
        v = BY[w]['pos'].startswith('V'); rest = f[len(st):]
        if shape: return v == (shape[0] in 'vp' or shape in ('inf', 'imp'))
        return rest in (VEND if v else NEND)
    good = [c for c in cands if fits(*c)] or cands
    bl = max(len(st) for st, w in good)
    return sorted({w for st, w in good if len(st) == bl})

IRREG = {'be': ['is', 'are', 'am'], 'do': ['does', 'do', 'do'], 'go': ['goes', 'go', 'go'], 'have': ['has', 'have', 'have'], 'man': 'men', 'woman': 'women', 'child': 'children', 'foot': 'feet', 'tooth': 'teeth', 'mouse': 'mice', 'person': 'people', 'wife': 'wives', 'life': 'lives', 'knife': 'knives', 'sheep': 'sheep', 'ship': 'ships'}
PAST = {'be': 'was', 'see': 'saw', 'give': 'gave', 'say': 'said', 'lead': 'led', 'take': 'took', 'run': 'ran', 'come': 'came', 'go': 'went', 'hear': 'heard', 'write': 'wrote', 'drink': 'drank', 'fight': 'fought', 'sleep': 'slept', 'throw': 'threw', 'build': 'built', 'hold': 'held', 'have': 'had', 'put': 'put', 'read': 'read', 'stand': 'stood', 'send': 'sent', 'make': 'made', 'do': 'did', 'find': 'found', 'flee': 'fled', 'catch': 'caught', 'leave': 'left', 'bring': 'brought', 'sit': 'sat', 'eat': 'ate', 'fall': 'fell', 'meet': 'met', 'seek': 'sought', 'rule': 'ruled', 'conquer': 'conquered', 'set': 'set', 'tell': 'told', 'know': 'knew', 'win': 'won', 'hide': 'hid', 'drive': 'drove', 'carry': 'carried', 'hurry': 'hurried', 'cry': 'cried', 'stay': 'stayed', 'play': 'played', 'destroy': 'destroyed', 'capture': 'captured', 'perish': 'perished', 'escape': 'escaped', 'overcome': 'overcame', 'strike': 'struck', 'get': 'got', 'wear': 'wore', 'can': 'could'}
def sfx(w):
    if re.search(r'(s|x|z|ch|sh)$', w): return w + 'es'
    if re.search(r'[^aeiou]y$', w): return w[:-1] + 'ies'
    if re.search(r'[^aeiou]o$', w): return w + 'es'
    return w + 's'
def past(w):
    if w in PAST: return PAST[w]
    if re.search(r'e$', w): return w + 'd'
    if re.search(r'[^aeiou]y$', w): return w[:-1] + 'ied'
    return w + 'ed'
def inflect(english, shape):
    base = re.sub(r'\s*\(.*\)$', '', english.split(',')[0].strip())
    if shape in ('o', 'adj', 'adjp', 'n1'): return base
    words = base.split(' '); head = words[0]; rest = ' '.join(words[1:])
    if shape == 'n2':
        ir = IRREG.get(base); pl = ir if isinstance(ir, str) else sfx(words[-1])
        return ' '.join(words[:-1]) + ' ' + pl if len(words) > 1 else pl
    if shape == 'inf': return 'to ' + base
    if shape == 'imp': return base + '!'
    if shape in ('p3s', 'p3p', 'p1s', 'p1p', 'p2s', 'p2p'):
        v = past(head)
        if head == 'be': v = 'was' if shape in ('p3s', 'p1s') else 'were'
        return v + (' ' + rest if rest else '')
    ir = IRREG.get(head) if isinstance(IRREG.get(head), list) else None
    v = (ir[0] if ir else sfx(head)) if shape == 'v3s' else (ir[2] if ir else head) if shape == 'v1s' else (ir[1] if ir else head)
    return v + (' ' + rest if rest else '')
def default_shape(r):
    p = r['pos']
    return 'n1' if p.startswith('N') else 'v3s' if p.startswith('V') else 'adj' if p.startswith('Adj') else 'o'

def parse(line, lv):
    toks = []
    for t in line.split():
        if t in (',', '.', '?', '!', ':', ';', '"', '—'): toks.append([t, None]); continue
        if t.startswith('@'): toks.append([t[1:], None]); continue   # a name or a word not asked
        m = re.match(r'^([^=/:]+)(?:=([^/:]+))?(?:/([^:]+))?(?::(.+))?$', t)
        form, hw, shape, gloss = m.groups()
        form = form.replace('_', ' ')
        key = (hw or form).lower().replace('_', ' ')
        word = ALIAS.get(norm(key)) or ALIAS.get(key)
        if not word and not hw:
            c = lemma(key, shape)
            if len(c) == 1: word = c[0]
            elif len(c) > 1: ERR.append(f'ambiguous {key!r} {c} in: {line}'); continue
        if not word: ERR.append(f'unknown word {key!r} in: {line}'); continue
        r = BY[word]
        if (lv < 0 and not r.get('top')) or (lv >= 0 and LEVEL[word] > lv): ERR.append(f'{word} is not allowed at level {lv} in: {line}')
        shape = shape or default_shape(r)
        gloss = (gloss or inflect(r['english'], shape)).replace('_', ' ')
        toks.append([form, word, gloss, shape])
    return toks

OUT = []; ERR = []
def S(lv, line, en, p=None, pt=None):
    OUT.append({'la': parse(line, lv), 'en': en, 'lv': lv, **({'p': p, 'pt': pt} if p else {})})
def P(lv, pid, title, pairs):
    for la, en in pairs: S(lv, la, en, pid, title)


# ---------------- Top 50 (lv -1): only the words marked top in vocab.js ----------------
for la, en in [
 ("servus aquam portat .", "The slave carries water"),
 ("magister verba/n2 dicit .", "The teacher says words"),
 ("femina in villa habitat .", "The woman lives in the house"),
 ("nauta ad terram ambulat .", "The sailor walks to the land"),
 ("dominus servum vocat .", "The master calls the slave"),
 ("regina bona est=sum .", "The queen is good"),
 ("equus magnus est=sum .", "The horse is big"),
 ("amicus bonus est=sum .", "The friend is good"),
 ("ego aquam porto/v1s .", "I carry water"),
 ("servi/n2 in via laborant/v3p .", "The slaves work on the road"),
 ("femina ad templum ambulat .", "The woman walks to the temple"),
 ("magister librum novum dat=do:gives .", "The teacher gives a new book"),
 ("nauta magnus equum videt .", "The big sailor sees the horse"),
 ("femina verbum audit .", "The woman hears the word"),
 ("dominus servos/n2 ad villam mittit .", "The master sends the slaves to the house"),
 ("quis in templo est=sum ?", "Who is in the temple?"),
 ("quid servus portat ?", "What does the slave carry?"),
 ("ubi=ubi? est=sum regina ?", "Where is the queen?"),
 ("regina in villa magna habitat .", "The queen lives in a big house"),
 ("servus malus non laborat .", "The bad slave does not work"),
 ("amicus bene scribit .", "The friend writes well"),
 ("unus servus et duo nautae/n2 in via sunt=sum/v3p .", "One slave and two sailors are on the road"),
 ("tres equi/n2 in terra sunt=sum/v3p .", "Three horses are on the land"),
 ("dominus multos/adjp servos/n2 vocat .", "The master calls many slaves"),
 ("femina cum amico ambulat .", "The woman walks with a friend"),
 ("servus e villa ambulat .", "The slave walks out of the house"),
 ("nauta a villa ad templum ambulat .", "The sailor walks from the house to the temple"),
 ("ego sum=sum/v1s dominus .", "I am the master"),
 ("regina verba/n2 bona/adjp dicit .", "The queen says good words"),
 ("magister librum scribit et servo=servus dat=do:gives .", "The teacher writes a book and gives it to the slave"),
 ("servus laborat , sed dominus non laborat .", "The slave works, but the master does not work"),
 ("equus aquam videt et ad aquam ambulat .", "The horse sees the water and walks to the water"),
 ("femina librum novum amico dat=do:gives .", "The woman gives the new book to the friend"),
 ("nautae/n2 terram novam vident/v3p .", "The sailors see the new land"),
 ("magister bonus bene dicit .", "The good teacher speaks well"),
 ("servi/n2 multi/adjp in villa habitant/v3p .", "Many slaves live in the house"),
 ("dominus servum vocat quod servus non laborat .", "The master calls the slave because the slave does not work"),
 ("ego viam facio/v1s .", "I make a road"),
 ("nauta multam/adj aquam videt .", "The sailor sees much water"),
 ("regina magistro verba/n2 mittit .", "The queen sends words to the teacher"),
 ("amicus in via equum audit .", "The friend hears a horse in the road"),
 ("quid magister scribit ?", "What does the teacher write?"),
 ("femina bona templum videt .", "The good woman sees the temple"),
 ("ubi=ubi? nautae/n2 laborant/v3p ?", "Where do the sailors work?"),
 ("servus bonus aquam ad villam portat .", "The good slave carries water to the house"),
]: S(-1, la, en)
P(-1, 'pta', 'The slave', [
 ("servus in villa laborat .", "The slave works in the house"),
 ("dominus servum vocat .", "The master calls the slave"),
 ("dominus dicit : \" aquam porta=porto/imp ! \"", "The master says: \"Carry the water!\""),
 ("servus aquam ad dominum=dominus portat .", "The slave carries the water to the master"),
 ("dominus servo=servus librum dat=do:gives .", "The master gives the slave a book"),
 ("servus bonus est=sum .", "The slave is good"),
])
P(-1, 'ptb', 'The queen and the sailors', [
 ("regina in villa magna habitat .", "The queen lives in a big house"),
 ("nautae/n2 ad villam ambulant/v3p .", "The sailors walk to the house"),
 ("regina nautas/n2 videt et vocat .", "The queen sees the sailors and calls them"),
 ("\" quid portatis=porto/v2p ? \" dicit .", "\"What are you carrying?\" she says"),
 ("nautae/n2 librum novum portant/v3p .", "The sailors carry a new book"),
 ("regina librum videt et bene dicit .", "The queen sees the book and speaks well"),
])
# ---------------- Top 50, second set: 90 sentences and two short stories for absolute beginners ----------------
for la, en in [
 ("servus est=sum .", "He is a slave"),
 ("ego sum=sum/v1s servus .", "I am a slave"),
 ("femina est=sum regina .", "The woman is the queen"),
 ("equus bonus est=sum .", "The horse is good"),
 ("via magna est=sum .", "The road is big"),
 ("aqua bona est=sum .", "The water is good"),
 ("liber novus est=sum .", "The book is new"),
 ("templum magnum est=sum .", "The temple is big"),
 ("villa nova est=sum .", "The house is new"),
 ("servus malus est=sum .", "The slave is bad"),
 ("dominus bonus est=sum .", "The master is good"),
 ("regina magna est=sum .", "The queen is great"),
 ("amicus in via est=sum .", "The friend is in the road"),
 ("nauta in aqua est=sum .", "The sailor is in the water"),
 ("equus in terra est=sum .", "The horse is on the land"),
 ("dominus in villa est=sum .", "The master is in the house"),
 ("servus in templo est=sum .", "The slave is in the temple"),
 ("femina in via ambulat .", "The woman walks in the road"),
 ("equus ambulat .", "The horse walks"),
 ("nauta ambulat .", "The sailor walks"),
 ("servus laborat .", "The slave works"),
 ("femina laborat .", "The woman works"),
 ("magister scribit .", "The teacher writes"),
 ("regina dicit .", "The queen speaks"),
 ("amicus audit .", "The friend listens"),
 ("dominus videt .", "The master sees"),
 ("servus portat .", "The slave carries"),
 ("ego ambulo=ambulo/v1s .", "I walk"),
 ("ego laboro=laboro/v1s .", "I work"),
 ("ego video=video/v1s .", "I see"),
 ("ego audio=audio/v1s .", "I hear"),
 ("ego scribo=scribo/v1s .", "I write"),
 ("ego dico=dico/v1s .", "I speak"),
 ("ego non laboro=laboro/v1s .", "I do not work"),
 ("servus non ambulat .", "The slave does not walk"),
 ("equus non laborat .", "The horse does not work"),
 ("nauta non audit .", "The sailor does not hear"),
 ("servus aquam videt .", "The slave sees the water"),
 ("femina equum videt .", "The woman sees the horse"),
 ("amicus librum videt .", "The friend sees the book"),
 ("dominus villam videt .", "The master sees the house"),
 ("nauta terram videt .", "The sailor sees the land"),
 ("regina templum videt .", "The queen sees the temple"),
 ("servus librum portat .", "The slave carries the book"),
 ("femina aquam portat .", "The woman carries water"),
 ("magister librum dat=do:gives .", "The teacher gives a book"),
 ("dominus aquam dat=do:gives .", "The master gives water"),
 ("regina verbum dicit .", "The queen says a word"),
 ("amicus verbum audit .", "The friend hears a word"),
 ("servus dominum=dominus vocat .", "The slave calls the master"),
 ("dominus amicum vocat .", "The master calls a friend"),
 ("femina reginam vocat .", "The woman calls the queen"),
 ("magister verbum scribit .", "The teacher writes a word"),
 ("nauta viam facit .", "The sailor makes a road"),
 ("dominus villam facit .", "The master makes a house"),
 ("servus bene laborat .", "The slave works well"),
 ("equus bene ambulat .", "The horse walks well"),
 ("magister bene scribit .", "The teacher writes well"),
 ("femina bene dicit .", "The woman speaks well"),
 ("amicus non bene audit .", "The friend does not hear well"),
 ("servus et equus ambulant/v3p .", "The slave and the horse walk"),
 ("dominus et regina in villa sunt=sum/v3p .", "The master and the queen are in the house"),
 ("femina et amicus laborant/v3p .", "The woman and the friend work"),
 ("nauta et servus aquam portant/v3p .", "The sailor and the slave carry water"),
 ("servi/n2 laborant/v3p .", "The slaves work"),
 ("equi/n2 ambulant/v3p .", "The horses walk"),
 ("nautae/n2 vident/v3p .", "The sailors see"),
 ("feminae/n2 dicunt/v3p .", "The women speak"),
 ("amici/n2 audiunt/v3p .", "The friends listen"),
 ("servi/n2 in villa sunt=sum/v3p .", "The slaves are in the house"),
 ("equi/n2 in via sunt=sum/v3p .", "The horses are in the road"),
 ("unus equus est=sum .", "There is one horse"),
 ("duo servi/n2 sunt=sum/v3p .", "There are two slaves"),
 ("tres nautae/n2 sunt=sum/v3p .", "There are three sailors"),
 ("duo amici/n2 ambulant/v3p .", "Two friends walk"),
 ("tres feminae/n2 laborant/v3p .", "Three women work"),
 ("multi/adjp servi/n2 laborant/v3p .", "Many slaves work"),
 ("multi/adjp equi/n2 in terra sunt=sum/v3p .", "Many horses are on the land"),
 ("servus ad villam ambulat .", "The slave walks to the house"),
 ("equus ad aquam ambulat .", "The horse walks to the water"),
 ("femina ad templum ambulat .", "The woman walks to the temple"),
 ("nauta ad terram ambulat .", "The sailor walks to the land"),
 ("amicus e villa ambulat .", "The friend walks out of the house"),
 ("servus a villa ambulat .", "The slave walks from the house"),
 ("dominus cum servo=servus ambulat .", "The master walks with the slave"),
 ("regina cum amico ambulat .", "The queen walks with a friend"),
 ("femina cum equo ambulat .", "The woman walks with the horse"),
 ("servus laborat quod dominus vocat .", "The slave works because the master calls"),
 ("equus ambulat sed non laborat .", "The horse walks but does not work"),
 ("amicus bonus est=sum sed servus malus est=sum .", "The friend is good but the slave is bad"),
 ("quis est=sum ?", "Who is it?"),
 ("quis ambulat ?", "Who walks?"),
 ("quis laborat ?", "Who works?"),
 ("quid est=sum ?", "What is it?"),
 ("quid femina portat ?", "What does the woman carry?"),
 ("quid dominus dicit ?", "What does the master say?"),
 ("ubi=ubi? est=sum servus ?", "Where is the slave?"),
 ("ubi=ubi? est=sum villa ?", "Where is the house?"),
 ("ubi=ubi? equus ambulat ?", "Where does the horse walk?"),
 ("ubi=ubi? sunt=sum/v3p nautae/n2 ?", "Where are the sailors?"),
]: S(-1, la, en)
P(-1, 'ptc', 'The horse', [
 ("equus in via est=sum .", "The horse is in the road"),
 ("servus equum videt .", "The slave sees the horse"),
 ("servus equum vocat .", "The slave calls the horse"),
 ("equus ad servum ambulat .", "The horse walks to the slave"),
 ("servus aquam dat=do:gives .", "The slave gives water"),
 ("equus bonus est=sum .", "The horse is good"),
])
P(-1, 'ptd', 'The teacher', [
 ("magister in villa habitat .", "The teacher lives in a house"),
 ("magister librum scribit .", "The teacher writes a book"),
 ("amicus ad villam ambulat .", "A friend walks to the house"),
 ("magister amico librum dat=do:gives .", "The teacher gives the friend the book"),
 ("amicus librum videt et dicit : \" bene ! \"", "The friend sees the book and says: \"Good!\""),
])
print('\n'.join(ERR)); print(len(ERR), 'problems'); print(len(OUT), 'sentences')
lines = []
for o in OUT:
    la = json.dumps(o['la'], ensure_ascii=False)
    extra = f", p: {json.dumps(o['p'])}, pt: {json.dumps(o['pt'])}" if o.get('p') else ''
    lines.append(f"  {{ la: {la}, en: {json.dumps(o['en'], ensure_ascii=False)}, lv: {o['lv']}{extra} }},")
open(sys.argv[1], 'w').write('\n'.join(lines) + '\n')
