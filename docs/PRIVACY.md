# Privacy — what Zip blocks, what it doesn't, and why

Zip's goal is to be a browser you can trust by default. We care more about
being honest about limits than about marketing an "anonymous" label we
can't deliver.

## What Zip blocks by default

| Threat | What Zip does |
|--------|---------------|
| Known third-party trackers (Google Analytics, Facebook Pixel, etc.) | Blocks requests to known tracker hosts on cross-site navigations. First-party loads of your own analytics are allowed. |
| Fingerprinting via Client Hints | Strips `Sec-CH-UA-Full-Version-List`, `-Model`, `-Arch`, `-Full-Version`, `-Platform-Version`. In private windows, also strips `-Bitness` and `-WoW64`. |
| Referrer leaks | Trims `Referer` to origin only on cross-origin requests. |
| Permission over-reach | Default-denies geolocation, notifications, camera, microphone, MIDI, HID, serial, USB, Bluetooth, idle-detection, display-capture, window-management. |
| DNS leaks | Routes DNS through DoH (default: Cloudflare via Mozilla, configurable). |
| Insecure HTTPS | Deny-by-default on certificate errors with a clear warning (no "click through" silently). |
| Third-party window.open | `setWindowOpenHandler` denies pop-ups and redirects to new tabs when the user actually clicked a link. |

## What Zip signals to sites

* `Sec-GPC: 1` — Global Privacy Control. In some jurisdictions (US) this is
  a legally recognised "do not sell/share" opt-out.
* `DNT: 1` — Do Not Track. Not legally binding anywhere, but still read by
  some sites.

Zip never claims these headers *stop* a hostile site from tracking you.
They are statements of your preference. The blocking engine is what
actually enforces it.

## What Zip does *not* do

Honesty time:

1. **Zip is not Tor.** We don't route your traffic through onion relays.
   Your ISP sees you're online, and your IP is visible to every site you
   visit. If you need network-level anonymity, use Tor Browser or run Zip
   behind a VPN.
2. **The Chromium engine (prototype) has a different fingerprint than
   Firefox.** The prototype can't match Firefox's RFP (Resist
   Fingerprinting) coverage. That's one of the reasons the `firefox-fork/`
   roadmap exists.
3. **Zip's bundled block list is a snapshot.** It's refreshed by
   `npm run fetch-lists`. If you need a canonical list, point an extension
   like uBlock Origin at EasyPrivacy.
4. **Zip is early.** Audit the code. Don't trust the badge.

## The four tracking-protection levels

Set in Settings → Privacy.

* **Off** — nothing is blocked. Everything else (GPC, DoH, permission
  defaults) still applies.
* **Standard** — known tracker hosts blocked on cross-site requests.
* **Strict** (default) — Standard + stripped client-hint headers +
  third-party cookies isolated.
* **Paranoid** — Strict + referrer trimmed on *every* cross-origin
  request, including same-site. Breaks login flows on some sites.

## Private windows

Each private window gets its own in-memory `partition` (not prefixed with
`persist:`). When the window closes, cookies, cache, local storage and
IndexedDB vanish. The chrome gets a visible tint and border so you can
tell at a glance.

Private windows do **not**:
* share any cookies with normal windows.
* record anything to the on-disk history store.

They do:
* obey the same tracking-protection and DoH settings.
* allow you to download files (they go to disk — that's the point).

## DNS-over-HTTPS

Default endpoint: `https://mozilla.cloudflare-dns.com/dns-query` (Mozilla's
agreement with Cloudflare includes an explicit no-logging policy for
Firefox traffic — the endpoint is used here with the same contract).

Change it in Settings → Privacy → DNS-over-HTTPS. Some good alternatives:

* `https://dns.quad9.net/dns-query` (Quad9)
* `https://doh.mullvad.net/dns-query` (Mullvad)
* `https://dns.nextdns.io/<your-id>` (NextDNS)

## Reporting a security issue

See `SECURITY.md` (coming next). Short version: email the maintainers
rather than opening a public issue.
