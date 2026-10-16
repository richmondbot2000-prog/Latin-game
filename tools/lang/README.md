# Adding a language

Every language game is a folder at the site root (`tounsi/` is the first) built on the Latin game's engine.
A new language needs these hand-written files in its folder:

- `lang.json` — code, name, flag, greeting, tagline, the level names, theme colour, text-to-speech settings.
- `words.txt` — the word list: `level | word | english | pos | options` (see the header of `tounsi/words.txt`).
- `forms.js` — `Forms.of(word)` → every form with its shape (`tounsi/forms.js` is the model).
- `grammar.js` — the language's half of the English → language converter (`tounsi/grammar.js`): the forms a
  sentence needs and the sentence rules; the English analysis comes from the Latin `snap.js` at build time.
- `sentences.txt` — sentences and stories by level (`tounsi/sentences.txt`), checked against the word list.
- `synonyms.txt` — spoken alternatives, optional.
- `theme.css` — the accent colour and any look of its own.
- `VERSION` — a number, bumped on every publish (it is the app version and the service-worker cache name).

Then `python3 tools/lang/build.py <folder>` writes `vocab.js`, `index.html`, `app.js`, `sw.js`,
`manifest.webmanifest`, `read.js`, `phrases.js`, `synonyms.js` and `snap.js` — never edit those by hand —
and add the language to `languages.json` so the home pages link to it. Rebuild after any change to the
Latin `app.js`, `sw.js` or `snap.js`. Test: `LANG_DIR=<folder> node tools/lang/tests/run.js "An English sentence."`
