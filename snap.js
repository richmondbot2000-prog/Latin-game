/* Snap a page: photograph (or paste) any English text, and every word that is in the vocabulary turns into Latin,
   in the case, number, tense and person the English context asks for. The reader reads the English and says the
   English of each Latin word. Two parts: the Latin morphology built from the dictionary entries in vocab.js
   (nouns in five cases, adjectives agreeing with their noun, verbs in present / imperfect / perfect / future /
   infinitive / imperative), and the English analysis that decides which form each word needs. The photo is read
   on the phone itself by Tesseract (served from this site, in ocr/); nothing leaves the device. */
const Snap = (() => {
  // ---------- Latin morphology ----------
  const parts = w => w.dict.replace(/\s*\(irreg\.\)/g, '').replace(/\s*\+\s*[a-z]+/g, '').split(',').map(s => s.trim().replace(/\s+[0-9½].*$/, '').replace(/\s+(m|f|n)\.\s*(pl\.)?$/, '').replace(/\s+pl\.$/, ''));
  const head = w => w.word.replace(/\s*\(.*\)$/, '').replace(/\s*\+.*$/, '').replace(/\?$/, '');
  const gender = w => { const m = w.dict.match(/[0-9½]\s*(m\.\/f\.|m\.|f\.|n\.)/); const g = m ? m[1][0] : (w.pos.match(/^N\d(m|f|n)/) || [])[1]; return m && m[1] === 'm./f.' ? 'm' : (g || 'm'); };
  const nounStem = w => {
    const p = parts(w), h = p[0], g = p[1] || '';
    if (g.startsWith('-')) {
      const e = g.slice(1);
      if (e === 'ae') return h.slice(0, -1);
      if (e === 'i') return /(us|um)$/.test(h) ? h.slice(0, -2) : h;
      if (e === 'orum' || e === 'arum') return h.replace(/(i|ae)$/, '');
      if (e === 'is') return h.replace(/(is|es|s)$/, '');
      if (e === 'ei') return h.slice(0, -2);
      return h;
    }
    return g.replace(/5/.test(w.pos) ? /ei$/ : /(orum|arum|ium|um|ae|is|i)$/, '');
  };
  const vowels = s => (s.match(/[aeiou]/g) || []).length;
  // a noun in a case ('nom' 'acc' 'gen' 'dat' 'abl') and number
  function noun(w, cs, pl) {
    const h = head(w), st = nounStem(w), g = gender(w), d = +(w.pos.match(/\d/) || [1])[0];
    if (/pl\./.test(w.dict)) pl = true;
    if (/^[A-Z]/.test(h)) pl = false;   // Rome, Troy, Greece
    let T;
    if (d === 1) T = pl ? { nom: st + 'ae', acc: st + 'as', gen: st + 'arum', dat: st + 'is', abl: st + 'is' } : { nom: h, acc: st + 'am', gen: st + 'ae', dat: st + 'ae', abl: st + 'a' };
    else if (d === 2) T = g === 'n' ? (pl ? { nom: st + 'a', acc: st + 'a', gen: st + 'orum', dat: st + 'is', abl: st + 'is' } : { nom: h, acc: h, gen: st + 'i', dat: st + 'o', abl: st + 'o' })
      : (pl ? { nom: st + 'i', acc: st + 'os', gen: st + 'orum', dat: st + 'is', abl: st + 'is' } : { nom: h, acc: st + 'um', gen: st + 'i', dat: st + 'o', abl: st + 'o' });
    else if (d === 3) {
      const istem = (/(is|es)$/.test(h) && st === h.slice(0, -2)) || (vowels(h) === 1 && /[^aeiou][^aeiou]$/.test(st)) || (g === 'n' && /(e|al|ar)$/.test(h));
      const npl = st + (g === 'n' && /(e|al|ar)$/.test(h) ? 'ia' : 'a');
      T = g === 'n' ? (pl ? { nom: npl, acc: npl, gen: st + (istem ? 'ium' : 'um'), dat: st + 'ibus', abl: st + 'ibus' } : { nom: h, acc: h, gen: st + 'is', dat: st + 'i', abl: st + (istem && /e$/.test(h) ? 'i' : 'e') })
        : (pl ? { nom: /pl\./.test(w.dict) ? h : st + 'es', acc: st + 'es', gen: st + (istem ? 'ium' : 'um'), dat: st + 'ibus', abl: st + 'ibus' } : { nom: h, acc: st + 'em', gen: st + 'is', dat: st + 'i', abl: st + 'e' });
    }
    else if (d === 5) T = pl ? { nom: st + 'es', acc: st + 'es', gen: st + 'erum', dat: st + 'ebus', abl: st + 'ebus' } : { nom: h, acc: st + 'em', gen: st + 'ei', dat: st + 'ei', abl: st + 'e' };
    else return h;
    return T[cs] || h;
  }
  // an adjective (or possessive) agreeing in gender, case and number
  function adj(w, g, cs, pl) {
    const h = head(w), p = parts(w);
    if (w.pos === 'Adj212' || w.pos === 'numo' || (w.pos === 'pro' && /-a, -um/.test(w.dict)) || w.pos === 'numc' && /-a, -um/.test(w.dict)) {
      let st; if (h.endsWith('us')) st = h.slice(0, -2); else if (h.endsWith('er')) st = (p[1] || '').replace(/^-/, '').replace(/a$/, '') || h; else if (h.endsWith('i')) { st = h.slice(0, -1); pl = true; } else return h;
      if (p[1] && p[1].startsWith('-') && h.endsWith('er')) st = h;   // miser, -a, -um keeps its e
      const fake = { word: g === 'f' ? st + 'a' : g === 'n' ? st + 'um' : h, dict: (g === 'f' ? st + 'a, -ae 1 f.' : g === 'n' ? st + 'um, -i 2 n.' : h + ', ' + st + 'i 2 m.'), pos: g === 'f' ? 'N1f' : g === 'n' ? 'N2n' : 'N2m' };
      return noun(fake, cs, pl);
    }
    if (w.pos === 'Adj3') {
      const two = /-is, -e$/.test(w.dict) || p.length === 3;
      const st = two ? (h.endsWith('is') ? h.slice(0, -2) : (p[1] || h).replace(/is$/, '')) : (p[1] || h).replace(/is$/, '');
      const nomsg = g === 'n' ? (two ? st + 'e' : h) : (p.length === 3 && g === 'f' ? p[1] : h);
      const n = g === 'n';
      const T = pl ? { nom: st + (n ? 'ia' : 'es'), acc: st + (n ? 'ia' : 'es'), gen: st + 'ium', dat: st + 'ibus', abl: st + 'ibus' } : { nom: nomsg, acc: n ? nomsg : st + 'em', gen: st + 'is', dat: st + 'i', abl: st + 'i' };
      return T[cs] || h;
    }
    return h;
  }
  const IRR = {
    sum: { pr: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'], im: 'era', fu: ['ero', 'eris', 'erit', 'erimus', 'eritis', 'erunt'], pf: 'fu', inf: 'esse', imp: 'es' },
    possum: { pr: ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'], im: 'potera', fu: ['potero', 'poteris', 'poterit', 'poterimus', 'poteritis', 'poterunt'], pf: 'potu', inf: 'posse' },
    'eo (verb)': { pr: ['eo', 'is', 'it', 'imus', 'itis', 'eunt'], im: 'iba', fu: ['ibo', 'ibis', 'ibit', 'ibimus', 'ibitis', 'ibunt'], pf: 'i', inf: 'ire', imp: 'i' },
    volo: { pr: ['volo', 'vis', 'vult', 'volumus', 'vultis', 'volunt'], im: 'voleba', fu: ['volam', 'voles', 'volet', 'volemus', 'voletis', 'volent'], pf: 'volu', inf: 'velle' },
    nolo: { pr: ['nolo', 'non vis', 'non vult', 'nolumus', 'non vultis', 'nolunt'], im: 'noleba', fu: ['nolam', 'noles', 'nolet', 'nolemus', 'noletis', 'nolent'], pf: 'nolu', inf: 'nolle', imp: 'noli' },
    fero: { pr: ['fero', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt'], im: 'fereba', fu: ['feram', 'feres', 'feret', 'feremus', 'feretis', 'ferent'], pf: 'tul', inf: 'ferre', imp: 'fer' },
  };
  const pre = (p, t) => ({ pr: t.pr.map(x => p + x), im: p + t.im, fu: t.fu.map(x => p + x), pf: p + t.pf, inf: p + t.inf, imp: t.imp ? p + t.imp : null });
  Object.assign(IRR, { absum: pre('ab', IRR.sum), adsum: pre('ad', IRR.sum) });
  for (const [k, p] of [['adeo', 'ad'], ['exeo', 'ex'], ['redeo', 'red'], ['transeo', 'trans'], ['ineo', 'in'], ['pereo', 'per']]) IRR[k] = pre(p, IRR['eo (verb)']);
  IRR.absum.pf = 'afu'; IRR.adsum.pf = 'adfu';
  const PERS = ['1s', '2s', '3s', '1p', '2p', '3p'];
  const IMPF = ['m', 's', 't', 'mus', 'tis', 'nt'], PF = ['i', 'isti', 'it', 'imus', 'istis', 'erunt'], FUT3 = ['am', 'es', 'et', 'emus', 'etis', 'ent'], FUT1 = ['o', 'is', 'it', 'imus', 'itis', 'unt'];
  // a verb: tense 'pr' 'im' 'pf' 'fu' 'inf' 'imp', person '1s'…'3p'
  function verb(w, tense, pers) {
    const h = head(w), k = PERS.indexOf(pers) < 0 ? 2 : PERS.indexOf(pers), c = w.pos;
    const ir = IRR[w.word];
    if (ir) { if (tense === 'inf') return ir.inf; if (tense === 'imp') return ir.imp || ir.pr[1]; if (tense === 'pr' || tense === 'fu') return ir[tense][k]; if (tense === 'im') return ir.im + IMPF[k]; return ir.pf + PF[k]; }
    if (!/^V[1234m]$/.test(c) || !h.endsWith('o')) return h;
    const p = parts(w), st = h.slice(0, -1);
    if (tense === 'inf') return p[1] && !p[1].startsWith('-') ? p[1] : c === 'V1' ? st + 'are' : c === 'V2' || c === 'V4' ? st + 're' : c === 'Vm' ? st.slice(0, -1) + 'ere' : st + 'ere';
    if (tense === 'imp') return c === 'V1' ? st + 'a' : c === 'V2' || c === 'V4' ? st : c === 'Vm' ? st.slice(0, -1) + 'e' : st + 'e';
    if (tense === 'pr') {
      const f = c === 'V1' ? [h, st + 'as', st + 'at', st + 'amus', st + 'atis', st + 'ant'] : c === 'V2' ? [h, st + 's', st + 't', st + 'mus', st + 'tis', st + 'nt'] : c === 'V3' ? [h, st + 'is', st + 'it', st + 'imus', st + 'itis', st + 'unt']
        : c === 'V4' ? [h, st + 's', st + 't', st + 'mus', st + 'tis', st + 'unt'] : [h, st.slice(0, -1) + 'is', st.slice(0, -1) + 'it', st.slice(0, -1) + 'imus', st.slice(0, -1) + 'itis', st + 'unt'];
      return f[k];
    }
    if (tense === 'im') return st + (c === 'V1' ? 'aba' : c === 'V2' ? 'ba' : 'eba') + IMPF[k];
    if (tense === 'fu') return c === 'V1' ? st + 'ab' + FUT1[k] : c === 'V2' ? st + 'b' + FUT1[k] : st + FUT3[k];
    const third = p[2] || '';
    const pf = third.startsWith('-') ? (third === '-avi' ? st + 'av' : third === '-ivi' ? st + 'v' : third === '-veni' ? h.replace(/venio$/, 'ven') : st + 'u') : third.replace(/i$/, '');
    return (pf || st + 'av') + PF[k];
  }

  // ---------- English analysis ----------
  // English words never turned into Latin: too many meanings, or grammar words that Latin does without
  const BLOCK = new Set(['like', 'well', 'even', 'so', 'as', 'then', 'there', 'can', 'may', 'will', 'might', 'order', 'kind', 'back', 'face', 'show', 'right', 'just', 'still', 'leave', 'lead', 'second', 'fair', 'bear', 'fly', 'left', 'close', 'set', 'lie', 'sound', 'present', 'miss', 'mind', 'head', 'part', 'charge', 'force', 'drive', 'get', 'got', 'do', 'does', 'did', 'done', 'doing', 'for', 'by', 'on', 'at', 'to', 'of', 'what', 'who', 'whom', 'which', 'where', 'when', 'why', 'how', 'it', 'its', 'he', 'she', 'they', 'him', 'her', 'them', 'his', 'that', 'this', 'these', 'those', 'same', 'no-one', 'once', 'down', 'about', 'among', 'both', 'thousand', 'hundred', 'able', 'ought', 'should', 'must', 'have', 'has', 'had', 'having', 'be', 'been', 'being', 'am', 'is', 'are', 'was', 'were', 'one', 'up', 'off', 'over', 'out', 'in', 'into', 'with', 'from', 'through', 'across', 'against', 'around', 'near', 'under', 'above', 'before', 'after', 'between', 'without', 'because', 'and', 'but', 'not', 'or', 'nor', 'than', 'while', 'although', 'therefore', 'however', 'all', 'every', 'any', 'some', 'no', 'lives', 'last', 'first', 'mean', 'means', 'meant', 'spear', 'ever', 'us', 'i', 'me', 'we', 'you', 'my', 'your', 'our', 'their', 'myself', 'himself', 'herself', 'themselves', 'nobody', 'nothing', 'people', 'person', 'men', 'man']);
  // words handled by their own rules rather than the dictionary senses
  const PREP = { in: ['in + abl.', 'abl'], on: ['in + abl.', 'abl'], into: ['in + acc.', 'acc'], with: ['cum + abl.', 'abl'], from: ['a/ab + abl.', 'abl'], by: ['a/ab + abl.', 'abl'], through: ['per + acc.', 'acc'], across: ['trans + acc.', 'acc'], against: ['contra + acc.', 'acc'], around: ['circum + acc.', 'acc'], near: ['prope + acc.', 'acc'], under: ['sub + abl.', 'abl'], above: ['super + acc.', 'acc'], before: ['ante + acc.', 'acc'], after: ['post + acc.', 'acc'], between: ['inter + acc.', 'acc'], among: ['inter + acc.', 'acc'], without: ['sine + abl.', 'abl'], towards: ['ad + acc.', 'acc'], about: ['de + abl.', 'abl'] };
  const SMALL = { and: 'et', but: 'sed', not: 'non', or: 'aut', because: 'quod', while: 'dum', although: 'quamquam', therefore: 'igitur', however: 'tamen', nobody: 'nemo', nothing: 'nihil', i: 'ego', we: 'nos', himself: 'se', herself: 'se', themselves: 'se', man: 'vir', men: 'vir', person: 'homo', people: 'homo' };
  const PRON = { i: '1s', we: '1p', you: '2s', he: '3s', she: '3s', it: '3s', they: '3p', everyone: '3s', everybody: '3s', nobody: '3s', someone: '3s' };
  const DET = new Set(['the', 'a', 'an', 'my', 'your', 'his', 'her', 'their', 'our', 'its', 'this', 'that', 'these', 'those', 'some', 'many', 'every', 'each', 'no', 'all', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'few', 'several', 'other', 'another', 'such', 'what', 'which', 'whose']);
  const MOTION = new Set(['go', 'come', 'run', 'walk', 'hurry', 'sail', 'return', 'lead', 'send', 'carry', 'take', 'bring', 'arrive', 'flee', 'march', 'travel', 'ride', 'climb', 'rush', 'move', 'drive', 'fall', 'jump', 'escape', 'depart', 'approach']);
  const PASTPART = { seen: 'see', given: 'give', taken: 'take', run: 'run', come: 'come', gone: 'go', written: 'write', drunk: 'drink', fought: 'fight', thrown: 'throw', built: 'build', held: 'hold', had: 'have', put: 'put', stood: 'stand', sent: 'send', made: 'make', done: 'do', found: 'find', fled: 'flee', caught: 'catch', left: 'leave', brought: 'bring', sat: 'sit', eaten: 'eat', fallen: 'fall', met: 'meet', sought: 'seek', told: 'tell', known: 'know', won: 'win', hidden: 'hide', driven: 'drive', overcome: 'overcome', struck: 'strike', worn: 'wear', been: 'be', said: 'say', led: 'lead', heard: 'hear', slept: 'sleep', read: 'read', beaten: 'beat', chosen: 'choose', shown: 'show', sung: 'sing', ridden: 'ride' };
  const PAST = { see: 'saw', give: 'gave', say: 'said', lead: 'led', take: 'took', run: 'ran', come: 'came', go: 'went', hear: 'heard', write: 'wrote', drink: 'drank', fight: 'fought', sleep: 'slept', throw: 'threw', build: 'built', hold: 'held', have: 'had', put: 'put', read: 'read', stand: 'stood', send: 'sent', make: 'made', do: 'did', find: 'found', flee: 'fled', catch: 'caught', leave: 'left', bring: 'brought', sit: 'sat', eat: 'ate', fall: 'fell', meet: 'met', seek: 'sought', set: 'set', tell: 'told', know: 'knew', win: 'won', hide: 'hid', drive: 'drove', overcome: 'overcame', strike: 'struck', get: 'got', wear: 'wore', beat: 'beat', choose: 'chose', sing: 'sang', ride: 'rode', fear: 'feared' };
  const IRRPL = { man: 'men', woman: 'women', child: 'children', foot: 'feet', tooth: 'teeth', mouse: 'mice', person: 'people', wife: 'wives', life: 'lives', knife: 'knives', sheep: 'sheep', enemy: 'enemies', city: 'cities', country: 'countries', army: 'armies', body: 'bodies', story: 'stories', family: 'families' };
  const sfx = w => /(s|x|z|ch|sh)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /[^aeiou]o$/.test(w) ? w + 'es' : w + 's';
  const ing = w => /ie$/.test(w) ? w.slice(0, -2) + 'ying' : /e$/.test(w) && !/ee$/.test(w) ? w.slice(0, -1) + 'ing' : /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w) ? w + w.slice(-1) + 'ing' : w + 'ing';
  const past = w => PAST[w] || (/e$/.test(w) ? w + 'd' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ied' : /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w) ? w + w.slice(-1) + 'ed' : w + 'ed');

  // the index: English form → candidates [{ w, kind: 'n' | 'v' | 'a' | 'o', feat }]; built for the words in play
  let IDX = null, IDXKEY = '';
  function build(words) {
    const key = words.map(w => w.word).join('|'); if (IDX && IDXKEY === key) return IDX;
    IDX = {}; IDXKEY = key;
    const add = (en, w, kind, feat) => { const k = en.toLowerCase(); (IDX[k] = IDX[k] || []).push({ w, kind, feat, rank: (w.level || 1) * 10 + IDX[k].length }); };
    for (const w of words) {
      const senses = w.english.replace(/\(.*?\)/g, ' ').split(/[,;]/).map(s => s.trim()).filter(s => s && !/^(am|is|are|be)\s/.test(s) && !/\.\.\./.test(s) && !/…/.test(s));
      const kind = /^N/.test(w.pos) ? 'n' : /^V/.test(w.pos) ? 'v' : (/^Adj|^numo/.test(w.pos) || (w.pos === 'pro' && /-a, -um/.test(w.dict))) ? 'a' : 'o';
      if (w.pos === 'qu' || w.word === 'noli/nolite' || w.word === 'inquit/inquiunt' || w.word === '-que' || w.word === 'et … et …' || w.word === 'is' || w.word === 'qui' || w.word === 'hic, haec, hoc' || w.word === 'ille' || w.word === 'idem' || w.word === 'ipse' || w.word === 'se' || w.word === 'tu' || w.word === 'vos') continue;
      for (const s of senses) {
        const ws = s.split(/\s+/).filter((x, i) => !(i === 0 && x === 'to'));
        if (!ws.length || ws.length > 3) continue;
        if (kind === 'v' && ws.length === 2 && /^(to|at|for)$/.test(ws[1])) { const b = ws[0]; add(b, w, 'v', { f: 'base' }); add(sfx(b), w, 'v', { f: '3s' }); add(past(b), w, 'v', { f: 'past' }); add(ing(b), w, 'v', { f: 'ing' }); }   // "listen" as well as "listen to"
        const first = ws[0], rest = ws.slice(1).join(' ');
        if (kind === 'n') { add(first + (rest ? ' ' + rest : ''), w, 'n', { pl: false }); const pl = IRRPL[ws[ws.length - 1]] || sfx(ws[ws.length - 1]); add((ws.length > 1 ? ws.slice(0, -1).join(' ') + ' ' : '') + pl, w, 'n', { pl: true }); }
        else if (kind === 'v') { const tail = rest ? ' ' + rest : ''; add(first + tail, w, 'v', { f: 'base' }); add(sfx(first) + tail, w, 'v', { f: '3s' }); add(past(first) + tail, w, 'v', { f: 'past' }); add(ing(first) + tail, w, 'v', { f: 'ing' }); for (const pp in PASTPART) if (PASTPART[pp] === first) add(pp + tail, w, 'v', { f: 'pp' }); }
        else add(s, w, kind, {});
      }
    }
    for (const k in IDX) IDX[k].sort((a, b) => a.rank - b.rank);
    return IDX;
  }

  // split text into sentences of tokens { t: text, w: word or null }
  // tokens keep their character offset in the text, so a word can be found again on the photo
  const tokens = text => { const out = [], re = /[A-Za-z][A-Za-z'-]*|\d+|[^\sA-Za-z\d]+/g, t = text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"'); let m; while ((m = re.exec(t))) out.push({ t: m[0], at: m.index }); return out; };
  function sentences(text) {
    const out = []; let cur = [];
    for (const x of tokens(text)) { cur.push(x); if (/^[.!?]+["']?$/.test(x.t) || /^["']?[.!?]+$/.test(x.t)) { out.push(cur); cur = []; } }
    if (cur.length) out.push(cur);
    return out;
  }

  // one sentence: decide for each word whether it becomes Latin, and in which form
  function convert(sent, idx) {
    const low = sent.map(t => t.toLowerCase()), n = sent.length;
    const isWord = i => i >= 0 && i < n && /^[a-z]/.test(low[i]);
    const out = sent.map(t => ({ en: t, la: null, id: null }));
    const info = new Array(n).fill(null);   // { kind, w, feat, pl, g, cs, pers, tense }
    const look = i => { if (!isWord(i)) return null; if (BLOCK.has(low[i])) return null; const two = isWord(i + 1) && idx[low[i] + ' ' + low[i + 1]], three = isWord(i + 2) && idx[low[i] + ' ' + low[i + 1] + ' ' + low[i + 2]]; if (three) return { c: three, len: 3 }; if (two) return { c: two, len: 2 }; return idx[low[i]] ? { c: idx[low[i]], len: 1 } : null; };
    const prevWord = i => { for (let k = i - 1; k >= 0; k--) if (isWord(k) && !(info[k] && info[k].kind === 'fold')) return k; return -1; };
    const GIVE = new Set(['give', 'show', 'tell', 'send', 'hand', 'bring', 'teach', 'announce', 'entrust', 'promise']);
    const detBefore = i => { const p = prevWord(i); return p >= 0 && (DET.has(low[p]) || (info[p] && info[p].kind === 'a') || low[p] === 'of'); };
    // pass 1: tag every word
    let i = 0;
    while (i < n) {
      if (isWord(i) && low[i] === 'once' && low[i + 1] === 'upon' && low[i + 2] === 'a' && low[i + 3] === 'time' && idx.__words.olim) { info[i] = { kind: 'word', la: 'olim', id: 'olim', len: 4 }; i += 4; continue; }
      const found = look(i);
      if (!found) { i++; continue; }
      let cands = found.c;
      // noun or verb? "the work" is a noun, "they work" a verb
      const det = detBefore(i), subj = isWord(i - 1) && PRON[low[i - 1]], after = isWord(i + 1) ? low[i + 1] : '';
      if (det) cands = cands.filter(c => c.kind !== 'v').concat(cands.filter(c => c.kind === 'v'));
      else if (subj || (isWord(i - 1) && /^(to|will|shall|can|could|must|should|would|not|never|always|often|also)$/.test(low[i - 1]))) cands = cands.filter(c => c.kind === 'v').concat(cands.filter(c => c.kind !== 'v'));
      else if (cands.some(c => c.kind === 'v') && cands.some(c => c.kind === 'n') && /^(the|a|an|his|her|my|their|our|your)$/.test(after)) cands = cands.filter(c => c.kind === 'v').concat(cands.filter(c => c.kind !== 'v'));
      const c = cands[0];
      if (c.kind === 'v' && c.feat.f === 'ing' && !(isWord(i - 1) && /^(is|are|am|was|were)$/.test(low[i - 1]))) { i++; continue; }   // "the running boy": leave it
      if (c.kind === 'v' && c.feat.f === 'pp' && isWord(i - 1) && /^(is|are|am|was|were|be|been|being|get|got)$/.test(low[i - 1])) { i++; continue; }   // passive: leave it
      info[i] = { kind: c.kind, w: c.w, feat: c.feat, len: found.len };
      for (let j = 1; j < found.len; j++) info[i + j] = { kind: 'fold' };
      i += found.len;
    }
    // nouns: number from the English, case from what comes before (preposition, 'of', 'to'), or subject / object
    const firstVerb = (() => { for (let k = 0; k < n; k++) { if (info[k] && info[k].kind === 'v') return k; if (isWord(k) && /^(is|are|am|was|were|has|have|had|will|shall|can|could|must|should|did|does|do)$/.test(low[k])) return k; } return n; })();
    const copulaBefore = i => { for (let k = i - 1; k >= 0; k--) { if (!isWord(k)) return false; if (/^(is|are|am|was|were|be|been|become|became|seems|seemed)$/.test(low[k])) return true; if (info[k] && info[k].kind === 'v') return false; if (DET.has(low[k]) || (info[k] && info[k].kind === 'a') || low[k] === 'not' || low[k] === 'very') continue; return false; } return false; };
    const imperative = () => { for (let k = 0; k < n; k++) if (info[k] && info[k].kind === 'v') return k === 0 && info[k].feat.f === 'base' && (/[!]/.test(sent[n - 1]) || n <= 4) && !PRON[low[1] || '']; return false; };
    const caseAt = (k, f) => {
      const p = prevWord(k); let q = p;
      while (q >= 0 && (DET.has(low[q]) || (info[q] && info[q].kind === 'a') || /^(very|more|most|quite|little|big|old|young|good|bad)$/.test(low[q]))) q = prevWord(q);
      const pw = q >= 0 ? low[q] : '';
      if (pw === 'of') f.cs = 'gen';
      else if (PREP[pw]) { f.cs = PREP[pw][1]; if (!info[q]) info[q] = { kind: 'prep', w: null, id: PREP[pw][0], len: 1 }; }
      else if (pw === 'to' || pw === 'for' || pw === 'towards') {
        let v = -1; for (let m = q - 1; m >= 0; m--) if (info[m] && info[m].kind === 'v') { v = m; break; }
        const lemma = v >= 0 && info[v].w ? info[v].w.english.split(/[,;]/)[0].trim().split(' ')[0] : '';
        const motion = (v >= 0 && (MOTION.has(lemma) || MOTION.has(low[v].replace(/(s|ed|ing)$/, '')))) || /^(go|goes|going|went|gone|came|come|comes|coming|ran|run|runs|walked|walk|walks|hurried|sailed|returned|travelled|traveled)$/.test(low[prevWord(q)] || '');
        if (pw !== 'for' && motion) { f.cs = 'acc'; info[q] = { kind: 'prep', w: null, id: 'ad + acc.', len: 1 }; } else f.cs = 'dat';
      }
      else if ((pw === 'and' || pw === 'or') && prevWord(q) >= 0 && info[prevWord(q)] && info[prevWord(q)].kind === 'n') f.cs = info[prevWord(q)].cs;
      else if (copulaBefore(k)) f.cs = 'nom';
      else if (imperative() && q >= 0 && info[q] && info[q].kind === 'v' && /^,$/.test(sent[k - 1] || '')) f.cs = 'nom';   // "Run, boy!"
      else {
        const verbish = j => (info[j] && info[j].kind === 'v') || (isWord(j) && /^(is|are|am|was|were|has|have|had|will|shall|can|could|must|should|did|does|do)$/.test(low[j]));
        // a verb earlier in the clause with no noun between: this is its object; otherwise a verb coming up makes it the subject
        let before = false;
        for (let j = k - 1; j >= 0; j--) { if (!isWord(j)) { if (/^[,;:]$/.test(sent[j])) break; continue; } if (/^(who|which|that|when|while|because|if|and|but|so|as|then)$/.test(low[j])) break; if (info[j] && info[j].kind === 'n') break; if (verbish(j)) { before = true; break; } }
        let nom = !before, seen = 0;
        if (before) {
          f.cs = 'acc';
          // "gave the boys a prize": the first of two objects after a giving verb is the indirect one
          let v = -1; for (let j = k - 1; j >= 0; j--) if (info[j] && info[j].kind === 'v') { v = j; break; }
          const lemma = v >= 0 && info[v].w ? info[v].w.english.split(/[,;]/)[0].trim().split(' ')[0] : '';
          if (GIVE.has(lemma)) { let seen2 = 0; for (let j = k + (f.len || 1); j < n && seen2 < 4; j++) { if (!isWord(j) || PREP[low[j]] || /^(to|for|of|and|or)$/.test(low[j])) break; if (info[j] && info[j].kind === 'n') { f.cs = 'dat'; break; } seen2++; } }
        }
        else { for (let j = k + (f.len || 1); j < n && seen < 4; j++) { if (!isWord(j)) break; if (info[j] && (info[j].kind === 'n' || info[j].kind === 'prep')) break; if (verbish(j)) { nom = true; break; } if (/^(who|which|that|and|or|if|when|because|while|as|but|so|then)$/.test(low[j])) break; seen++; } f.cs = 'nom'; }
      }
    };
    for (let k = 0; k < n; k++) { const f = info[k]; if (!f || f.kind !== 'n') continue; f.pl = !!f.feat.pl; f.g = gender(f.w); caseAt(k, f); }
    // adjectives agree with the noun they go with: the next noun, or the subject of 'is'
    for (let k = 0; k < n; k++) {
      const f = info[k]; if (!f || f.kind !== 'a') continue;
      let m = -1;
      for (let j = k + 1; j < n && j <= k + 3; j++) { if (info[j] && info[j].kind === 'n') { m = j; break; } if (!isWord(j) || (info[j] && info[j].kind === 'v') || /^(is|are|was|were)$/.test(low[j])) break; }
      if (m < 0 && copulaBefore(k)) { for (let j = k - 1; j >= 0; j--) if (info[j] && info[j].kind === 'n' && info[j].cs === 'nom') { m = j; break; } }
      if (m >= 0) { f.g = info[m].g; f.cs = m > k || !copulaBefore(k) ? info[m].cs : 'nom'; f.pl = info[m].pl; }
      else { f.g = 'm'; caseAt(k, f); f.pl = isWord(k + 1) && /s$/.test(low[k + 1]) && !/ss$/.test(low[k + 1]) && !info[k + 1]; if (copulaBefore(k)) { let j = k - 1; while (j >= 0 && !PRON[low[j]] && !/^[.;]$/.test(sent[j])) j--; if (j >= 0 && PRON[low[j]]) f.pl = /^(we|they|you)$/.test(low[j]) && low[j] !== 'you'; } }
    }
    // verbs: person from the subject, tense from the English form and the words before it
    let lastPers = '3s';
    for (let k = 0; k < n; k++) {
      const f = info[k]; if (!f || f.kind !== 'v') continue;
      const p1 = prevWord(k), w1 = p1 >= 0 ? low[p1] : '', p2 = prevWord(p1), w2 = p2 >= 0 ? low[p2] : '';
      const fm = f.feat.f;
      let pers = null;
      for (let j = k - 1; j >= 0; j--) {
        if (!isWord(j)) { if (/^[,;:]$/.test(sent[j]) && pers) break; continue; }
        if (PRON[low[j]]) { pers = PRON[low[j]]; if (low[j] === 'you' || low[j] === 'they') break; break; }
        if (info[j] && info[j].kind === 'n' && info[j].cs === 'nom') { pers = info[j].pl ? '3p' : '3s'; if (/^(and)$/.test(low[prevWord(j)] || '')) pers = '3p'; break; }
        if (info[j] && info[j].kind === 'v') { pers = null; break; }
        if (/^(is|was|has|does)$/.test(low[j])) { pers = '3s'; break; }
        if (/^(are|were)$/.test(low[j])) { pers = '3p'; break; }
      }
      if (!pers) { if (fm === '3s') pers = '3s'; else if (fm === 'base' && !/^(to|will|shall|can|could|must|should|would|do|did|does|not)$/.test(w1) && k > 0 && isWord(k - 1) && !PRON[w1]) pers = '3p'; else pers = lastPers; }
      if (fm === '3s') pers = '3s';
      let tense = 'pr';
      if (w1 === 'to' || /^(can|could|must|should|would|may|might|ought)$/.test(w1) || (w1 === 'not' && /^(can|could|must|should|would|may|might)$/.test(w2)) || /^(wants?|wanted|able|like|likes|liked)$/.test(w1)) tense = 'inf';
      else if (w1 === 'will' || w1 === 'shall' || (w1 === 'not' && /^(will|shall)$/.test(w2))) tense = 'fu';
      else if (fm === 'past' || fm === 'pp' || (fm === 'base' && (w1 === 'did' || (w1 === 'not' && w2 === 'did')))) tense = 'pf';
      else if (fm === 'base' && k === 0 && (/[!]/.test(sent[n - 1]) || n <= 4) && !PRON[low[1] || '']) tense = 'imp';
      if (fm === 'base' && (w1 === "don't" || (w1 === 'not' && w2 === 'do'))) { tense = 'inf'; info[p1] = { kind: 'word', la: 'noli', id: 'noli/nolite', len: 1 }; if (w1 === 'not') info[p2] = { kind: 'fold' }; }
      if (fm === 'base' && (w1 === 'did' || (w1 === 'not' && w2 === 'did'))) { tense = 'pf'; info[w1 === 'did' ? p1 : p2] = { kind: 'fold' }; }
      if (fm === 'base' && (w1 === 'will' || w1 === 'shall' || (w1 === 'not' && /^(will|shall)$/.test(w2)))) info[w1 === 'not' ? p2 : p1] = { kind: 'fold' };
      if (fm === 'ing' && /^(was|were|is|are|am)$/.test(w1)) info[p1] = { kind: 'fold' };
      if ((fm === 'pp' || fm === 'past') && /^(has|have|had)$/.test(w1)) info[p1] = { kind: 'fold' };
      if ((fm === 'pp' || fm === 'past') && w1 === 'not' && /^(has|have|had)$/.test(w2)) info[p2] = { kind: 'fold' };
      if (fm === 'ing' && /^(was|were)$/.test(w1)) tense = 'im';
      if (tense === 'inf' && /^(can|could)$/.test(w1 === 'not' ? w2 : w1)) info[w1 === 'not' ? p2 : p1] = { kind: 'word', la: verb({ word: 'possum', pos: 'Vi', dict: 'possum, posse, potui' }, /^could$/.test(w1 === 'not' ? w2 : w1) ? 'pf' : 'pr', pers), id: 'possum', len: 1 };
      if (tense === 'inf' && /^(must|should|ought)$/.test(w1 === 'not' ? w2 : w1)) { const dw = { word: 'debeo', pos: 'V2', dict: 'debeo, -ere, debui, debitum 2' }; info[w1 === 'not' ? p2 : p1] = { kind: 'word', la: verb(dw, 'pr', pers), id: 'debeo', len: 1 }; }
      if (tense === 'inf' && w1 === 'to') info[p1] = { kind: 'fold' };
      f.pers = pers; f.tense = tense; lastPers = pers;
    }
    // the copula: is / are / was / were → est / sunt / erat / erant (not when it is only helping another verb)
    for (let k = 0; k < n; k++) {
      if (info[k] || !isWord(k) || !/^(is|are|am|was|were)$/.test(low[k])) continue;
      const nx = isWord(k + 1) ? low[k + 1] : '';
      if ((/ing$/.test(nx) || PASTPART[nx] || /ed$/.test(nx) || nx === 'being' || nx === 'been') && !(info[k + 1] && info[k + 1].kind === 'a')) continue;
      if (nx === 'not' && isWord(k + 2) && (/ing$/.test(low[k + 2]) || PASTPART[low[k + 2]] || /ed$/.test(low[k + 2]))) continue;
      const w1 = low[prevWord(k)] || '';
      const pers = low[k] === 'am' ? '1s' : w1 === 'you' ? '2s' : w1 === 'we' ? '1p' : w1 === 'i' ? '1s' : /^(are|were)$/.test(low[k]) && w1 !== 'there' ? '3p' : '3s';
      const persFix = /^(are|were)$/.test(low[k]) && w1 === 'you' ? '2s' : pers;
      info[k] = { kind: 'word', la: verb({ word: 'sum', pos: 'Vi', dict: 'sum, esse, fui' }, /^(was|were)$/.test(low[k]) ? 'im' : 'pr', persFix), id: 'sum', len: 1 };
    }
    for (let k = 0; k < n; k++) {
      if (info[k] || !isWord(k) || !/^(has|have|had)$/.test(low[k])) continue;
      const nx = isWord(k + 1) ? low[k + 1] : '';
      if (!nx || /ing$/.test(nx) || PASTPART[nx] || /ed$/.test(nx) || /^(to|been|not|never|no)$/.test(nx)) continue;
      const w1 = low[prevWord(k)] || '', pers = PRON[w1] || (low[k] === 'has' ? '3s' : low[k] === 'have' ? '3p' : lastPers);
      info[k] = { kind: 'word', la: verb({ word: 'habeo', pos: 'V2', dict: 'habeo, -ere, habui, habitum 2' }, low[k] === 'had' ? 'im' : 'pr', pers), id: 'habeo', len: 1 };
    }
    // small words with one Latin answer
    for (let k = 0; k < n; k++) {
      if (info[k] || !isWord(k)) continue;
      const s = SMALL[low[k]];
      if (s) { if (low[k] === 'man' || low[k] === 'men' || low[k] === 'person' || low[k] === 'people') { const ww = idx.__words[s]; if (ww) info[k] = { kind: 'n', w: ww, feat: { pl: /s|men|people/.test(low[k]) && low[k] !== 'man' }, len: 1, pl: low[k] === 'men' || low[k] === 'people', g: 'm', cs: k < firstVerb || copulaBefore(k) ? 'nom' : 'acc' }; const p = prevWord(k); if (info[k] && p >= 0) { if (low[p] === 'of') info[k].cs = 'gen'; else if (PREP[low[p]]) { info[k].cs = PREP[low[p]][1]; if (!info[p]) info[p] = { kind: 'prep', w: null, id: PREP[low[p]][0], len: 1 }; } } } else info[k] = { kind: 'word', la: s, id: s, len: 1 }; }
      else if (PREP[low[k]] && isWord(k + 1)) { /* a preposition is only turned when its noun was */ }
      else if (low[k] === 'with' && /^(me|us|you)$/.test(low[k + 1] || '')) { info[k] = { kind: 'word', la: { me: 'mecum', us: 'nobiscum', you: 'tecum' }[low[k + 1]], id: 'cum + abl.', len: 2 }; }
      else if (low[k] === 'you' && k < firstVerb) info[k] = { kind: 'word', la: 'tu', id: 'tu', len: 1 };
      else if (low[k] === 'you') info[k] = { kind: 'word', la: 'te', id: 'tu', len: 1 };
      else if (low[k] === 'me') info[k] = { kind: 'word', la: prevWord(k) >= 0 && /^(to|for)$/.test(low[prevWord(k)]) ? 'mihi' : 'me', id: 'ego', len: 1 };
      else if (low[k] === 'us') info[k] = { kind: 'word', la: prevWord(k) >= 0 && /^(to|for)$/.test(low[prevWord(k)]) ? 'nobis' : 'nos', id: 'nos', len: 1 };
      else if (/^(my|your|our|their|his|her)$/.test(low[k])) {
        let m = -1; for (let j = k + 1; j < n && j <= k + 3; j++) { if (info[j] && info[j].kind === 'n') { m = j; break; } if (!isWord(j)) break; }
        if (m >= 0) { const id = { my: 'meus', your: 'tuus', our: 'noster', their: 'suus', his: 'suus', her: 'suus' }[low[k]], ww = idx.__words[id]; if (ww) info[k] = { kind: 'a', w: ww, feat: {}, len: 1, g: info[m].g, cs: info[m].cs, pl: info[m].pl }; }
      }
    }
    // pass 2: the forms
    const cap = (en, la) => /^[A-Z]/.test(en) && !/^[A-Z]/.test(la) ? la[0].toUpperCase() + la.slice(1) : la;
    for (let k = 0; k < n; k++) {
      const f = info[k]; if (!f) continue;
      let la = null, id = f.id || (f.w && f.w.word);
      if (f.kind === 'fold') { out[k].skip = true; continue; }
      if (f.kind === 'word') la = f.la;
      else if (f.kind === 'prep') { la = head(idx.__words[f.id] || { word: f.id }); if (f.id === 'a/ab + abl.') la = /^[aeiou]/i.test(low[k + 1] || '') ? 'ab' : 'a'; if (f.id === 'e/ex + abl.') la = 'ex'; }
      else if (f.kind === 'n') la = noun(f.w, f.cs, f.pl);
      else if (f.kind === 'a') la = adj(f.w, f.g, f.cs, f.pl);
      else if (f.kind === 'v') la = verb(f.w, f.tense, f.pers);
      else la = head(f.w);
      if (!la) continue;
      out[k].la = cap(sent[k], la); if (k > 0 && out[k - 1].skip && /^[A-Z]/.test(sent[k - 1])) out[k].la = cap(sent[k - 1], out[k].la); out[k].id = id; out[k].len = f.len || 1;
      for (let j = 1; j < (f.len || 1); j++) out[k + j].skip = true;   // "look at" → specto: the second word folds into the first
    }
    // the English behind each Latin word, folded helpers included ("were walking", "did not find" → the verb's gloss)
    for (let k = 0; k < n; k++) {
      if (!out[k].la) continue;
      let a = k; while (a > 0 && out[a - 1].skip && !out[a - 1].la) a--;
      out[k].gloss = sent.slice(a, k + (out[k].len || 1)).join(' ');
    }
    return out;
  }
  // the whole text → sentences of tokens { en, la, id }; `words` = the vocabulary in play
  function latinise(text, words) {
    const idx = build(words); idx.__words = Object.fromEntries(words.map(w => [w.word, w]));
    return sentences(text).map(s => {
      const r = convert(s.map(x => x.t), idx);
      r.forEach((t, i) => { t.at = s[i].at; let a = i; while (a > 0 && r[a - 1].skip && !r[a - 1].la) a--; t.from = s[a].at; t.to = s[i + (t.len || 1) - 1].at + s[i + (t.len || 1) - 1].t.length; });   // from…to: the English this Latin stands for
      return r;
    }).filter(s => s.some(t => /[a-z]/i.test(t.en)));
  }

  // ---------- reading the photo on the phone ----------
  let lib = null;
  const script = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('could not load ' + src)); document.head.appendChild(s); });
  async function ocr(file, progress) {
    progress('Loading the reader…', 0);
    if (!window.Tesseract) await (lib = lib || script('ocr/tesseract.min.js'));
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('That picture could not be opened')); i.src = url; });
    const max = 1800, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const base = new URL('ocr', location.href).href;
    const worker = await Tesseract.createWorker('eng', 1, { workerPath: base + '/worker.min.js', corePath: base, langPath: base, logger: m => { if (m.status === 'recognizing text') progress('Reading the words…', m.progress || 0); else if (/loading|initializ/.test(m.status)) progress('Loading the reader…', 0); } });
    try {
      const r = await worker.recognize(c);
      // the words with their boxes on the picture; the text is the words joined by spaces, each word knowing its offset
      const words = []; let text = '';
      // paragraphs and lines are kept (a blank line between paragraphs); words the recogniser is unsure of, or that
      // are not words at all ("e_", "dng"), are left out rather than shown as nonsense
      const junk = t => !/[a-z]/i.test(t) ? !/^\d+$/.test(t) && !/^[.,;:!?'"()-]+$/.test(t) : (!/[aeiouy]/i.test(t.replace(/[^a-z]/gi, '')) && t.replace(/[^a-z]/gi, '').length > 2) || /[_|\\~^<>{}\[\]#@*=+]/.test(t);
      let lastPara = null, lastLine = null;
      const paras = r.data.paragraphs || [], lines = r.data.lines || [];
      for (const w of r.data.words || []) {
        let t = (w.text || '').trim().replace(/^[_|~^]+|[_|~^]+$/g, ''); if (!t || junk(t) || (w.confidence < 35 && !/^[.,;:!?]$/.test(t))) continue;
        const li = w.line || null, pa = (li && li.paragraph) || w.paragraph || null;
        if (text) text += pa && lastPara && pa !== lastPara ? '\n\n' : li && lastLine && li !== lastLine ? '\n' : ' ';
        lastPara = pa || lastPara; lastLine = li || lastLine;
        words.push({ t, at: text.length, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 }); text += t;
      }
      if (!words.length) return { text: r.data.text || '', words: [], image: null, w: 0, h: 0 };
      // crop the picture to the text, with a margin, so the print is as large as the screen allows
      const mx = c.width * .03, my = c.height * .02;
      const X0 = Math.max(0, Math.min(...words.map(w => w.x0)) - mx), Y0 = Math.max(0, Math.min(...words.map(w => w.y0)) - my), X1 = Math.min(c.width, Math.max(...words.map(w => w.x1)) + mx), Y1 = Math.min(c.height, Math.max(...words.map(w => w.y1)) + my);
      const cc = document.createElement('canvas'); cc.width = Math.round(X1 - X0); cc.height = Math.round(Y1 - Y0); cc.getContext('2d').drawImage(c, X0, Y0, cc.width, cc.height, 0, 0, cc.width, cc.height);
      words.forEach(w => { w.x0 -= X0; w.x1 -= X0; w.y0 -= Y0; w.y1 -= Y0; });
      return { text, words, image: cc.toDataURL('image/jpeg', .85), w: cc.width, h: cc.height };
    } finally { worker.terminate(); }
  }
  return { latinise, ocr, noun, adj, verb, parts };
})();
