# CLAUDE.md — Latin game

A Latin learning game, built by a father for his daughter. Public site at
**https://latin.musicalmagic.uk**, served by GitHub Pages from `main`.

## Non-negotiables

- **The repo is PUBLIC.** Everything in it is readable by anyone. Never commit a
  token, a key, or anything personal — and that includes **the daughter's name,
  age, school or photograph**. The game must be good without knowing who is
  playing it. Progress lives in `localStorage`. Cloud sync (see below) stores
  stars and levels only, under a random per-player sync code — never a name.
- **No accounts, no sign-in, no tracking, no third-party analytics.** A child uses
  this. Plain HTML, CSS and JS served from one domain.
- **No ads, no external embeds**, nothing that could put something unexpected in
  front of a child.

## What it is

A game for learning the ISEB Common Entrance Latin vocabulary (Levels 1–3, 403
words in `vocab.js`) by recognition, not grammar. Built so far:

- **Organise** — swipe cards (`app.js`): Latin word + a right or clearly-wrong
  meaning; stars 0–5 per word; memory cards (`memory.js`); example phrases
  (`phrases.js`); fireworks (`effects.js`); vocabulary settings Beginner / Level
  1 / 2 / 3. Players = first name + two emojis, no passwords.
- **Practice** — "Squishygeddon": a Plants-vs-Zombies-style defence
  (`practice.js`), always landscape; coins come only from matching words.
  Worlds through the solar system (Tutorial, Earth, Moon, Mars, Saturn,
  Neptune, then Deep space) with a boss on each world's last level; the Bumble
  Blaster upgrades through three tiers (tier 3 = machine gun); 5 right answers
  in a row arm a Freeze, 10 a Lightning storm; 1–3 stars per level from the
  correct-answer ratio; a trophy cabinet (`#trophies`) of 20 trophies.
  Art from the owner's folders: `art/squishies/` (incl. the rigged Antbun),
  `art/ui/`, `art/trophies/`. Per-player counters live in
  `latin.practice.<id>` (kills, by_<type>, correct, asked, won, stars).
- **Jaques Hammer** — a runner (`hammer.js`), portrait like the artist's mockup
  (works either way up). One wide board at a time scrolls
  in with a Latin word and a meaning; tap to smash the wrong ones, let the right
  ones pass. The bad guy (the "Decoy") opens the game saying he has changed
  the town's signs, and comes back out of the ground to club Jaques on a
  mistake; three lives, score with a combo bonus. **Levels**: each is a scene
  with its matching outfit and 'hammer' (`LEVELS` in `hammer.js`: road +
  hammer, pier + shark, farmer + pitchfork …); 10 + 2/level signs to clear.
  Only two backgrounds exist so far (road, pier), so most outfits run on the
  road until the owner sends their scenes. Progress in `latin.hammer.<id>`
  {best, level, cleared, plays}.
  Art from the owner's "Jaques Hammer" folder in `art/jh/`: pixel rigs drawn part
  by part (`meta.json` holds every part's box — Jacque has 19 outfit skins and
  there are 22 weapons, only `standard` + the hammer are used so far), the dog,
  the Decoy's enter/dead frames, effect pieces (`fx_*`), UI pieces (`ui_*`),
  chest art, and `bg_road`/`bg_pier` backgrounds. Outfits, weapons, the shop and
  chests are still unused ideas from the artist's set.
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
