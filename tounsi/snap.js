/* Tounsi: Snap a page and the Library. An English text with every vocabulary word turned into Tunisian, in the
   form the English asks for, read on the phone itself by Tesseract (served from ../ocr/); nothing leaves the device.
   DERIVED FILE — built by tounsi/tools/build_snap.py from tools/snap_tn.js (the Tunisian grammar and the sentence
   rules) and the Latin game's snap.js (the English analysis, the photo reader and the option shaper, taken as they
   are). Edit those, not this. */
const Snap = (() => {
  // ---------- Tunisian morphology ----------
  // nouns: the definite article (ed-dar), the plural from the dictionary (dyar), a possessive ending (dari, darek)
  // or, for a noun ending in -a, mte3- after it (karhba mte3i)
  const POSS = { my: 'i', your: 'ek', his: 'ou', her: 'ha', its: 'ou', our: 'na', their: 'hom' };
  const head = w => (w.word || '').replace(/\s*\(.*\)$/, '');
  function noun(w, def, pl, poss) {
    let la = pl && w.pl ? w.pl : head(w);
    if (poss) {
      if (w.stem && !pl) { const V = { my: 'ya', your: 'k', his: 'h', her: 'ha', its: 'h', our: 'na', their: 'hom' }; return /[aeiou]$/.test(w.stem) ? w.stem + V[poss] : w.stem + POSS[poss]; }   // ommou, bouk, khouh
      const e = POSS[poss]; return /a$/.test(la) || / /.test(la) ? la + ' mte3' + e : la + e;
    }
    return def ? Forms.definite(la) : la;
  }
  function adj(w, g, pl) { return pl ? (w.pl || w.word) : g === 'f' ? (w.f || w.word) : w.word; }
  // verbs: the present by person (yemchi, temchi, nemchi…), the past (mcha, mchet, mchaw…), the future with bech,
  // "was doing" with kan, the imperative (emchi!) — the forms come from forms.js
  const KAN = { '1s': 'kont', '2s': 'kont', '3s': 'kan', '3sf': 'kanet', '1p': 'konna', '2p': 'kontou', '3p': 'kanou' };
  const HAVE = { '1s': '3andi', '2s': '3andek', '3s': '3andou', '3sf': '3andha', '1p': '3andna', '2p': '3andkom', '3p': '3andhom' };
  const PRK = { '1s': 'v1s', '2s': 'v2s', '3s': 'v3s', '3sf': 'v2s', '1p': 'v1p', '2p': 'v2p', '3p': 'v3p' };
  function verb(w, tense, pers) {
    pers = pers || '3s';
    const pr = Forms.present(w); if (!pr) return head(w);
    const present = pr[PRK[pers]];
    if (tense === 'pr' || tense === 'inf') return present;
    if (tense === 'fu') return 'bech ' + present;
    if (tense === 'im') return KAN[pers] + ' ' + present;
    if (tense === 'imp') return pr.v2s.replace(/^t/, '');
    const pa = Forms.past(w);
    if (pers === '1s' || pers === '2s') return pa.p1s;
    if (pers === '3s') return head(w);
    if (pers === '3sf') return pa.p3s;
    if (pers === '1p') return pa.p1s.replace(/t$/, 'na');
    if (pers === '2p') return pa.p1s + 'ou';
    return pa.p3p;
  }

  // ---------- English analysis (the tables are the Latin game's) ----------
  const BLOCK = new Set(['like', 'well', 'even', 'so', 'as', 'then', 'there', 'can', 'may', 'will', 'might', 'order', 'kind', 'back', 'face', 'show', 'right', 'just', 'still', 'leave', 'lead', 'second', 'fair', 'bear', 'fly', 'left', 'close', 'set', 'lie', 'sound', 'present', 'miss', 'mind', 'head', 'part', 'charge', 'force', 'drive', 'get', 'got', 'do', 'does', 'did', 'done', 'doing', 'for', 'by', 'on', 'at', 'to', 'of', 'what', 'who', 'whom', 'which', 'where', 'when', 'why', 'how', 'it', 'its', 'he', 'she', 'they', 'him', 'her', 'them', 'his', 'that', 'this', 'these', 'those', 'same', 'no-one', 'once', 'down', 'about', 'among', 'both', 'thousand', 'hundred', 'able', 'ought', 'should', 'must', 'have', 'has', 'had', 'having', 'be', 'been', 'being', 'am', 'is', 'are', 'was', 'were', 'one', 'up', 'off', 'over', 'out', 'in', 'into', 'with', 'from', 'through', 'across', 'against', 'around', 'near', 'under', 'above', 'before', 'after', 'between', 'without', 'because', 'and', 'but', 'not', 'or', 'nor', 'than', 'while', 'although', 'therefore', 'however', 'all', 'every', 'any', 'some', 'no', 'lives', 'last', 'first', 'mean', 'means', 'meant', 'spear', 'ever', 'us', 'i', 'me', 'we', 'you', 'my', 'your', 'our', 'their', 'myself', 'himself', 'herself', 'themselves', 'nobody', 'nothing', 'people', 'person', 'men', 'man']);
  const PRON = { i: '1s', we: '1p', you: '2s', he: '3s', she: '3s', it: '3s', they: '3p', everyone: '3s', everybody: '3s', nobody: '3s', someone: '3s', some: '3p', many: '3p', all: '3p', both: '3p', several: '3p', few: '3p', others: '3p' };
  const DET = new Set(['the', 'a', 'an', 'my', 'your', 'his', 'her', 'their', 'our', 'its', 'this', 'that', 'these', 'those', 'some', 'many', 'every', 'each', 'no', 'all', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'few', 'several', 'other', 'another', 'such', 'what', 'which', 'whose']);
  const MOTION = new Set(['go', 'come', 'run', 'walk', 'hurry', 'sail', 'return', 'lead', 'send', 'carry', 'take', 'bring', 'arrive', 'flee', 'march', 'travel', 'ride', 'climb', 'rush', 'move', 'drive', 'fall', 'jump', 'escape', 'depart', 'approach']);
  const PASTPART = { seen: 'see', given: 'give', taken: 'take', run: 'run', come: 'come', gone: 'go', written: 'write', drunk: 'drink', fought: 'fight', thrown: 'throw', built: 'build', held: 'hold', had: 'have', put: 'put', stood: 'stand', sent: 'send', made: 'make', done: 'do', found: 'find', fled: 'flee', caught: 'catch', left: 'leave', brought: 'bring', sat: 'sit', eaten: 'eat', fallen: 'fall', met: 'meet', sought: 'seek', told: 'tell', known: 'know', won: 'win', hidden: 'hide', driven: 'drive', overcome: 'overcome', struck: 'strike', worn: 'wear', been: 'be', said: 'say', led: 'lead', heard: 'hear', slept: 'sleep', read: 'read', beaten: 'beat', chosen: 'choose', shown: 'show', sung: 'sing', ridden: 'ride' };
  const PAST = { see: 'saw', give: 'gave', say: 'said', lead: 'led', take: 'took', run: 'ran', come: 'came', go: 'went', hear: 'heard', write: 'wrote', drink: 'drank', fight: 'fought', sleep: 'slept', throw: 'threw', build: 'built', hold: 'held', have: 'had', put: 'put', read: 'read', stand: 'stood', send: 'sent', make: 'made', do: 'did', find: 'found', flee: 'fled', catch: 'caught', leave: 'left', bring: 'brought', sit: 'sat', eat: 'ate', fall: 'fell', meet: 'met', seek: 'sought', set: 'set', tell: 'told', know: 'knew', win: 'won', hide: 'hid', drive: 'drove', overcome: 'overcame', strike: 'struck', get: 'got', wear: 'wore', beat: 'beat', choose: 'chose', sing: 'sang', ride: 'rode', fear: 'feared' };
  const IRRPL = { man: 'men', woman: 'women', child: 'children', foot: 'feet', tooth: 'teeth', mouse: 'mice', person: 'people', wife: 'wives', life: 'lives', knife: 'knives', sheep: 'sheep', enemy: 'enemies', city: 'cities', country: 'countries', army: 'armies', body: 'bodies', story: 'stories', family: 'families' };
  const sfx = w => /(s|x|z|ch|sh)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /[^aeiou]o$/.test(w) ? w + 'es' : w + 's';
  const ing = w => /ie$/.test(w) ? w.slice(0, -2) + 'ying' : /e$/.test(w) && !/ee$/.test(w) ? w.slice(0, -1) + 'ing' : /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w) ? w + w.slice(-1) + 'ing' : w + 'ing';
  const past = w => PAST[w] || (/e$/.test(w) ? w + 'd' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ied' : /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w) ? w + w.slice(-1) + 'ed' : w + 'ed');

  // English words with one Tunisian answer that the dictionary senses do not give cleanly: [form, id in vocab.js]
  const SMALL = { and: ['w', 'w'], or: ['wala', 'wala'], but: ['ama', 'ama'], because: ['khater', 'khater'], if: ['ken', 'ken'], not: ['mouch', 'mouch'],
    in: ['fi', 'fi'], on: ['3la', '3la'], about: ['3la', '3la'], from: ['men', 'men'], with: ['m3a', 'm3a'], without: ['bla', 'bla'], under: ['ta7t', 'ta7t'], behind: ['wra', 'wra'], between: ['bin', 'bin'],
    before: ['9bal', '9bal'], after: ['ba3d', 'ba3d'], here: ['houni', 'houni'], there: ['ghadi', 'ghadi'], now: ['tawa', 'tawa'], today: ['elyoum', 'elyoum'], tomorrow: ['ghodwa', 'ghodwa'], yesterday: ['elbere7', 'elbere7'],
    always: ['dima', 'dima'], never: ['abadan', 'abadan'], sometimes: ['sa3at', 'sa3at'], very: ['barcha', 'barcha'], much: ['barcha', 'barcha'], many: ['barcha', 'barcha'], only: ['bark', 'bark'], just: ['bark', 'bark'], also: ['zeda', 'zeda'], too: ['zeda', 'zeda'],
    i: ['ena', 'ena'], you: ['enti', 'enti'], he: ['houwa', 'houwa'], she: ['hiya', 'hiya'], we: ['a7na', 'a7na'], they: ['houma', 'houma'],
    this: ['hedha', 'hedha'], these: ['hedhouma', 'hedhouma'], what: ['chnowa', 'chnowa'], who: ['chkoun', 'chkoun'], where: ['win', 'win'], when: ['waqtech', 'waqtech'], how: ['kifech', 'kifech'], why: ['3lech', '3lech'],
    yes: ['ey', 'ey'], no: ['le', 'le'], nothing: ['7atta chay', 'chay'], something: ['7aja', '7aja'], someone: ['7ad', '7ad'], everything: ['kol chay', 'chay'], all: ['kol', 'kol'], every: ['kol', 'kol'], same: ['nafs', 'nafs'], other: ['akher', 'akher'] };
  const NUMS = { one: 'wa7ed', two: 'zouz', three: 'thletha', four: 'arb3a', five: 'khamsa', six: 'setta', seven: 'sab3a', eight: 'thmenya', nine: 'tes3a', ten: '3achra', twenty: '3echrin', hundred: 'mya', thousand: 'alf' };
  // English words never turned into Tunisian beyond the Latin list: grammar words and the senses that mislead
  const UNBLOCK = new Set(['man', 'men', 'people', 'person', 'head', 'drive', 'sound', 'mind', 'face', 'first', 'last', 'thousand', 'hundred', 'lives', 'same', 'nothing', 'nobody', 'once', 'should', 'must', 'able']);
  const BLOCK2 = new Set([...[...BLOCK].filter(x => !UNBLOCK.has(x)), 'that', 'which', 'the', 'a', 'an', 'than', 'time', 'way', 'long', 'light', 'second', 'country', 'party', 'form', 'close', 'open']);

  // the index: English form → candidates [{ w, kind: 'n' | 'v' | 'a' | 'o', feat }]; built for the words in play
  let IDX = null, IDXKEY = '';
  function build(words) {
    const key = words.map(w => w.word).join('|'); if (IDX && IDXKEY === key) return IDX;
    IDX = {}; IDXKEY = key;
    const add = (en, w, kind, feat) => { const k = en.toLowerCase(); if (BLOCK2.has(k)) return; (IDX[k] = IDX[k] || []).push({ w, kind, feat, rank: (w.level || 0) * 10 + IDX[k].length }); };
    for (const w of words) {
      if (w.pos === 'qu' || w.pos === 'pro' || w.pos === 'num' || w.pos === 'prep' || w.pos === 'conj' || /\.\.\./.test(w.word)) continue;   // these have their own rules (SMALL, NUMS)
      const senses = w.english.replace(/\(.*?\)/g, ' ').split(/[,;]/).map(s => s.trim()).filter(s => s && !/\.\.\./.test(s) && !/…/.test(s));
      const kind = /^N/.test(w.pos) ? 'n' : /^V/.test(w.pos) ? 'v' : /^Adj/.test(w.pos) ? 'a' : 'o';
      for (const s of senses) {
        const ws = s.split(/\s+/).filter((x, i) => !(i === 0 && x === 'to'));
        if (!ws.length || ws.length > 3) continue;
        if (kind === 'v' && ws.length === 2 && /^(to|at|for|up|out|in|on|back|down)$/.test(ws[1])) { const b = ws[0]; add(b, w, 'v', { f: 'base' }); add(sfx(b), w, 'v', { f: '3s' }); add(past(b), w, 'v', { f: 'past' }); add(ing(b), w, 'v', { f: 'ing' }); }
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
    let end = 0;
    for (const x of tokens(text)) {
      // a new paragraph ends the sentence only after a heading (CHAPTER I, a title in capitals): a photo's paragraphs can break mid-sentence
      if (cur.length && /\n\s*\n/.test(text.slice(end, x.at))) {
        const words = cur.filter(c => /[A-Za-z]/.test(c.t)), caps = words.filter(c => /^[A-Z0-9]/.test(c.t)).length;
        if (words.length && (end - cur[0].at < 120) && (caps / words.length >= .5 || /^(CHAPTER|Chapter|PART|Part|BOOK|Book)$/.test(cur[0].t))) { out.push(cur); cur = []; }
      }
      cur.push(x); end = x.at + x.t.length;
      if (/^[.!?]+["']?$/.test(x.t) || /^["']?[.!?]+$/.test(x.t)) { out.push(cur); cur = []; }
    }
    if (cur.length) out.push(cur);
    return out;
  }


  // one sentence: decide for each word whether it becomes Tunisian, and in which form
  // brk[j]: a line break comes just before token j (a photo's or a poem's lines)
  function convert(sent, idx, brk = []) {
    const low = sent.map(t => t.toLowerCase()), n = sent.length;
    const isWord = i => i >= 0 && i < n && /^[a-z]/.test(low[i]);
    const out = sent.map(t => ({ en: t, la: null, id: null }));
    const info = new Array(n).fill(null);   // { kind, w, feat, pl, g, def, poss, pers, tense }
    const W = idx.__words;
    // words in capitals (headings, shouting) are left alone
    const look = i => { if (!isWord(i)) return null; if (BLOCK2.has(low[i])) return null; if (/^[A-Z]{2,}$/.test(sent[i])) return null; const two = isWord(i + 1) && idx[low[i] + ' ' + low[i + 1]], three = isWord(i + 2) && idx[low[i] + ' ' + low[i + 1] + ' ' + low[i + 2]]; if (three) return { c: three, len: 3 }; if (two) return { c: two, len: 2 }; return idx[low[i]] ? { c: idx[low[i]], len: 1 } : null; };
    const prevWord = i => { for (let k = i - 1; k >= 0; k--) if (isWord(k) && !(info[k] && info[k].kind === 'fold')) return k; return -1; };
    const detBefore = i => { const p = prevWord(i); return p >= 0 && (DET.has(low[p]) || (info[p] && info[p].kind === 'a') || low[p] === 'of'); };
    // pass 1: tag every word
    let i = 0;
    while (i < n) {
      const found = look(i);
      if (!found) { i++; continue; }
      let cands = found.c;
      // noun or verb? "the work" is a noun, "they work" a verb
      const det = detBefore(i), subj = isWord(i - 1) && PRON[low[i - 1]], after = isWord(i + 1) ? low[i + 1] : '';
      if (det) cands = cands.filter(c => c.kind !== 'v').concat(cands.filter(c => c.kind === 'v'));
      else if (subj || (isWord(i - 1) && /^(to|will|shall|can|could|must|should|would|not|never|always|often|also)$/.test(low[i - 1]))) cands = cands.filter(c => c.kind === 'v').concat(cands.filter(c => c.kind !== 'v'));
      else if (cands.some(c => c.kind === 'v') && cands.some(c => c.kind === 'n') && /^(the|a|an|his|her|my|their|our|your)$/.test(after)) cands = cands.filter(c => c.kind === 'v').concat(cands.filter(c => c.kind !== 'v'));
      const c = cands[0];
      const prevW = isWord(i - 1) ? low[i - 1] : '', nextW = isWord(i + found.len) ? low[i + found.len] : '', prev2 = isWord(i - 2) ? low[i - 2] : '';
      const skipIt = () => { i += found.len; };
      const NOUNISH_PREP = /^(in|with|for|of|without|from|by|into|at|on|under|after|before|about)$/;
      // a verb used as a noun ("the work", "a walk") or as an adjective ("he was cross") stays English
      if (c.kind === 'v' && (/^(the|a|an|my|your|his|her|its|our|their|no)$/.test(prevW) || /'s$/.test(low[i - 1] || '') || NOUNISH_PREP.test(prevW) || (NOUNISH_PREP.test(prev2) && /^(great|deep|real|sudden|terrible|little|much|such)$/.test(prevW)))) { skipIt(); continue; }
      if (c.kind === 'v' && (c.feat.f === 'base' || c.feat.f === '3s') && /^(is|was|were|am|are|be|been|very|so|too|rather|quite|felt|seemed|looked|got|getting|grew)$/.test(prevW)) { skipIt(); continue; }
      if (c.kind === 'v' && c.feat.f === 'base' && /^(him|her|them|me|us|it|you)$/.test(prevW) && /^(make|made|makes|let|lets|help|helped|helps|watch|watched|saw|see|sees|heard|hear|hears|felt|feel|bid|bade)$/.test(prev2)) { skipIt(); continue; }
      // a noun used as a verb ("I hope", "we work") stays English
      if (c.kind === 'n' && /^(i|we|they|you|he|she|can|could|will|would|should|must|might|may|do|does|did|don't|didn't|won't|can't|cannot)$/.test(prevW)) { skipIt(); continue; }
      // words that are only safe in one use
      const lem = c.w.word;
      if (lem === 'sghir' && /^little$/.test(low[i]) && (nextW === '' || /^(more|less|bit|while|too|way|further|longer|better|closer|nearer|farther|by|of|as)$/.test(nextW) || /ly$/.test(nextW))) { skipIt(); continue; }   // "a little more"
      if (lem === 'kbir' && /^(great)$/.test(low[i]) && /^(deal|many|much)$/.test(nextW)) { skipIt(); continue; }
      if (lem === 'chaf' && /^(like|as|after|forward|up|out|round|around|down|back|well|ill|tired|sad|happy|pale|cross|surprised)$/.test(nextW)) { skipIt(); continue; }   // "look like", "looked tired"
      if (lem === 'akher' && /^(the|an)$/.test(prevW) && /^(day|night|time|week|year)$/.test(nextW)) { skipIt(); continue; }
      if (lem === 'bark' && /^(if|not)$/.test(prevW)) { skipIt(); continue; }
      if (low[i] === 'once' && nextW === 'upon') { skipIt(); continue; }   // "once upon a time" is not "one time"
      if (lem === 'ma' && /^(a|the|some|much|more|of)$/.test(prevW) === false && /^(water)$/.test(low[i]) === false) { skipIt(); continue; }
      if (c.kind === 'v' && c.feat.f === 'ing' && !(isWord(i - 1) && /^(is|are|am|was|were)$/.test(low[i - 1]))) { i++; continue; }   // "the running boy": leave it
      if (c.kind === 'v' && c.feat.f === 'pp' && isWord(i - 1) && /^(is|are|am|was|were|be|been|being|get|got)$/.test(low[i - 1])) { i++; continue; }   // passive: leave it
      info[i] = { kind: c.kind, w: c.w, feat: c.feat, len: found.len };
      for (let j = 1; j < found.len; j++) info[i + j] = { kind: 'fold' };
      i += found.len;
    }
    const copulaBefore = i => { for (let k = i - 1; k >= 0; k--) { if (!isWord(k)) return false; if (/^(is|are|am|was|were|be|been|become|became|seems|seemed)$/.test(low[k])) return true; if (info[k] && info[k].kind === 'v') return false; if (DET.has(low[k]) || (info[k] && info[k].kind === 'a') || low[k] === 'not' || low[k] === 'very') continue; return false; } return false; };
    // nouns: definite after "the" (and a possessive: my house → dari), number from the English
    for (let k = 0; k < n; k++) {
      const f = info[k]; if (!f || f.kind !== 'n') continue;
      f.pl = !!f.feat.pl; f.g = f.w.g || (/a$/.test(head(f.w)) ? 'f' : 'm');
      let q = prevWord(k);
      while (q >= 0 && (info[q] && info[q].kind === 'a' || /^(very|more|most|quite|little|big|old|young|good|bad|same|other)$/.test(low[q]))) q = prevWord(q);
      const pw = q >= 0 ? low[q] : '';
      if (pw === 'the') { f.def = true; info[q] = { kind: 'fold' }; }
      else if (pw === 'this' || pw === 'that' || pw === 'these' || pw === 'those') f.def = true;
      else if (POSS[pw] && !brk[k]) { f.poss = pw; info[q] = { kind: 'fold' }; }
      if (f.pl && /^(a|an|one)$/.test(pw)) f.pl = false;
    }
    // adjectives agree with the noun they go with: the next noun, or the subject of 'is'
    for (let k = 0; k < n; k++) {
      const f = info[k]; if (!f || f.kind !== 'a') continue;
      let m = -1;
      for (let j = k + 1; j < n && j <= k + 3; j++) { if (info[j] && info[j].kind === 'n') { m = j; break; } if (!isWord(j) || (info[j] && info[j].kind === 'v') || /^(is|are|was|were|of)$/.test(low[j])) break; }
      if (m < 0 && copulaBefore(k)) { for (let j = k - 1; j >= 0; j--) if (info[j] && info[j].kind === 'n') { m = j; break; } }
      if (m >= 0) { f.g = info[m].g; f.pl = info[m].pl; }
      else { f.g = 'm'; f.pl = /^(many|few|all|both|several)$/.test(low[k]) || (isWord(k + 1) && /s$/.test(low[k + 1]) && !/ss$/.test(low[k + 1]) && !info[k + 1]);
        if (copulaBefore(k)) { let j = k - 1; while (j >= 0 && !PRON[low[j]] && !/^[.;]$/.test(sent[j])) j--; if (j >= 0 && PRON[low[j]]) { f.pl = /^(we|they)$/.test(low[j]); if (low[j] === 'she') f.g = 'f'; } } }
    }
    // verbs: person from the subject, tense from the English form and the words before it
    let lastPers = '3s';
    const persOf = (j, def) => { const p = PRON[low[j]]; if (!p) return def; return low[j] === 'she' ? '3sf' : p; };
    for (let k = 0; k < n; k++) {
      const f = info[k]; if (!f || f.kind !== 'v') continue;
      const p1 = prevWord(k), w1 = p1 >= 0 ? low[p1] : '', p2 = prevWord(p1), w2 = p2 >= 0 ? low[p2] : '';
      const fm = f.feat.f;
      let pers = null;
      for (let j = k - 1; j >= 0; j--) {
        if (!isWord(j) && /["“”]/.test(sent[j])) { const nx = sent.slice(k + 1).find(x => /\w/.test(x)); pers = (nx && (nx.toLowerCase() === 'she' ? '3sf' : PRON[nx.toLowerCase()])) || '3s'; break; }
        if (!isWord(j)) { if (/^[,;:]$/.test(sent[j]) && pers) break; continue; }
        if (PRON[low[j]]) { pers = persOf(j, '3s'); break; }
        if (info[j] && info[j].kind === 'n') {
          let objOf = -1; for (let m = j - 1; m >= 0; m--) { if (!isWord(m)) { if (/^[.;:!?]$/.test(sent[m])) break; continue; } if (info[m] && info[m].kind === 'v') { objOf = m; break; } if (PRON[low[m]] || (info[m] && info[m].kind === 'n')) break; }
          if (objOf >= 0) { j = objOf + 1; continue; }   // "she ate the bread and drank": the bread is eaten, not drinking
          pers = info[j].pl ? '3p' : info[j].g === 'f' ? '3sf' : '3s'; if (/^(and)$/.test(low[prevWord(j)] || '')) pers = '3p'; break; }
        if (info[j] && info[j].kind === 'v') { pers = info[j].pers || null; break; }
        if (/^(is|was|has|does)$/.test(low[j])) { pers = '3s'; break; }
        if (/^(are|were)$/.test(low[j])) { pers = '3p'; break; }
      }
      if (!pers) { if (fm === '3s') pers = '3s'; else if (fm === 'base' && !/^(to|will|shall|can|could|must|should|would|do|did|does|not)$/.test(w1) && k > 0 && isWord(k - 1) && !PRON[w1]) pers = '3p'; else pers = lastPers; }
      if (fm === '3s' && pers !== '3sf') pers = '3s';
      let tense = 'pr';
      const glued = fm === 'base' && !sent.slice(p1 + 1, k).some(x => /[,;:!?"“”]/.test(x));
      const MODAL = /^(can|could|must|should|would|may|might|ought)$/, viaPron = glued && PRON[w1] && MODAL.test(w2);   // "can you help"
      if (glued && (w1 === 'to' || MODAL.test(w1) || viaPron || (w1 === 'not' && MODAL.test(w2)) || /^(wants?|wanted|able|like|likes|liked)$/.test(w1))) tense = 'inf';
      else if (w1 === 'will' || w1 === 'shall' || (w1 === 'not' && /^(will|shall)$/.test(w2))) tense = 'fu';
      else if (fm === 'past' || fm === 'pp' || (fm === 'base' && (w1 === 'did' || (w1 === 'not' && w2 === 'did')))) tense = 'pf';
      else if (fm === 'base' && k === 0 && (/[!]/.test(sent[n - 1]) || n <= 4) && !PRON[low[1] || '']) tense = 'imp';
      if (fm === 'base' && (w1 === "don't" || (w1 === 'not' && w2 === 'do'))) { tense = 'neg-imp'; info[p1] = { kind: 'fold' }; if (w1 === 'not') info[p2] = { kind: 'fold' }; }
      if (fm === 'base' && (w1 === 'did' || (w1 === 'not' && w2 === 'did'))) { tense = w1 === 'not' ? 'neg-pf' : 'pf'; info[w1 === 'did' ? p1 : p2] = { kind: 'fold' }; if (w1 === 'not') info[p1] = { kind: 'fold' }; }
      if (fm === 'base' && (w1 === 'will' || w1 === 'shall' || (w1 === 'not' && /^(will|shall)$/.test(w2)))) info[w1 === 'not' ? p2 : p1] = { kind: 'fold' };
      if (fm === 'ing' && /^(was|were|is|are|am)$/.test(w1)) info[p1] = { kind: 'fold' };
      if ((fm === 'pp' || fm === 'past') && /^(has|have|had)$/.test(w1)) info[p1] = { kind: 'fold' };
      if ((fm === 'pp' || fm === 'past') && w1 === 'not' && /^(has|have|had)$/.test(w2)) info[p2] = { kind: 'fold' };
      if (fm === 'ing' && /^(was|were)$/.test(w1)) tense = 'im';
      // can / could → ynajjem, must / should → lezem, in front of the verb in the present
      const hp = (w1 === 'not' || viaPron) ? p2 : p1, hw = low[hp] || '';
      if (tense === 'inf' && /^(can|could)$/.test(hw) && W.najjem) info[hp] = { kind: 'word', la: verb(W.najjem, hw === 'could' ? 'pf' : 'pr', pers), id: 'najjem', len: 1 };
      if (tense === 'inf' && /^(must|should|ought)$/.test(hw) && W.lezem) info[hp] = { kind: 'word', la: 'lezem', id: 'lezem', len: 1 };
      if (tense === 'inf' && w1 === 'to') info[p1] = { kind: 'fold' };
      f.pers = pers; f.tense = tense; lastPers = pers;
    }
    // is / are / am: Tunisian says nothing ("houwa kbir"); was / were → kan; has / have as the main verb → 3and-
    for (let k = 0; k < n; k++) {
      if (info[k] || !isWord(k) || !/^(was|were|has|have|had)$/.test(low[k])) continue;
      const nx = isWord(k + 1) ? low[k + 1] : '';
      if ((/ing$/.test(nx) || PASTPART[nx] || /ed$/.test(nx) || nx === 'being' || nx === 'been') && !(info[k + 1] && info[k + 1].kind === 'a')) continue;
      if (nx === 'not' && isWord(k + 2) && (/ing$/.test(low[k + 2]) || PASTPART[low[k + 2]] || /ed$/.test(low[k + 2]))) continue;
      if (/^(has|have|had)$/.test(low[k]) && (!nx || /^(to|been|not|never|no)$/.test(nx))) continue;
      const w1 = low[prevWord(k)] || '';
      let pers = w1 === 'she' ? '3sf' : PRON[w1] || (/^(are|were|have)$/.test(low[k]) && w1 !== 'there' ? '3p' : '3s');
      if (/^(are|were|have)$/.test(low[k]) && w1 === 'you') pers = '2s';
      if (!PRON[w1]) { const p = prevWord(k); if (p >= 0 && info[p] && info[p].kind === 'n') pers = info[p].pl ? '3p' : info[p].g === 'f' ? '3sf' : pers; }
      if (/^(was|were)$/.test(low[k])) info[k] = { kind: 'word', la: KAN[pers], id: 'kan', len: 1 };
      else info[k] = { kind: 'word', la: (low[k] === 'had' ? KAN[pers] + ' ' : '') + HAVE[pers], id: '3and' + { '1s': 'i', '2s': 'ek', '3s': 'ou', '3sf': 'ha', '1p': 'na', '2p': 'kom', '3p': 'hom' }[pers], len: 1 };
    }
    // small words with one Tunisian answer, numbers, "there is"
    for (let k = 0; k < n; k++) {
      if (info[k] || !isWord(k)) continue;
      if (low[k] === 'there' && /^(is|are|was|were)$/.test(low[k + 1] || '') && W.famma) { info[k] = { kind: 'word', la: /^(was|were)$/.test(low[k + 1]) ? 'kan famma' : 'famma', id: 'famma', len: 2 }; info[k + 1] = { kind: 'fold' }; continue; }
      if (low[k] === 'not' && /^(is|are|am)$/.test(low[k - 1] || '') && !(info[k + 1] && info[k + 1].kind === 'v')) { info[k] = { kind: 'word', la: 'mouch', id: 'mouch', len: 1 }; continue; }
      if (low[k] === 'not') continue;   // "not" with a verb is ma …ch, done in pass 2
      if (low[k] === 'to' || low[k] === 'for') {   // to the market → lel-souk (the article joins the l); to school → l mdrasa
        let m = k + 1; while (m < n && info[m] && info[m].kind === 'fold') m++;
        if (isWord(m) && info[m] && info[m].kind === 'n' && W.l) { if (info[m].def) { info[m].def = false; info[m].lel = true; info[k] = { kind: 'fold' }; } else info[k] = { kind: 'word', la: 'l', id: 'l', len: 1 }; }
        continue; }
      const s = SMALL[low[k]];
      if (s && W[s[1]]) { if (low[k] === 'you' && /^(are|were|have)$/.test(low[k + 1] || '')) { info[k] = { kind: 'word', la: 'enti', id: 'enti', len: 1 }; continue; } if (/^(i|you|he|she|we|they)$/.test(low[k]) && info[k + 1] && info[k + 1].kind === 'v') { info[k] = { kind: 'word', la: s[0], id: s[1], len: 1 }; continue; } info[k] = { kind: 'word', la: s[0], id: s[1], len: 1 }; continue; }
      if (NUMS[low[k]] && W[NUMS[low[k]]]) { info[k] = { kind: 'word', la: NUMS[low[k]], id: NUMS[low[k]], len: 1 }; continue; }
    }
    // pass 2: the forms
    const cap = (en, la) => /^[A-Z]/.test(en) && !/^[A-Z]/.test(la) ? la[0].toUpperCase() + la.slice(1) : la;
    for (let k = 0; k < n; k++) {
      const f = info[k]; if (!f) continue;
      let la = null, id = f.id || (f.w && f.w.word);
      if (f.kind === 'fold') { out[k].skip = true; continue; }
      if (f.kind === 'word') la = f.la;
      else if (f.kind === 'n') { la = noun(f.w, f.def, f.pl, f.poss); if (f.lel) la = 'l' + Forms.definite(la); }
      else if (f.kind === 'a') la = adj(f.w, f.g, f.pl);
      else if (f.kind === 'v') {
        if (f.tense === 'neg-imp') la = 'ma ' + verb(f.w, 'pr', '2s') + 'ch';
        else if (f.tense === 'neg-pf') la = 'ma ' + verb(f.w, 'pf', f.pers) + 'ch';
        else { la = verb(f.w, f.tense, f.pers); const p = prevWord(k); if (p >= 0 && low[p] === 'not' && !info[p]) { la = 'ma ' + la + 'ch'; info[p] = { kind: 'fold' }; out[p].skip = true; } }
      }
      else la = head(f.w);
      if (!la) continue;
      out[k].la = cap(sent[k], la); if (k > 0 && out[k - 1].skip && /^[A-Z]/.test(sent[k - 1])) out[k].la = cap(sent[k - 1], out[k].la); out[k].id = id; out[k].len = f.len || 1;
      for (let j = 1; j < (f.len || 1); j++) { out[k + j].skip = true; out[k + j].tail = true; }
    }
    // the English behind each Tunisian word, folded helpers included ("were walking", "did not find" → the verb's gloss)
    for (let k = 0; k < n; k++) {
      if (!out[k].la) continue;
      let a = k; while (a > 0 && out[a - 1].skip && !out[a - 1].la && !out[a - 1].tail) a--;
      out[k].gloss = sent.slice(a, k + (out[k].len || 1)).join(' ');
    }
    return out;
  }
  // the whole text → sentences of tokens { en, la, id }; `words` = the vocabulary in play
  function latinise(text, words) {
    const idx = build(words); idx.__words = Object.fromEntries(words.map(w => [w.word, w]));
    const isHeading = sx => { const a = sx[0].at, b = sx[sx.length - 1].at + sx[sx.length - 1].t.length, para = text.slice(a, b).trim();
      const ws = para.split(/\s+/), titled = ws.filter(w => /^[A-Z0-9]/.test(w)).length / ws.length >= .5;
      return /(^|\n\s*\n)\s*$/.test(text.slice(0, a)) && /^\s*(\n\s*\n|$)/.test(text.slice(b)) && para.length < 120 && (!/[.,;:!?]["'”’)]?$/.test(para) || /^(CHAPTER|Chapter|PART|Part|BOOK|Book)\b/.test(para) || (para.length < 50 && titled && !/["“”]/.test(para))); };
    return sentences(text).map(s => {
      const r = isHeading(s) ? s.map(x => ({ en: x.t, la: null, id: null })) : convert(s.map(x => x.t), idx, s.map((x, i) => i > 0 && /\n/.test(text.slice(s[i - 1].at + s[i - 1].t.length, x.at))));
      r.forEach((t, i) => { t.at = s[i].at; let a = i; while (a > 0 && r[a - 1].skip && !r[a - 1].la && !r[a - 1].tail) a--; t.from = s[a].at; t.to = s[i + (t.len || 1) - 1].at + s[i + (t.len || 1) - 1].t.length; });
      return r;
    }).filter(s => s.some(t => /[a-z]/i.test(t.en)));
  }

  // ---------- reading the photo on the phone ----------
  let lib = null;
  const script = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('could not load ' + src)); document.head.appendChild(s); });
  // the recogniser is loaded once and kept: warm() starts it in the background as soon as Snap a page opens, so the
  // ~6 MB of model files are on their way while the page is being framed, and the next photo needs no loading at all
  let wk = null, onLog = null;
  function warm() {
    if (!wk) {
      wk = (async () => {
        if (!window.Tesseract) await (lib = lib || script('ocr/tesseract.min.js'));
        const base = new URL('ocr', document.baseURI).href;
        return Tesseract.createWorker('eng', 1, { workerPath: base + '/worker.min.js', corePath: base, langPath: base, logger: m => onLog && onLog(m) });
      })();
      wk.catch(() => { wk = null; });
    }
    return wk;
  }
  async function ocr(file, progress) {
    progress('Getting the reader ready…', 0);
    onLog = m => { if (m.status === 'recognizing text') progress('Reading the words…', m.progress || 0); else if (/loading/.test(m.status)) progress('Getting the reader ready (only the first time)…', m.progress || 0); };
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('That picture could not be opened')); i.src = url; });
    const max = 1800, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    let worker;
    try {
      worker = await warm();
      const r = await worker.recognize(c);
      return pageText(r.data, c);
    } catch (err) { if (worker) { try { worker.terminate(); } catch (e) {} } wk = null; throw err; }
    finally { onLog = null; }
  }
  // the words of the page and nothing else. Real print reads at 80–97% confidence; the table under the paper, the
  // print showing through from the back and the shadows read as low-confidence scraps ("ae", "ik et", "rye c") off to
  // the side of the text. So each line keeps the run of confident words and only the near neighbours of that run;
  // a line with no confident word at all is dropped. Line breaks are kept for verse (most lines start with a
  // capital), a blank line between verses or paragraphs comes from the gap between the lines.
  const junk = t => !/[a-z]/i.test(t) ? !/^\d+$/.test(t) && !/^[.,;:!?'"“”‘’()-]+$/.test(t) : (!/[aeiouy]/i.test(t.replace(/[^a-z]/gi, '')) && t.replace(/[^a-z]/gi, '').length > 2) || /[_|\\~^<>{}\[\]#@*=+%£$€¢™©®]/.test(t);
  function pageText(data, c) {
    const lines = [];
    for (const li of data.lines || []) {
      let ws = (li.words || []).map(w => ({ t: (w.text || '').trim().replace(/^[_~^]+|[_~^]+$/g, ''), c: w.confidence, b: w.bbox })).filter(w => w.t);
      // a capital I is often read as a bar
      ws.forEach((w, i) => { if (w.t === '|' && w.c >= 60 && ws[i + 1] && /^[a-z]/i.test(ws[i + 1].t)) w.t = 'I'; });
      const anchor = w => !junk(w.t) && ((w.c >= 80 && /[a-z]{2,}/i.test(w.t)) || (w.c >= 88 && /^(I|a|A)$/.test(w.t)));
      const ai = ws.map((w, i) => anchor(w) ? i : -1).filter(i => i >= 0); if (!ai.length) continue;
      const hs = ai.map(i => ws[i].b.y1 - ws[i].b.y0).sort((x, y) => x - y), h = hs[hs.length >> 1];
      let lo = ai[0], hi = ai[ai.length - 1];
      const near = (a, b) => b.b.x0 - a.b.x1 < h * 1.3;
      while (lo > 0 && ws[lo - 1].c >= 55 && !junk(ws[lo - 1].t) && near(ws[lo - 1], ws[lo])) lo--;
      while (hi < ws.length - 1 && ws[hi + 1].c >= 55 && !junk(ws[hi + 1].t) && near(ws[hi], ws[hi + 1])) hi++;
      ws = ws.slice(lo, hi + 1).filter(w => !junk(w.t) && (w.c >= 35 || /^[.,;:!?]$/.test(w.t)));
      if (ws.some(w => /[a-z]{2,}/i.test(w.t))) lines.push({ ws, h, x0: ws[0].b.x0, x1: ws[ws.length - 1].b.x1, y0: Math.min(...ws.map(w => w.b.y0)), y1: Math.max(...ws.map(w => w.b.y1)) });
    }
    if (!lines.length) return { text: '', words: [], image: null, w: 0, h: 0 };
    // paragraphs by the gaps between lines
    const hs = lines.map(l => l.h).sort((x, y) => x - y), H = hs[hs.length >> 1];
    const paras = [[lines[0]]];
    for (let i = 1; i < lines.length; i++) { if (lines[i].y0 - lines[i - 1].y1 > H * .9) paras.push([]); paras[paras.length - 1].push(lines[i]); }
    const words = []; let text = '';
    paras.forEach((pl, pi) => {
      const caps = pl.filter(l => /^["'“‘(]?[A-Z]/.test(l.ws[0].t)).length, verse = pl.length >= 2 && caps / pl.length >= .6;
      const right = Math.max(...pl.map(l => l.x1)), width = right - Math.min(...pl.map(l => l.x0));
      pl.forEach((l, li) => {
        if (text) {
          if (li === 0) text += '\n\n';
          else { const prev = pl[li - 1], lastT = prev.ws[prev.ws.length - 1].t; text += verse || /-$/.test(lastT) || (/[.!?:"”]$/.test(lastT) && prev.x1 < right - width * .15) ? '\n' : ' '; }
        }
        l.ws.forEach((w, wi) => { if (wi) text += ' '; words.push({ t: w.t, at: text.length, x0: w.b.x0, y0: w.b.y0, x1: w.b.x1, y1: w.b.y1 }); text += w.t; });
      });
    });
    // crop the picture to the text, with a margin
    const mx = c.width * .03, my = c.height * .02;
    const X0 = Math.max(0, Math.min(...words.map(w => w.x0)) - mx), Y0 = Math.max(0, Math.min(...words.map(w => w.y0)) - my), X1 = Math.min(c.width, Math.max(...words.map(w => w.x1)) + mx), Y1 = Math.min(c.height, Math.max(...words.map(w => w.y1)) + my);
    const cc = document.createElement('canvas'); cc.width = Math.round(X1 - X0); cc.height = Math.round(Y1 - Y0); cc.getContext('2d').drawImage(c, X0, Y0, cc.width, cc.height, 0, 0, cc.width, cc.height);
    words.forEach(w => { w.x0 -= X0; w.x1 -= X0; w.y0 -= Y0; w.y1 -= Y0; });
    return { text, words, image: cc.toDataURL('image/jpeg', .85), w: cc.width, h: cc.height };
  }

  // an English meaning of another word, put into the same shape as a gloss ("were walking" → "were carrying"; "boys" → "farmers")
  function shapeLike(gloss, english, kind) {
    const base = english.replace(/\(.*?\)/g, '').trim().replace(/^to\s+/, ''); if (!base) return null;
    const ws = gloss.trim().split(/\s+/), last = ws[ws.length - 1].toLowerCase(), head = ws.slice(0, -1).join(' ');
    const bw = base.split(' '), b = bw[0], rest = bw.slice(1).join(' ');
    const cap = x => /^[A-Z]/.test(ws[0]) ? x[0].toUpperCase() + x.slice(1) : x;
    let f = b;
    const THIRD = { be: 'is', have: 'has', do: 'does', go: 'goes' }, PASTS = new Set([...Object.values(PAST), 'was', 'were', 'had', 'did']);
    const PP = Object.fromEntries(Object.entries(PASTPART).map(([pp, base]) => [base, pp]));   // base → past participle (see → seen)
    const helper = head.split(' ').pop();
    if (kind === 'v') {
      if (/ing$/.test(last)) f = ing(b);
      else if (/^(has|have|had|been)$/.test(helper) || (PASTPART[last] && PASTPART[last] !== last)) f = b === 'be' ? 'been' : (PP[b] || past(b));   // "has seen" → "has carried", "has given"
      else if (/ed$/.test(last) || PASTS.has(last)) f = b === 'be' ? (last === 'were' ? 'were' : 'was') : past(b);
      else if (last === 'am' || last === 'is' || last === 'are') f = b === 'be' ? last : last === 'are' ? b : (THIRD[b] || sfx(b));
      else if (/s$/.test(last) && !/ss$/.test(last) && !(head && /^(to|will|can|must|should|could)$/.test(head.split(' ').pop()))) f = THIRD[b] || sfx(b);
    } else if (kind === 'n') { if (/s$/.test(last) && !/ss$/.test(last) && last.length > 3) f = IRRPL[b] || sfx(b); }
    else return cap(base);   // little words: the other word's own meaning, whole
    const out = (head ? head + ' ' : '') + f + (rest ? ' ' + rest : '');
    return cap(out);
  }

  return { latinise, ocr, warm, noun, adj, verb, shapeLike };
})();
