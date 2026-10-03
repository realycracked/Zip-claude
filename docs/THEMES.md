# Themes

Zip ships with 12 themes, picked to cover a wide stylistic range:

| ID | Name | Vibe |
|----|------|------|
| `hacker` | Hacker Terminal | Green-on-black monospace with glow |
| `macos` | macOS Monterey | Translucent light panels, blue accent |
| `gamer` | RGB Gamer | Neon red/purple with scanlines |
| `ubuntu` | Ubuntu Aubergine | Orange on aubergine |
| `arch` | Arch Linux | Cyan on deep slate, monospace chrome |
| `cyberpunk` | Cyberpunk 2088 | Hot pink + cyan glow |
| `dracula` | Dracula | Classic purple accent on charcoal |
| `nord` | Nord | Cool arctic blues |
| `gruvbox` | Gruvbox | Warm earthy retro |
| `firefox-classic` | Firefox Classic | Familiar Firefox orange |
| `matrix` | Matrix | Digital-rain green on black |
| `minimal` | Minimal Light | White, flat, library quiet |

## How to write a new theme

Create `src/renderer/styles/themes/<id>.css` and set the shared custom
properties on `:root`:

```css
:root {
  --bg: #...;         /* App background */
  --fg: #...;         /* Default foreground */
  --accent: #...;     /* Links, focus rings, active indicators */
  --accent-glow: rgba(...);  /* Shadow around accent */
  --on-accent: #...;  /* Text on top of accent color */
  --muted: #...;      /* Secondary text, inactive icons */
  --chrome: #...;     /* The top chrome bar background */
  --tab-bg: #...;     /* Inactive tab */
  --tab-active: #...; /* Active tab */
  --tab-hover: #...;  /* Hovered tab */
  --omni: #...;       /* URL bar background */
  --omni-focus: #...; /* URL bar when focused */
  --panel-bg: #...;   /* Settings/downloads panel background */
  --border: rgba(...);/* Hairlines and dividers */
  --danger: #...;     /* Error/close color */
  --private-chrome: ...;    /* Chrome tint for private windows */
  --private-omni: #...;     /* Omnibar tint for private windows */
  --private-border: #...;   /* Private-window border accent */
  --font-chrome: '...', ...; /* Chrome font family */
}
```

Then add the theme to `THEMES` in
`src/renderer/components/settings-panel.js`:

```js
{ id: 'your-id', name: 'Your Theme', hint: 'One line description' }
```

And a swatch gradient in `src/renderer/styles/base.css`:

```css
.theme-swatch--your-id { background: linear-gradient(...); }
```

## Readability checklist

Before merging a theme:

* **Contrast.** The URL bar text and tab titles should hit WCAG AA
  contrast against their background. In practice, 4.5:1 for text.
* **Private mode is distinct.** The private-mode variables should produce
  a chrome that is instantly recognisable as *not normal*.
* **Focus visible.** When the URL bar is focused, the ring/outline must be
  obvious. Keyboard users rely on it.
* **No pure black-on-pure-white without respite.** Full-contrast themes
  are tiring; add a small amount of warmth or coolness.

## User-defined themes (coming next)

Settings → Themes → "Create" will open a form that writes a new theme to
`userData/custom-themes/*.css`. Design is being worked out; today, drop
your file in `src/renderer/styles/themes/`.
