# CLAUDE.md — Latin game

A Latin learning game, built by a father for his daughter. Public site at
**https://latin.musicalmagic.uk**, served by GitHub Pages from `main`.

## Non-negotiables

- **The repo is PUBLIC.** Everything in it is readable by anyone. Never commit a
  token, a key, or anything personal — and that includes **the daughter's name,
  age, school or photograph**. The game must be good without knowing who is
  playing it. If progress needs saving, use `localStorage`; nothing leaves the
  browser.
- **No accounts, no sign-in, no tracking, no third-party analytics.** A child uses
  this. Plain HTML, CSS and JS served from one domain.
- **No ads, no external embeds**, nothing that could put something unexpected in
  front of a child.

## What it is

Nothing is built yet. The owner will describe the game; this file exists so a
fresh session knows the constraints before writing a line.

Worth asking him before building rather than assuming: how old she is, what Latin
she is actually learning (vocabulary, declensions, verb endings, translation),
whether it should follow a particular textbook or course, and what she will play
it on.

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
