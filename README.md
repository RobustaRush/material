# @robustarush/material

[![npm](https://img.shields.io/npm/v/@robustarush/material)](https://www.npmjs.com/package/@robustarush/material)
[![license: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

Material 3 web components built with [Stencil](https://stenciljs.com/). More than
70 custom elements — buttons, text fields, dialogs, data tables — that style
themselves from CSS custom properties and run in any page, with or without a
framework.

Each component bundles its own CSS into its shadow root. The only stylesheet you
load is a theme file of `--md-sys-color-*` tokens. There is no runtime stylesheet
fetch and no build step for consumers.

## Install

```sh
npm install @robustarush/material
```

Or load it from a CDN with no install:

```html
<script type="module" src="https://unpkg.com/@robustarush/material"></script>
```

## Quick start

A page needs three things: the theme stylesheet, a theme class on `<html>`, and
the Material Symbols font.

```html
<html lang="en" class="light">
<head>
  <link rel="stylesheet" href="https://unpkg.com/@robustarush/material/css/theme.css">
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">
  <script type="module" src="https://unpkg.com/@robustarush/material"></script>
</head>
<body>
  <material-button variant="filled" label="It works" icon="check"></material-button>
</body>
</html>
```

- **`theme.css`** carries the `--md-sys-color-*` custom properties. They cascade
  into every shadow tree, so components render themed with no per-component setup.
- **The `<html>` class** picks the theme: `light`, `dark`, or one of the four
  contrast variants. No class means no tokens.
- **The Material Symbols font** renders the `icon="..."` ligatures. Without it,
  icons show as their text names.

## Loading options

| Method | Source | Use it when |
|--------|--------|-------------|
| Single bundle | `unpkg.com/@robustarush/material` (~590 KB, all elements eager) | You want one file and use many components. |
| Lazy loader | `.../dist/material/material.esm.js` (small entry) | A page uses a few components; chunks load on demand. |

With a bundler:

```js
import { defineCustomElements } from '@robustarush/material/loader';
import '@robustarush/material/theme.css';
defineCustomElements();
```

Or import only the elements you use. Each one registers itself:

```js
import '@robustarush/material/dist/components/material-button.js';
```

## What the components handle

- **Self-contained styles.** No stylesheet to fetch, no adopted-stylesheet
  wiring, no flash of unstyled content. A component renders correctly the moment
  it upgrades.
- **Form association.** Put a field in a `<form>` with a `name` and it posts its
  value, runs constraint validation (`required`, `checkValidity()`,
  `reportValidity()`), and resets with the form. No hidden inputs.
- **Server-first.** Components enhance server-rendered markup, such as a real
  `<table>` inside `material-data-table` or a real `<form>` post, instead of
  owning a client-side data model.
- **Plain events.** Every interaction is a `CustomEvent` you read with
  `addEventListener` (`valueChange`, `materialSort`, …).
- **RTL and i18n.** Set `dir="rtl"` on any subtree and layout, animation, and
  keyboard direction follow. Strings and formats come from your `gettext` and
  `Intl`, English by default.
- **Accessibility.** Keyboard navigation, focus rings, 48dp touch targets,
  Windows High Contrast, and `prefers-reduced-motion` are built in.

## Components

| Group | Elements | Reference |
|-------|----------|-----------|
| Actions | button, icon-button, fab, fab-menu, split-button, button-group, chip, chip-set | [actions.md](skills/material-web-components/references/actions.md) |
| Text fields | textfield, textarea, number-field, masked-field, date-field, time-field, datetime-field, date-range-field, file-field, json-field | [fields.md](skills/material-web-components/references/fields.md) |
| Selection | checkbox, radio, switch, slider, select, autocomplete, dropzone | [forms.md](skills/material-web-components/references/forms.md) |
| Navigation | app-bar, toolbar, navigation-bar, navigation-rail, navigation-group, navigation-item, tabs, breadcrumbs, pagination, stepper | [navigation.md](skills/material-web-components/references/navigation.md) |
| Overlays | dialog, bottom-sheet, side-sheet, menu, tooltip, snackbar, command-palette | [overlays.md](skills/material-web-components/references/overlays.md) |
| Data & display | data-table, list, card, avatar, badge, divider, tree, transfer, calendar, carousel, rich-text, time-picker | [display.md](skills/material-web-components/references/display.md), [data-table.md](skills/material-web-components/references/data-table.md), [lists.md](skills/material-web-components/references/lists.md) |
| Progress | linear-progress, circular-progress, loading-indicator, skeleton | [progress.md](skills/material-web-components/references/progress.md) |
| Search | search, search-app-bar | [search.md](skills/material-web-components/references/search.md) |

Tags and attributes are kebab-case (`<material-date-field first-day-of-week="1">`).
Boolean attributes follow HTML rules: present means true.

## Theming

`theme.css` holds the tokens from
[Material Theme Builder](https://material-foundation.github.io/material-theme-builder/),
scoped to six classes: `light`, `dark`, and a medium- and high-contrast variant of
each. Switch themes by changing the `<html>` class.

To use your own palette, export a new set from the builder (Export → Web → CSS),
replace the six files in `src/theme/`, and rebuild. Component code never changes,
because every element reads the same `--md-sys-color-*` names. See
[theming.md](skills/material-web-components/references/theming.md).

## Documentation

Each area has a reference under `skills/material-web-components/references/`:

- [setup.md](skills/material-web-components/references/setup.md) — loading the library on a page
- [theming.md](skills/material-web-components/references/theming.md) — tokens and palettes
- [forms.md](skills/material-web-components/references/forms.md) / [fields.md](skills/material-web-components/references/fields.md) — form controls and validation
- [navigation.md](skills/material-web-components/references/navigation.md), [overlays.md](skills/material-web-components/references/overlays.md), [display.md](skills/material-web-components/references/display.md), [lists.md](skills/material-web-components/references/lists.md), [data-table.md](skills/material-web-components/references/data-table.md), [progress.md](skills/material-web-components/references/progress.md), [search.md](skills/material-web-components/references/search.md), [stepper.md](skills/material-web-components/references/stepper.md)
- [i18n.md](skills/material-web-components/references/i18n.md) — catalogs and formats
- [integrations.md](skills/material-web-components/references/integrations.md) — what you wire up (endpoints, persistence, file upload, maps)

## Development

Build from source and run the dev server:

```sh
git clone https://github.com/RobustaRush/material
cd material && npm install
npm start        # http://localhost:3333
```

`npm start` runs three watchers: theme bundling, Tailwind for the demo pages, and
Stencil's dev server. Every component has a demo page at
`src/demos/<component>.html`, which is where behavior is checked. There are no unit
tests; the components are mostly CSS, so demo pages carry the test cases.

Build the package:

```sh
npm run build    # theme.css + Stencil dist/ + single-file CDN bundle
```

`npm publish` runs this build first through `prepublishOnly`.

Add a component:

```sh
npx stencil generate material-card
```

Keep each component's styles in its own shadow root and read `var(--md-sys-color-*)`
directly. `src/global/material.css` is a Tailwind entry for the demo and showcase
pages only; no `<material-*>` element depends on it.

## License

[AGPL-3.0-or-later](LICENSE).
