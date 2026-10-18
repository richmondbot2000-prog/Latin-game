// A small piano made in the browser (Web Audio): nothing is downloaded.
(function () {
  let ac, wave, out;
  function ctx() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const n = 16, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) im[i] = Math.pow(i, -1.6) * (i % 2 ? 1 : .55);
      wave = ac.createPeriodicWave(re, im);
      out = ac.createDynamicsCompressor();
      out.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(m, t, len, vel) {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.setPeriodicWave(wave); o.frequency.value = f;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(12000, f * 9), t); lp.frequency.exponentialRampToValueAtTime(Math.min(8000, f * 2.5), t + .6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + .008);
    g.gain.exponentialRampToValueAtTime(vel * .35, t + .35);
    g.gain.exponentialRampToValueAtTime(.0008, t + len + 1.2);
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + len + 1.3);
  }
  let token = 0;
  // seq = [[midi, midi…], …] played one after another
  function play(seq, gap) {
    if (!seq || !seq.length || !Sound.on) return;
    const c = ctx(); token++;
    let t = c.currentTime + .05;
    const step = gap || (seq.length > 4 ? .35 : .75);
    for (const ch of seq) {
      const vel = .32 / Math.sqrt(ch.length);
      ch.forEach(m => tone(m, t, step, vel));
      t += step;
    }
  }
  function blip(ok) {
    if (!Sound.on) return;
    const c = ctx(), t = c.currentTime + .02;
    (ok ? [76, 83] : [52]).forEach((m, i) => tone(m, t + i * .09, .12, ok ? .12 : .1));
  }
  // read a term aloud with the phone's own voice
  function say(text, lang) {
    if (!Sound.on || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.replace(/, ed$/, ''));
    u.lang = { it: 'it-IT', fr: 'fr-FR', de: 'de-DE' }[lang] || 'en-GB';
    const v = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').startsWith(u.lang.slice(0, 2)));
    if (v) u.voice = v;
    u.rate = .9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  window.Sound = { on: true, play, blip, say, unlock: ctx };
})();
