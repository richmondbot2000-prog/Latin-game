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
  colour). **Eggs drop at random while you play the cards**, like cards from
  a pack (`Beasts.onRight(u, streak)`: about one right answer in twelve,
  always on a combo — 3, 5, 8, 10 in a row, then every 5 — and always on a
  new player's first right answer). A new monster shows the "NEW … Egg"
  fanfare (the artist's trumpets, `trumpets_l/r.png`, cut from a screenshot,
  plus confetti); finding a monster you already have is a **duplicate, and a
  duplicate evolves it one stage** (egg → baby → teen → adult, the white
  "EVOLVING" glow). A duplicate of a fully grown monster re-rolls once for one
  that can still grow. The bar above the cards shows the latest find and the
  Beastpedia count. `latin.beasts.<id>`
  = { have: { key: stage }, order, last, finds, total }, synced (union, furthest
  stage). The **Beastpedia** (`#beasts`, banner on the home page) shows every
  stage as a circle, silhouettes for the ones still to find, and a sheet with
  the picture, stage, element and ecology for the found ones.
- **Read** — "Sentences" (`read.js`, `renderRead` in `app.js`): 60 hand-written
  sentences using only Beginner words, each token mapped to its headword and
  checked against `vocab.js`. The reader is asked each word's meaning in turn
  (3 options, same star rule); the English appears at the end. Progress in
  `latin.read.<id>` {done{n: time}, read}. Next: longer passages.
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

## Cloud sync (switched on)

`sync.js` + `sync/worker.js` (Cloudflare Worker `latin-sync` + KV namespace
`LATIN`, in the owner's Cloudflare account, the one that also holds
musicalmagic.uk). Live at **https://sync.musicalmagic.uk** (custom domain on
the worker; also latin-sync.richmondbot2000.workers.dev). `SYNC_URL` in
`sync.js` points at it. Each player gets a code like `APPLE-TIGER-2481` on
the profile screen (shown once when the player is created, and behind the
☁️ line on the home page); progress is stored under SHA-256 of the code,
never a name. The blob (`blobOf` in `sync.js`) holds `latin.progress`,
`streak`, `level`, `practice`, `stats`, `hammer`, `read` and `beasts` for the player;
`merge` keeps the best of both devices (stars by latest time, scores and
levels by max, Hammer items as a union with coins from the device that has
earned more, Read sentences as a union). Avatars and the player list itself
(name + emojis) stay on the device. A new device: "I have a sync code
from another device" on the new-player or sign-in screen, type the code,
progress merges in. The worker allows only `GET`/`PUT /p/<64 hex>` from
`latin.musicalmagic.uk` (and localhost:8765), 64 KB max, JSON only.
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
