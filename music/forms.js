// Learn the notes: a note has one form — itself. (The engine asks every language for its forms.)
const Forms = (() => {
  const of = w => [{ la: w.show || w.word, shape: 'o' }];
  return { of, pick: w => of(w)[0], definite: x => x, present: () => null, past: () => null, show: () => '' };
})();
