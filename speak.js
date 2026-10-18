/* Reading words aloud with the phone's own voices (the Web Speech API — nothing is sent to us). Each game's
   index.html sets LANG.tts: { lang: 'ar-TN', fallback: 'ar', script: 'chat-arabic', auto: true, rate: .85 }.
   script 'chat-arabic' turns the Latin-letter Tunisian (3aslema, khobz) into Arabic script first, since the
   Arabic voices read that; the Latin game uses an Italian voice, which comes close to church Latin.
   The setting (auto-read on / off) is shared by the games: latin.speak. Speak.say(text) reads a word or line when
   auto-read is on; Speak.say(text, true) always (the 🔊 buttons). */
const Speak = (() => {
  const cfg = (typeof LANG !== 'undefined' && LANG.tts) || {};
  const KEY = 'latin.speak';
  const can = () => (typeof speechSynthesis !== 'undefined' && !!cfg.lang) || !!cfg.audio;
  const on = () => { if (!can()) return false; const v = store.get(KEY, null); return v == null ? !!cfg.auto : !!v; };
  const toggle = () => { store.set(KEY, !on()); return on(); };
  let voices = [];
  const load = () => { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } };
  if (typeof speechSynthesis !== 'undefined') { load(); try { speechSynthesis.onvoiceschanged = load; } catch (e) {} }
  const voice = () => {
    if (!voices.length) load();
    const want = (cfg.lang || '').toLowerCase(), fb = (cfg.fallback || want.split('-')[0]).toLowerCase();
    return voices.find(v => v.lang.toLowerCase().replace('_', '-') === want) || voices.find(v => v.lang.toLowerCase().startsWith(fb)) || null;
  };
  // the chat alphabet → Arabic script: digraphs and the numerals first, then letter by letter; the article el-/ed-/ech-
  // becomes ال (the voice assimilates the sun letter itself); a short e is not written, an initial one is an alif
  const DI = { kh: 'خ', gh: 'غ', ch: 'ش', sh: 'ش', th: 'ث', dh: 'ذ', ou: 'و', ee: 'ي', aa: 'ا' };
  const ONE = { 3: 'ع', 7: 'ح', 9: 'ق', 5: 'خ', 8: 'غ', 2: 'ء', a: 'ا', i: 'ي', o: 'و', u: 'و', b: 'ب', t: 'ت', j: 'ج', d: 'د', r: 'ر', z: 'ز', s: 'س', f: 'ف', k: 'ك', l: 'ل', m: 'م', n: 'ن', h: 'ه', w: 'و', y: 'ي', q: 'ق', g: 'ڨ', p: 'ب', v: 'ڤ', c: 'ك', x: 'كس', e: '' };
  function chatToArabic(text) {
    return text.toLowerCase().split(/\s+/).map(word => {
      let w = word.replace(/[^a-z0-9'-]/g, ''), out = '';
      const art = w.match(/^e(l|d|t|r|z|s|n|ch|dh|th)-(.+)$/); if (art) { out = 'ال'; w = art[2]; }
      else if (w.startsWith('l') && /^l(e[dtsrznl]|ech|edh|eth)-/.test(w)) { out = 'لل'; w = w.replace(/^le?[a-z]{1,2}-/, ''); }   // les-souk, led-dar
      w = w.replace(/-/g, '').replace(/([^aeiou])\1/g, '$1');   // a doubled consonant is one letter (the voice needs no shadda)
      // a short a / e / o / u is not written (khobz → خبز, kalb → كلب); a is written when it is the word's only vowel
      // before a single final consonant (dar → دار), at the end (mcha → مشا) or at the start (ana → انا)
      const vowels = (w.match(/[aeiou]/g) || []).length, longA = vowels === 1 && /^[^aeiou]*a[^aeiou]$/.test(w);
      for (let i = 0; i < w.length; i++) {
        const two = w.slice(i, i + 2);
        if (DI[two]) { out += DI[two]; i++; continue; }
        const ch = w[i];
        if (ch === 'a') { out += (i === 0 || i === w.length - 1 || longA) ? 'ا' : ''; continue; }
        if (ch === 'e' || ch === 'o' || ch === 'u') { out += i === 0 ? 'ا' : ''; continue; }
        if (ch === "'") continue;
        out += ONE[ch] !== undefined ? ONE[ch] : ch;
      }
      return out;
    }).join(' ');
  }
  // recorded clips: LANG.tts.audio names a folder with index.json ({ "word or form": "file.mp3" }); a text in it is
  // played from the file (one player at a time), anything else goes to the synthetic voice
  let clips = null, player = null;
  if (cfg.audio) fetch(cfg.audio + '/index.json').then(r => r.ok ? r.json() : {}).then(j => { clips = j; }).catch(() => { clips = {}; });
  const clip = text => { const k = text.trim().toLowerCase().replace(/[.,;:!?"]/g, ''); return clips && (clips[k] || clips[text.trim()]) || null; };
  // clips are fetched ahead of time: the service worker keeps every clip it has fetched once, so a word that has been
  // primed plays at once. prime(text) fetches one clip; warm(texts) fetches a list in the background, a few at a time
  const primed = new Set();
  const prime = text => { busyUntil = Date.now() + 2000; const f = cfg.audio && text && clip(text); if (!f || primed.has(f)) return; primed.add(f); try { fetch(cfg.audio + '/' + f, { credentials: 'same-origin' }).catch(() => primed.delete(f)); } catch (e) {} };
  let warmQ = [], warming = false, busyUntil = 0;
  const warm = texts => {
    if (!cfg.audio) return;
    const t0 = Date.now(), tick = () => { if (clips) go(); else if (Date.now() - t0 < 10000) setTimeout(tick, 300); };
    const go = () => { const first = []; for (const t of texts) { const f = t && clip(t); if (f && !primed.has(f)) first.push(f); } warmQ.unshift(...first); pump(); };   // the level's words go to the front of the queue
    tick();
  };
  // The whole library is downloaded in the background, so every clip is on the phone before it is needed: one at
  // a time, starting a few seconds after the page opens, with a pause between clips that have to come from the
  // network and none for ones already saved; the card's own clip (prime) and a beast picture always go first.
  // Once every file is in, a note in localStorage skips the pass on later visits (until the index grows).
  const DONE_KEY = 'latin.clips.' + (cfg.audio || '');
  const warmAll = () => {
    if (!cfg.audio || typeof caches === 'undefined') return;
    const t0 = Date.now(), tick = () => { if (clips) go(); else if (Date.now() - t0 < 15000) setTimeout(tick, 500); };
    const go = () => {
      const files = [...new Set(Object.values(clips))]; if (!files.length) return;
      let done = null; try { done = localStorage.getItem(DONE_KEY); } catch (e) {}
      if (done === String(files.length)) return;
      for (const f of files) if (!primed.has(f)) warmQ.push(f);
      warmQ.push({ end: files.length }); pump();
    };
    setTimeout(tick, 4000);
  };
  const pump = () => {
    if (warming || !warmQ.length) return;
    if (Date.now() < busyUntil) { setTimeout(pump, busyUntil - Date.now()); return; }
    warming = true; const f = warmQ.shift();
    if (f && f.end) { try { localStorage.setItem(DONE_KEY, String(f.end)); } catch (e) {} warming = false; pump(); return; }
    const url = cfg.audio + '/' + f, t0 = Date.now();
    const go = !f || primed.has(f) ? Promise.resolve(true) : caches.match(url).then(hit => hit ? true : (primed.add(f), fetch(url, { credentials: 'same-origin' }).then(() => false, () => { primed.delete(f); return false; })));
    go.then(saved => { if (saved) primed.add(f); warming = false; if (warmQ.length) setTimeout(pump, saved || Date.now() - t0 < 120 ? 15 : 600); });
  };
  if (typeof document !== 'undefined' && typeof localStorage !== 'undefined' && location.hostname !== '127.0.0.1' && location.hostname !== 'localhost') warmAll();
  // a word that comes into focus is read, then read once more 2 s after the first reading ends (the 🔊 buttons read once);
  // a new word, or a tap on a button, cancels the pending repeat
  let last = 0, again = null, gen = 0;
  // mode: 'synth' makes the phone's voice read even when a clip exists — the 2 s repeat uses whatever the first
  // reading used, so a word is never heard in two different voices
  let lastSynth = false;
  function play(text, done, mode) {
    const f = mode !== 'synth' && cfg.audio && clip(text);
    lastSynth = !f;
    if (f) {
      busyUntil = Date.now() + 2500;
      // the clip plays if it is ready within 1.5 s; on a slow connection the phone's own voice reads the word instead
      // and the clip keeps downloading, so it is there next time
      try {
        if (player) player.pause();
        const a = player = new Audio(cfg.audio + '/' + f); a.preload = 'auto'; a.onended = done;
        let ok = false, gaveUp = false;
        const start = () => { if (ok || gaveUp) return; ok = true; a.play().catch(() => {}); };
        a.addEventListener('canplaythrough', start); a.addEventListener('loadeddata', start);
        const g = gen;
        setTimeout(() => { if (ok || g !== gen) return; gaveUp = true; lastSynth = true; try { a.pause(); } catch (e) {} if (player === a) player = null; prime(text); synth(text, done); }, 1500);
        a.load();
        return true;
      } catch (e) {}
    }
    return synth(text, done);
  }
  function synth(text, done) {
    if (!can() || !cfg.lang || typeof speechSynthesis === 'undefined') { if (done) done(); return false; }
    try {
      speechSynthesis.cancel();
      const spoken = cfg.script === 'chat-arabic' ? chatToArabic(text) : text;
      const u = new SpeechSynthesisUtterance(spoken);
      const v = voice(); if (v) u.voice = v; u.lang = v ? v.lang : cfg.lang; u.rate = cfg.rate || .9;
      let started = false, ended = false;
      const finish = () => { if (ended) return; ended = true; if (done) done(); };
      u.onstart = () => { started = true; };
      u.onend = finish; u.onerror = finish;
      last = Date.now(); speechSynthesis.speak(u); keep = u;   // held, or Safari drops the utterance and its onend
      const g = gen;
      setTimeout(() => {   // nothing started: Safari dropped it (a cancel just before, or the voice still waking) — say it once more
        if (started || ended || g !== gen) return;
        try { speechSynthesis.cancel(); const u2 = new SpeechSynthesisUtterance(spoken); if (v) u2.voice = v; u2.lang = u.lang; u2.rate = u.rate; u2.onend = finish; u2.onerror = finish; speechSynthesis.speak(u2); keep = u2; } catch (e) { finish(); }
      }, 1000);
      return true;
    } catch (e) { return false; }
  }
  let keep = null;
  // iPhone: Safari only starts the voice inside a tap, and in Jacques Hammer and Squishygeddon the words come up
  // seconds after the last tap. The first tap on any screen says a silent utterance, which unlocks the voice for
  // the rest of the visit; a reading that Safari still drops (no start within a second) is tried once more.
  let unlocked = false;
  function unlock() {
    if (unlocked || typeof speechSynthesis === 'undefined' || !cfg.lang) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = cfg.lang; speechSynthesis.speak(u); unlocked = true; } catch (e) {}
  }
  if (typeof document !== 'undefined') for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) document.addEventListener(ev, unlock, { capture: true, passive: true });
  function say(text, force) {
    if (!text || (!force && !on())) return false;
    clearTimeout(again); const g = ++gen;
    return play(text, () => { if (g !== gen || force) return; const same = lastSynth ? 'synth' : 'clip'; again = setTimeout(() => { if (g === gen) play(text, null, same); }, 2000); });
  }
  const stop = () => { clearTimeout(again); gen++; try { speechSynthesis.cancel(); } catch (e) {} if (player) try { player.pause(); } catch (e) {} };
  // a small speaker button: tap to hear the text the getter returns
  const button = (cls = '') => can() ? `<button class="speakbtn ${cls}" type="button" aria-label="Hear it" title="Hear it">🔊</button>` : '';
  const wire = (root, getText) => { if (!root) return; root.querySelectorAll('.speakbtn').forEach(b => { b.onclick = e => { e.stopPropagation(); say(getText(), true); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }; }); };
  // the on / off line for a settings area
  const LABELS = cfg.toggle || ['🔊 Reading words aloud — tap to turn off', '🔇 Words are not read aloud — tap to turn on'];   // a game's own wording (Learn the notes: playing each note)
  const toggleHTML = () => can() ? `<button class="linkbtn speakline" id="speakToggle">${on() ? LABELS[0] : LABELS[1]}</button>` : '';
  const wireToggle = (root, after) => { const b = (root || document).querySelector('#speakToggle'); if (!b) return; b.onclick = () => { toggle(); b.outerHTML = toggleHTML(); wireToggle(root, after); if (after) after(on()); }; };
  return { say, stop, on, toggle, can, button, wire, toggleHTML, wireToggle, chatToArabic, prime, warm, warmAll };
})();
