// Latin forms for the cards: nouns in singular and plural (nominative and accusative), adjectives in
// their genders and plurals, verbs through the present tense. Built from each word's dictionary entry
// in vocab.js. Each form carries a 'shape' so the English can be put into the same number or person.
const Forms = (() => {
  const cap = s => /^[A-Z]/.test(s);
  const stemOf = (w, head) => {          // the stem from the genitive in the dictionary entry
    const m = w.dict.match(/^([^,]+),\s*([^\s,]+)/); if (!m) return null;
    let gen = m[2].trim();
    if (gen.startsWith('-')) {           // '-ae', '-i', '-is': the headword with its ending swapped
      const e = gen.slice(1);
      if (e === 'ae') return head.slice(0, -1);
      if (e === 'i') return head.endsWith('us') || head.endsWith('um') ? head.slice(0, -2) : head;
      if (e === 'is') return head.replace(/is$/, '').replace(/es$/, '');
      if (e === 'ei') return head.slice(0, -2);
      return head;
    }
    return gen.replace(/(ae|is|ei|i)$/, '');
  };
  function noun(w) {
    const head = w.word.replace(/\s*\(.*\)$/, ''), d = w.pos, out = [{ la: head, shape: 'n1' }];
    const st = stemOf(w, head); if (!st) return out;
    const proper = cap(head);
    if (d === 'N1f' || d === 'N1m') { out.push({ la: st + 'am', shape: 'n1' }); if (!proper) out.push({ la: st + 'ae', shape: 'n2' }, { la: st + 'as', shape: 'n2' }); }
    else if (d === 'N2m') { out.push({ la: st + 'um', shape: 'n1' }); if (!proper) out.push({ la: st + 'i', shape: 'n2' }, { la: st + 'os', shape: 'n2' }); }
    else if (d === 'N2n') { if (!proper) out.push({ la: st + 'a', shape: 'n2' }); }
    else if (d === 'N3m' || d === 'N3f' || d === 'N3mf') { out.push({ la: st + 'em', shape: 'n1' }); if (!proper) out.push({ la: st + 'es', shape: 'n2' }); }
    else if (d === 'N3n') { if (!proper) out.push({ la: st + (/(e|al|ar)$/.test(head) ? 'ia' : 'a'), shape: 'n2' }); }
    else if (d === 'N5f' || d === 'N5m') { out.push({ la: st + 'em', shape: 'n1' }); if (!proper) out.push({ la: st + 'es', shape: 'n2' }); }
    return out;
  }
  function adj(w) {
    const head = w.word, out = [{ la: head, shape: 'adj' }];
    if (w.pos === 'Adj212' || w.pos === 'numo' || (w.pos === 'pro' && /-a, -um/.test(w.dict))) {
      let st;
      if (head.endsWith('us')) st = head.slice(0, -2);
      else if (head.endsWith('er')) { const fem = (w.dict.match(/,\s*-?(\w+),/) || [])[1] || ''; st = fem.includes('er') ? head : head.slice(0, -2) + 'r'; }
      else return out;
      out.push({ la: st + 'a', shape: 'adj' }, { la: st + 'um', shape: 'adj' }, { la: st + 'i', shape: 'adjp' }, { la: st + 'ae', shape: 'adjp' }, { la: st + 'a', shape: 'adjp' });
    } else if (w.pos === 'Adj3') {
      if (head.endsWith('is')) { const st = head.slice(0, -2); out.push({ la: st + 'e', shape: 'adj' }, { la: st + 'es', shape: 'adjp' }, { la: st + 'ia', shape: 'adjp' }); }
      else { const st = stemOf(w, head); if (st) out.push({ la: st + 'em', shape: 'adj' }, { la: st + 'es', shape: 'adjp' }); }
    }
    return out;
  }
  const IRREG_LA = { sum: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'], absum: ['absum', 'abes', 'abest', 'absumus', 'abestis', 'absunt'], adsum: ['adsum', 'ades', 'adest', 'adsumus', 'adestis', 'adsunt'],
    possum: ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'], 'eo (verb)': ['eo', 'is', 'it', 'imus', 'itis', 'eunt'], volo: ['volo', 'vis', 'vult', 'volumus', 'vultis', 'volunt'], nolo: ['nolo', 'non vis', 'non vult', 'nolumus', 'non vultis', 'nolunt'] };
  const PERSONS = ['v1s', 'v2s', 'v3s', 'v1p', 'v2p', 'v3p'];
  function verb(w) {
    const head = w.word, p = w.pos;
    let f = null;
    if (IRREG_LA[head]) f = IRREG_LA[head];
    else if (!head.endsWith('o')) return [{ la: head, shape: 'o' }];
    else {
      const st = head.slice(0, -1);
      if (p === 'V1') f = [head, st + 'as', st + 'at', st + 'amus', st + 'atis', st + 'ant'];
      else if (p === 'V2') f = [head, st + 's', st + 't', st + 'mus', st + 'tis', st + 'nt'];                 // teneo -> tenes
      else if (p === 'V3') f = [head, st + 'is', st + 'it', st + 'imus', st + 'itis', st + 'unt'];
      else if (p === 'V4') f = [head, st + 's', st + 't', st + 'mus', st + 'tis', st + 'unt'];                // audio -> audis, audiunt
      else if (p === 'Vm') f = [head, st.slice(0, -1) + 'is', st.slice(0, -1) + 'it', st.slice(0, -1) + 'imus', st.slice(0, -1) + 'itis', st + 'unt'];   // capio -> capis, capiunt
      else return [{ la: head, shape: 'o' }];
    }
    return f.map((la, i) => ({ la, shape: PERSONS[i] }));
  }
  function of(w) {
    if (/^N/.test(w.pos)) return noun(w);
    if (/^V/.test(w.pos)) return verb(w);
    if (/^Adj|^numo/.test(w.pos) || (w.pos === 'pro' && /-a, -um/.test(w.dict))) return adj(w);
    return [{ la: w.show || w.word, shape: 'o' }];
  }
  // pick a form for a card: half the time the headword, otherwise any other form
  function pick(w) {
    const all = of(w);
    if (all.length < 2 || Math.random() < .5) return { la: w.show || all[0].la, shape: 'o' };
    return all[1 + Math.floor(Math.random() * (all.length - 1))];
  }
  return { of, pick };
})();
