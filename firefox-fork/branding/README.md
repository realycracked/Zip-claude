# Zip Browser branding assets

Drop-in replacement for `browser/branding/official/`. `setup.sh` copies
this directory into `mozilla-unified/browser/branding/zip/` and the
mozconfig points at it with `--with-branding=browser/branding/zip`.

| File | What goes here |
|------|----------------|
| `configure.sh` | Shell fragment with product strings (DONE) |
| `content/about-logo.svg` | Logo shown in About dialog (TODO) |
| `content/about-logo@2x.png` | Hi-DPI PNG fallback (TODO) |
| `default*.png` | Taskbar / dock icons at 16, 32, 48, 64, 128, 256 (TODO) |
| `firefox.ico` | Windows icon (TODO) |
| `firefox.icns` | macOS icon (TODO) |
| `locales/en-US/brand.properties` | `brandShortName`, `brandFullName`, etc. (TODO) |
| `locales/en-US/brand.ftl` | Fluent strings (TODO) |

Icon assets will land here as the design system is finalised; until then
the build falls back to Mozilla's unbranded assets.
