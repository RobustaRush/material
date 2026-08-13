# Theming, density & RTL

Color, size, and direction are all controlled from the host page — no per-component config, no rebuild. Components read inherited CSS custom properties, so one change on an ancestor re-skins every shadow tree at once.

## The one required stylesheet

`theme.css` (loaded once in the host page, light DOM) ships every `--md-sys-color-*` token plus the theme-independent type-scale/motion/shape/elevation tokens. It defines six color themes, each scoped to a class:

`light` · `dark` · `light-medium-contrast` · `dark-medium-contrast` · `light-high-contrast` · `dark-high-contrast`

Activate one by putting the class on `<html>` (or any ancestor of the components):

```html
<html class="dark">
```

No class → no color tokens → un-themed components. See `references/setup.md` for the full page wiring, including `material.css`.

It is two halves in one file, and the split matters when replacing the palette:

| Published | Contents | Origin |
| --- | --- | --- |
| `tokens.css` | type scale, motion, shape, elevation, focus ring | the library, from the M3 spec |
| the six palette classes | `--md-sys-color-*` only | Material Theme Builder |

`theme.css` = `tokens.css` + the palettes. Loading it is still one `<link>`; the parts exist so a Theme Builder export can stand in for the palette half alone (see Re-skinning).

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
2. Export → Web → CSS.
3. Load `tokens.css` **and your export**, instead of `theme.css`. Keep the six class names — they are the contract that the `dark:` variant in `tailwind.css` and the runtime switcher above both key off.

```html
<link rel="stylesheet" href="/static/material/tokens.css">
<link rel="stylesheet" href="/static/my-theme.css">
```

No build step, no component change: every component reads the same token names regardless of the palette. Do **not** put an export in place of the whole of `theme.css` — Theme Builder emits colors only, so the type scale, radii, shadows and motion curves would disappear with it, and any Tailwind utility bridged off them would resolve to nothing.

Working inside this repo instead of consuming the package: replace the six files in `src/theme/` (filenames must stay the same) and rebuild.

## Tailwind projects

`advanced-material-web/tailwind.css` maps the whole token set into Tailwind v4's theme namespaces, so the stock utilities are Material-flavoured — no new class names:

```css
@import "tailwindcss";
@import "advanced-material-web/tailwind.css";
```

Covers colors (including `*-fixed`), the type scale as both `text-xs`…`text-6xl` and MD3 roles (`text-body-large`), `rounded-*` from the corner tokens, `shadow-*` from elevation plus explicit `shadow-elevation-1…5`, and `ease-*` / `duration-*` from the motion tokens. Every value stays a `var()` reference, so a palette swap needs no rebuild. `dark:` is repointed at the theme classes rather than `prefers-color-scheme`.

The page still loads `tokens.css` or `theme.css` — the bridge declares utilities, not token values.

## No build step: ready-made classes

`material.css` carries the type scale and a form grid as plain classes, for pages without Tailwind:

```html
<h1 class="md-typescale-headline-large">Title</h1>

<form class="md-grid">
  <material-textfield label="First name" style="--md-span: 3"></material-textfield>
  <material-textfield label="Address"    style="--md-span: 12"></material-textfield>
</form>
```

One class per MD3 typescale role (`md-typescale-body-large`, matching `@material/web`'s names). The grid is 12 tracks by default (`--md-grid-columns`, `--md-grid-gap` on the container, `--md-span` per child) and sizes itself with a **container** query: below 30rem of its own width every child takes a full row, above it each takes its span, clamped to the tracks that exist. `md-grid-auto` reflows equal tracks sized by `--md-grid-min` instead. Everything sits in a cascade layer, so unlayered page CSS wins without `!important`.

## RTL

Every component uses CSS logical properties and direction-aware motion/keyboard handling. Set direction on `<html>` (or any subtree) and layout, animation, and arrow-key behavior flip automatically:

```html
<html dir="rtl" lang="ar" class="light">
```

No component attribute is involved. A subtree can override the page direction by setting its own `dir`.
