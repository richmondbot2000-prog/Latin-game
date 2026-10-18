// Grade 5 theory: pitches, keys, intervals, chords, and the question makers.
// A pitch is { l: letter 0-6 (C..B), a: accidental -2..2, o: octave } (middle C = C4).
// A question is { topic, kind, prompt, stave, options: [{ text } | { stave }], answer, explain, play, item }.
(function () {
  const LET = 'CDEFGAB';
  const NAT = [0, 2, 4, 5, 7, 9, 11];
  const ACC = { '-2': '♭♭', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' };
  const VFACC = { '-2': 'bb', '-1': 'b', 0: 'n', 1: '#', 2: '##' };
  const mod = (n, m) => ((n % m) + m) % m;
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const chance = p => Math.random() < p;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wpick = list => { let t = 0; for (const [, w] of list) t += w; let r = Math.random() * t; for (const [v, w] of list) { if ((r -= w) < 0) return v; } return list[0][0]; };

  const dia = p => p.o * 7 + p.l;
  const semi = p => p.o * 12 + NAT[p.l] + p.a;
  const midi = p => semi(p) + 12;
  const fromDia = (d, a = 0) => ({ l: mod(d, 7), a, o: Math.floor(d / 7) });
  const name = p => LET[p.l] + ACC[p.a];
  const vfKey = p => LET[p.l].toLowerCase() + (p.a === 0 ? '' : VFACC[p.a]) + '/' + p.o;
  const pc = s => ({ l: LET.indexOf(s[0]), a: s.slice(1) === '#' ? 1 : s.slice(1) === 'b' ? -1 : 0 });
  const samePc = (p, q) => p.l === q.l && p.a === q.a;
  const ORD = ['', 'unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave'];
  const ORDN = n => ORD[n];

  // Clefs: the diatonic number of the middle line
  const CLEF = {
    treble: { mid: 34, label: 'treble', ref: 'the middle line is B' },
    bass: { mid: 22, label: 'bass', ref: 'the middle line is D' },
    alto: { mid: 28, label: 'alto', ref: 'the middle line is middle C' },
    tenor: { mid: 26, label: 'tenor', ref: 'the second line from the top is middle C' },
  };
  // The grade being practised: each ABRSM grade adds to the ones below it
  let G = 5;
  const anyClef = () => wpick([['treble', 3], ['bass', 3], ['alto', G >= 4 ? 2 : 0], ['tenor', G >= 5 ? 1.5 : 0]]);
  const mainClef = () => wpick([['treble', 3], ['bass', 2]]);
  const RANGE = () => G === 1 ? 6 : 8;   // steps from the middle line: one or two ledger lines

  // Keys, up to six sharps or flats (the Grade 5 range)
  const MAJ = [['C', 0], ['G', 1], ['D', 2], ['A', 3], ['E', 4], ['B', 5], ['F#', 6], ['F', -1], ['Bb', -2], ['Eb', -3], ['Ab', -4], ['Db', -5], ['Gb', -6]];
  const MIN = [['A', 0], ['E', 1], ['B', 2], ['F#', 3], ['C#', 4], ['G#', 5], ['D#', 6], ['D', -1], ['G', -2], ['C', -3], ['F', -4], ['Bb', -5], ['Eb', -6]];
  const KEYS = MAJ.map(([t, f]) => ({ t: pc(t), minor: false, f, spec: t }))
    .concat(MIN.map(([t, f]) => ({ t: pc(t), minor: true, f, spec: t + 'm' })));
  const SHARPS = [3, 0, 4, 1, 5, 2, 6], FLATS = [6, 2, 5, 1, 4, 0, 3];
  function keyAccs(f) {
    const a = [0, 0, 0, 0, 0, 0, 0];
    if (f > 0) SHARPS.slice(0, f).forEach(l => a[l] = 1);
    if (f < 0) FLATS.slice(0, -f).forEach(l => a[l] = -1);
    return a;
  }
  // Grade 1: C G D F major; 2: up to 3 sharps/flats major, A E D minor; then 4, 5, 6 both
  const keyOk = k => G === 1 ? !k.minor && k.f >= -1 && k.f <= 2 : G === 2 ? Math.abs(k.f) <= (k.minor ? 1 : 3) : Math.abs(k.f) <= G + 1;
  const gKeys = () => KEYS.filter(keyOk);
  const keyName = k => name({ ...k.t, o: 0 }) + (k.minor ? ' minor' : ' major');
  const accWord = f => f === 0 ? 'no sharps or flats' : Math.abs(f) + (f > 0 ? ' sharp' : ' flat') + (Math.abs(f) > 1 ? 's' : '');
  // the scale of a key as pitch classes, degree 0..6 (minor = harmonic minor)
  function scalePcs(k, type) {
    const acc = keyAccs(k.f);
    const out = [];
    for (let i = 0; i < 7; i++) {
      const l = mod(k.t.l + i, 7);
      out.push({ l, a: acc[l] });
    }
    if (k.minor && type !== 'natural') out[6] = { ...out[6], a: out[6].a + 1 };
    if (k.minor && type === 'melodic') out[5] = { ...out[5], a: out[5].a + 1 };
    return out;
  }
  // place a pitch class in the octave that brings it nearest diatonic number d
  function near(p, d) {
    const o = Math.round((d - p.l) / 7);
    return { l: p.l, a: p.a, o };
  }
  // accidental to print before a note, given the key signature
  function shownAcc(p, f) {
    const k = keyAccs(f || 0)[p.l];
    return p.a === k ? null : VFACC[p.a];
  }
  const note = (p, f) => ({ key: vfKey(p), acc: shownAcc(p, f) });

  // Intervals
  function interval(p, q) {
    if (dia(q) < dia(p)) [p, q] = [q, p];
    const num = dia(q) - dia(p) + 1;
    const s = semi(q) - semi(p);
    const oct = Math.floor((num - 1) / 7);
    const sn = num - oct * 7;            // 1..7, or 8 when exactly an octave
    const base = NAT[sn - 1];
    const diff = s - oct * 12 - base;
    const perfect = [1, 4, 5, 8].includes(sn);
    const Q = perfect ? { '-1': 'diminished', 0: 'perfect', 1: 'augmented' } : { '-2': 'diminished', '-1': 'minor', 0: 'major', 1: 'augmented' };
    const qual = Q[diff];
    if (!qual) return null;
    const simple = sn === 1 && oct ? 'octave' : ORDN(sn);
    let nm;
    if (num === 8) nm = qual + ' octave';
    else if (oct && num <= 15) nm = 'compound ' + qual + ' ' + (sn === 1 ? 'octave' : simple);
    else nm = qual + ' ' + simple;
    return { num, sn, oct, qual, diff, perfect, name: nm, semis: s };
  }
  // the note an interval above (or below) p: num 2..15, diff from major/perfect
  function transpose(p, num, diff, down) {
    const d = dia(p) + (down ? -(num - 1) : num - 1);
    const sn = (num - 1) % 7 + 1, oct = Math.floor((num - 1) / 7);
    const s = semi(p) + (down ? -1 : 1) * (NAT[sn - 1] + oct * 12 + diff);
    const q = fromDia(d);
    q.a = s - (q.o * 12 + NAT[q.l]);
    return Math.abs(q.a) > 1 ? null : q;
  }

  // ---------- question makers ----------
  const stave = (clef, notes, o = {}) => ({ clef, notes, ...o });
  const W = notes => notes.map(n => ({ keys: [n.key], acc: [n.acc], dur: 'w' }));
  function opts(correct, wrong, n = 4) {
    const seen = new Set([correct]);
    const w = [];
    for (const x of wrong) { if (!seen.has(x) && w.length < n - 1) { seen.add(x); w.push(x); } }
    const all = shuffle([correct, ...w]);
    return { options: all.map(text => ({ text })), answer: all.indexOf(correct) };
  }
  function staveOpts(correct, wrong) {
    const all = shuffle([correct, ...wrong]);
    return { options: all.map(s => ({ stave: s })), answer: all.indexOf(correct) };
  }
  const randAcc = () => wpick([[0, 6], [1, 2], [-1, 2]]);
  const ordinalSteps = n => n === 1 ? 'one step' : n + ' steps';

  // 1. Name the note
  function qNoteName() {
    const clef = anyClef(), c = CLEF[clef];
    const R = RANGE();
    const p = fromDia(c.mid + rnd(2 * R + 1) - R, randAcc());
    const wrong = [];
    const asTreble = fromDia(dia(p) - c.mid + (clef === 'treble' ? CLEF.bass.mid : CLEF.treble.mid), p.a);
    wrong.push(name(asTreble));
    wrong.push(name(fromDia(dia(p) + 1, p.a)), name(fromDia(dia(p) - 1, p.a)));
    if (p.a) wrong.push(name({ ...p, a: 0 }));
    const st = dia(p) - c.mid;
    const where = st === 0 ? 'on the middle line' : ordinalSteps(Math.abs(st)) + (st > 0 ? ' above' : ' below') + ' the middle line';
    const midName = name(fromDia(c.mid));
    return {
      topic: 'notes', kind: 'name',
      prompt: `Name this note (${c.label} clef)`,
      stave: stave(clef, W([note(p)])),
      ...opts(name(p), shuffle(wrong)),
      explain: `In the ${c.label} clef the middle line is ${midName}${clef === 'alto' ? ' (middle C)' : ''}. This note is ${where}, so it is ${name(p)}.`,
      play: [[midi(p)]],
    };
  }

  // 2. Same pitch in another clef
  function qSamePitch() {
    const from = anyClef();
    let to = anyClef(); while (to === from) to = anyClef();
    const lo = Math.max(CLEF[from].mid, CLEF[to].mid) - 6, hi = Math.min(CLEF[from].mid, CLEF[to].mid) + 6;
    if (hi < lo) return qSamePitch();
    const p = fromDia(lo + rnd(hi - lo + 1), randAcc());
    const inRange = q => Math.abs(dia(q) - CLEF[to].mid) <= 9;
    const cands = [{ ...p, o: p.o + 1 }, { ...p, o: p.o - 1 }, fromDia(dia(p) + 1, p.a), fromDia(dia(p) - 1, p.a), fromDia(dia(p) + 2, p.a), fromDia(dia(p) - 2, p.a)].filter(inRange);
    const wrong = shuffle(cands).slice(0, 3).map(q => stave(to, W([note(q)]), { small: true }));
    return {
      topic: 'notes', kind: 'clef',
      prompt: `Which shows the same note, at the same pitch, in the ${to} clef?`,
      stave: stave(from, W([note(p)])),
      ...staveOpts(stave(to, W([note(p)]), { small: true }), wrong),
      explain: `The note is ${name(p)} ${octWord(p)}. In the ${to} clef ${CLEF[to].ref}.`,
      play: [[midi(p)]],
    };
  }
  function octWord(p) {
    const d = dia(p) - 28;
    if (d === 0) return '(middle C)';
    if (d > 0 && d < 7) return 'just above middle C';
    if (d < 0 && d > -7) return 'just below middle C';
    return d > 0 ? 'high above middle C' : 'well below middle C';
  }

  // 3. Enharmonic equivalents
  function qEnharmonic() {
    const clef = mainClef();
    const pool = [[0, 1], [1, 1], [3, 1], [4, 1], [5, 1], [1, -1], [2, -1], [4, -1], [5, -1], [6, -1], [2, 1], [6, 1], [0, -1], [3, -1]];
    const [l, a] = pick(pool);
    const p = near({ l, a }, CLEF[clef].mid);
    const s = semi(p);
    const eq = [fromDia(dia(p) + 1), fromDia(dia(p) - 1)].map(q => ({ ...q, a: s - (q.o * 12 + NAT[q.l]) })).filter(q => Math.abs(q.a) <= 1);
    const right = eq[0];
    const wrong = [name({ ...right, a: right.a + (right.a > 0 ? -1 : 1) }), name({ ...p, a: -p.a }), name(fromDia(dia(p) + (dia(right) > dia(p) ? -1 : 1), p.a)), name(fromDia(dia(p) + 2, -p.a))];
    return {
      topic: 'notes', kind: 'enh',
      prompt: 'Which note sounds exactly the same as this one?',
      stave: stave(clef, W([note(p)])),
      ...opts(name(right), wrong),
      explain: `${name(p)} and ${name(right)} are the same key on the piano: enharmonic equivalents.`,
      play: [[midi(p)]],
    };
  }

  // Grades 1-2: tone or semitone
  function qToneSemitone() {
    const clef = mainClef();
    for (let t = 0; t < 30; t++) {
      const lo = fromDia(CLEF[clef].mid - 4 + rnd(7), randAcc());
      const s = 1 + rnd(2);
      const hi = fromDia(dia(lo) + 1);
      hi.a = semi(lo) + s - (hi.o * 12 + NAT[hi.l]);
      if (Math.abs(hi.a) > 1) continue;
      const w = s === 1 ? 'semitone' : 'tone';
      return {
        topic: 'notes', kind: 'tone',
        prompt: 'Is this a tone or a semitone?',
        stave: stave(clef, W([note(lo), note(hi)])),
        ...opts(w, ['tone', 'semitone'], 2),
        explain: `From ${name(lo)} to ${name(hi)} is ${s === 1 ? 'one semitone: the very next key on the piano' : 'a tone: two semitones, with one key in between on the piano'}.` + (s === 1 && !lo.a && !hi.a ? ' E–F and B–C are the natural semitones.' : ''),
        play: [[midi(lo)], [midi(hi)]],
      };
    }
    return qNoteName();
  }
  // Grades 1-3: note and rest values
  const VALS = [['w', 'semibreve', 4, 1], ['h', 'minim', 2, 1], ['q', 'crotchet', 1, 1], ['8', 'quaver', .5, 1], ['16', 'semiquaver', .25, 1], ['hd', 'dotted minim', 3, 1], ['qd', 'dotted crotchet', 1.5, 1], ['8d', 'dotted quaver', .75, 2]];
  const beatsWord = n => ({ 4: '4', 3: '3', 2: '2', 1.5: '1½', 1: '1', .75: '¾', .5: '½', .25: '¼' }[n]);
  function qNoteValue() {
    const vals = VALS.filter(v => v[3] <= G);
    const v = pick(vals);
    const rest = !v[0].includes('d') && chance(.3);
    const nm = v[1] + (rest ? ' rest' : '');
    const st = stave('treble', [{ keys: ['b/4'], acc: [], dur: v[0] + (rest ? 'r' : '') }]);
    if (chance(.5)) {
      return {
        topic: 'time', kind: 'value',
        prompt: `What is this ${rest ? 'rest' : 'note'} called?`,
        stave: st,
        ...opts(nm, shuffle(vals.filter(x => x !== v)).sort((a, b) => Math.abs(a[2] - v[2]) - Math.abs(b[2] - v[2])).map(x => x[1] + (rest ? ' rest' : ''))),
        explain: `It is a ${nm}, worth ${beatsWord(v[2])} crotchet beat${v[2] === 1 ? '' : 's'}.` + (v[0].includes('d') ? ' A dot adds half the value again.' : ''),
      };
    }
    return {
      topic: 'time', kind: 'beats',
      prompt: `How many crotchet beats is this ${rest ? 'rest' : 'note'} worth?`,
      stave: st,
      ...opts(beatsWord(v[2]), shuffle(vals.filter(x => x[2] !== v[2])).sort((a, b) => Math.abs(a[2] - v[2]) - Math.abs(b[2] - v[2])).map(x => beatsWord(x[2]))),
      explain: `A ${nm} lasts ${beatsWord(v[2])} crotchet beat${v[2] === 1 ? '' : 's'}.` + (v[0].includes('d') ? ' A dot adds half the value again.' : ''),
    };
  }

  // 4. Key signatures
  function qKeySig() {
    const clef = anyClef();
    const k = pick(gKeys());
    const same = gKeys().filter(x => x.minor === k.minor && x.f !== k.f);
    const wrong = shuffle(same).sort((x, y) => Math.abs(Math.abs(x.f) - Math.abs(k.f)) - Math.abs(Math.abs(y.f) - Math.abs(k.f))).slice(0, 5);
    const rel = KEYS.find(x => x.f === k.f && x.minor !== k.minor);
    return {
      topic: 'keys', kind: 'sig',
      prompt: `Which ${k.minor ? 'minor' : 'major'} key has this key signature?`,
      stave: stave(clef, [], { key: k.spec }),
      ...opts(keyName(k), shuffle(wrong.slice(0, 3)).map(keyName)),
      explain: `${accWord(k.f)[0].toUpperCase() + accWord(k.f).slice(1)}: ${keyName(k)}` + ` (${k.minor ? 'relative major' : 'relative minor'}: ${keyName(rel)}).` + (k.f > 0 ? ' For sharps, the key is a semitone above the last sharp (major).' : k.f < -1 ? ' For flats, the major key is the last flat but one.' : ''),
      play: [chordMidis(k, 0)],
    };
  }
  function qKeySigReverse() {
    const clef = mainClef();
    const k = pick(gKeys().filter(x => x.f !== 0));
    let others = shuffle(gKeys().filter(x => x.minor === k.minor && x.f !== k.f && (Math.abs(x.f) === Math.abs(k.f) || Math.abs(x.f - k.f) === 1)));
    if (others.length < 3) others = others.concat(shuffle(gKeys().filter(x => x.minor === k.minor && x.f !== k.f && !others.includes(x))));
    return {
      topic: 'keys', kind: 'sigrev',
      prompt: `Which is the key signature of ${keyName(k)}?`,
      stave: null,
      ...staveOpts(stave(clef, [], { key: k.spec, small: true }), others.slice(0, 3).map(x => stave(clef, [], { key: x.spec, small: true }))),
      explain: `${keyName(k)} has ${accWord(k.f)}.`,
      play: [chordMidis(k, 0)],
    };
  }

  // 5. Scales and degrees
  const DEG = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading note'];
  function qScale() {
    const clef = mainClef();
    const k = pick(gKeys().filter(x => Math.abs(x.f) <= 5));
    const type = k.minor ? pick(['harmonic', 'melodic']) : 'major';
    const pcs = scalePcs(k, type);
    const start = near(pcs[0], CLEF[clef].mid - 3);
    const ps = [];
    for (let i = 0; i <= 7; i++) { const d = dia(start) + i; ps.push({ ...pcs[i % 7], o: Math.floor(d / 7) }); }
    const tn = name({ ...k.t, o: 0 });
    const labels = { major: tn + ' major', harmonic: tn + ' harmonic minor', melodic: tn + ' melodic minor (ascending)' };
    const correct = labels[type];
    const wrong = Object.values(labels).filter(x => x !== correct);
    const relMaj = KEYS.find(x => !x.minor && x.f === k.f);
    if (k.minor) wrong.push(name({ ...relMaj.t, o: 0 }) + ' major');
    else { const rm = KEYS.find(x => x.minor && x.f === k.f); wrong.push(name({ ...rm.t, o: 0 }) + ' harmonic minor'); }
    const why = {
      major: 'tones and semitones T T S T T T S: a major scale.',
      harmonic: `the 7th (${name(ps[6])}) is raised a semitone but the 6th (${name(ps[5])}) is not: harmonic minor.`,
      melodic: `going up, both the 6th (${name(ps[5])}) and the 7th (${name(ps[6])}) are raised: melodic minor.`,
    }[type];
    return {
      topic: 'scales', kind: 'scale',
      prompt: 'Which scale is this?',
      stave: stave(clef, ps.map(p => ({ keys: [vfKey(p)], acc: [p.a ? VFACC[p.a] : null], dur: 'q' }))),
      ...opts(correct, wrong),
      explain: `It starts on ${tn}; ${why}`,
      play: ps.map(p => [midi(p)]), gap: 0.32,
    };
  }
  function qDegree() {
    const clef = mainClef();
    const k = pick(gKeys().filter(x => Math.abs(x.f) <= 5));
    const pcs = scalePcs(k, 'harmonic');
    const i = rnd(7);
    const p = near(pcs[i], CLEF[clef].mid + rnd(7) - 3);
    const L = G >= 4 ? DEG : ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
    return {
      topic: 'scales', kind: 'degree',
      prompt: G >= 4 ? `In ${keyName(k)}, what is the technical name of this note?` : `In ${keyName(k)}, which degree of the scale is this note?`,
      stave: stave(clef, W([note(p, k.f)]), { key: k.spec }),
      ...opts(L[i], shuffle(L.filter((_, j) => j !== i)).sort((a, b) => Math.abs(L.indexOf(a) - i) - Math.abs(L.indexOf(b) - i))),
      explain: `Count up the scale of ${keyName(k)} from ${name(pcs[0])}: ${name(p)} is note ${i + 1}` + (G >= 4 ? `, the ${DEG[i]}.` : '.'),
      play: [chordMidis(k, 0), [midi(p)]],
    };
  }

  // 6. Intervals
  // Grades 1-3: the lower note is the tonic of a key (number only up to Grade 2)
  function qIntervalTonic() {
    const clef = mainClef();
    const k = pick(gKeys());
    const pcs = scalePcs(k, k.minor ? pick(['harmonic', 'melodic']) : 'major');
    const i = 1 + rnd(7);
    const lo = near(pcs[0], CLEF[clef].mid - 5 + rnd(3));
    const hi = { ...pcs[i % 7], o: Math.floor((dia(lo) + i) / 7) };
    const iv = interval(lo, hi);
    const num = i === 7 ? 'octave' : ORDN(i + 1);
    const letters = [];
    for (let d = dia(lo); d <= dia(hi); d++) letters.push(LET[mod(d, 7)]);
    let right, wrong;
    if (G < 3) {
      right = num;
      wrong = ['2nd', '3rd', '4th', '5th', '6th', '7th', 'octave'].filter(x => x !== num).sort((a, b) => Math.abs(ORD.indexOf(a) - i - 1) - Math.abs(ORD.indexOf(b) - i - 1) + Math.random() - .5);
    } else {
      right = iv.name;
      const all = [];
      for (let n = 2; n <= 8; n++) (n === 8 ? ['perfect octave'] : [4, 5].includes(n) ? ['perfect ' + ORDN(n)] : ['major ' + ORDN(n), 'minor ' + ORDN(n)]).forEach(x => all.push([x, n]));
      wrong = shuffle(all).sort((a, b) => Math.abs(a[1] - i - 1) - Math.abs(b[1] - i - 1)).map(x => x[0]);
    }
    return {
      topic: 'intervals', kind: 'ivtonic',
      prompt: G < 3 ? `What is the number of this interval? (${keyName(k)})` : `Name this interval (${keyName(k)})`,
      stave: stave(clef, W([note(lo, k.f), note(hi, k.f)]), { key: k.spec }),
      ...opts(right, wrong),
      explain: `Count the letter names ${letters.join(' ')}: ${letters.length === 8 ? 'an octave' : 'a ' + num}` + (G < 3 ? '.' : `. ${name(hi)} is ${iv.semis} semitones above ${name(lo)}, so it is a ${iv.name}.`),
      play: [[midi(lo)], [midi(hi)], [midi(lo), midi(hi)]],
    };
  }
  function qInterval() {
    if (G <= 3) return qIntervalTonic();
    const clef = mainClef(), c = CLEF[clef];
    for (let tries = 0; tries < 50; tries++) {
      const compound = G >= 5 && chance(.2);
      const num = compound ? 9 + rnd(4) : 2 + rnd(7);
      const sn = (num - 1) % 7 + 1;
      const perfect = [1, 4, 5, 8].includes(sn);
      const diff = num === 8 ? 0 : perfect ? wpick([[0, 6], [1, 2], [-1, 2]]) : wpick([[0, 3.5], [-1, 3.5], [1, 1.5], [-2, 1.5]]);
      const lo = fromDia(c.mid - 8 + rnd(Math.max(1, 17 - num)), randAcc());
      const hi = transpose(lo, num, diff, false);
      if (!hi || dia(hi) > c.mid + 9) continue;
      const iv = interval(lo, hi);
      if (!iv) continue;
      const wrong = [];
      const quals = perfect ? ['perfect', 'augmented', 'diminished'] : ['major', 'minor', 'augmented', 'diminished'];
      const pre = iv.oct ? 'compound ' : '';
      const simpleName = sn === 1 ? 'octave' : ORDN(sn);
      if (num === 8) wrong.push('major 7th', 'minor 7th', 'compound minor 2nd', 'perfect 5th');
      else quals.forEach(q => q !== iv.qual && wrong.push(pre + q + ' ' + simpleName));
      if (num !== 8) [sn - 1, sn + 1].filter(n => n >= 2 && n <= 7).forEach(n => {
        const qq = [1, 4, 5, 8].includes(n) ? (iv.qual === 'major' || iv.qual === 'minor' ? 'perfect' : iv.qual) : (iv.qual === 'perfect' ? pick(['major', 'minor']) : iv.qual);
        wrong.push(pre + qq + ' ' + ORDN(n));
      });
      const mp = { ...hi, a: hi.a - diff };
      const kind = perfect ? 'perfect' : 'major';
      const letters = [];
      for (let d = dia(lo); d <= dia(hi) && letters.length < 16; d++) letters.push(LET[mod(d, 7)]);
      const numWord = num <= 8 ? simpleName : `${num}th: an octave plus a ${simpleName}, so a compound ${simpleName}`;
      const ex = `Count the letter names ${letters.join(' ')}: a ${numWord}. A ${kind} ${simpleName} above ${name(lo)} is ${name(mp)}` + (iv.diff === 0 ? '.' : `, so ${name(hi)} makes it ${iv.qual}.`);
      return {
        topic: 'intervals', kind: 'iv',
        prompt: 'Name this interval',
        stave: stave(clef, W([note(lo), note(hi)])),
        ...opts(iv.name, shuffle(wrong.filter(Boolean))),
        explain: ex,
        play: [[midi(lo)], [midi(hi)], [midi(lo), midi(hi)]],
      };
    }
    return qNoteName();
  }

  // 7. Chords
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function chordPcs(k, deg) { const s = scalePcs(k, 'harmonic'); return [s[deg % 7], s[(deg + 2) % 7], s[(deg + 4) % 7]]; }
  function chordMidis(k, deg) {
    const [r, t, f] = chordPcs(k, deg);
    const base = near(r, 25);
    const ps = [base, near(t, dia(base) + 2), near(f, dia(base) + 4)];
    return ps.map(midi);
  }
  function voiceChord(k, deg, inv, around) {
    const pcs = chordPcs(k, deg);
    const order = [pcs[inv], pcs[(inv + 1) % 3], pcs[(inv + 2) % 3]];
    const steps = [[0, 2, 4], [0, 2, 5], [0, 3, 5]][inv];
    const b = near(order[0], around);
    return steps.map((s, i) => ({ ...order[i], o: Math.floor((dia(b) + s) / 7) }));
  }
  function chordSymbol(k, deg, inv) {
    const [r, t, f] = chordPcs(k, deg).map(p => ({ ...p, o: 4 }));
    const third = mod(semi(t) - semi(r), 12), fifth = mod(semi(f) - semi(r), 12);
    let s = name(r) + (fifth === 6 ? 'dim' : third === 3 ? 'm' : '');
    if (inv) s += '/' + name([r, t, f][inv]);
    return s;
  }
  const CHORD_KEYS = () => gKeys().filter(x => Math.abs(x.f) <= 4);
  // Grades 1-3: whose tonic triad is this?
  function qTonicTriad() {
    const clef = mainClef();
    const k = pick(gKeys());
    const ps = voiceChord(k, 0, 0, CLEF[clef].mid - 4 + rnd(3));
    const others = shuffle(gKeys().filter(x => x !== k)).sort((a, b) => (b.minor === k.minor) - (a.minor === k.minor));
    return {
      topic: 'chords', kind: 'triad',
      prompt: 'This is a tonic triad. Which key is it in?',
      stave: stave(clef, [{ keys: ps.map(vfKey), acc: ps.map(p => shownAcc(p, 0)), dur: 'w' }]),
      ...opts(keyName(k), others.map(keyName)),
      explain: `${ps.map(name).join('–')} are the 1st, 3rd and 5th notes of ${keyName(k)}: its tonic triad.`,
      play: [ps.map(midi)],
    };
  }
  // Grade 4: chords I, IV and V in root position
  function qPrimary() {
    const clef = mainClef();
    const k = pick(gKeys());
    const deg = pick([0, 3, 4]);
    const ps = voiceChord(k, deg, 0, CLEF[clef].mid - 4 + rnd(3));
    const tones = ps.map(name).join('–');
    return {
      topic: 'chords', kind: 'primary',
      prompt: `This chord is in ${keyName(k)}. Which chord is it?`,
      stave: stave(clef, [{ keys: ps.map(vfKey), acc: ps.map(p => shownAcc(p, k.f)), dur: 'w' }], { key: k.spec }),
      ...opts(ROMAN[deg], ['I', 'IV', 'V'], 3),
      explain: `${tones} is built on ${name(ps[0])}, note ${deg + 1} of ${keyName(k)}: chord ${ROMAN[deg]} (${['tonic', '', '', 'subdominant', 'dominant'][deg]}).`,
      play: [ps.map(midi)],
    };
  }
  function qChord() {
    const clef = mainClef();
    const k = pick(CHORD_KEYS());
    const deg = pick([0, 0, 1, 3, 4, 4]);
    const inv = rnd(3);
    const ps = voiceChord(k, deg, inv, CLEF[clef].mid - 4 + rnd(3));
    const label = ROMAN[deg] + 'abc'[inv];
    const wrong = [];
    for (const d of [0, 1, 3, 4]) for (let i = 0; i < 3; i++) if (d !== deg || i !== inv) wrong.push(ROMAN[d] + 'abc'[i]);
    const prefer = shuffle(wrong).sort((a, b) => score(b) - score(a));
    function score(w) { return (w[0] === label[0] && w.length === label.length ? 2 : 0) + (w.slice(-1) === label.slice(-1) ? 1 : 0) + Math.random(); }
    const tones = chordPcs(k, deg).map(p => name({ ...p, o: 0 }));
    const invWord = ['root position (the root, ' + tones[0] + ', is at the bottom)', 'first inversion (the 3rd, ' + tones[1] + ', is at the bottom)', 'second inversion (the 5th, ' + tones[2] + ', is at the bottom)'][inv];
    return {
      topic: 'chords', kind: 'chord',
      prompt: `This chord is in ${keyName(k)}. Which chord is it?`,
      stave: stave(clef, [{ keys: ps.map(vfKey), acc: ps.map(p => shownAcc(p, k.f)), dur: 'w' }], { key: k.spec }),
      ...opts(label, prefer),
      explain: `In ${keyName(k)}, chord ${ROMAN[deg]} is ${tones.join('–')}. It is in ${invWord}: ${label}.`,
      play: [ps.map(midi)],
    };
  }
  function qChordSymbol() {
    const clef = mainClef();
    const k = pick(CHORD_KEYS());
    const deg = pick([0, 3, 4, 4, 1]);
    const inv = rnd(3);
    const ps = voiceChord(k, deg, inv, CLEF[clef].mid - 4 + rnd(3));
    const right = chordSymbol(k, deg, inv);
    const wrong = [0, 1, 2].filter(i => i !== inv).map(i => chordSymbol(k, deg, i));
    wrong.push(chordSymbol(k, (deg + 4) % 7, inv), chordSymbol(k, (deg + 3) % 7, 0));
    const bass = name(ps[0]);
    return {
      topic: 'chords', kind: 'symbol',
      prompt: 'Which chord symbol fits this chord?',
      stave: stave(clef, [{ keys: ps.map(vfKey), acc: ps.map(p => shownAcc(p, k.f)), dur: 'w' }], { key: k.spec }),
      ...opts(right, wrong),
      explain: `The notes are ${chordPcs(k, deg).map(p => name({ ...p, o: 0 })).join('–')} with ${bass} at the bottom: ${right}` + (inv ? ` (the part after the slash is the bass note).` : '.'),
      play: [ps.map(midi)],
    };
  }
  function qCadence() {
    const clef = mainClef();
    const k = pick(CHORD_KEYS());
    const type = pick(['perfect', 'perfect', 'plagal', 'imperfect', 'imperfect']);
    const pair = type === 'perfect' ? [4, 0] : type === 'plagal' ? [3, 0] : [pick([0, 1, 3]), 4];
    const around = CLEF[clef].mid - 4;
    const c1 = voiceChord(k, pair[0], 0, around);
    let c2 = voiceChord(k, pair[1], 0, around);
    if (dia(c2[0]) - dia(c1[0]) > 3) c2 = c2.map(p => ({ ...p, o: p.o - 1 }));
    if (dia(c1[0]) - dia(c2[0]) > 3) c2 = c2.map(p => ({ ...p, o: p.o + 1 }));
    const ex = { perfect: 'V then I: a perfect cadence (it sounds finished).', plagal: 'IV then I: a plagal cadence (the "Amen").', imperfect: ROMAN[pair[0]] + ' then V: an imperfect cadence (it ends on V and sounds unfinished).' }[type];
    return {
      topic: 'chords', kind: 'cadence',
      prompt: `These two chords end a phrase in ${keyName(k)}. Which cadence is it?`,
      stave: stave(clef, [c1, c2].map(ps => ({ keys: ps.map(vfKey), acc: ps.map(p => shownAcc(p, k.f)), dur: 'w' })), { key: k.spec }),
      ...opts(type, ['perfect', 'plagal', 'imperfect'], 3),
      explain: ex,
      play: [c1.map(midi), c2.map(midi)], gap: 0.9,
    };
  }

  // 8. Time signatures and rhythm
  const TS = [
    ['2/4', 'simple duple'], ['3/4', 'simple triple'], ['4/4', 'simple quadruple'], ['2/2', 'simple duple'], ['3/2', 'simple triple'], ['4/2', 'simple quadruple'], ['3/8', 'simple triple'],
    ['6/8', 'compound duple'], ['9/8', 'compound triple'], ['12/8', 'compound quadruple'], ['6/4', 'compound duple'], ['9/4', 'compound triple'], ['6/16', 'compound duple'], ['12/16', 'compound quadruple'],
    ['5/4', 'irregular (5 beats)'], ['7/8', 'irregular (7 beats)'], ['5/8', 'irregular (5 beats)'], ['7/4', 'irregular (7 beats)'],
  ];
  const TS_G = { '2/4': 1, '3/4': 1, '4/4': 1, '2/2': 2, '3/2': 2, '4/2': 2, '3/8': 2, '6/8': 3, '9/8': 3, '12/8': 3, '6/4': 4, '9/4': 4, '6/16': 4, '12/16': 4, '5/4': 5, '7/8': 5, '5/8': 5, '7/4': 5 };
  const tsOk = t => TS_G[t] <= G;
  const BEATNAME = { 2: 'minim', 4: 'crotchet', 8: 'quaver', 16: 'semiquaver' };
  const DOTNAME = { 4: 'dotted minim', 8: 'dotted crotchet', 16: 'dotted quaver' };
  function qTimeKind() {
    if (G < 3) return qTimeMeaning();
    const [ts, kind] = pick(TS.filter(t => tsOk(t[0])));
    const [top, bot] = ts.split('/').map(Number);
    const all = [...new Set(TS.filter(t => tsOk(t[0])).map(t => t[1]))];
    const wrong = shuffle(all.filter(x => x !== kind)).sort((a, b) => (b.split(' ')[1] === kind.split(' ')[1] ? 1 : 0) - (a.split(' ')[1] === kind.split(' ')[1] ? 1 : 0) + (Math.random() - .5));
    let ex;
    if (kind.startsWith('irregular')) ex = `${top} beats can't be split evenly into twos or threes, so ${ts} is irregular (often grouped ${top === 5 ? '3+2 or 2+3' : '2+2+3 or 3+2+2'}).`;
    else if (kind.startsWith('compound')) ex = `A top number of 6, 9 or 12 means compound time: the ${BEATNAME[bot]}s go in threes, so ${top / 3} ${DOTNAME[bot]} beats a bar — ${kind}.`;
    else ex = `${top} ${BEATNAME[bot]} beats a bar: ${kind}.`;
    return {
      topic: 'time', kind: 'tskind',
      prompt: `What kind of time is ${ts}?`,
      stave: stave('treble', [], { time: ts }),
      ...opts(kind, wrong),
      explain: ex,
    };
  }
  // Grades 1-2: what a time signature means
  function qTimeMeaning() {
    const list = TS.filter(t => tsOk(t[0])).map(t => t[0]);
    const ts = pick(list);
    const [top, bot] = ts.split('/').map(Number);
    const mean = (a, b) => `${a} ${BEATNAME[b]} beats in a bar`;
    const wrong = shuffle(list.filter(x => x !== ts).map(x => mean(...x.split('/').map(Number))));
    wrong.unshift(mean(top, bot === 4 ? 2 : 4), mean(bot === 4 ? top + 1 : top, bot));
    return {
      topic: 'time', kind: 'tsmean',
      prompt: `What does the time signature ${ts} mean?`,
      stave: stave('treble', [], { time: ts }),
      ...opts(mean(top, bot), shuffle(wrong.slice(0, 4))),
      explain: `The top number says how many beats (${top}); the bottom number says what kind: ${bot} = ${BEATNAME[bot]}s.`,
    };
  }
  // a bar of rhythm, in semiquaver units
  const SIMPLE_BEAT = [[['q'], 3], [['8', '8'], 3], [['8d', '16'], 1.5], [['16', '16', '8'], 1], [['8', '16', '16'], 1], [['16', '16', '16', '16'], 1], [['qr'], 1]];
  const COMP_BEAT = [[['qd'], 3], [['q', '8'], 3], [['8', '8', '8'], 3], [['8d', '16', '8'], 1], [['16', '16', '8', '8'], 1], [['qdr'], 1]];
  const HALF_BEAT = [[['h'], 2], [['q', 'q'], 3], [['q', '8', '8'], 2], [['8', '8', 'q'], 1], [['hr'], .5]];
  const EIGHTH_BEAT = [[['8'], 3], [['16', '16'], 2], [['8r'], 1]];
  const RHY = { '2/4': [SIMPLE_BEAT, 2], '3/4': [SIMPLE_BEAT, 3], '4/4': [SIMPLE_BEAT, 4], '6/8': [COMP_BEAT, 2], '9/8': [COMP_BEAT, 3], '12/8': [COMP_BEAT, 4], '3/8': [EIGHTH_BEAT, 3], '2/2': [HALF_BEAT, 2], '3/2': [HALF_BEAT, 3], '5/4': [SIMPLE_BEAT, 5], '7/8': [null, 7] };
  const LEN = { '16': 1, '8': 2, '8d': 3, 'q': 4, 'qd': 6, 'h': 8, 'hd': 12, 'w': 16 };
  const lenOf = d => LEN[d.replace('r', '')];
  function qTimeBar() {
    const ts = pick(Object.keys(RHY).filter(tsOk));
    const [pat, beats] = RHY[ts];
    const groups = [];
    if (ts === '7/8') {
      for (const g of shuffle([[2, 2, 3], [3, 2, 2], [2, 3, 2]])[0]) groups.push(g === 2 ? pick([['8', '8'], ['q'], ['16', '16', '8']]) : pick([['8', '8', '8'], ['q', '8'], ['qd']]));
    } else {
      for (let b = 0; b < beats; b++) {
        if (pat === SIMPLE_BEAT && beats > 2 && b < beats - 1 && b % 2 === 0 && chance(.15)) { groups.push(['h']); b++; continue; }
        groups.push(wpick(pat));
      }
      if (groups.flat().every(d => d.endsWith('r'))) groups[0] = [pat === COMP_BEAT ? 'qd' : pat === HALF_BEAT ? 'h' : pat === EIGHTH_BEAT ? '8' : 'q'];
      if (groups[0][0].endsWith('r') && chance(.7)) groups[0] = [groups[0][0].replace('r', '')];
    }
    const total = groups.flat().reduce((t, d) => t + lenOf(d), 0);
    const totalOf = t => { const [a, b] = t.split('/').map(Number); return a * 16 / b; };
    const others = TS.map(t => t[0]).filter(t => tsOk(t) && totalOf(t) !== total);
    const close = shuffle(others).sort((a, b) => Math.abs(totalOf(a) - total) - Math.abs(totalOf(b) - total)).slice(0, 5);
    const [top, bot] = ts.split('/').map(Number);
    const compound = [6, 9, 12].includes(top) && bot === 8;
    const beam = ts === '3/8' ? [groups.flat()] : groups;
    return {
      topic: 'time', kind: 'tsbar',
      prompt: 'Which time signature fits this bar?',
      stave: stave('treble', [], { rhythm: beam }),
      ...opts(ts, shuffle(close.slice(0, 3))),
      explain: compound ? `The quavers are grouped in threes: ${top / 3} dotted-crotchet beats, which is ${ts}.`
        : ts === '7/8' ? 'Seven quavers grouped in twos and threes: 7/8, an irregular time.'
          : `The bar adds up to ${top} ${BEATNAME[bot]}s: ${ts}.`,
    };
  }

  // 9. Transposing instruments
  const INST = [
    { name: 'clarinet in B♭', num: 2, diff: 0, word: 'a major 2nd lower' },
    { name: 'trumpet in B♭', num: 2, diff: 0, word: 'a major 2nd lower' },
    { name: 'clarinet in A', num: 3, diff: -1, word: 'a minor 3rd lower' },
    { name: 'horn in F', num: 5, diff: 0, word: 'a perfect 5th lower' },
    { name: 'cor anglais (in F)', num: 5, diff: 0, word: 'a perfect 5th lower' },
  ];
  function qTranspose() {
    const ins = pick(INST);
    for (let t = 0; t < 40; t++) {
      const written = fromDia(CLEF.treble.mid - 3 + rnd(9), randAcc());
      const sounding = transpose(written, ins.num, ins.diff, true);
      if (!sounding || dia(sounding) < CLEF.treble.mid - 8) continue;
      const toWrite = chance(.4);
      const shown = toWrite ? sounding : written, right = toWrite ? written : sounding;
      const w = [transpose(shown, ins.num, ins.diff, !toWrite), transpose(shown, ins.num === 2 ? 3 : 2, ins.num === 2 ? -1 : 0, !toWrite), shown, transpose(shown, ins.num, ins.diff === 0 ? -1 : 0, !toWrite)]
        .filter(q => q && !(samePc(q, right) && q.o === right.o) && Math.abs(dia(q) - CLEF.treble.mid) <= 9);
      const uniq = []; for (const q of w) if (!uniq.some(u => samePc(u, q) && u.o === q.o)) uniq.push(q);
      if (uniq.length < 2) continue;
      return {
        topic: 'transpose', kind: toWrite ? 'write' : 'sound',
        prompt: toWrite ? `You want the ${ins.name} to sound this note. Which note does the player read?` : `A ${ins.name} plays this written note. Which note do you actually hear?`,
        stave: stave('treble', W([note(shown)])),
        ...staveOpts(stave('treble', W([note(right)]), { small: true }), uniq.slice(0, 3).map(q => stave('treble', W([note(q)]), { small: true }))),
        explain: `The ${ins.name} sounds ${ins.word} than written, so ${toWrite ? 'the part is written ' + ins.word.replace('lower', 'higher') + ': ' + name(sounding) + ' is written ' + name(written) : 'written ' + name(written) + ' sounds as ' + name(sounding)}.`,
        play: [[midi(sounding)]],
      };
    }
    return qNoteName();
  }

  // 10 & 11. Terms and instruments (fixed items, tracked one by one)
  function qTerm(prog) {
    const T = window.TERMS;
    const TG = T.filter(x => x.gr <= G);
    const t = weightedItem(TG, x => 'term:' + x.t, prog);
    const lang = { it: 'Italian', fr: 'French', de: 'German' }[t.l];
    const reverse = chance(.3);
    const pool = TG.filter(x => x.g !== t.g && x.m !== t.m);
    const sameLang = shuffle(pool.filter(x => x.l === t.l));
    const wrong = sameLang.concat(shuffle(pool)).slice(0, 6);
    if (reverse) {
      return {
        topic: 'terms', kind: 'termrev', item: 'term:' + t.t,
        prompt: `Which ${lang} word means “${t.m}”?`,
        ...opts(t.t, wrong.map(x => x.t)),
        explain: `${t.t} (${lang}): ${t.m}.`, say: { text: t.t, lang: t.l },
      };
    }
    return {
      topic: 'terms', kind: 'term', item: 'term:' + t.t,
      prompt: `What does the ${lang} word “${t.t}” mean?`,
      ...opts(t.m, wrong.map(x => x.m)),
      explain: `${t.t}: ${t.m}.` + (t.n ? ' ' + t.n : ''), say: { text: t.t, lang: t.l },
    };
  }
  function qFact(prog) {
    const F = window.FACTS;
    const f = weightedItem(F.filter(x => x.gr <= G), x => 'fact:' + x.q + x.a, prog);
    return {
      topic: 'instruments', kind: 'fact', item: 'fact:' + f.q + f.a,
      prompt: f.q,
      ...opts(f.a, shuffle(f.w)),
      explain: f.e || f.a + '.',
    };
  }
  // items you got wrong or have not seen come up more
  function weightedItem(list, key, prog) {
    const items = (prog && prog.items) || {};
    const now = Date.now();
    return wpick(list.map(x => {
      const s = items[key(x)];
      if (!s) return [x, 3];
      const age = (now - s.t) / 36e5;
      if (s.last === 0) return [x, age < .05 ? .2 : 6];
      return [x, Math.max(.2, 2 - s.r * .5) * Math.min(3, 1 + age / 48)];
    }));
  }

  // make: [question maker, weight, first grade, last grade]
  const TOPICS = [
    { id: 'notes', name: 'Notes & clefs', icon: '𝄞', make: [[qNoteName, 4], [qToneSemitone, 2, 1, 2], [qSamePitch, 2, 3], [qEnharmonic, 1.5, 4]] },
    { id: 'keys', name: 'Key signatures', icon: '♯', make: [[qKeySig, 3], [qKeySigReverse, 2]] },
    { id: 'scales', name: g => g < 2 ? 'Scales' : 'Scales & degrees', icon: '🎼', make: [[qScale, 2, 2], [qDegree, 2]] },
    { id: 'intervals', name: 'Intervals', icon: '↕', make: [[qInterval, 1]] },
    { id: 'chords', name: g => g < 4 ? 'Tonic triads' : g < 5 ? 'Chords' : 'Chords & cadences', icon: '🎹', make: [[qTonicTriad, 1, 1, 3], [qPrimary, 1, 4, 4], [qChord, 2.5, 5], [qChordSymbol, 1.5, 5], [qCadence, 1.5, 5]] },
    { id: 'time', name: 'Time & rhythm', icon: '⏱', make: [[qNoteValue, 2, 1, 3], [qTimeKind, 1.5], [qTimeBar, 2]] },
    { id: 'transpose', name: 'Transposing', icon: '🎺', make: [[qTranspose, 1, 5]] },
    { id: 'terms', name: 'Terms & signs', icon: '📖', make: [[qTerm, 1]] },
    { id: 'instruments', name: 'Instruments', icon: '🎻', make: [[qFact, 1, 4]] },
  ];
  const makers = (t, g) => t.make.filter(([, , lo = 1, hi = 5]) => g >= lo && g <= hi);
  // the topics of a grade, with that grade's names
  function topicsFor(g) {
    return TOPICS.filter(t => makers(t, g).length).map(t => ({ ...t, name: typeof t.name === 'function' ? t.name(g) : t.name }));
  }
  function make(topicId, prog, g) {
    G = g || 5;
    const t = TOPICS.find(x => x.id === topicId);
    const list = makers(t, G).map(([f, w]) => [f, w]);
    for (let i = 0; i < 5; i++) {
      try { const q = wpick(list)(prog); if (q && q.options && q.options.length >= 2) return q; } catch (e) { console.error(e); }
    }
    return qNoteName();
  }

  window.Theory = { TOPICS, topicsFor, make, interval, transpose, keyAccs, scalePcs, chordSymbol, KEYS, name, midi, dia, semi, fromDia, vfKey, chordPcs };
})();
