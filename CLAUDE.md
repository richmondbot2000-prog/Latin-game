# CLAUDE.md — Latin game

A Latin learning game, built by a father for his daughter. Public site at
**https://latin.musicalmagic.uk**, served by GitHub Pages from `main`.

## Non-negotiables

- **The repo is PUBLIC.** Everything in it is readable by anyone. Never commit a
  token, a key, or anything personal — and that includes **the daughter's name,
  age, school or photograph**. The game must be good without knowing who is
  playing it. Progress lives in `localStorage`. Cloud sync (see below) stores
  stars and levels only, under a random per-player sync code — never a name.
- Players pick their face on a profile screen, then their two secret emojis.
  An avatar photo is optional and lives only in that browser's `localStorage`
  (`latin.users[].avatar`, a 160px JPEG data URL); it is never synced or
  committed.
- **No accounts, no sign-in, no tracking, no third-party analytics.** A child uses
  this. Plain HTML, CSS and JS served from one domain.
- **No ads, no external embeds**, nothing that could put something unexpected in
  front of a child.

## What it is

A game for learning the ISEB Common Entrance Latin vocabulary (Levels 1–3, 403
words in `vocab.js`) by recognition, not grammar. Built so far:

- **Organise** — the Word list (opens on All, least known first: by stars, then least recently answered, then alphabetical; the filter chips last for the visit; **pull a row right to mark the word known** — five stars, rested 30 days — **or left for not known** — no stars, due now: `mark` in `renderList`, pointer events on the list, a green/red label under the sliding row, `SWIPE` = 88px, a vertical move is left to the scroll, a short pull snaps back, and the memo tap is suppressed after a pull). **Cards & Beasts** (under Practice on the
  home page, with Squishygeddon and Jacques Hammer; Read holds Sentences
  and Passages; `#cards` → `renderCardsHome`: a face-down deck to swipe or tap to
  play, the Beastpedia banner, the scene of the latest beast; the play
  screen shows only the back arrow, the streak, the card and the two
  buttons) — swipe cards (`app.js`): Latin word + a right or clearly-wrong
  meaning (`distractors`: a wrong answer never shares a word, a `sense` group, an `avoid` pairing or **any meaning once the spoken alternatives in `synonyms.js` are counted** — `meanings(w)` = senses ∪ SYNONYMS — so "how come" (kifech) is never offered against 3lech, why); stars 0–5 per word (**`recordAnswer(u, w, ok, ms)`**: a word is known when it has been answered right, quickly, several times, over a stretch of time — each word keeps `a` recent accuracy (running average, latest answers weigh most, a wrong answer takes 30 % off), `q` quick right answers (within `QUICK` = 3 s of the word appearing; halved by a wrong answer), `g` the longest gap in hours it has survived (time since the last answer when next got right) and `v` its usual speed; `bandOf` reads the stars off `BANDS`: New / Shaky / Learning on accuracy alone, Known needs 2 quick rights and a day survived, Solid 4 and six days, Mastered 6 and 27 days (`BAND_NAMES`; **the display is a strength bar, not stars**: `strengthOf` = 40 accuracy + 30 quick rights (six is full) + 30 survival (a month is full, log scale), 0–100, drawn by `barHTML` as a bar coloured by band with the band's name under it — in the word list (sorted by strength; the filter chips and the count / legend lines are rendered `hidden` at the owner's request, the code kept), on the memo card with `whyHTML` ("right 9 of 10 · 4 quick · known for 8 days") and thin along the top of a card; the home page meter is the level's average strength; `starsHTML` remains only for the ★ row elsewhere) — so five quick rights in one sitting give two stars, slow-only answers never pass two, a slip on a mastered word drops it to Known; the cards, Sentences, the reader, the Squishygeddon quiz and a Hammer smash pass the time taken, letting a sign past passes none; records from before are **re-rated once from their history** (`rateProg`, `RATING` = 2 kept in `m`, run by `getProg`): accuracy (right + 1)/(answered + 2), a word whose last answer was wrong is Shaky or, with six rights at four in five, Learning; on a streak: Learning, Known with 4 rights at .75 and a streak of 2, Solid with 7 at .85 and 4, Mastered with 10 at .92, a five streak and at most one wrong ever; accuracy, quick rights and survival set to match) with spaced repetition (`REST` in `app.js`: a
  right answer makes the word due again in 10 min / 1 / 3 / 7 / 30 days by
  star count, a wrong one makes it due at once; **a word is
  never withheld**: due words come first, and once none are due every word
  is in play — a word got wrong in the last 24 h twice as often, twice or
  more three times as often (`boost`) — with a gap of `GAP` cards before
  the same word returns; the game never says "resting", only "N due" and,
  in the word list, "due again <date>"; all games use the rule);
  Cards show the word in a random form half the time (`forms.js`: noun
  cases and plurals, adjective genders, present-tense persons, generated
  from the dictionary entry) with the English, right or wrong, in the same
  number or person (`inflectAll`); tap a card to flip it (word to 0 stars,
  streak kept). **Vocabulary settings**: Top 50 (`top: true` in `vocab.js`, 50 of the Beginner words; Tounsi: `top=1` in `words.txt`, 50 of level 0) / Beginner / Level 1 / 2 / 3. **Top 50 is for the cards and the games**: `readLocked(u)` greys the Read banners with a corner tag naming the next setting, taps say so (`readGate`), and `route()` sends `#passages / #snap / #library / #book` home — **except Sentences** when the language has sentences for the 50 words (`lv: -1` in `read.js`, `topSentences()`; Tounsi has 56, two of them stories, written in `sentences.txt` under `-1 |`, the builder allowing only `top` words): then `renderRead` uses `L = -1` and shows only those. Latin has 168 (four stories, pta–ptd), the block at the end of `read.js` written by `tools/build_read_top.py` (the sentences live in the script in `build_read.py`'s notation with the level check limited to `top` words; it writes a snippet that replaces every `lv: -1` line before the closing `];`, the first entries keeping their order and numbers). Tounsi has 174 Beginner sentences (two stories). Memory cards (`memory.js`); example phrases
  (`phrases.js`: the first sentence of `read.js` that holds the word; a language built by `build_read.js` gives one per level as `[{ la, en, lv }]` and `phraseFor(w, u)` shows the first within the player's setting, so the phrase never uses a word above their level); fireworks (`effects.js`); the example phrase sits under the meaning on the card, the three a little above centre; a long word shrinks to fit on one line (fit loop after `deck.innerHTML`); vocabulary settings Beginner / Level
  1 / 2 / 3. Players = first name + two emojis, no passwords.
  The card screen follows the artist's own MemiBeasts app (the preview video
  and screenshots in the Drive `MemiBeasts/` folder): grey-framed cream cards
  with a sunburst and the card number, word / rule / meaning, a green tick or
  red cross stamped on the card before it flies off, combo words (SWEET!,
  SICKKK!, MAGIC!, PERFECT! at 3 / 5 / 8 / 10 in a row), swipe up = "I don't
  know" (turns the card over), and a scene behind the cards coloured by the
  **beast** being raised. **Beasts** (`beasts.js`, `art/beasts/`): the
  artist's 48 MemiBeasts monsters, each up to four stages (egg, baby, teen,
  adult; 175 pictures as 360px WebP, names and one-line ecologies from the
  artist's `Monster Ecologies` sheet in `art/beasts/beasts.json`, element by
  colour). **Eggs drop while you play the cards**
  (`Beasts.onCard(u, ok, streak)`: every 5 right answers in a row, every 20
  cards played right or wrong — `played` in the state — and on a new
  player's first right answer; a drop on a wrong card shows after the memo). A new monster shows the "NEW … Egg"
  fanfare (the artist's trumpets, `trumpets_l/r.png`, cut from a screenshot,
  plus confetti); finding a monster you already have is a **duplicate, and a
  duplicate evolves it one stage** (egg → baby → teen → adult, the white
  "EVOLVING" glow). A duplicate of a fully grown monster re-rolls once for one
  that can still grow. **Ten monsters are RARE** (`rare: true` in `beasts.json`: dueljaw, royalvizaro, pulsar, nebula, crockasaur, flamondis, lizanaut, mamoth, jaxi, opal): the roll (`pool` in `beasts.js`) gives each a fifth of a plain monster's chance (~5% of drops), their fanfare and gift cards are a metallic holographic card (`.card.beast.rare`: near-black foil, drifting rainbow patches, glitter dots, a moving sheen, silver frame, a ✦ RARE badge), and their Beastpedia discs have a rainbow ring and a star (`.bc.rare`). `Beasts.force(key)` sets the next drop, for tests (`scratchpad/rare.js`). The bar above the cards shows the latest find and the
  Beastpedia count. The next beast is rolled ahead and its pictures
  preloaded (`ahead` in `beasts.js`: `fetchPic` reads the picture from any cache the page can see or fetches it, saves it in the page-level **`latin-art`** cache — which the service worker never deletes — and hands out a blob URL from `img()`; this matters for Tounsi, whose worker at `tounsi/` cannot intercept `../art/` requests); all 175 pictures are in the service
  worker cache list and a fanfare picture that fails retries (`retryImg`). `latin.beasts.<id>`
  = { have: { key: stage }, order, last, finds, total }, synced (union, furthest
  stage). A duplicate of a **fully grown** monster is a **spare**
  (`spare: { key: n }`, "SPARE!" fanfare, ×N badge in the Beastpedia, its disc drawn as a pile: one or two discs behind, `.bc.stack`); spares
  are the only thing that can be given away. The **Beastpedia** (`#beasts`,
  from the Cards & Beasts home) shows every stage as a circle, silhouettes
  for the ones still to find, and a sheet with the picture, stage, element,
  ecology and, for a spare, **🎁 Give one to a friend**.
  **Player names and gifts** (`sync/worker.js`, `Sync.claimName / sendGift /
  inbox / giftCode / claimCode`, UI in `nameSheet / giveSheet / giftSheet /
  loadInbox` in `app.js`): a player may claim one name (3–16 letters/digits,
  unique, first come; the game says "not your real name"; stored on the
  worker as `n:<name>` → key and `k:<key>` → name, kept in `u.player`; looked
  up only by exact name, never listed). Give → type a friend's name → the
  worker checks the sender's blob really holds the spare, 10 gifts a day,
  and drops it in the friend's inbox (`in:<key>`); the spare leaves the
  sender. On the home page `loadInbox` shows a 🎁 box ("ANN has sent you an
  Albadaba!") with Open (→ `Beasts.receive`: new monster at the sender's
  stage, otherwise an evolution or a spare; `giftSheet` fanfare) and "Don't
  accept from X" (local mute list `latin.mutes.<id>`, muted gifts are thrown
  away). Give → **Invite a friend**: a gift code (`c:<CODE>`, 60 days) and a
  share-sheet message with `https://latin.musicalmagic.uk/#gift/CODE`; the
  link stores `latin.pendingGift`, survives sign-up, and `claimCode` opens
  it; the sender's inbox gets "Someone opened your gift". No e-mail: nothing
  about a recipient is ever stored. "Save my code" (share sheet / copy) on
  the sync-code sheet; the sync code remains the only way back in.
- **Read** — "Sentences" (`read.js`, `renderRead` in `app.js`): 301 hand-written
  sentences, each token mapped to its headword and checked against
  `vocab.js`: 60 + two short stories from Beginner words only, then about 60
  sentences and three stories (4–6 lines each) for each of Levels 1, 2 and 3
  (`lv`; stories carry `p` id and `pt` title), using that level's words and
  grammar (Level 2+: 3rd declension, perfect tense, `inquit`, `noli`,
  questions; Level 3: `qui`, `hic`/`ille`, `dum`, the `eo` compounds). The
  game follows the level setting: sentences of the level and below, the
  level's own 7 times in 10; a story is read line by line with the earlier
  lines and their English kept above the card, and a big celebration at
  the end. The reader is asked each word's meaning in turn (3 options from
  the level's words, same star rule; **or spoken / typed**: the Passages microphone row (`micHTML`, `micListener`, `bindTyped`) sits under the options and `say(word)` in `renderRead` picks the option the word belongs to — the right one if the word is in the gloss, a sense or a `SYNONYMS` alternative, a wrong one if it is only in that option; a small word (you, he, the…) counts only when it is an option on its own; the box clears after each answer; `inflect` also makes perfect, infinitive
  and imperative forms, `PAST` in `app.js`); the English appears at the end.
  The later sentences were written in a compact notation and built by
  `scratchpad/build_read.py` (session scratchpad), which lemmatises each
  form from the dictionary entries and refuses any word above the level.
  Progress in `latin.read.<id>` {done{n: time}, read}; the first 60 keep
  their numbers, new sentences are only ever appended.
- **Passages** (`renderPassages` in `app.js`, banner under Read): the eleven
  stories from `read.js` (`PASSAGES`, grouped by `p`), one at random. The
  current sentence sits at the top in Latin, the earlier ones in green and
  the later ones dimmed; below it the English translation with every word
  hidden. The player **speaks the English** (Web Speech API,
  `SpeechRecognition`/`webkitSpeechRecognition`, `lang en-GB`, continuous
  with interim results, restarted on `end`; on iPhone the browser sends the
  audio to Apple to recognise — nothing goes to us) or types a word: each
  word heard fills its blank in the translation and flips the Latin word
  whose gloss contains it (`say`; `sameWord` matches on stems, so works /
  working / worked count) — or any other meaning of that word: the
  dictionary senses and the spoken alternatives in **`synonyms.js`**
  (`SYNONYMS`, every one of the 403 words: great / mighty / huge for
  magnus, irregular pasts like saw / ran / went spelt out; multi-word
  entries match by their content words). A flip also fills that word's
  blank in the translation. Tapping a
  Latin word flips it too. On iPhone the session is not continuous (Safari
  drops long sessions) and is restarted after each result; the status line
  under the microphone names every state and error (`ERRORS`). The typing
  box processes words live as they are typed or dictated with the keyboard's
  own 🎤 key, which works on every iPhone, including the home-screen app. All blanks filled → next sentence; last
  sentence → fireworks and the next passage. Progress `latin.passages.<id>`
  {done{p: time}}, synced as a union.
- **Read a book** (`book.js`, `renderPassages(u, true)`, banner under Read,
  greyed with a "Level 3" corner tag until the level is set to 3): *Puer et
  Via Longa*, the owner's original Latin story, read sentence by sentence
  with the Passages mechanic (speak or type the English; every Latin word
  flips). `BOOK = { title, sub, chapters: [{ title, en, sents: [{ la, en }] }] }`;
  tokens outside the 403 words carry an `x:form` id and just their gloss.
  The three sentences just read stay above the current one with their
  English; a chapter ends with "Chapter finished — carry on", the book's
  end offers a re-read. Place kept in `latin.book.<id>` {at}, synced by max.
  Built by `scratchpad/build_book.py` (session scratchpad): one line per
  sentence in `form/gloss[=headword]` notation plus the translation; add
  chapters there and rebuild. Six chapters, 287 sentences, 1779 words, of
  which only 39 (scio, disco, si, ut, satis, salve, gratias ago, saccus, saxum,
  lapis, albus, pes, finis) fall outside the 403; everything else is Level 3.
- **Snap a page** (`snap.js`, `renderSnap` in `app.js`, banner under Read, `#snap`):
  photograph (or paste) any English text; every word that is in the
  vocabulary of the player's level turns into Latin in the form the English
  context asks for, and the reader says the English of each Latin word
  (the Passages mechanic: `micListener` / `bindTyped` / `micHTML` in
  `app.js` are shared by Passages, the book and Snap). The photo is read
  **on the phone** by Tesseract.js 5 served from `ocr/` (Apache-2.0:
  `tesseract.min.js`, `worker.min.js`, the two LSTM wasm cores, the
  tessdata_fast English model gzipped; ~10 MB, fetched on first use and
  then cached by the service worker) — nothing is uploaded. `Snap.ocr`
  draws the picture to a canvas at ≤1800px (so EXIF rotation is applied)
  and recognises it with a progress bar. The recogniser is started by `Snap.warm()` when the Snap start screen opens and kept for the next photo; the shutter freezes the picture on screen and stops the camera at once ("you can put the phone down"). `pageText` keeps only real print: per line, the run of words read at ≥80% confidence and their close neighbours (the table, print showing through from the back, shadows read as low-confidence scraps off to the side); a line without a confident word is dropped; paragraphs come from the gaps between lines; verse (most lines start with a capital) keeps its line breaks, and the reader shows a photo's or pasted text's single line breaks as `<br>` (books' are not); a possessive never reaches across a line break ("told her / Another day"). `Snap.latinise(text, words)`:
  sentences → tokens `{ en, la, id, gloss, skip }`. Morphology from the
  dictionary entries: nouns in five cases and both numbers (`noun`;
  i-stems, plural-only nouns, proper nouns), adjectives agreeing in gender,
  case and number (`adj`, 2-1-2 and 3rd declension), verbs in present /
  imperfect / perfect / future / infinitive / imperative (`verb`, the
  irregular table `IRR` for sum, possum, eo and compounds, volo, nolo,
  fero). English analysis in `convert`: an English → candidates index built
  from the dictionary senses (nouns with their plurals, verbs in base / -s /
  past / -ing / past-participle forms, two-word senses like "listen to" and
  "look at" fold the second word in); noun vs verb by the word before (a
  determiner → noun, a pronoun or modal → verb); case: `of` → genitive,
  prepositions by `PREP` (the preposition itself turns Latin, `with me` →
  mecum), `to` → ad + acc. after a motion verb else dative, the first of
  two objects after a giving verb → dative, otherwise a noun whose verb
  comes before it in the clause is the object and one whose verb follows is
  the subject, predicate nouns after is/was nominative, "Run, boy!"
  vocative; adjectives agree with the next noun or, after a copula, the
  subject; verb person from the subject (pronoun or noun, "X and Y" →
  plural), tense from the English form and helpers (`were walking` →
  imperfect, `will` → future, a helper only before a base verb with no comma or quote between, so '"I might not," said Pooh' is *dixit* — after a closing quote the speaker is the word after the verb, `did not` → perfect, `can/must/want to` +
  verb → possum/debeo/volo + infinitive, `do not` → noli + infinitive;
  the helper words fold into the Latin and the gloss keeps them: "were
  walking"); is/are/was/were → est/sunt/erat/erant when not a helper;
  has/have/had as a main verb → habeo. `BLOCK` lists English words never
  converted (too many meanings: like, well, even, so, there, left, kind…). **Keeping the Latin right** (after a word got the
  wrong meaning, "in gold letters" → *epistulae*): context rules right after
  a candidate is chosen in `convert` — senses a word must not be found by
  (`OMIT`: take → *capio*, not *duco*; race, beat, general; "bed" is not the
  past of "be"); a verb after an article or possessive or a preposition
  ("the rules", "doctor's orders", "in great fear") or after a copula or
  "very" ("he was cross") stays English, as does a noun after a subject
  pronoun or modal ("I hope") and a bare verb after made / let / saw +
  him / her / them ("made him laugh"); words safe in one use only (*epistula*
  only near write / send / read, *arma* only near weapons and war, *deinde*
  not "the next", *solus* only "the only", *parvus* not "a little more",
  *longus* not "long ago" / "as long as", *carus* not "Oh dear", *patria*
  only "my / his / their country", *servo* not "keep quiet", *specto* not
  "look like" / "looked tired", *silva* not "a piece of wood", *lux* not
  "light blue"); an adjective does not agree across "of" ("Many of the
  soldiers" → *Multi*); some / many / all / both are plural subjects; the
  tail of a two-word sense ("went out", "look at") never joins the next
  word's answer. **Before changing `snap.js`:** `node tests/latin-cases.js`
  (every mistake found so far, each as a sentence with what the word must
  become or that it stays English; add one for every new mistake) and
  `node tests/book-audit.js` (the converter over the 20 shelf books from the
  live worker: every English → Latin pair, how often, an example; review
  the top few hundred for wrong meanings).
  **The start screen** (`start()` in `renderSnap`, after Google Translate):
  white, one big "Enter text" box (`#pasted`), round **Pictures** and
  **Camera** buttons along the bottom (a blue **Read** button appears once
  there is text; **Last page** when there is one). **Camera** opens a
  full-screen live view (`getUserMedia`, back camera, `.camscreen`) with a
  white shutter and a gallery button; the shutter draws the video frame
  to a canvas and sends it to `Snap.ocr`; if the live view is refused it
  falls back to the phone's own camera (`capture="environment"` input).
  **The reader** (`read(text)`; `html.readermode` turns the whole screen
  white, `.reader` max 42rem, 20px gutters, no card): a thin head with
  ← Home and "n of m"; Latin words bold `.lw`, the word in focus
  highlighted yellow. **The answer panel** (`.rsheet`) is fixed across the
  bottom fifth of the screen: a grip with the Latin word in focus, then
  the **three meanings** as full-width buttons (the word's own gloss and
  two from other words of the same kind in the same English shape,
  `Snap.shapeLike`: "were walking" → "were carrying"; `avoid` lists
  respected; fragments like "-self" skipped; never a wrong option that shares a word with any meaning of the target — its senses or its `SYNONYMS`, so no "huge" for *magnus* — and never a name like Troy). Tap or drag the grip up and
  it opens to show Font (Serif / Sans), Size (16 / 18 / 21px) and Page
  (☀ White / ☾ Black: `html.rdark`, also on the start screen), kept in
  `latin.reader` {font, size, dark}. Right → the button goes green, the
  word turns into its English in green and the focus hops on, scrolled
  clear of the panel; wrong → red, the right one green, the word's
  English in red with a wavy underline, then the hop. The page's
  paragraph breaks are kept and junk words dropped.
  Every answer goes through `recordAnswer` (stars, leaderboard). Tapping any
  unanswered Latin word moves the focus there. All words answered →
  celebration and the panel shows "🏆 N of M right" with "Another page" /
  "Read it again". The microphone is not used here. (`Snap.ocr` still returns the word boxes on
  the picture, unused since the photo overlay was dropped: book print is too
  small on a phone.) Progress
  `latin.snap.<id>` {pages, words, last} (the last text, for "The last page
  again"; not synced). Banner `art/banners/library.jpg` for the Library. Tested by `scratchpad/reader.js` (paste, right and
  wrong answers, the panel's font, size and black page, finishing a page),
  `scratchpad/camtest.js` (the camera screen with a fake camera) and `scratchpad/snap.js`
  (the OCR path on a rendered PNG, ~2 s in Chromium).
- **Library** (`library()` inside `renderSnap(u, 'books')`, banner under Read,
  `#library`): Project Gutenberg books, **with their illustrations**, in the
  Snap a page reader. Gutenberg sends no CORS header, so the sync worker
  fetches them (`gutenberg(id)` in `sync/worker.js`): `GET
  https://sync.musicalmagic.uk/book/<n>` → `{ id, title, author, pics, text }`.
  It reads the **HTML edition** (`pg<n>-images.html`, plain text as the
  fallback) between the `pg-start/end-separator` markers (`htmlParas`):
  `<table>`s (contents), page numbers and footnote marks dropped; inline tags
  joined without a space (drop caps: `<span class="dropcap">M</span>RS`); a
  picture becomes its own paragraph `[[img src="images/x.jpg" cap="…" w=".."
  h=".."]]` (captions from `class="caption"` / `<figcaption>`; a one-letter
  alt is a drawn initial and goes back into the text; ornaments under 90px
  dropped; a lone capital before the rest of its word is joined: "I" + "N the
  sea"). **The story start** (`storyStart`): front matter is skipped —
  introduction, preface, foreword, dedication, transcriber's / editor's
  notes, copyright text (`FRONT`, ending at the next real heading, not the
  author's signature) and contents / lists of illustrations or chapters
  (`LIST`, ending at the first chapter heading followed by prose or the
  first real sentence, with its title); then the first chapter heading
  (`HEAD`: CHAPTER / PART / BOOK, Roman numerals I.–XXXIX. only — "L. Frank
  Baum" is not chapter L) followed by real prose (`isProse`: mostly lower
  case, few digits, under half the words capitalised, real punctuation),
  or else the first long prose paragraph, stepped back over opening
  sentences, verse and dialogue (pictures not counted) to the story's own
  title; the one picture just before the start comes with it. Cached at the
  edge 30 days under `/__book/<n>/v14` on the worker's own host — when the
  cleaning changes, bump that **and** `BOOK_V` in `app.js` (sent as `?v=`).
  `GET /bookimg/<n>/<path>` passes a book's picture through (path checked:
  `images/…jpg|png|gif`, no `..`; cached 30 days), so the game only ever
  loads from its own domains. **The shelf** (`SHELF`, the illustrated
  Gutenberg editions where one exists, marked "Illustrated"):
  Winnie-the-Pooh 67098, Peter Rabbit 14838, Velveteen Rabbit 11757, Alice
  (Rackham) 28885, Wizard of Oz (Denslow) 43936, Just So Stories 32488,
  Wind in the Willows 27805, Jungle Book 236, Peter Pan in Kensington
  Gardens 26999, Peter Pan 16, Pinocchio 16865, Happy Prince 902, Grimm
  52521, Five Children and It 17314, Heidi 46409, Treasure Island 120, Anne
  of Green Gables 64365, Secret Garden 113, Railway Children 1874, Black
  Beauty 271; a "Carry on reading" card; a box that takes any Gutenberg
  link or number (that book joins the shelf). Books are kept on the phone
  in the `latin-books` cache (the service worker keeps it across updates);
  the game re-asks once and trims itself if a book ever arrives with the
  licence text still in it. Opening can't hang (`getBook` / `open`): the
  response is read once as text (no `clone()`: Safari can stall a split
  body) and saved to the cache in the background, never awaited; the Cache
  API is raced against 2 s, the download aborts after 25 s; any failure, or
  an error while paging, shows the message with **Try again** (fresh from
  the worker, the saved copy deleted). Tested by `scratchpad/stuck3.js`
  (normal, saved copy, a Cache API that never answers, offline + retry). Pages of ~200 words broken between paragraphs
  (`paginate`; a picture counts 70 words and stays with the text after it;
  a page never ends on a heading). In the reader (`read(text, { label,
  back, next, done, pic })`) pictures stand in the text as `IMGMARKn` (in
  capitals, so never turned into Latin) and become `figure.rpic` (full
  width, at most 62% of the screen high, caption in italics) or, when 150px
  or smaller, a floated drop cap `img.rdrop` at the start of the next
  paragraph; every picture retries if it fails (`retryImg`). Headings
  (short, no full stop or `CHAPTER …`, no Latin in them) are centred `.rh`
  and stay English (`isHeading` in `Snap.latinise`; a paragraph break ends
  a sentence only after a heading, so a photo's mid-sentence breaks don't),
  and words in capitals are never converted. Place per book in
  `latin.library.<id>` {books: {n: {at, pages, title, author, pics}}, last}
  (not synced). Tested by `scratchpad/library.js` and `scratchpad/pics.js`
  against the live worker; `scratchpad/wtest2.mjs` runs the worker's book
  route locally over the shelf (start, words, pictures), `wdbg.mjs` prints
  a book's opening paragraphs with the chosen start.
- **Practice** — "Squishygeddon": a Plants-vs-Zombies-style defence
  (`practice.js`), always landscape; coins come only from matching words.
  Each level is one long day on a planet (`WORLDS` in `practice.js`,
  `worldOf(n)`: Earth, Mars, Saturn, Rainbow, round again tougher):
  wave 1 trickles in for 8 min (gap 14 s → 1.2 s, ~150 squishies, kinds by
  the minute), ended by the Chomp King (`WAVE1_BOSS`: no more spawns until
  he is beaten), then a huge wave of 250, and at the end of the game the
  other three bosses (`FINAL_BOSSES`) one after another, each announced and
  sent once the last is dead and the lawn is nearly clear; ~12 min,
  ~400 squishies plus the bosses' minions. **Bosses** (`big: 3`) are three rows tall: `sq.rows`
  lists the rows they fill, `inRow(sq, r)` is used by every hit test, they
  chew the first gun they meet in any of their rows, set off all three
  mowers (600 damage each, not instant death) and lose the game if they
  reach the house. Each has a red power bar across the top of the lawn
  (`drawBossBars`) and `spawns` smaller squishies of its own kind every few
  seconds (Chomp King → Chomps, Brood Queen → Skitters, Ghost King → Ghosts,
  Sharky → Sharklings, a small Sharky from the artist's `Sharky` rig).
  HP 3000–6000; a full defence (`scratchpad/long.js`) still wins in ~10.5 min.
  Numbers follow the original PvZ (Blaster = peashooter:
  20 dmg / 1.5 s; Chomp 100 hp crosses in ~2 min; Shield 1000 hp ≈ 40 s of
  chewing). Squishies have `res` (damage multipliers per kind: bullet, spray,
  ice, beam, ring, blast, rock, bomb), `nofreeze`, `nobrain` and a `tip` shown
  the first time they appear, so guns and squishies counter each other
  (Flyers only fall to Handy/ice/ring/blast; ghosts ignore ice and sound but
  burn to Solar Blast; Antbun armour halves bullets; a brain-washed Kamikaze
  explodes in the crowd). **Worlds** (art in `art/world/`, cut from the
  artist's Environment and Backgrounds folders): Earth is the plain lawn;
  **Mars** (the artist's layout picture) has trenches (`layHazards`,
  `S.cellKind`) that cannot be built on and that walkers wade through at
  half speed; **Saturn** has rocks the shovel digs up for 25 coins;
  **Rainbow** has a puddle (no building unless a **Floaty** raft, 25 coins,
  is dropped first; walkers slow to 0.7), a portal that pops squishies out
  mid-lawn every 10 s once the huge wave is in, and a rip with tentacles at
  the right edge while a boss is due. Every lap round the four worlds adds
  20 % squishy health (`levelSpec(n).tough`, `sq.maxHp`); the win screen
  goes straight to the next world. 5 right answers
  in a row arm a Freeze, 10 a Lightning storm, 15 a Meteor shower
  (`S.meteors`, 400 damage each on the six nearest squishies); 1–3 stars per level from the
  correct-answer ratio; a trophy cabinet (`#trophies`) of 20 trophies.
  **Weapons** (the owner's Weapons folder, rendered from the Spine rigs with
  `scratchpad/sq2/spine.py`, exported to `art/weapons/`): Blaster, Handy
  Turret, Freeze Turret, Freeze Ray (every 10 s a 2-second ray down the whole row that ices every squishy in it), Sonic Boom, Solar Blast (key `mortar`),
  Miner Shoot, Detonate Bomb, Plasma Bomb, Brain Wash, Shield, most with
  three upgrade tiers; `GUNS` in `practice.js` holds their behaviour
  (`kind`: shoot / beam / ring / lob / mine / bomb / brain / wall). Weapons
  with a Spine rig animate through `rig.js` (a small Spine player) from
  `art/rigs/<key>.json+.png`, exported by `scratchpad/sq2/export_rigs.py`:
  Fire plays after a shot, Idle between. Plasma Bomb and Brain Wash have no
  usable rig and stay as still pictures. Not used yet: Floaty. The
  **Generator** (`kind: 'gen'`, first in the shop like PvZ's Sunflower,
  cost 50, hp 300) pays `tier.pay` coins every `tier.every` seconds (5/20 s,
  8/15 s, 12/12 s) with a coin float and a bounce; its three tiers are the
  artist's `Generators/Gen2-4` rigs exported as `art/rigs/generator1-3`
  (one looping `animation`), shop stills rendered from the rigs into
  `art/weapons/generator1-3.png` (Gen1 and Gen5 have no atlas).
  **Effects** come from the artist's `Partical Effects` sheets, cut into
  `art/fx/` (`FX_NAMES` in `practice.js`): `boom` draws `burst1-4_<c>` with
  two flung `drop`s (`col`: `y` fire for bombs, mines, Kamikaze and Solar
  shells, `w` for lightning and rock shells, `c` ice), the Solar shell trails
  `trail2_y`, Sonic rings cycle `wave1-4`, ghosts (`mist: true`) trail
  `mist.png` and leave a `slime` puddle, the Freeze shows `sparkles` over the
  lawn and cyan bursts in the ice wave, and bullet guns puff the artist's
  `barrelsmoke` rig (`art/rigs/barrelsmoke`, animation `Fire`, frames start
  at 0.5 s) from the muzzle after each shot (`drawMuzzleSmoke`).
  Art from the owner's folders: `art/squishies/` (incl. the rigged Antbun),
  `art/ui/`, `art/trophies/`. **Rigged squishies** (the artist's Squishies
Drive folder, id 1P6XWDzXcu_AHl6ooNK0PwGwcLf3s-Obw, inside the shared art
root 1kSOzKEnj5_GiJhmTwQmwOnf6G2mL2iar): Chomp, Skitter, Flyer (FlyingFiend),
Chomp King, Brood Queen, Ghost King, Sharky (SharkyBoss), Kamikaze and Unicorn play
their Spine rigs (`art/rigs/<key>.json+.png`) through `drawSqRig` while
healthy: Walk on the squishy's own clock (`sq.wob`; a roller by distance),
WalkSwell next to a gun, Attack while eating. Only the Kamikaze is mirrored
(`rigFlip`). Every kind except the Antbun has `sheet` (the artist's 3×3
`<Name>Death.png`, cut into `art/squishies/<key>/d1-9.png` at 320px; `fig` is
the healthy figure's width, `foot` its baseline). **Damage look**: a hit
bulges the squishy for a fifth of a second (`sq.bulge`, `BULGE_T`); once
three quarters of its health is gone (`HURT_AT` = .25) it shows the bruised
frames 4-6 (at 25 / 16 / 8 %); on death frames 7-9 (`sqdeath`): the pop,
the bits flying out (swelling), then the puddle lies for a second and
soaks away (1.6 s in all). Ghost and Moley have no usable rig (no
animation file / no atlas), so they walk as their flat pictures but still
bruise and burst. Artist-drawn bosses wear their own crown, so the game's
crown is skipped for them. The Antbun keeps its own parts rig. The rigs were
converted by `scratchpad/export_sq2.py` (session scratchpad, not the repo):
it straightens rotated atlas regions and repacks them at 0.25 scale. The
**Unicorn** (Walk/WalkSwell only) appears from minute 5½: below half health
it bolts at 2.4× speed (`gallop`, dust-and-sparkle `gallop` fx), Brain Wash
can't turn it, ice hurts it 1.5× and bullets 0.75× — freeze it before it
runs, or kill it in one go. Not used yet from that folder: MoleKings.
Per-player counters live in
  `latin.practice.<id>` (kills, by_<type>, correct, asked, won, stars).
- **Jacques Hammer** — a runner (`hammer.js`), portrait like the artist's mockup
  (works either way up). One wide board at a time scrolls in with a Latin word
  and a meaning; tap to smash the wrong ones, let the right ones pass. The bad
  guy (the "Decoy") opens the game saying he has changed the town's signs, and
  comes back out of the ground to club Jacques on a mistake. **No hearts**: a level allows `MISTAKES` = 3 wrong signs (shown as ✗ n/3 in the top bar, blinking at 3); one more and "Too many wrong!" sends the player back to the start of the same place, coins kept (`S.lives` counts the mistakes). **A level is a set number of signs per place** (`signs` in `SCENES`: Town road 10 up to Under the sea 26 and Future wave 30; `quota(n)`). A sign is judged only once the whole board is behind Jacques, and boards are kept until then (the off-screen filter is `-(bw + .5)`: with a board 80% of a phone's width the old `-.4` dropped every board unjudged in portrait, so letting signs past never counted). **No score is shown, only coins** (`S.score` still counts inside, unused on screen), and **no level numbers**: the top bar shows signs done `n/quota`, the bar below 📍 the place (the scene's name), and the start screen and the level-clear overlay say "Next stop: <scene> — dress Jacques for it" (`openItems(onClose, where)` puts the place in the Items badge where the artist's Lv. was). **Levels** cycle through the artist's fifteen scenes
  (`SCENES` in `hammer.js`: road, pier, park, beach, forest, blossom, Greece,
  canyon, temple, snowy peaks, cave, spooky, Arabian night, under the sea,
  future wave), one per level; 10 + 2 per level signs to clear. Once a sign is fully on screen the scroll holds for a second (`S.hold`; Jacques runs on the spot) so it can be read. Each scene is
  drawn in parallax from `art/jh/scenes.json` + `art/jh/scenes/*.png`: a sky
  block stretched over the screen, `far` props at 12 % of run speed placed by a hand-set `kind` in `scenes.json` (`ground`: hills, mountains, a distant castle stand on the horizon behind the ground strip; `sky`: clouds, suns, moons float in the upper sky at a height from the piece's index; `top`: the cave's stalactites hang from the top edge; `skyrot`: two Snowy clouds the sheet had on their side, drawn turned upright — the cutter's `y` values were unreliable and on a tall phone put mountains in mid-air), `mid` props (trees, pillars, buildings) at 45 %, the ground
  strip and `near` props at run speed, placed by a hash so a level always
  looks the same. The pieces were cut from the artist's `Background Assets`
  sheets by `scratchpad/scenes.py` (session scratchpad; it finds the sky and
  ground bands by row runs, the props by connected components, classes them
  by shape and brightness, with `scene_overrides.json` for the few it gets
  wrong). **Coins**: 3 for every sign judged right, paid on the spot — a gold coin pops out behind Jacques, turns once and flies to the 🪙 counter at the top right (`earnCoin`, `drawCoin`, bits of kind `coin`; the counter ticks up when it lands), plus 10 at the end of a level and 15 more for a perfect one; when a level ends, `bank()` moves the run's coins into the save, drops coins still flying and refreshes the counter, and the overlay quotes `saved().coins`, so the two always agree; the score sits in the bar underneath; the **Items**
  screen (JACQUE / HAMMER / PUP / SHOP tabs, after the artist's mockup) sells
  26 costumes, 23 'hammers' and 5 pups, owned for ever and worn whenever.
  Art in `art/jh/`. **Characters are the artist's Spine rigs** played by
  `rig.js`: `art/rigs/jacque` (skins = costumes, `RIG_SKIN` in `hammer.js`
  maps costume keys to skin names; Walk / Idle / Attack for the swing / Hit
  when clubbed; the weapon slot is a hook that draws our `w_<key>.png` where
  the artist's hammer sits), `art/rigs/decoy` (Spawn, Idle / Laugh while
  talking, Attack, Death as he sinks) and `art/rigs/dog` (Walk, Sit, Talk)
  with `dog_gb/gc/gg/gp` recoloured atlases for the pups (the recolour maps
  were learnt from the old `g_*`/`gb_*` parts). Exported by
  `scratchpad/export_rig_skins.py` (session scratchpad) at 1:1 pixel scale.
  `rig.js` also understands named skins, alpha colour timelines, draw-order
  keys and per-slot hooks. The old part-by-part drawing (`meta.json` boxes)
  remains for the seven costumes that came only as flat pictures (disco,
  suit, samurai, astronaut, cowboy, karate, turban: `body` is one cut-out on
  recoloured standard legs) and as a fallback; signs `sign0-7` (+ `_l`/`_r` halves; the halves of styles 1, 2, 6, 7 were rebuilt from the whole sign because the pale face had been cut away as background) with six wooden styles
  cycling by level and green/red once judged; `title_tall/wide.jpg` start
  screen. Progress in `latin.hammer.<id>` {best, level, cleared, coins,
  earned, owned[], wear{skin, weapon, pup}}.
- Installable as a home-screen app (`manifest.webmanifest`, `sw.js`; bump the
  cache name in `sw.js` **and** `APP_VERSION` in `app.js` together on every
  publish). Updates: the worker installs each core file on its own (one
  failure never blocks a new version), `index.html` re-checks `sw.js` whenever
  the app comes to the front and reloads once when a new worker takes over,
  and `checkVersion()` in `app.js` reads the live `sw.js` on the home page and
  refreshes by itself when it is newer (once per session; the version line at
  the bottom of the home page does the same by hand).
  On activation the new worker **copies the art from the old cache** before
  deleting it (an update never leaves a game without its pictures), then warms
  the gaps. Every picture, rig and scene loader (`hammer.js` `img`,
  `rig.js`, `practice.js` sprite tables) retries a failed load a few seconds
  later, and Jacques Hammer says "Loading the scene…" and **does not start** (`loaded()` / `S.ready` in `hammer.js`: clock at zero, no signs made) until the scene, the sign, Jacques, the dog and, for the intro, the Decoy are all in — after 12 s it starts anyway (`scratchpad/jhslow.js` tests it with every picture 3 s late).

## Other languages: Tounsi (`tounsi/`) and how to add one

Every language game is a folder at the site root built on the Latin engine;
**Tounsi** (Tunisian Arabic, Derja) is live at
**https://latin.musicalmagic.uk/tounsi/** (and **Music**, Learn the notes, at `/music/`, and **Russian** at `/russian/`, see below) — same rules as the Latin game
(public repo, nothing personal, no accounts). `languages.json` lists the
games; every home page links to the others from it (`otherGames()`).
A language folder holds the hand-written `lang.json` (code, name, flag,
greeting, tagline, level names, theme colour, `tts`), `words.txt` (the word
list, one per line: `level | word | english | pos | options`; the single
source of `vocab.js`), `forms.js` (every form of a word with its shape),
`grammar.js` (its half of the English → language converter), `sentences.txt`
(sentences and stories by level, in a notation that looks every form up in
`forms.js` and refuses a word above the level; `form=headword|gloss` for
anything irregular, `Name=-`), `synonyms.txt`, **`memory.txt`** (the "How do we remember this?" hook for every word: `id | emojis | hook`; cognates first, then word families, then sound-alike pictures — built to `memory.js` by `build_memory.py`), **`arabic.txt`** (the word in the language's own script: `id | word | plural | feminine | present | I did | past stem | they do`, merged into `vocab.js` as `ar / arpl / arf / arpres / arp1 / arps / arpp`; `forms.js` gives every form its `ar` and `Forms.show(w)` the headword's, and `app.js` shows it as the `.arab` line under the word on cards, in the word list, on the memo card and the flipped card — nothing shows for a language without it), **`origins.txt`** (optional: `id | note` of up to 300 characters on where the word comes from — cognate, borrowing, whether it is Tunisia's own; built into `memory.js` as `ORIGINS` and shown as "Where it comes from" on the memo card only — never on the playing card; Tounsi has all 1,100), `theme.css` and `VERSION`. The memo card also has **"My own way to remember it"**: the player's own note, kept on the device in `latin.notes.<id>` / `<code>.notes.<id>` (never synced).
`python3 tools/lang/build.py <folder>` then writes the **derived files, never
edited by hand**: `vocab.js`, `index.html` (from
`tools/lang/index.template.html`: `<base href="../">`, `APP_NS`, `LANG`),
`app.js`, `sw.js`, `manifest.webmanifest` (checked text replacements of the
Latin ones in `build_app.py`), `memory.js`, `read.js`, `phrases.js`, `synonyms.js`
(`build_read.js`) and `snap.js` (`build_snap.py`: `grammar.js` plus the
Latin `snap.js`'s English analysis, photo reader and option shaper). **Rerun
the build and bump the folder's `VERSION` after any change to the Latin
`app.js`, `sw.js` or `snap.js`** (`VERSION` = its `APP_VERSION` and the
`<code>-vN` cache name). The shared engine files key storage by `NS_P / NS_H /
NS_B / NS_S` (= `APP_NS` or `latin`): a language's progress lives under
`<code>.*`, its sync blob under the hash of `<code>:` + code, its gift names
in their own namespace, while the player list (`latin.users`,
`latin.current`) and the read-aloud setting are shared — one profile plays
every game. **Wrong answers that are too close** (`sense=` groups in `words.txt`, `"sense"` in the Latin `vocab.js`; 149 Tounsi entries are in a group — thanks, have, let's go, before / after, girl / boy, singular / plural pairs…): `python3 tools/near_sweep.py [folder]` lists every same-kind pair whose meanings WordNet or a shared word form puts together and the game does not yet block; check the list by hand and add groups — never apply it blindly (it also pairs "dates" the fruit with "date"). Needs `pip install nltk` and the WordNet corpus unzipped into `~/nltk_data/corpora`.
`tools/lang/README.md` is the recipe; tests:
`LANG_DIR=<folder> node tools/lang/tests/cases.js` (Tunisian cases, add one
per mistake) and `tools/lang/tests/run.js "…"` prints a conversion;
browser tour `scratchpad/tounsi2.js`.

**Tounsi specifics.** 1,100 entries: 1,000 words (`level` 0–9, 100 each; the settings are Basic, Top 200 … Top 500, each = its words and all lower ones — levels 5–9 have no setting of their own) plus 100 **phrases**
(`level` 10, `pos` = `phrase`: sayings whose meaning is not the sum of their words,
ma3lich, ya 7asra, 3la rasi…) which join the words in two settings, **500 + Phrases**
(`4p`) after Top 500 and **1000 + Phrases** (`9p`) at the end (`inLevel`: a key ending
in `p` = the words up to that level plus level 10; `levels` in `lang.json`; levels 5–10
have no sentences yet; every form has a recorded clip) in the Latin-letter spelling Tunisians text in (3 = ayn,
7 = ḥ, 9 = q, kh, gh, ch, dh, th). `forms.js`: verbs from the "he does" form
(present in six persons; the plural stem drops a short vowel, yekhdem →
yekhdmou, or adds w after a vowel, yemchi → yemchiw) and the "he did"
headword (past mchit / mchet / mchaw / mchina / mchitou; CCVC verbs shift
the vowel, khdem → khedmet; `p1`, `ps`, `pp` in words.txt for the irregular
ones); nouns take the definite article with sun letters (ed-dar, ech-chams,
eth-thelj; never on larb3a / lekhmis / ethletha / ethnin) and the plural from
the entry; a `stem` takes possessive endings (ommou, bouk, khouh);
adjectives f / pl from the entry; a word that appears twice carries a tag,
`3am (year)`. The converter: no cases — "the" folds into a definite noun,
"to the market" → les-souk, "my house" → dari (karhba mte3i after -a),
verbs by person and tense (present; past; bech + present for "will"; kan +
present for "was doing"; ma …ch for "not"; can → ynajjem, must → lezem),
is/are dropped, was/were → kan/kanet/kanou, has/have → 3and-, there is →
famma, "once upon a time" left alone. 227 sentences and 10 stories (two a
level). Known gaps: the banners still show Latin words; Gutenberg books
convert live, so quality follows the converter.

## Music: Learn the notes (`music/`) and the theory questions (`grade5/`)

**https://grade5.musicalmagic.uk** is the address of the music games: the
Cloudflare worker `grade5-site` (`grade5-site/worker.js`) redirects every
visit to **latin.musicalmagic.uk/music/** (and `/grade5/…` paths to the theory
questions), and answers `/sw.js` with a worker that unregisters itself (the
first theory version ran on that host). Redeploy it only if `grade5-site/`
changes (`CLOUDFLARE_API_TOKEN=x npx wrangler deploy` there).

**Learn the notes (`music/`)** is a language game on the Latin engine, built
like Tounsi (`python3 tools/lang/build.py music`; bump `music/VERSION`), where
each **note on a clef is a word** (`treble E4`, english `E`, pos `note`) and its
picture is the word: `vocab.js` `pic` = `music/staves/<slug>.svg`. 70 notes:
`tools/music/make_notes.py` writes `words.txt`, `memory.txt` (where the note sits
and the rhyme: Every Good Boy Deserves Football, FACE, Good Boys Deserve Fun
Always, All Cows Eat Grass; middle C; ledger lines; sharps/flats) and
`notes.json`; `node tools/music/staves.js` draws the SVGs with VexFlow (needs
playwright), `python3 tools/music/clips.py` synthesises a piano note per pitch
(`music/audio/*.mp3`, 41 clips, `index.json` maps each note id → clip), so
`Speak.say(note)` plays the note (no voice: `LANG.tts` has no `lang`). Levels:
Beginner (the 9 treble stave notes, `top=1`), Treble clef, + Bass clef, + Ledger
lines, + Sharps & flats, + Alto clef (Grade 4), + Tenor clef (Grade 5). It has
the word list, Cards & Beasts, Squishygeddon, Jacques Hammer, the leaderboard
(game `music`) and sync; no Read section (`lang.json` `noread`: `build.py`
writes stub read/phrases/synonyms/snap.js and the home page shows `LANG.links`
instead — the **Theory questions** banner, `music/theory.jpg` → `grade5/`).
Engine hooks it added (all inert for Latin and Tounsi): `wordHTML(w, text)` in
`app.js` shows `w.pic` on the card, word list, memo and flipped card (the text
stays in a hidden `.vh` span for 🔊); `hammer.js` draws the picture (3:2, the
staves are cropped to 150 × 100) almost as tall as the sign's face on a pale card on its left,
the letter big beside it (`wordPic`) and words its messages "That note is C, not F";
`practice.js` puts it in the question box and never offers the same wrong
answer twice (two notes can both be C); `speak.js` takes `LANG.tts.toggle`
labels; `KIND` maps pos `note`. Test: `scratchpad/regress.js` tours Latin,
Tounsi and Music (home, list, card, beasts, Hammer, Squishygeddon) at 390px.

**The theory questions (`grade5/`)**: a separate game for ABRSM Grades 1–5
music theory at latin.musicalmagic.uk/grade5/, linked both ways with Learn the
notes (same rules: public, nothing personal, no
accounts, no tracking). It shares nothing with the Latin engine: no profiles,
no sync; progress is `localStorage['grade5.progress']` { grade, topics:
{'<grade>.<id>': {n, r, a}}, items: {key: {r, w, last, t}}, days, sound }.
**The grade selector** (Grade 1 2 3 4 5 across the top of the home page, a
★ on a grade with stars earned) sets `prog.grade`; `Theory.make(topic, prog,
grade)` sets `G` and each grade asks only its own syllabus, cumulatively:
G1 treble/bass up to one ledger line, C G D F major, tone/semitone, note and
rest values, 2/4 3/4 4/4, interval numbers above the tonic, tonic triads,
degree numbers, 27 terms; G2 two ledger lines, up to 3 sharps/flats major and
A E D minor, scales, 2/2 3/2 4/2 3/8, dotted quaver; G3 4 sharps/flats, interval
qualities above the tonic, compound time (simple/compound/duple…), treble ↔
bass same pitch; G4 5 sharps/flats, alto clef, enharmonics, any interval with
augmented/diminished, technical names, chords I IV V, /4 and /16 compound,
French terms, instruments; G5 as below (`keyOk`, `TS_G`, `TERMS[].gr`,
`FACTS[].gr`, the grade range in each `TOPICS[].make` entry, `topicsFor(g)`
for the topics a grade shows and their names). Files: `theory.js` (pitches
`{ l, a, o }`, keys up to six sharps/flats, `interval`, `transpose`, chords,
and one question maker per kind: note names in four clefs, same pitch in
another clef, enharmonics, key signatures both ways, scales, degrees,
intervals incl. compound, chords Ia–Vc, chord symbols, cadences, time
signatures by kind and from a bar of rhythm, transposing instruments, terms,
instruments; `TOPICS` weights them), `terms.js` (`TERMS` Italian / French /
German with `g` groups never offered against each other, `FACTS`),
`stave.js` (VexFlow 4.2.5 with Bravura in `lib/`, MIT, drawn to SVG scaled
to the width; a lone note is centred between ghost notes), `sound.js` (a Web
Audio piano made in the page; terms read with the phone's Italian / French /
German voice), `app.js` (home, rounds of 10, explanation after every
answer, mixed practice favours weak topics). Bump `CACHE` in `grade5/sw.js`
and `APP_VERSION` in `grade5/app.js` together on every publish.
A push to `main` publishes it. The owner may later move the music games to
their own repository (GitHub would not let a session create one). Checks: `scratchpad/g5check.js` (thousands
of questions per grade in node), `scratchpad/g5grades.js` (what each grade asks) and `scratchpad/g5browser.js` (every kind drawn at
390px, screenshots).

## Russian (`russian/`)

The 100 most common Russian words (a frequency list without the particles that cannot go on a card — же, бы,
ли, себя — and with the everyday words a beginner needs: привет, пока, да, нет, спасибо, пожалуйста, мама,
папа, друг, школа, вода), live at **latin.musicalmagic.uk/russian/**, built like Tounsi
(`python3 tools/lang/build.py russian`; bump `russian/VERSION`). As in Tounsi, the word is in the **English
alphabet** (standard transliteration: privet, spasibo, khorosho — `words.txt`) and `arabic.txt` (the historical
name) holds the **Cyrillic**, shown small underneath (`LANG.ownScript` = ltr, `ru`, so the engine does not mark
that line as Arabic; `theme.css` sizes it). The voice reads the Cyrillic (`synth_azure.py` `plain` mode speaks
the form's `ar`); `audio/index.json` maps both spellings to each clip. Settings: Top 10 (the first words a child says:
privet, poka, da, net, spasibo, pozhaluysta, mama, papa, ya, ty), Top 25, Top 50, Top 75, Top 100 — `level` 0–4 in
`words.txt`, cumulative; no `top=1` words, so `build_app.py` adds no Beginner setting. `memory.txt`: sound-alike or shared-root hooks, written for a child. No Read section
(`noread`). Voice: `tools/lang/synth_azure.py russian ru-RU-SvetlanaNeural` (`tts.script` `plain`: the
Cyrillic is read as written; 100 clips in `russian/audio/`).

## Merge Beasts (`merge/`)

A standalone tap-and-merge idle game at **latin.musicalmagic.uk/merge/**, modelled on Tapps' Goat Evolution
(researched 30 Oct 2026: crates, drag-to-merge, poop coins, five stages, upgrades, a Goatpedia, an alternate universe at
the end). It shares nothing with the Latin engine — no profiles, no sync — and keeps its save in
`localStorage['merge.save']` { coins, world, unlocked, fields{w: [{id, lv, x, y}]}, crate{w: level}, up{crate, cap, tap,
away}, seen, t, total }. **The chain** (`buildChain` in `merge/app.js`): the artist's 49 MemiBeasts from
`art/beasts/beasts.json`, by element earth → grass → water → snow → crystal → fire, every stage in turn (egg → baby → teen
→ adult → the next beast's egg), 175 levels, split into five **worlds** (`WORLDS`: Meadow = earth + grass, Lagoon = water,
Crystal Caves = snow + crystal, Ember Plains = the first 10 fire beasts, Volcano = the rest), each with its own field,
sky and ground; making a world's last beast opens the next. **Play**: beasts wander on the field and earn `RATE(L)` =
0.5 × 1.33^L coins a second each, paid as a trickle (`tick`, 4 a second) with a 🪙 drop animation; tap a beast for a
burst (`tapMult` × its rate); drag one onto an identical one (`twinNear` measures where they are drawn; nobody wanders
during a drag) and they merge into the next level with sparks, and a fanfare card for a new beast's egg or an adult
(`fanfare`); a crate drops every `crateEvery` seconds and opens into the world's crate level (`save.crate[w]`,
upgradeable one level at a time, 40 × 1.33^(L+1)); Buy gives that beast for 25 × 1.33^L; the field holds `capOf` beasts
(10, +2 per upgrade, max 20). **Upgrades** (`UPS`): faster crates, bigger field, stronger taps, tractor (away earnings:
`awayFrac` 25 % + 15 % a level up to 100 %, `awayHours` 2 + 2 a level, shown by `away()` on return as "While you were
away"). **Beastpedia**: every level as a cell, silhouettes until made, rare beasts outlined; a cell opens the artist's
stage name, ecology and the earning rate. Big numbers print as K M B T Qa… (`fmt`). Files: `index.html`, `app.js`,
`style.css`, `sw.js` (shell cached on install, pictures cached as fetched; bump `CACHE` with `APP_VERSION`),
`manifest.webmanifest`; listed in `languages.json` so every home page links to it. Test: `scratchpad/merge.js` (crate,
tap, drag-merge, upgrades, Beastpedia, away sheet at 390px). Not built yet: the alternate universe at the end, sound.

## Dance Evolution (`dance/`)

The Merge Beasts engine with **dancers**, at **latin.musicalmagic.uk/dance/** (`dance/app.js` is `merge/app.js` with the chain,
wording and sprites swapped; same save shape in `localStorage['dance.save']`). **The chain is 36 stages × 3 sisters = 108
levels (v36: the owner wants twelve characters in every room, so nine rooms × four stages; `sisters7.py`; `load` remaps a save from the 20-stage chain by stage name, `save.chainv` = 2)** (`dance/dancers.json`: stage, sister, stageName, sheet, frames, top, crawl; worlds by stage, four each: Nursery 0–3 (Baby, Tot, **Birthday** — party hat, striped top, a balloon; a bounce, a sway and claps, a twirl — Nursery), Dance school 4–7 (Leotard, Dance school, First tutu, Jazz),
Ballet theatre 8–11 (En pointe, Swan, **Sugar Plum** — the Nutcracker fairy, lilac tutu dotted in her colour, a wand; hops on pointe, a port de bras, piqué turns — Prima), City stage 12–15 (Street, **Tap** — waistcoat, bowler, black tap shoes; shuffle-hop, soft-shoe sway, pivot and stamp — **Salsa** — ruffles, red heels, hoop earrings; the basic step, hip sway, the cross-body turn — Stage star), World tour 16–19 (World tour, **Bollywood** — orange choli, gold bangles, a flower; shoulder bounces and jumps, wrist circles and the head slide, a spin — Movie star, Royal gala), Academy 20–23 (Teacher, **Examiner** — grey suit, a clipboard; marks, a nod, a hop — **Judge** — sequinned jacket, the "10" paddle — **Graduate** — gown and mortarboard; a jump for joy, hand on heart, a wave; `bg_academy`: a hall with three portraits, a trophy cabinet, a red carpet), **Studio 24–27** (**Rehearsal** — leggings, leg warmers `warmers`, a water bottle; star jumps, stretches, a lunge — Choreographer, **Dance captain** — black tee with her star; counts and jumps, arm sweeps, turning to the line — **Coach** — tracksuit and cap; squats, stretches, claps; `bg_studio`: a mirror wall with the cast reflected, a barre, a whiteboard, a chair, a boombox, tape marks), **Stage door 28–31** (**Understudy** — rehearsal greys, the script; Director, **Leading lady** — feather boa `collar: 'boa'`, long gloves; a kick, the boa sweep, a spin — **Producer** — the suit, a phone; `bg_stagedoor`: backstage bricks, the star door and its sign, a lamp, a costume rail, a flight case, a rope), **Hall of fame 32–35** (Icon, **Statue** — gold from head to toe, `skin_override` / `hairc_override`; a held pose and a bounce, a slow shimmer, a slow turn — **Superstar** — gold fringe and gloves, a boa; a leap, the sweep, a spin — Legend; new hats `partyhat` / `bowler` / `mortar`, props `wand` / `clipboard` / `paddle` / `bottle` / `script` / `phone`; `bg_hall`: spotlights, three framed stars in the sisters' colours, a chandelier, a marble plinth with a gold star, velvet ropes, a red carpet; `scratchpad/dancers/rooms2.py`) — **`load` migrates saves when rooms are split (v35)**: every dancer moves to the room of her stage, a bag that pointed into a later room moves there (clamped inside each room's levels), and the open rooms follow what has been made; stages: Baby, Tot, Nursery, Leotard, Dance school, First tutu,
Jazz, En pointe, Swan, Prima, Street, Stage star, World tour, Movie star (dark bodice, long gown, flashbulbs), Royal gala (pale gown, tiara, a waltz), Teacher (bun, cardigan, black skirt, cane), **Choreographer** (all black, headset, shoes in her colour: marking the counts / arm cues / a spin to face the cast), **Director** (dark coat, red scarf: the bow from the wings), **Icon** (her colour head to toe, a silver streak: her earliest move perfected — Lainey's toddler jump as a tuck jump, Miri's sway as swan arms, Juliette's wobbly twirl as a clean double pirouette), Legend; `DESC` one line each). **The economy (31 Oct 2026, after the owner's daughters finished the first version in an afternoon)**: a better bag costs `crateUpCost` = 300 × 1.38^L (1.45 until v36; 108 levels) and **must be earned — the dancer two levels above the bag has to have been made by merging first** (`crateGate` / `crateEarned`, `save.seen`; the shop row says "First make … by merging"), an Invite is `priceOf` = 40 × 1.35^L. **The ending** (`discover` on the last level → `finale`, once, `save.finished`): a curtain-call overlay (`.finale`: red curtains part, the three Legends dancing, a pixel trophy `art/trophy.png`, confetti, "You did it!"), then the **Hall of Fame** (`hall`, the 🏆 button in the top bar, shown once finished): two Legends cannot merge (a merge of two opens the Hall instead) — **Retire a Legend** removes a final-level dancer from the stage for a ⭐ (`save.stars`) and two hours' income; **Encore** (`save.encore`) starts the show again from the cot with +50 % earnings per encore for ever (`RATE`), keeping upgrades, stars and the Dancepedia. **The sisters' names are fixed in `NAMES` in `dance/app.js`** (youngest first) — the
owner's explicit decision on 30 Oct 2026, reaffirmed after the risk of a public repo was put to him; this is the one
exception to the no-names rule above and it covers the three first names only (no surnames, ages, school or photos — the
photos he sent to set the looks are not in the repo and must never be); a level is `nameOf(c)` = "<stage> <name>". **The art is the cute 48 × 64 chibi style the owner's daughters loved (v24), chosen again on 31 Oct 2026 after a higher-resolution, likeness-driven redraw (fig4 / sisters4, hand-pixelled heads, kept in the session scratchpad with the research and the plan) was rejected: "not recognisable, and we've lost the cute look"** — at a 30-px face a likeness is carried by hair, colour, size and movement, not by drawing the face. The looks, youngest first: Lainey dark-brown wavy hair pulled back for class (bunches with blue bows at Nursery), simple smile; Miri a mass of dark curls with a centre parting (`curly`), a small grin; Juliette long straight dark hair, tallest, a small grin. **Each sister has a colour family for every costume** (`COL` in `sisters5.py`: Lainey teal, Miri pink, Juliette purple — main / light / dark; the Swan tutu stays white and the Legend gown gold, with the sister's colour on the bodice or panel), and **every stage has its own combination of silhouette, tone, pattern or second colour, legwear, hair or hat and prop** (v32, after the girls found many too similar; `STAGES` in `sisters6.py`; `fig3` options `pattern` dots / stripes / star / sash, `patc`, `gloves`, `collar`, hats and hair `tophat` / `beret` / `hood` / `updo` / `pony` / `bunches`, props `flowers` / `balloon` / `clapper`): Baby nappy; Tot dotted top + tiny tutu, hair down; Nursery party dress with a white collar, a balloon, bunches / curls / ponytail; Leotard pale leotard + white tights; Dance school bun, black practice skirt, pink tights; First tutu dark bodice with a gold sash, big pale tutu, bow / tiara / flower; Jazz striped top, black skirt and tights, a top hat; En pointe white leotard, her tutu, ribbons, bun; Swan all white with her sash and a tiara; Prima dark bodice, her tutu, pink tights, a bouquet, hair up high; Street tee, jeans, trainers, cap / ponytail; Stage star black sequin top, her fringe, gold shoes, mic / star; World tour flamenco ruffles / coin skirt / fan gown; Movie star gold top, her long gown, long gloves, a clapperboard, updo; Royal gala pale gown, white gloves, red sash, tiara; Teacher cardigan with a white collar, black wrap skirt, cane, bun; Choreographer her hoodie, black joggers, headset; Director black coat, red scarf, black beret; Icon her colour head to toe with a white star and the silver streak; Legend gold head to toe with her panel, gold gloves, a star above her — then the stages above. **Art**: 16-bit-style pixel sprites, **the cute 48-unit chibi design drawn at 96 × 128 (v31)** — `fig5.py` runs `fig3`'s body through the doubling canvas (`S2`, finer 1-px outline and shading, the big head and simple dark eyes kept; `facekind` small / round / tall gives Lainey smaller cheerful eyes and Juliette taller ones) — drawn by the session scratchpad generators `scratchpad/dancers/fig2.py` (the palette and the first figure) and **`sisters6.py` (= `sisters5.py` on `figure5`, with secondary motion: the skirt `tdy` and the head lag the body's rise and fall by a frame) + `fig3.py` / `fig5.py`** (`choreography.md`, `plan.md`, `brief.md` and the three `research_*.md` beside them): **each sister has a movement personality that holds through every stage, so she is known without her name — Lainey jumps (lifts, squats, leaps), Miri flows (arms, balances, sways, head tilts), Juliette turns (spins, footwork, clean finishes)** — and **the moves climb a real ladder** (toddler bounce / sway / tiptoe / gallop → primary-class pliés, tendus, sautés, port de bras → arabesque, échappé, pas de chat, développé, a single pirouette → jazz kick-ball-change, isolations, jazz square + pivot → pointe échappés, bourrée, piqué turns → swan sissonnes, swan arms + penché, bourrée en tournant → grand jeté, attitude promenade, fouettés → running man, body wave, two-step + freeze → kick line + split leap, mic turn, chaînés → flamenco / belly dance / fan dance → red carpet, a waltz, teaching, choreographing, the director's bow, the icon's perfected first move → grand jeté manège, penché, fouettés, all into a révérence); the Baby crawls (Lainey fast then bum-bounces; Miri sits rocking and clapping with a short crawl; Juliette crawls and pushes up to kneel). Keyframes are eased to 32 frames (40 for Baby, Prima, Legend). `fig3.figure3` takes a continuous `pose` — limb endpoints, optional knees `lk/rk`, elbows `le/re`, `sink` (hips drop for a plié), lean, bend, lift, `pointe`, `jazz` hands, a `turn` that **rotates the body in depth (v37, after the owner saw World tour Juliette "split in half" by the old squash-and-mirror spin): `vc`/`vs` = cos/sin of the angle; every sideways offset (feet, knees, hands, elbows, shoulders) is scaled by cos, the torso and skirts narrow to no less than 42 %, a tutu stays a disc, the far arm is drawn behind the body, patterns and the gown panel only show from the front, and `draw_head` slides the features round the head (one eye in profile) and covers the face with hair from behind (`s.view`)**, and for babies `tilt` 0 crawl → 1 sit, `knees` 1 kneel, `stride`; `loop(keys, n)` eases between weighted keyframes, `turn` always forwards — → `dance/art/sNN_G.png` horizontal sprite sheets + `dancers.json`; the older `sisters.py` / `fig2.figure` drew the first 6–8 still poses); `spriteHTML(c, scale)` shows a sheet as a
div (`data-frames`, `data-fw`; `SCALE` = 0.875 on the field so a dancer is 84 × 112 on screen, .5 in the Dancepedia, 1.5 in the fanfare and detail) whose frame is stepped by a JavaScript interval every 40 ms (`frameNo`; not CSS keyframes — a level came up blank on the owner's iPhone with the CSS version), `image-rendering: pixelated`; `preloadSheets()` fetches all 42 sheets at the start; **a Baby only moves across the floor while her loop is crawling** (`crawl` in `dancers.json` lists each baby level's runs of all-fours frames; `wander` lets her set off only in the first frames of a run and sets the glide to the run's length), on the field at
`SCALE` 1.75, in the Dancepedia at 1 (still), in the fanfare and detail at 3. **Everything else is pixel art too** (`scratchpad/dancers/icons.py`, `backgrounds.py` → `dance/art/`): the five rooms (`bg_nursery` a girl's bedroom — bed, teddy, shelf, window with curtains, ballerina poster, lamp, rug; `bg_school` mirror and barre; `bg_theatre` curtains and spotlights; `bg_city` night street with a neon sign; `bg_tour` sunset festival with bunting and lanterns; 96 × 128, the floor from row 70, stretched over the field with `image-rendering: pixelated`, the old gradient ground hidden), a 6-frame spinning coin (`coin.png`, `.coinspin` in the top bar; `coin1.png` as the `i.cn` inline coin wherever an amount is printed), the dance bag (`bag.png`: crates, the bag button and the sheet), the ballet shoe (`shoe.png`, Invite), the applause icon (`clap.png`; the rose `rose.png` is unused: every drop is a coin since the owner found claps and roses confusing; the first dance bag carries a "A new dancer is inside — tap it!" tag, `save.bagsOpened`), and the sheet / bar icons (`stage`, `manager`, `star`, `home`, `book`, `up`). Buy is Invite, the tractor is the Manager. Above each dancer's head is her name in two lines of black pixel text, no box, at 38 % opacity until she is touched or dragged (`.hold` / `.drag` → full black) (`lvHTML(n, c)` → `pixText(stage)` + `pixText(name)`: the 5 × 7 font `art/font.png`, glyph order in `art/font.json`, `FONT`; accents stripped, unknown characters skipped; `top` in `dancers.json` is each sheet's first drawn row, so the text sits at `top × SCALE − 36`). `art/digits.png` is the earlier digits-only font, unused. The save is written at once on every change (no debounce). **Start-up cannot go blank (v34, after the girls' phone showed an empty stage with no signal)**: `buildChain` fetches `dancers.json` and `font.json` with three timed-out attempts (a retry bypasses caches) and falls back to the last good copy kept in `localStorage` (`dance.spec`, `dance.font`); `load` repairs a save whose world, fields or upgrades are missing or out of range and drops dancers at levels the chain no longer has; `main().catch` prints the error in the stage hint with tap-to-retry; and the service worker's `activate` copies anything the new cache is missing from the old one before deleting it, so an update on a poor connection never loses the shell. **Move my game** (in the Upgrades sheet, `moveSheet`): a save code (`saveCode()`, base64 of { s: save }) to copy / share and paste into another app or phone — needed because an iPhone home-screen app and Safari keep separate storage, which looked like a wipe to the owner. App icon: two pointe shoes seen from the front with crossed ribbons, after a cross-stitch pattern the owner sent, on pink (`dance/icons/`, drawn by `scratchpad/dancers/icon3.py`; `index.html` and the manifest point at it). Test: `scratchpad/dance.js`. Listed in `languages.json`.

## Read aloud (`speak.js`)

Words are read with the phone's own voices (Web Speech API; nothing is
sent anywhere). `LANG.tts` in each index.html: Tounsi `{ lang: 'ar-TN',
fallback: 'ar', script: 'chat-arabic', auto: true }` — `chatToArabic` turns
the chat spelling into Arabic script first (el-/ed-/ech- → ال, short a/e/o/u
not written, a doubled consonant once), which the Arabic voices read; Latin
`{ lang: 'it-IT', auto: false }` (Italian comes closest). The setting
`latin.speak` (shared; default = `auto`) is the "Reading words aloud" line
on the home page. `Speak.say(text)` reads when the setting is on and **reads the word again 2 s after the first reading ends** (a new word or a 🔊 tap cancels the repeat; `Speak.stop()` on every hash change), `say(text, true)` always and once: a card as it comes up, the highlighted word in
Sentences, each line of Passages, the word in focus in the reader, the word to match in Squishygeddon, a Jacques Hammer sign as it holds on screen; 🔊
buttons (`.cardspeak / .barspeak / .gripspeak`, one document click
handler) read again. **Recorded clips** beat the synthetic voice and are in the repo for both games: `LANG.tts.audio`
names a folder with `index.json` ({ lower-cased text without punctuation: file }); `speak.js` plays the clip when
the text has one, else the phone's voice. `tools/lang/synth_azure.py <folder> <voice>` records every form, every
sentence word, every sentence and the book's lines with Azure's neural voices (needs `AZURE_SPEECH_KEY` /
`AZURE_SPEECH_REGION` in the environment, never in the repo; re-runs only record what is missing): **Tounsi**
`tounsi/audio/` (4,736 clips covering every form of the 1,100 entries, `ar-TN-HediNeural`, read from the hand-written Arabic spellings) and **Latin**
`audio/` (2,392 clips, `it-IT-IsabellaNeural` reading a classical respelling made by `classical()` — c and g always
hard, v as w, ae → ai, oe → oi only in poena / proelium / moenia / foedus, gn → ghn, ph → f; Azure has no Latin
voice). Latin now reads aloud by default too (`auto: true`). The GitHub Actions workflow `Record voices`
(`.github/workflows/record-voices.yml`, repository secrets of the same names) can re-run a recording and commit
the clips; the key was otherwise supplied as environment variables of the owner's cloud environment for one run.
The clips are not in the service-worker cache list: they are fetched on demand and the worker keeps every clip it has fetched (copied across updates like the art). `Speak.prime(text)` fetches one clip ahead (the next card, in `renderPlay`), `Speak.warm(texts)` puts the level's headword clips at the front of the queue on the first card, and **`warmAll()` downloads the whole library in the background** from 4 s after the page opens (not on localhost): one clip at a time, 0.6 s between clips that come from the network and none between ones already saved (`caches.match` first), held off for 2 s around a prime or a playing clip; when every file is in, `latin.clips.<folder>` = the file count skips the pass until the index grows; a clip not ready within 1.5 s is replaced by the phone's own voice for that reading while it keeps downloading, and the 2 s repeat then uses the phone's voice too (`lastSynth` / the `mode` of `play` in `speak.js`), so a word is never heard in two voices. Headless tests stub
`speechSynthesis` (`scratchpad/speaktest.js`).

## Cloud sync (switched on)

`sync.js` + `sync/worker.js` (Cloudflare Worker `latin-sync` + KV namespace
`LATIN`, in the owner's Cloudflare account, the one that also holds
musicalmagic.uk). Live at **https://sync.musicalmagic.uk** (custom domain on
the worker; also latin-sync.richmondbot2000.workers.dev). `SYNC_URL` in
`sync.js` points at it. Each player gets a code like `APPLE-TIGER-2481` on
the profile screen (shown once when the player is created, and behind the
☁️ line on the home page); progress is stored under SHA-256 of the code,
never a name. The blob (`blobOf` in `sync.js`) holds `latin.progress`,
`streak`, `level`, `practice`, `stats`, `hammer`, `read`, `beasts` and `passages` for the player;
`merge` keeps the best of both devices (stars by latest time, scores and
levels by max, Hammer items as a union with coins from the device that has
earned more, Read sentences as a union). Avatars and the player list itself
(name + emojis) stay on the device. A new device: "I have a sync code
from another device" on the new-player or sign-in screen, type the code,
progress merges in. **The leaderboard shows everyone** (`loadBoard` in `app.js`, `Sync.board / myId`, `PUT /lb/<game>/<key>` and `GET /lb/<game>` in the worker): every push also sends the player's two emojis, **the profile name** (`who`, up to 20 characters; the owner decided on 19 Oct 2026 that the board shows real player names — a claimed player name still takes precedence) and the words-answered tally (`stats.days`, last 10 days, and ever) and the worker keeps one document per game (`lbi:<game>`, newest 300 players; a key listing would lag by a minute) with the claimed player name added. The home page shows that board in place of the device-only table: players on this device with their own face and name, everyone else as emojis + PLAYER NAME, else their profile name (or "a player" from before version 174). Other players' rows can be up to a minute stale (KV edge cache).
The worker allows `GET`/`PUT /p/<64 hex>` from
`latin.musicalmagic.uk` (and localhost:8765), 64 KB max, JSON only, plus the
name / gift routes and `GET /book/<n>` (see `sync/worker.js`).
Redeploy from `sync/` with `npx wrangler deploy`. The Cloudflare token is
stored as a **network secret** on the Claude cloud environment "Default"
(name `CLOUDFLARE_API_TOKEN`, Bearer, allowed host `api.cloudflare.com`):
the proxy adds the `Authorization` header to calls to that host, so the
session never sees the value. If `$CLOUDFLARE_API_TOKEN` is empty, check
`curl -s https://api.cloudflare.com/client/v4/user/tokens/verify` first, then
run wrangler with a placeholder value (`CLOUDFLARE_API_TOKEN=x npx wrangler
deploy`) and let the proxy supply the real one. Only if that fails, ask the
owner to paste a token for that one job. Never commit a token or write it
into any file in the repo.
A two-level name (sync.latin.musicalmagic.uk) failed TLS, so the worker
sits at sync.musicalmagic.uk. `localStorage['latin.syncUrl']` (JSON string)
overrides the URL for local testing; `scratchpad/synctest.js` is the
two-device test.

## How it deploys

Push to `main`. Live at `latin.musicalmagic.uk` within a minute. No build step, no
bundler, no framework — plain files. `.nojekyll` is present so GitHub serves every
file as-is; don't delete it.

## Working style

The owner is non-technical and works from a phone via claude.ai/code. Don't hand
him terminal commands and don't ask him to install anything — make the change,
push it, and tell him what to look at.

He will be on a phone almost every time. Check the layout at 390px before saying
it works. A game that is unplayable on a phone is not done.
