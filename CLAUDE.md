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

- **Organise** — the Word list. **Cards & Beasts** (under Practice on the
  home page, with Squishygeddon and Jacques Hammer; Read holds Sentences
  and Passages; `#cards` → `renderCardsHome`: a face-down deck to swipe or tap to
  play, the Beastpedia banner, the scene of the latest beast; the play
  screen shows only the back arrow, the streak, the card and the two
  buttons) — swipe cards (`app.js`): Latin word + a right or clearly-wrong
  meaning; stars 0–5 per word with spaced repetition (`REST` in `app.js`: a
  right answer rests the word 10 min / 1 / 3 / 7 / 30 days by star count, a
  wrong one zeroes it and brings it straight back; a word got wrong in the
  last 24 h comes up twice as often, twice or more three times as often
  (`boost`); all games use the rule);
  Cards show the word in a random form half the time (`forms.js`: noun
  cases and plurals, adjective genders, present-tense persons, generated
  from the dictionary entry) with the English, right or wrong, in the same
  number or person (`inflectAll`); tap a card to flip it (word to 0 stars,
  streak kept). Memory cards (`memory.js`); example phrases
  (`phrases.js`); fireworks (`effects.js`); the example phrase sits under the meaning on the card, the three centred together; vocabulary settings Beginner / Level
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
  that can still grow. The bar above the cards shows the latest find and the
  Beastpedia count. The next beast is rolled ahead and its pictures
  preloaded (`ahead` in `beasts.js`); all 175 pictures are in the service
  worker cache list and a fanfare picture that fails retries (`retryImg`). `latin.beasts.<id>`
  = { have: { key: stage }, order, last, finds, total }, synced (union, furthest
  stage). A duplicate of a **fully grown** monster is a **spare**
  (`spare: { key: n }`, "SPARE!" fanfare, ×N badge in the Beastpedia); spares
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
  the level's words, same star rule; `inflect` also makes perfect, infinitive
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
  and recognises it with a progress bar. `Snap.latinise(text, words)`:
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
  comes back out of the ground to club Jacques on a mistake; three lives, score
  with a combo bonus. **Levels** cycle through the artist's fifteen scenes
  (`SCENES` in `hammer.js`: road, pier, park, beach, forest, blossom, Greece,
  canyon, temple, snowy peaks, cave, spooky, Arabian night, under the sea,
  future wave), one per level; 10 + 2 per level signs to clear. Each scene is
  drawn in parallax from `art/jh/scenes.json` + `art/jh/scenes/*.png`: a sky
  block stretched over the screen, `far` props (clouds, hills, suns) at 12 %
  of run speed, `mid` props (trees, pillars, buildings) at 45 %, the ground
  strip and `near` props at run speed, placed by a hash so a level always
  looks the same. The pieces were cut from the artist's `Background Assets`
  sheets by `scratchpad/scenes.py` (session scratchpad; it finds the sky and
  ground bands by row runs, the props by connected components, classes them
  by shape and brightness, with `scene_overrides.json` for the few it gets
  wrong). Clearing a level pays **coins**; the **Items**
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
  recoloured standard legs) and as a fallback; signs `sign0-7` (+ `_l`/`_r` halves) with six wooden styles
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
  later, and Jacques Hammer says "Loading the scene…" until the sky is in.

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
progress merges in. The worker allows `GET`/`PUT /p/<64 hex>` from
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
