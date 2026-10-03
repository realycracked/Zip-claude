# Zip Browser patches

These are the Zip-specific changes applied on top of `mozilla-unified`.

Patches are plain `git apply` format. `setup.sh` applies them automatically
in alphabetical order. If a patch stops applying cleanly (Mozilla moved the
file), regenerate it:

```bash
cd mozilla-unified
# ... edit files ...
git diff > ../patches/00X-my-change.patch
```

| # | File | Summary |
|---|------|---------|
| 001 | `001-branding.patch` | Point `browser/branding/official` chain at Zip |
| 002 | `002-remove-telemetry.patch` | Remove all telemetry endpoints and settings UI |
| 003 | `003-privacy-defaults.patch` | Flip `about:config` to Zip defaults |
| 004 | `004-remove-studies.patch` | Rip out Normandy/SHIELD study runner |
| 005 | `005-themes-pack.patch` | Preload the 12 Zip themes |
| 006 | `006-safer-permissions.patch` | Default-deny geolocation/notifications/media |
| 007 | `007-strip-webpush.patch` | Remove Mozilla WebPush client |
| 008 | `008-brand-newtab.patch` | Replace about:newtab with Zip Start page |

## Keeping patches small

Each patch should be reviewable in one sitting. Prefer many small patches
to one large one. If a patch grows beyond ~1000 lines, split it.

## about:config privacy defaults (what `003-privacy-defaults.patch` sets)

```
privacy.resistFingerprinting            = true
privacy.firstparty.isolate              = true
privacy.trackingprotection.enabled      = true
privacy.trackingprotection.pbmode.enabled = true
privacy.trackingprotection.socialtracking.enabled = true
privacy.donottrackheader.enabled        = true
privacy.globalprivacycontrol.enabled    = true
network.cookie.cookieBehavior           = 5    // Reject trackers + partition
network.http.referer.XOriginTrimmingPolicy = 2
network.trr.mode                        = 2    // DoH enabled, fallback allowed
dom.security.https_only_mode            = true
dom.security.https_only_mode_pbm        = true
browser.safebrowsing.downloads.remote.enabled = false
media.peerconnection.ice.default_address_only = true
geo.enabled                             = false
browser.send_pings                      = false
app.shield.optoutstudies.enabled        = false
app.normandy.enabled                    = false
datareporting.healthreport.uploadEnabled = false
toolkit.telemetry.enabled               = false
toolkit.telemetry.unified               = false
breakpad.reportURL                      = ""
browser.aboutHomeSnippets.updateUrl     = ""
browser.newtabpage.activity-stream.feeds.telemetry = false
```
