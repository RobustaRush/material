# @robustarush/material

Material 3 web components built with [Stencil](https://stenciljs.com/).
Each component ships its own scoped CSS — no required stylesheet fetch, no
build step for consumers.

## Quick start

```bash
npm install
npm start
```

Open <http://localhost:3333>. Three watchers run in parallel: theme bundling,
Tailwind compilation (for the demo pages only, see below), and Stencil's dev
server.

## One stylesheet, one job

```
/static/material/theme.css   Material 3 tokens (--md-sys-color-*)
```

**`theme.css`** ships exactly the variables produced by
[Material Theme Builder](https://material-foundation.github.io/material-theme-builder/),
scoped to six classes: `.light`, `.dark`, `.light-medium-contrast`,
`.dark-medium-contrast`, `.light-high-contrast`, `.dark-high-contrast`.
It's the only stylesheet a consumer of the components needs to load.

### Activating a theme

```html
<html class="light">…</html>
```

Or pick any of the 6 contrast variants. Custom properties cascade into shadow
DOM, so every component picks up the active theme without doing anything
else — no JS, no per-component config, no adopted stylesheet.

### How styling reaches shadow DOM

- `theme.css` is loaded once in the host page (light DOM only) — its
  `--md-sys-color-*` variables inherit into every shadow tree for free.
- Each component's own CSS (bundled into its JS chunk by Stencil, scoped to
  its shadow root) reads those variables directly — e.g.
  `background: var(--md-sys-color-primary)`. Nothing is fetched at runtime;
  the component renders correctly the instant it upgrades.

### `material.css` — optional, for your own page markup only

`src/global/material.css` is a Tailwind v4 entry point (`@import
"tailwindcss"` + a `@theme` bridge that maps `--md-sys-color-*` into
Tailwind utility names like `bg-primary`). It's used by this repo's own demo
and showcase pages to lay out plain HTML around the components — it is
**not** required by, or coupled to, any `<material-*>` element. Skip it
entirely unless you want the same MD3-aware Tailwind utilities in your own
light-DOM markup.

## Project layout

```
src/
  index.html              # dev showcase page (Stencil compiles → www/index.html)
  components/
    material-button/      # one component per folder, tag prefix `material-`
    material-card/
  demos/                  # one demo page per component, Tailwind-styled page chrome
  showcases/              # composed real-world layouts (email, CRM, ERP)
  global/
    material.css          # Tailwind entry for demo/showcase page markup only
  theme/
    theme.css             # @import all 6 generated theme files
    light.css dark.css
    light-mc.css dark-mc.css
    light-hc.css dark-hc.css
www/                      # build output, fully gitignored — owned by Stencil + Tailwind CLI
  index.html               # generated from src/index.html
  build/                   # Stencil bundles
  static/material/
    material.css
    theme.css
```

> **Don't edit `www/index.html`** — Stencil regenerates it from
> `src/index.html` on every build and wipes the directory on `start`. Edit
> the source file instead.

## Regenerating the theme

1. Open <https://material-foundation.github.io/material-theme-builder/>.
2. Pick a seed colour or upload an image.
3. Export → Web → CSS — you get six files.
4. Replace the files in `src/theme/`. Filenames must stay the same.
5. `npm run build:theme` (or just keep `npm start` running).

No component change is required — every component reads the same
`--md-sys-color-*` variable names regardless of which theme is active.

## Adding a component

```bash
npx stencil generate material-card
```

Pattern — self-contained styles, no external stylesheet dependency:

```tsx
import { Component, Prop, h } from '@stencil/core';

@Component({ tag: 'material-card', styleUrl: 'material-card.css', shadow: true })
export class MaterialCard {
  render() {
    return (
      <div part="surface">
        <slot />
      </div>
    );
  }
}
```

```css
/* material-card.css */
[part="surface"] {
  border-radius: 0.75rem;
  padding: 1rem;
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
}
```

Reach for `var(--md-sys-color-*)` directly — see `src/theme/light.css` (or
any of the other five theme files) for the full token list. Reserve
`src/global/material.css` Tailwind utilities for demo/showcase page markup
only, not component internals.

## Build

```bash
npm run build   # theme.css → material.css → stencil dist/, loader/, www/
```

`npm publish` runs this automatically via `prepublishOnly`.
