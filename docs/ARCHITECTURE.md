# Architecture — Electron prototype

The prototype is a plain Electron app with a few deliberate choices.

## Processes

```
┌────────────────────────────────┐
│ main process (Node + Chromium) │
│  • WindowManager               │
│  • Privacy engine              │
│  • Settings store              │
│  • Downloads manager           │
│  • IPC router                  │
└──────────────┬─────────────────┘
               │ IPC via contextBridge
┌──────────────▼─────────────────┐    ┌────────────────────────────┐
│ shell renderer (one per window)│    │ tab renderers (one per tab)│
│  • Chrome: tabs, omnibar,      │    │  • Each is a WebContentsView │
│    buttons, panels, themes     │    │  • Attached as child view   │
│  • No Node access              │    │  • Sits at y=chromeHeight   │
└────────────────────────────────┘    └────────────────────────────┘
```

* **The shell** is one `BrowserWindow` per browser window. It renders the
  custom chrome from `src/renderer/`. Node integration is **off**;
  `contextIsolation` is **on**; the only API it sees is the one defined in
  `src/preload/preload.js`.
* **Tabs** are not nested windows. They're `WebContentsView` instances
  attached to the shell's `contentView`. The shell asks main to create,
  swap, resize and destroy them.
* **Private windows** get an in-memory partition (`createPartitionName`).
  Normal windows share `persist:zip-default`.

## IPC surface

All IPC goes through `ipcMain.handle` / `ipcRenderer.invoke`, which gives
us promise-shaped calls with return values. Channel names are grouped by
feature (`tabs:*`, `settings:*`, `downloads:*`, `privacy:*`, `history:*`,
`bookmarks:*`).

The preload bridge in `src/preload/preload.js` is the only place the
renderer can touch Electron APIs. If a feature needs a new call, add it
there and in `src/main/main.js:registerIpc`.

## Privacy pipeline

```
Request from the web
       │
       ▼
onBeforeRequest   ─ block cross-site tracker hosts
       │
       ▼
onBeforeSendHeaders ─ Sec-GPC: 1 · DNT: 1 · strip CH-UA extras · trim Referer
       │
       ▼
network stack      ─ DoH via setDnsOverHttpsConfig
       │
       ▼
Response
```

* First-party requests on a tracker domain (e.g. example.com loading its
  own analytics.example.com) are **not** blocked — the heuristic checks
  cross-site only.
* HTTPS state and cert errors flow back to the renderer via `tabs:update`
  so the padlock and "Site info" panel stay honest.

## Settings

`Settings` is a JSON-on-disk store under `app.getPath('userData')`. Writes
are debounced (150 ms) and atomic (`write-to-tmp` + rename) so a crash can
never leave the file half-written. Corrupt files are preserved as
`settings.json.corrupt` and defaults take over.

## Themes

Each theme is one CSS file in `src/renderer/styles/themes/` that overrides
the custom properties defined in `src/renderer/styles/base.css`. The
renderer swaps the `<link id="theme-stylesheet">` href on change, which is
cheap enough that transitions feel instant.

See [`THEMES.md`](THEMES.md) for the variable contract.

## Where Chromium differs from Gecko

The Electron prototype uses Chromium's engine. That's a good enough platform
to iterate the UX on, but it has fingerprinting characteristics different
from Gecko. For the long term, the Firefox fork is the target — see
`firefox-fork/`.
