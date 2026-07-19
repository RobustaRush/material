# Setup — loading the library on a page

One stylesheet, one script, one class on `<html>`. No bundler required; components lazy-load their own chunks.

## Install

```sh
npm install @robustarush/material
```

The package ships the components, the TypeScript types, and `theme.css`. Serve
`node_modules/@robustarush/material/css/theme.css` (import it via
`@robustarush/material/theme.css`) and, for the no-bundler path, the ESM entry
under your static assets.

## CDN (no install, no build step)

The whole library is also one self-contained ESM file — every `<material-*>`
registers on load:

```html
<html lang="en" class="light">
<head>
  <link rel="stylesheet" href="https://unpkg.com/@robustarush/material/css/theme.css">
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">
  <script type="module" src="https://unpkg.com/@robustarush/material"></script>
</head>
<body>
  <material-button variant="filled" label="It works"></material-button>
</body>
</html>
```

`https://unpkg.com/@robustarush/material` resolves to the single bundle
(`cdn/material.min.js`, ~590 KB — all 72 components eager). For pages that use a
handful of components, prefer the **lazy loader** below (small entry, chunks
fetched on demand): `https://unpkg.com/@robustarush/material/dist/material/material.esm.js`.

## Page wiring (self-hosted, no build step)

```html
<html lang="en" class="light">
<head>
  <link rel="stylesheet" href="/static/material/theme.css">
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">
  <!-- one eager bundle … -->
  <script type="module" src="/static/material/material.min.js"></script>
  <!-- … or the lazy loader (chunks fetched on demand) -->
  <!-- <script type="module" src="/static/material/material.esm.js"></script> -->
</head>
<body>
  <material-button variant="filled" label="It works"></material-button>
</body>
</html>
```

Three requirements, each load-bearing:

- **`theme.css` in the host page (light DOM)** — ships the `--md-sys-color-*` custom properties. They cascade into every shadow tree; without it components render un-themed.
- **A theme class on `<html>`** — one of `light`, `dark`, `light-medium-contrast`, `dark-medium-contrast`, `light-high-contrast`, `dark-high-contrast`. No class → no tokens. See `theming.md`.
- **Material Symbols Outlined font** — every `icon="..."` attribute is a [Material Symbols](https://fonts.google.com/icons) ligature name (`search`, `arrow_back`, `delete`). Without the font, icons render as raw text.

Nothing else: each component's CSS is bundled into its JS chunk and scoped to its shadow root — no per-component stylesheet, no FOUC-management, no adopted-stylesheet setup.

## With a bundler

Lazy loader (recommended — components load on demand):

```js
import { defineCustomElements } from '@robustarush/material/loader';
import '@robustarush/material/theme.css';   // if your bundler handles CSS
defineCustomElements();
```

Or import only the components you use (tree-shakeable, each self-registers):

```js
import '@robustarush/material/dist/components/material-button.js';
import '@robustarush/material/dist/components/material-switch.js';
```

Still ensure the theme class on `<html>` and the icon font are present (the
font can't be bundled — it's a webfont link in the host page).

## Verifying

Open the page: the button renders filled with the theme's primary color (not a bare `<button>`), and `document.querySelector('material-button').shadowRoot` is non-null. If components stay invisible/unstyled, check the browser console for a 404 on the bundle and confirm both the `theme.css` link and the `<html>` theme class are present.

## Conventions (apply to every component)

- Tags and attributes are kebab-case: `<material-date-field first-day-of-week="1">`. Boolean attributes follow HTML rules — present = true.
- Form components are **form-associated custom elements**: put them in a plain `<form>` with a `name` and they post values, participate in constraint validation (`required`, `checkValidity()`, `reportValidity()`), and reset with the form. No hidden-input hacks needed.
- Events are `CustomEvent`s with a `detail` payload, named `valueChange` / `checkedChange` / `material*` (`materialSort`, `materialStepChange`, …). Listen with plain `addEventListener`.
- Server-first: components enhance server-rendered markup (a real `<table>` inside `material-data-table`, real `<form>` posts) rather than owning a client-side data model.
- RTL works out of the box — set `dir="rtl"` on `<html>` (or any subtree); layout, animation, and keyboard direction follow.
