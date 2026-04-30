# @robustarush/material

Material 3 web components built with [Stencil](https://stenciljs.com/),
styled with Tailwind v4 against MD3 design tokens.

## Quick start

```bash
npm install
npm start
```

Open <http://localhost:3333>. Three watchers run in parallel: theme bundling,
Tailwind compilation, and Stencil's dev server.

## Two stylesheets, two jobs

```
/static/material/theme.css      Material 3 tokens (--md-sys-color-*)
/static/material/material.css   Tailwind utilities + component styles
```

**`theme.css`** ships exactly the variables produced by
[Material Theme Builder](https://material-foundation.github.io/material-theme-builder/),
scoped to six classes: `.light`, `.dark`, `.light-medium-contrast`,
`.dark-medium-contrast`, `.light-high-contrast`, `.dark-high-contrast`.

**`material.css`** generates Tailwind utilities (`bg-primary`,
`text-on-surface`, …) from a `@theme` block whose values are
`var(--md-sys-color-*)` references. Result: utilities follow whichever theme
class is active.

### Activating a theme

```html
<html class="light">…</html>
```

Or pick any of the 6 contrast variants. Custom properties cascade into shadow
DOM, so every component picks up the active theme without doing anything.

### How styling reaches shadow DOM

- `theme.css` is loaded once in the host page (light DOM only) — its variables
  inherit into every shadow tree for free.
- `material.css` is adopted into each shadow root via
  [`adoptedStyleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets):
  fetched once, parsed once, shared by all instances.

Override the `material.css` URL per page:

```html
<meta name="material-stylesheet" content="/assets/material.css" />
```

Default URL is `/static/material/material.css` — matches Django's
`staticfiles` layout so dev and production hit the same path.

## Project layout

```
src/
  index.html              # dev showcase page (Stencil compiles → www/index.html)
  components/
    material-button/      # one component per folder, tag prefix `material-`
    material-card/
  global/
    material.css          # @import "tailwindcss"; + @theme bridge to MD3 vars
  theme/
    theme.css             # @import all 6 generated theme files
    light.css dark.css
    light-mc.css dark-mc.css
    light-hc.css dark-hc.css
  utils/
    adopted-styles.ts     # adoptMaterialStyles(shadowRoot)
www/                      # build output, fully gitignored — owned by Stencil + Tailwind CLI
  index.html              # generated from src/index.html
  build/                  # Stencil bundles
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

No component change is required — the bridge in `material.css` keeps Tailwind
utilities pointed at whatever MD3 tokens the new theme defines.

## Adding a component

```bash
npx stencil generate material-card
```

Pattern:

```tsx
import { Component, Element, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

@Component({ tag: 'material-card', shadow: true })
export class MaterialCard {
  @Element() el!: HTMLElement;
  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
  }
  render() {
    return (
      <div class="rounded-lg p-4 bg-surface-container text-on-surface shadow">
        <slot />
      </div>
    );
  }
}
```

MD3-aware Tailwind classes available out of the box: `bg-primary`,
`text-on-primary`, `bg-surface-container-{lowest,low,'',high,highest}`,
`bg-secondary-container`, `border-outline-variant`, `text-on-surface-variant`,
… see `src/global/material.css` for the full list.

## Build

```bash
npm run build   # theme.css → material.css → stencil dist/, loader/, www/
```
