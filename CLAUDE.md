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

- **Organise** — swipe cards (`app.js`): Latin word + a right or clearly-wrong
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
  (`phrases.js`); fireworks (`effects.js`); vocabulary settings Beginner / Level
  1 / 2 / 3. Players = first name + two emojis, no passwords.
- **Read** — "Sentences" (`read.js`, `renderRead` in `app.js`): 60 hand-written
  sentences using only Beginner words, each token mapped to its headword and
  checked against `vocab.js`. The reader is asked each word's meaning in turn
  (3 options, same star rule); the English appears at the end. Progress in
  `latin.read.<id>` {done{n: time}, read}. Next: longer passages.
- **Practice** — "Squishygeddon": a Plants-vs-Zombies-style defence
  (`practice.js`), always landscape; coins come only from matching words.
  For now one long daytime level on Earth (the owner dropped the worlds):
  wave 1 trickles in for 8 min (gap 14 s → 1.2 s, ~150 squishies, kinds by
  the minute), then a final wave of 250 led by the four bosses; ~10 min,
  ~400 squishies. Numbers follow the original PvZ (Blaster = peashooter:
  20 dmg / 1.5 s; Chomp 100 hp crosses in ~2 min; Shield 1000 hp ≈ 40 s of
  chewing). Squishies have `res` (damage multipliers per kind: bullet, spray,
  ice, beam, ring, blast, rock, bomb), `nofreeze`, `nobrain` and a `tip` shown
  the first time they appear, so guns and squishies counter each other
  (Flyers only fall to Handy/ice/ring/blast; ghosts ignore ice and sound but
  burn to Solar Blast; Antbun armour halves bullets; a brain-washed Kamikaze
  explodes in the crowd). The world/level code (`WORLDS`, trophies) is still
  there, unused; 5 right answers
  in a row arm a Freeze, 10 a Lightning storm; 1–3 stars per level from the
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
  usable rig and stay as still pictures. Not used yet: Floaty, Generators.
  Art from the owner's folders: `art/squishies/` (incl. the rigged Antbun),
  `art/ui/`, `art/trophies/`. Per-player counters live in
  `latin.practice.<id>` (kills, by_<type>, correct, asked, won, stars).
- **Jacques Hammer** — a runner (`hammer.js`), portrait like the artist's mockup
  (works either way up). One wide board at a time scrolls in with a Latin word
  and a meaning; tap to smash the wrong ones, let the right ones pass. The bad
  guy (the "Decoy") opens the game saying he has changed the town's signs, and
  comes back out of the ground to club Jacques on a mistake; three lives, score
  with a combo bonus. **Levels** alternate the two scenes (road, pier); 10 + 2
  per level signs to clear. Clearing a level pays **coins**; the **Items**
  screen (JACQUE / HAMMER / PUP / SHOP tabs, after the artist's mockup) sells
  26 costumes, 23 'hammers' and 5 pups, owned for ever and worn whenever.
  Art in `art/jh/`: pixel rigs drawn part by part (`meta.json` holds every
  part's box per outfit); seven costumes (disco, suit, samurai, astronaut,
  cowboy, karate, turban) came only as flat pictures, so their `body` is one
  cut-out on recoloured standard legs; pups `gb/gc/gg/gp_*` are recolours of
  the dog `g_*`; signs `sign0-7` (+ `_l`/`_r` halves) with six wooden styles
  cycling by level and green/red once judged; `title_tall/wide.jpg` start
  screen. Progress in `latin.hammer.<id>` {best, level, cleared, coins,
  earned, owned[], wear{skin, weapon, pup}}. Only two backgrounds exist; more
  scenes would need pictures from the owner.
- Installable as a home-screen app (`manifest.webmanifest`, `sw.js`; bump the
  cache name in `sw.js` when files change).

## Cloud sync (built, not yet switched on)

`sync.js` + `sync/worker.js` (Cloudflare Worker + KV). Each player gets a code
like `APPLE-TIGER-2481`; progress is stored under SHA-256 of the code. It is
off until `SYNC_URL` in `sync.js` is set. To switch it on, from a session that
has the env var **`CLOUDFLARE_API_TOKEN`** (token made from Cloudflare's
"Edit Cloudflare Workers" template):

1. `cd sync && npx wrangler kv namespace create LATIN` → put the id in
   `wrangler.toml`.
2. `npx wrangler deploy` → note the `https://latin-sync.<account>.workers.dev` URL.
3. Set `SYNC_URL` in `sync.js` to that URL, bump the `sw.js` cache name, push to
   `main`. (Optional later: a custom domain such as `sync.latin.musicalmagic.uk`.)
4. Test: `localStorage['latin.syncUrl']` can override the URL for local testing;
   `scratch` tests used a stand-in server with the same two routes.

The worker allows only `GET`/`PUT /p/<64 hex>` from `latin.musicalmagic.uk`
(and localhost), 64 KB max, JSON only.

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
