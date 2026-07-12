# Theming, density & RTL

Color, size, and direction are all controlled from the host page — no per-component config, no rebuild. Components read inherited CSS custom properties, so one change on an ancestor re-skins every shadow tree at once.

## The one required stylesheet

`theme.css` (loaded once in the host page, light DOM) ships every `--md-sys-color-*` token plus theme-independent motion/shape/elevation tokens. It defines six color themes, each scoped to a class:

`light` · `dark` · `light-medium-contrast` · `dark-medium-contrast` · `light-high-contrast` · `dark-high-contrast`

Activate one by putting the class on `<html>` (or any ancestor of the components):

```html
<html class="dark">
```

No class → no color tokens → un-themed components. See `references/setup.md` for the full page wiring.

## Switching theme at runtime

Swap the class; the cascade does the rest. Persist the choice yourself.

```js
const THEMES = ['light','dark','light-medium-contrast','dark-medium-contrast',
                'light-high-contrast','dark-high-contrast'];
function setTheme(name) {
  document.documentElement.classList.remove(...THEMES);
  document.documentElement.classList.add(name);
}
```

## Color tokens

Components use `var(--md-sys-color-*)` directly. The full MD3 role set is present: `primary` / `on-primary` / `primary-container` / `on-primary-container`, the same four for `secondary` / `tertiary` / `error`, plus `surface`, `surface-variant`, `surface-container`(-low/-high…), `on-surface`, `on-surface-variant`, `outline`, `outline-variant`, `background`, `on-background`, `inverse-*`, `scrim`, `shadow`, and the `*-fixed` roles. Reference these in your own page CSS to match the components; they follow the active theme automatically.

## Density (A− / A / A+)

Component sizes are in **rem**, so scaling the root font-size rescales every component, spacing, and type token in lockstep. There is no density attribute — set `font-size` on `<html>`:

```js
// 0.8 = compact, 0.9 = comfortable (typical desktop), 1.0 = spacious
document.documentElement.style.fontSize = (0.9 * 16) + 'px';
```

Persist it like the theme. Because everything is rem-based, one line rescales the whole UI without touching any component.

## Re-skinning (new brand color)

1. Open the [Material Theme Builder](https://material-foundation.github.io/material-theme-builder/), pick a seed color or upload an image.
2. Export → Web → CSS — you get the six theme files.
3. Replace them in the library's `src/theme/` (filenames must stay the same) and rebuild `theme.css`, **or** just concatenate the exported files into your own `theme.css` keeping the six class names.
4. No component change is needed — every component reads the same token names regardless of the palette.

## RTL

Every component uses CSS logical properties and direction-aware motion/keyboard handling. Set direction on `<html>` (or any subtree) and layout, animation, and arrow-key behavior flip automatically:

```html
<html dir="rtl" lang="ar" class="light">
```

No component attribute is involved. A subtree can override the page direction by setting its own `dir`.
