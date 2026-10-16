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
    for (const s of SUN) if (w.startsWith(s)) return 'e' + s[0] + '-' + w;
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
    if (/a$/.test(p)) { const s = p.slice(0, -1); return { p1s: w.p1 || s + 'it', p3s: s + 'et', p3p: s + 'aw' }; }
    const sh = st || shifted(p);
    return { p1s: w.p1 || p + 't', p3s: sh + 'et', p3p: sh + 'ou' };
  }
  function verb(w) {
    const out = [{ la: w.show || w.word, shape: 'o' }];
    const pr = present(w); if (!pr) return out;
    for (const k of ['v1s', 'v2s', 'v3s', 'v1p', 'v2p', 'v3p']) out.push({ la: pr[k], shape: k });
    const pa = past(w);
    for (const k of ['p1s', 'p3s', 'p3p']) out.push({ la: pa[k], shape: k });
    return out;
  }
  function noun(w) {
    const head = w.word.replace(/\s*\(.*\)$/, ''), out = [{ la: head, shape: 'n1' }];
    if (/^[A-Z]/.test(head) || /^(baba|ommi|khouya|bouya|rabbi)$/.test(head)) return out;
    out.push({ la: definite(head), shape: 'nd' });
    if (w.pl && w.pl !== head) { out.push({ la: w.pl, shape: 'n2' }); out.push({ la: definite(w.pl), shape: 'ndp' }); }
    return out;
  }
  function adj(w) {
    const head = w.word, out = [{ la: head, shape: 'adj' }];
    if (w.f && w.f !== head) out.push({ la: w.f, shape: 'adj' });
    if (w.pl && w.pl !== head) out.push({ la: w.pl, shape: 'adjp' });
    return out;
  }
  function of(w) {
    if (w.pos === 'N') return noun(w);
    if (w.pos === 'V') return verb(w);
    if (w.pos === 'Adj') return adj(w);
    return [{ la: w.show || w.word, shape: 'o' }];
  }
  // pick a form for a card: half the time the headword, otherwise any other form
  function pick(w) {
    const all = of(w);
    if (all.length < 2 || Math.random() < .5) return { la: w.show || all[0].la, shape: 'o' };
    return all[1 + Math.floor(Math.random() * (all.length - 1))];
  }
  return { of, pick, definite, present, past };
})();
