// Tunisian forms for the cards, built from each word's entry in vocab.js. Each form carries a 'shape' so the
// English can be put into the same person or number:
//   verbs: the present in six persons (v1s I, v2s you, v3s he/she, v1p we, v2p you, v3p they) from the "he does"
//          form (pres), and the past for I / she / they (p1s, p3s, p3p) from the "he did" headword;
//   nouns: the definite (ed-dar "the house", shape nd), the plural (dyar, n2) and the definite plural (ed-dyar, ndp);
//   adjectives: the feminine (kbira, adj) and the plural (kbar, adjp).
// The regular rules cover most verbs; vocab.js gives p1 (I did), ps (the past stem for she / they) and pp (they do)
// where a verb is irregular (7ab → 7abbit / 7abbet / y7ebbou; chaf → choft).
const Forms = (() => {
  const V = 'aeiou';
  const isV = ch => V.includes(ch);
  // the definite article assimilates to a "sun letter": ed-dar, es-souk, ech-chams, en-nar, but el-ktab, el-beb
  const SUN = ['ch', 'dh', 'th', 't', 'd', 'r', 'z', 's', 'n', 'l'];
  function definite(w) {
    if (/^(el |ed |es |ech |en |et |er |ez )/.test(w)) return w;
    for (const s of SUN) if (w.startsWith(s)) return 'e' + s + '-' + w;
    return 'el-' + w;
  }
  // the final consonant run of a stem and the vowel before it, for the "drop the short vowel" rule: khdem → khdmou
  function plural3(stem) {
    const m = stem.match(/^(.*?)([aeiou]+)([^aeiou]+)$/);   // … vowel(s) + final consonants
    if (!m) return stem + 'ou';
    const [, head, vow, tail] = m;
    const earlier = /[aeiou]/.test(head);                  // another vowel earlier in the stem: this one is short and drops
    if (earlier && vow.length === 1) return head + tail + 'ou';
    return stem + 'ou';
  }
  function present(w) {
    const pres = w.pres; if (!pres || !/^y/.test(pres)) return null;
    const rest = pres.slice(1);
    const plStem = w.pp ? w.pp.slice(1) : /i$/.test(rest) ? rest + 'w' : /a$/.test(rest) ? rest + 'w' : /ou$/.test(rest) ? rest + 'w' : plural3(rest);
    return { v1s: 'n' + rest, v2s: 't' + rest, v3s: pres, v1p: 'n' + plStem, v2p: 't' + plStem, v3p: 'y' + plStem };
  }
  // the past: mcha → mchit / mchet / mchaw; khdem → khdemt / khedmet / khedmou; chaf → choft / chafet / chafou
  function shifted(past) {
    // a vowel moves forward for she / they: khdem → khedm-, dkhal → dekhl-, 9a3ad → 9a3d-, kammal → kamml-
    const vs = past.match(/[aeiou]+/g) || [];
    if (vs.length >= 2) return past.replace(/[aeiou]+([^aeiou]+)$/, '$1');   // drop the last vowel: 9a3ad → 9a3d, kammal → kamml
    const m = past.match(/^([^aeiou]+)([aeiou]+)([^aeiou]+)$/); if (!m) return past;
    const [, c1, , c3] = m;
    const units = c1.match(/(ch|dh|th|kh|gh|.)/g);
    if (units.length >= 2) return units[0] + 'e' + units.slice(1).join('') + c3;   // khdem → khedm, chrab → cherb
    return past;   // chaf, 9al, jeb: unchanged
  }
  function past(w) {
    const p = w.word.replace(/\s*\(.*\)$/, ''), st = w.ps || null;
    let r;
    if (/a$/.test(p)) { const s = p.slice(0, -1); r = { p1s: w.p1 || s + 'it', p3s: s + 'et', p3p: s + 'aw' }; }
    else { const sh = st || shifted(p); r = { p1s: w.p1 || p + 't', p3s: sh + 'et', p3p: sh + 'ou' }; }
    r.p1p = r.p1s.replace(/t$/, 'na'); r.p2p = r.p1s + 'ou';   // mchit → mchina / mchitou, khdemt → khdemna / khdemtou
    return r;
  }
  // the same forms in Arabic script, from the spellings in vocab.js (ar = he did, arpres = he does, arp1 = I did, arps = the
  // past stem for she / they, arpp = they do): the script hides the short-vowel shifts, so the rules are simpler than above
  const AR = 'ال';
  function arPresent(w) {
    const pres = w.arpres; if (!pres || !pres.startsWith('ي')) return null;
    const rest = pres.slice(1);
    const plStem = w.arpp ? w.arpp.slice(1) : rest.endsWith('ى') ? rest.slice(0, -1) + 'او' : rest + 'و';   // ينسى → ينساو, يمشي → يمشيو, يخدم → يخدمو
    return { v1s: 'ن' + rest, v2s: 'ت' + rest, v3s: pres, v1p: 'ن' + plStem, v2p: 'ت' + plStem, v3p: 'ي' + plStem };
  }
  function arPast(w) {
    const p = w.ar; if (!p) return null;
    let r;
    if (/[اى]$/.test(p)) { const s = p.slice(0, -1); r = { p1s: w.arp1 || s + 'يت', p3s: s + 'ات', p3p: s + 'او' }; }
    else { const st = w.arps || p; r = { p1s: w.arp1 || p + 'ت', p3s: st + 'ت', p3p: st + 'و' }; }
    r.p1p = r.p1s.replace(/ت$/, 'نا'); r.p2p = r.p1s + 'و';
    return r;
  }
  const show = w => w.ar ? (w.pos === 'V' && w.arpres ? w.ar + ' / ' + w.arpres : w.ar) : '';
  function verb(w) {
    const out = [{ la: w.show || w.word, shape: 'o', ar: show(w) }];
    const pr = present(w); if (!pr) return out;
    const apr = arPresent(w) || {}, apa = arPast(w) || {};
    for (const k of ['v1s', 'v2s', 'v3s', 'v1p', 'v2p', 'v3p']) out.push({ la: pr[k], shape: k, ar: apr[k] || '' });
    const pa = past(w);
    for (const k of ['p1s', 'p3s', 'p3p', 'p1p', 'p2p']) out.push({ la: pa[k], shape: k, ar: apa[k] || '' });
    return out;
  }
  function noun(w) {
    const head = w.word.replace(/\s*\(.*\)$/, ''), out = [{ la: head, shape: 'n1', ar: w.ar || '' }];
    if (/^[A-Z]/.test(head) || /^(baba|ommi|khouya|bouya|rabbi)$/.test(head) || /^(ethnin|ethletha|larb3a|lekhmis)$/.test(head)) return out;
    const arDef = a => a ? (a.startsWith(AR) ? a : AR + a) : '';
    out.push({ la: definite(head), shape: 'nd', ar: arDef(w.ar) });
    if (w.pl && w.pl !== head) { out.push({ la: w.pl, shape: 'n2', ar: w.arpl || '' }); out.push({ la: definite(w.pl), shape: 'ndp', ar: arDef(w.arpl) }); }
    return out;
  }
  function adj(w) {
    const head = w.word, out = [{ la: head, shape: 'adj', ar: w.ar || '' }];
    if (w.f && w.f !== head) out.push({ la: w.f, shape: 'adj', ar: w.arf || '' });
    if (w.pl && w.pl !== head) out.push({ la: w.pl, shape: 'adjp', ar: w.arpl || '' });
    return out;
  }
  function of(w) {
    if (w.pos === 'N') return noun(w);
    if (w.pos === 'V') return verb(w);
    if (w.pos === 'Adj') return adj(w);
    return [{ la: w.show || w.word, shape: 'o', ar: w.ar || '' }];
  }
  // pick a form for a card: half the time the headword, otherwise any other form
  function pick(w) {
    const all = of(w);
    // a verb's card shows the "he does" form alone (yemchi); the list and the memo card show both forms (mcha / yemchi)
    if (all.length < 2 || Math.random() < .5) return w.pos === 'V' && w.pres ? { la: w.pres, shape: 'o', ar: w.arpres || '' } : { la: w.show || all[0].la, shape: 'o', ar: show(w) };
    return all[1 + Math.floor(Math.random() * (all.length - 1))];
  }
  return { of, pick, definite, present, past, show };
})();
