# Roadmap

A living list. Everything here is best-effort, nothing here is a promise.

## 0.1 — current

* Electron prototype with tabs, unified URL/search bar, back/forward/reload.
* Tracking protection with cross-site heuristic + bundled list.
* Sec-GPC and DNT headers; DNS-over-HTTPS via Mozilla/Cloudflare.
* Private windows with ephemeral partitions.
* Downloads panel.
* Settings UI (General, Privacy, Themes, Search, Downloads, Advanced, About).
* Developer tools (inherited from Chromium).
* 12 polished themes.
* Firefox-fork scaffold with mozconfig, build scripts, and the key privacy
  patches drafted.

## 0.2 — next

* [ ] Bookmarks UI (CRUD exists; needs panel).
* [ ] History panel (data exists; needs panel + search).
* [ ] Omnibar suggestions (history + top sites + search engine).
* [ ] Session restore on relaunch.
* [ ] Find-in-page (`Ctrl+F`).
* [ ] Zoom level per site (`Ctrl +` / `Ctrl -`).
* [ ] User-defined custom themes via Settings UI (file-based today).
* [ ] Pinned tabs.
* [ ] Picture-in-picture.
* [ ] Reader mode.

## 0.3 — security hardening

* [ ] Sandbox: enable site isolation parity with Firefox.
* [ ] Automated tracker-list updater (background job, signed delivery).
* [ ] HTTPS-only mode UI (engine flag already set).
* [ ] First-party isolation prototype in Chromium (partial cookies today).
* [ ] CRLite-equivalent revocation check or OCSP must-staple requirement.

## 0.4 — Firefox fork becomes primary

* [ ] Branding pack: finalise logo, icons, product strings.
* [ ] Signed builds for macOS (Apple notarisation) and Windows.
* [ ] Linux AppImage + flatpak.
* [ ] Auto-update channel with signed metadata.
* [ ] Chrome / Firefox extensions compatibility pass.
* [ ] Migrate Electron prototype's chrome into `browser/components/zip/` of
      the fork.

## Research / stretch

* Tor integration as a one-click mode in Settings → Privacy.
* Decentralised sync (no central Mozilla-style account) via a user-held
  key — think a signed, encrypted blob the user hosts on their own
  storage.
* On-device page summariser (fully local, no network calls).

## What we are explicitly *not* doing

* Crypto wallet integration.
* Built-in VPN with mandatory sign-up.
* Ad network of our own.
* Account system that holds your data on our servers.
