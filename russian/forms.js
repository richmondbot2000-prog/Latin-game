// Russian: each word has one form here — its dictionary form; ar is the sound-it-out guide shown under it.
const Forms = (() => {
  const of = w => [{ la: w.show || w.word, shape: 'o', ar: w.ar }];
  return { of, pick: w => of(w)[0], definite: x => x, present: () => null, past: () => null, show: w => w.ar || '' };
})();
