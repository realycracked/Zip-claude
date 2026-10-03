# Contributing to Zip Browser

Thanks for your interest. Zip aims to be a browser people trust: fast,
reliable, and genuinely private. The following rules keep the project
coherent as it grows.

## Ground rules

1. **No telemetry.** Not now, not ever. Features that need "anonymous"
   metrics to prove themselves are features we don't ship.
2. **No dark patterns.** Settings have one meaning. Private mode has a
   distinct chrome. Security indicators tell the truth.
3. **Small changes beat big ones.** A patch that touches one concern is
   easier to review and safer to land.
4. **Reproducible builds.** Anything you add must build from scratch on a
   clean machine. No vendored binaries beyond what Mozilla itself ships.

## Local setup

```bash
git clone https://github.com/<you>/zip-browser.git
cd zip-browser
npm install
npm start
```

For the Firefox fork, see `firefox-fork/README.md`.

## Project layout

```
src/
  main/        # Electron main process (tabs, privacy, downloads, settings)
  preload/     # contextIsolation-safe IPC bridge
  renderer/    # custom browser chrome: HTML, JS, CSS, themes
assets/
  lists/       # bundled tracker domains
  icons/       # application icons
docs/          # design & architecture docs
firefox-fork/
  patches/     # Zip-specific patches on top of mozilla-unified
  branding/    # Zip branding assets
  mozconfig    # Mozilla build config
  setup.sh     # clones mozilla-unified and applies patches
  build.sh     # ./mach build with Zip's mozconfig
scripts/       # repo utilities (fetch tracker lists, release helpers)
```

## Commit style

* First line: imperative, ≤ 72 characters. "Add private window chrome tint."
* Reference an issue number if there is one.
* Keep unrelated changes out of the commit — one topic per commit.

## Opening a pull request

1. Branch from `main`.
2. Make the change, add a doc note if it's user-visible, run `npm run lint`.
3. Open the PR as a draft while you're iterating. Mark ready when CI is
   green and you've smoke-tested the browser locally.

PR descriptions should answer three things: **what** changed, **why**, and
**how to verify** it (one or two concrete steps a reviewer can repeat).

## Design priorities

The order matters when two of these conflict:

1. **Correctness & security** — if a feature leaks a user's data, it's
   broken.
2. **Clarity** — the user should know what the browser is doing.
3. **Speed** — a browser that lags is a browser that gets replaced.
4. **Polish** — animations, spacing, and shortcuts should feel considered.

## Themes

See `docs/THEMES.md`. New themes are a single CSS file setting the shared
variables defined in `src/renderer/styles/base.css`. We're happy to accept
new ones that pass the readability checklist.

## Code of conduct

Be kind. Assume good faith. If you can't, step away from the keyboard.
