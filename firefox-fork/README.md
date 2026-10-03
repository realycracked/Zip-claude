# Zip Browser — Firefox fork roadmap

This directory is the long-term roadmap for a true Gecko-based Zip Browser,
forked from `mozilla-unified` (the official Firefox source tree).

The Electron prototype in the parent repository is what you launch today for
rapid iteration on UX and privacy features. This directory is **where that
work migrates to a real browser engine**: Gecko gives us resistance to
fingerprinting, deep process isolation, and independence from Chromium's
roadmap.

Everything here is reproducible — no secret binaries, no hand-tweaked
build. Someone with 100 GB of free disk and a few hours of CPU should be
able to go from a clean checkout to a running Zip Browser build.

---

## 1. Prerequisites

| Platform | What you need |
|----------|---------------|
| Linux (recommended) | Debian 12 / Ubuntu 22.04+ / Fedora 38+, `python3`, `curl`, `mercurial`, `git`, `clang`, 16 GB RAM, 100 GB free disk |
| macOS | Xcode 15+, Homebrew, `python3`, 16 GB RAM, 100 GB free disk |
| Windows | Visual Studio 2022 Build Tools, MozillaBuild, 16 GB RAM, 100 GB free disk |

Mozilla's own prerequisites page is the source of truth:
<https://firefox-source-docs.mozilla.org/setup/>

## 2. One-time setup

```bash
cd firefox-fork
./setup.sh
```

What `setup.sh` does:

1. Runs Mozilla's `mach bootstrap` installer (downloads toolchains, system
   deps). You can inspect it first in `setup.sh`.
2. Clones `mozilla-unified` into `firefox-fork/mozilla-unified/`. This is
   gitignored — it's ~15 GB.
3. Writes our shared `mozconfig` into the checkout so Zip Browser-specific
   build flags are picked up.
4. Links the `patches/` and `branding/` directories into the tree.

> **Note.** The clone step is heavy. Use `--depth=shallow` on slow
> connections by exporting `ZIP_SHALLOW=1`.

## 3. Build

```bash
./build.sh                # release build
./build.sh --debug        # debug build
./build.sh --artifact     # artifact build (skip C++ compile; fastest)
```

Artifact builds compile only the JS/CSS front-end against Mozilla's
pre-built binaries — great for iterating on the Zip-specific chrome.

Full builds take 45–180 minutes on first run and 2–20 minutes incrementally.

Binaries land in `mozilla-unified/obj-*/dist/bin/`.

## 4. Run

```bash
./run.sh                  # launches the built Zip Browser
./run.sh -p zip-dev       # with a specific profile
./run.sh --no-remote      # ignore an already-running instance
```

## 5. What the patches do

See `patches/README.md` for the full list. Highlights:

| Patch | What it changes |
|-------|-----------------|
| `001-branding.patch` | Replaces Firefox branding with Zip branding, product strings, trademark bits |
| `002-remove-telemetry.patch` | Rips out telemetry, Normandy, experiments, crash reporter network calls, Pocket, Mozilla accounts |
| `003-privacy-defaults.patch` | Flips `about:config` defaults for RFP, FPI, DoH, CRLite, cookie policy, referrer, cross-origin isolation |
| `004-remove-studies.patch` | Removes SHIELD/Normandy study runner |
| `005-themes-pack.patch` | Pre-installs the 12 Zip themes as built-in Firefox themes |
| `006-safer-permissions.patch` | Tightens permission prompts (geolocation, notifications, media default-deny) |
| `007-strip-webpush.patch` | Removes Mozilla WebPush service wiring |
| `008-brand-newtab.patch` | Replaces about:newtab with Zip Start page |

## 6. Branding

`branding/` holds the icons, product strings, and locale strings that
replace Firefox's own under `browser/branding/`. `setup.sh` symlinks it in.

## 7. Signing & distribution

Signing is **manual and off by default**. We do not ship binaries from this
repo yet. See `docs/ROADMAP.md` for the signing plan.

## 8. Why this isn't the default yet

* **Build time.** A fresh Gecko build is slow. Contributors should be able
  to prototype UX in minutes, not hours — hence the Electron prototype.
* **Binary size.** We don't ship 100 GB of upstream source in git.
* **Signing.** macOS and Windows binaries need code signing, which needs
  certificates we haven't bought yet.

When the Gecko build has UX parity with the Electron prototype, this
directory becomes the primary target and the Electron tree moves to
`legacy-electron/`.
