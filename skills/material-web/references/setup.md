# Setup — loading the library on a page

One stylesheet, one script, one class on `<html>`. No bundler required; components lazy-load their own chunks.

## Install

```sh
npm install advanced-material-web
```

Ships components, TypeScript types, `theme.css`, and `material.css`. Serve `node_modules/advanced-material-web/css/theme.css` (importable as `advanced-material-web/theme.css`) and, on the no-bundler path, the ESM entry from your static assets.

## CDN (no install, no build step)

One self-contained ESM file; every `<material-*>` registers on load:

```html
<html lang="en" class="light">
<head>
  <link rel="stylesheet" href="https://unpkg.com/advanced-material-web/css/theme.css">
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">
  <script type="module" src="https://unpkg.com/advanced-material-web"></script>
</head>
<body>
  <material-button variant="filled" label="It works"></material-button>
</body>
</html>
```

`https://unpkg.com/advanced-material-web` resolves to the single eager bundle (`cdn/material.min.js`, ~590 KB, all 72 components). For pages using a handful of components, prefer the lazy loader — small entry, chunks on demand: `https://unpkg.com/advanced-material-web/dist/material/material.esm.js`.

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

## The second stylesheet: material.css

Almost every component's CSS rides inside its JS chunk, scoped to its shadow root. Two are the exception — `material-data-table` and `material-breadcrumbs` enhance markup that stays in the **light DOM** (a server-rendered `<table>`, a real `<nav>`), so their styling ships as `material.css` and must be linked like `theme.css`:

```html
<link rel="stylesheet" href="/static/material/theme.css">
<link rel="stylesheet" href="/static/material/material.css">
```

Skip it and only those two render unstyled; everything else is fine. Any component whose readme says "Styles live in the document stylesheet" needs it.

## With a bundler

```js
// Lazy loader — recommended, components load on demand
import { defineCustomElements } from 'advanced-material-web/loader';
import 'advanced-material-web/theme.css';
defineCustomElements();

// Or import only what you use (each self-registers)
import 'advanced-material-web/dist/components/material-button.js';
```

The theme class and the icon font still have to be in the host page — a webfont link can't be bundled.

## Conventions (every component)

- Tags and attributes are kebab-case: `<material-date-field first-day-of-week="1">`.
- Events are `CustomEvent`s with a `detail` payload, named `valueChange` / `checkedChange` / `material*` (`materialSort`, `materialStepChange`, …).
- Form controls are form-associated: `name` + a plain `<form>` gives real values, real constraint validation, real reset. Never add hidden inputs.
- If a component looks unstyled, the cause is nearly always a missing theme class on `<html>` or a 404 on the bundle.
