# Zip Browser

**A fast, reliable, privacy-focused desktop browser. 12 built-in themes.
No telemetry, no account, no dark patterns.**

Zip Browser is an open-source browser project with two tracks:

1. **The prototype** — a working desktop browser built on Electron, in this
   repository. Tabs, unified URL + search bar, history, bookmarks, downloads,
   private windows, tracking protection, DNS-over-HTTPS, Global Privacy
   Control, developer tools, and 12 polished themes. You can build and run
   it in minutes.
2. **The Firefox fork** — a long-term Gecko-based build living in
   `firefox-fork/`. Same UX, but with Firefox's deeper fingerprinting
   resistance and independence from Chromium. Reproducible scripts, no
   secret binaries.

> Status: early. The prototype is functional. The fork is scaffolded with
> working scripts and patches; expect to spend a few hours on the first
> `./setup.sh && ./build.sh` run.

---

## Why Zip?

| Problem with other browsers | How Zip handles it |
|-----------------------------|--------------------|
| Telemetry on by default | No telemetry — ever. The code to send it isn't there. |
| Dark patterns around private mode | Private window has a distinct chrome, obvious indicator, in-memory partition. |
| Hidden settings for cookies / trackers | Four plain levels: Off, Standard, Strict (default), Paranoid. |
| Vague security indicators | Click the padlock → see connection state, trackers blocked, cert errors. |
| Themes that are flat recolors | 12 themes, each a real redesign: Hacker, macOS, Gamer, Ubuntu, Arch, Cyberpunk, Dracula, Nord, Gruvbox, Firefox Classic, Matrix, Minimal. |

---

## Build and run (prototype)

### Prerequisites

* Node 18+ and npm 9+
* On Linux: `libnss3`, `libgtk-3-0`, `libasound2`, `libxshmfence1` (your
  distro's packaging bundles these for Electron).

### Install and launch

```bash
git clone https://github.com/<you>/zip-browser.git
cd zip-browser
npm install
npm start
```

The first `npm install` downloads the Electron runtime (~200 MB).

### Refresh tracker lists

Bundled lists ship with the app. To rebuild from upstream sources:

```bash
npm run fetch-lists
```

### Package for your platform

```bash
npm run dist:linux    # AppImage + deb
npm run dist:mac      # dmg
npm run dist:win      # NSIS installer
```

Build artifacts land in `dist/`.

---

## Build the Firefox fork

See `firefox-fork/README.md`.

Short version:

```bash
cd firefox-fork
./setup.sh    # clones mozilla-unified, applies Zip patches (slow, ~15 GB)
./build.sh    # compiles Gecko with Zip branding (slow, 45–180 min)
./run.sh      # launches the Zip-branded Gecko binary
```

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+N` | New window |
| `Ctrl+Shift+P` | New **private** window |
| `Ctrl+L` | Focus the address bar |
| `Ctrl+R` / `Ctrl+Shift+R` | Reload / hard reload |
| `Ctrl+J` | Open downloads panel |
| `Ctrl+,` | Open settings |
| `F12` | Open developer tools |
| `Alt+←` / `Alt+→` | Back / Forward |

(On macOS, replace `Ctrl` with `⌘`.)

---

## Documentation

* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the prototype is wired up.
* [`docs/PRIVACY.md`](docs/PRIVACY.md) — what Zip blocks, what it doesn't, and why.
* [`docs/THEMES.md`](docs/THEMES.md) — the theme system and how to write your own.
* [`docs/ROADMAP.md`](docs/ROADMAP.md) — what ships next, what comes later.
* [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to get involved.

---

## License

[Mozilla Public License 2.0](LICENSE). The Firefox fork inherits MPL-2.0 from
upstream Mozilla; the Electron prototype matches it so code can move
between the two.
