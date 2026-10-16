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
  // a word that comes into focus is read, then read once more 2 s after the first reading ends (the 🔊 buttons read once);
  // a new word, or a tap on a button, cancels the pending repeat
  let last = 0, again = null, gen = 0;
  function play(text, done) {
    const f = cfg.audio && clip(text);
    if (f) { try { if (player) player.pause(); player = new Audio(cfg.audio + '/' + f); player.onended = done; player.play().catch(() => {}); return true; } catch (e) {} }
    if (!can()) return false;
    try {
      speechSynthesis.cancel();
      const spoken = cfg.script === 'chat-arabic' ? chatToArabic(text) : text;
      const u = new SpeechSynthesisUtterance(spoken);
      const v = voice(); if (v) u.voice = v; u.lang = v ? v.lang : cfg.lang; u.rate = cfg.rate || .9;
      u.onend = done; u.onerror = done;
      last = Date.now(); speechSynthesis.speak(u); keep = u;   // held, or Safari drops the utterance and its onend
      return true;
    } catch (e) { return false; }
  }
  let keep = null;
  function say(text, force) {
    if (!text || (!force && !on())) return false;
    clearTimeout(again); const g = ++gen;
    return play(text, () => { if (g !== gen || force) return; again = setTimeout(() => { if (g === gen) play(text, null); }, 2000); });
  }
  const stop = () => { clearTimeout(again); gen++; try { speechSynthesis.cancel(); } catch (e) {} if (player) try { player.pause(); } catch (e) {} };
  // a small speaker button: tap to hear the text the getter returns
  const button = (cls = '') => can() ? `<button class="speakbtn ${cls}" type="button" aria-label="Hear it" title="Hear it">🔊</button>` : '';
  const wire = (root, getText) => { if (!root) return; root.querySelectorAll('.speakbtn').forEach(b => { b.onclick = e => { e.stopPropagation(); say(getText(), true); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }; }); };
  // the on / off line for a settings area
  const toggleHTML = () => can() ? `<button class="linkbtn speakline" id="speakToggle">${on() ? '🔊 Reading words aloud — tap to turn off' : '🔇 Words are not read aloud — tap to turn on'}</button>` : '';
  const wireToggle = (root, after) => { const b = (root || document).querySelector('#speakToggle'); if (!b) return; b.onclick = () => { toggle(); b.outerHTML = toggleHTML(); wireToggle(root, after); if (after) after(on()); }; };
  return { say, stop, on, toggle, can, button, wire, toggleHTML, wireToggle, chatToArabic };
})();
