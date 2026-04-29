# @robustarush/material

Material web components built with [Stencil](https://stenciljs.com/).
Tailwind v4 produces a single external stylesheet that components adopt into
their shadow roots — no per-component style bundling.

## Quick start

```bash
npm install
npm start            # builds Tailwind in --watch and runs the Stencil dev server
```

Open <http://localhost:3333>.

## Project layout

```
src/
  components/
    material-button/        # one component per folder, tag prefix is `material-`
  global/
    material.css            # Tailwind v4 entry: @import "tailwindcss"; + @theme tokens
  utils/
    adopted-styles.ts       # adoptMaterialStyles(shadowRoot) helper
www/
  index.html                # dev host page
  static/material/material.css   # Tailwind output (gitignored)
```

## How styling works

1. `npm run build:css` compiles `src/global/material.css` to
   `www/static/material/material.css` using `@tailwindcss/cli`.
2. The host page links the same file:
   ```html
   <link rel="stylesheet" href="/static/material/material.css" />
   ```
3. Each component calls `adoptMaterialStyles(this.el.shadowRoot)` in
   `connectedCallback`. The CSS is fetched once, parsed into a single
   `CSSStyleSheet`, and adopted by every shadow root via
   [`adoptedStyleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets).
   No FOUC after the first load; no duplicate parsing.

### Overriding the stylesheet URL

Default: `/static/material/material.css` (matches Django staticfiles).

Override per page:

```html
<meta name="material-stylesheet" content="/assets/material.css" />
```

## Adding a component

```bash
npx stencil generate material-card
```

Then in the new component:

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
    return <div class="rounded-lg shadow p-4 bg-white"><slot /></div>;
  }
}
```

Tailwind classes used in `.tsx` files are picked up automatically — the
`@source "../**/*.{ts,tsx}"` directive in `material.css` tells Tailwind v4
where to scan.

## Build

```bash
npm run build        # tailwind --minify, then stencil build (dist/, loader/, www/)
```
