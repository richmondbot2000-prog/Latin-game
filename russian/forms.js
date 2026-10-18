// Russian: each word has one form here — its dictionary form, in the English alphabet; ar is the Cyrillic shown small underneath.
const Forms = (() => {
  const of = w => [{ la: w.show || w.word, shape: 'o', ar: w.ar }];
  return { of, pick: w => of(w)[0], definite: x => x, present: () => null, past: () => null, show: w => w.ar || '' };
})();
