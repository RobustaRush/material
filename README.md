# advanced-material-web

[![npm](https://img.shields.io/npm/v/advanced-material-web)](https://www.npmjs.com/package/advanced-material-web)
[![license: AGPL-3.0 + exception](https://img.shields.io/badge/license-AGPL--3.0%20%2B%20exception-blue)](LICENSE_EXCEPTION)

Material 3 web components built with [Stencil](https://stenciljs.com/). More than
70 custom elements — buttons, text fields, dialogs, data tables — that style
themselves from CSS custom properties and run in any page, with or without a
framework.

Each component bundles its own CSS into its shadow root. The only stylesheet you
load is a theme file of `--md-sys-color-*` tokens — with one exception:
`material-data-table` and `material-breadcrumbs` enhance real light-DOM markup
(a server-rendered `<table>`, a real `<nav>`) rather than a shadow root, so
their styling ships as a second, optional stylesheet (`material.css`). There
is no runtime stylesheet fetch and no build step for consumers.

## Install

```sh
npm install advanced-material-web
```

Or load it from a CDN with no install:

```html
<script type="module" src="https://unpkg.com/advanced-material-web"></script>
```

## Quick start

A page needs three things: the theme stylesheet, a theme class on `<html>`, and
the Material Symbols font.

```html
<html lang="en" class="light">
<head>
  <link rel="stylesheet" href="https://unpkg.com/advanced-material-web/css/theme.css">
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">
  <script type="module" src="https://unpkg.com/advanced-material-web"></script>
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

Using `material-data-table` or `material-breadcrumbs`? Add
`advanced-material-web/material.css` next to `theme.css` — see
[Light-DOM components](#light-dom-components).

## Loading options

| Method | Source | Use it when |
|--------|--------|-------------|
| Single bundle | `unpkg.com/advanced-material-web` (~590 KB, all elements eager) | You want one file and use many components. |
| Lazy loader | `.../dist/material/material.esm.js` (small entry) | A page uses a few components; chunks load on demand. |

With a bundler:

```js
import { defineCustomElements } from 'advanced-material-web/loader';
import 'advanced-material-web/theme.css';
defineCustomElements();
```

Or import only the elements you use. Each one registers itself:

```js
import 'advanced-material-web/dist/components/material-button.js';
```

## Frameworks

The elements work in any framework as-is. The same install also carries typed props, real event
bindings, two-way binding and — for React and Vue — server rendering, as subpath imports:

```js
import { MaterialButton } from 'advanced-material-web/react';     // React 18+, Next.js / Remix SSR
import { MaterialButton } from 'advanced-material-web/vue';       // Vue 3.5+, v-model, Nuxt SSR
import { MaterialButton } from 'advanced-material-web/angular';   // Angular 19+, standalone, reactive forms
import { MaterialButton } from 'advanced-material-web/svelte';    // Svelte 5, bind:value
```

No separate install and no version to keep in lockstep — each subpath is generated from the same
component sources on every release. See [`docs/frameworks.md`](docs/frameworks.md).

The package also ships editor metadata — VS Code custom data, JetBrains web-types, and a Custom
Elements Manifest — so `<material-*>` tags autocomplete in plain HTML and server templates. Setup is
in [`docs/frameworks.md`](docs/frameworks.md#editor-and-tooling-metadata).

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
| Actions | button, icon-button, fab, fab-menu, split-button, button-group, chip, chip-set | [actions.md](skills/material-web/references/actions.md) |
| Text fields | textfield, textarea, number-field, masked-field, date-field, time-field, datetime-field, date-range-field, file-field, json-field | [fields.md](skills/material-web/references/fields.md) |
| Selection | checkbox, radio, switch, slider, select, autocomplete, dropzone | [forms.md](skills/material-web/references/forms.md) |
| Navigation | app-bar, toolbar, navigation-bar, navigation-rail, navigation-group, navigation-item, tabs, breadcrumbs, pagination, stepper | [navigation.md](skills/material-web/references/navigation.md) |
| Overlays | dialog, bottom-sheet, side-sheet, menu, tooltip, snackbar, command-palette | [overlays.md](skills/material-web/references/overlays.md) |
| Data & display | data-table, list, card, avatar, badge, divider, tree, transfer, calendar, carousel, rich-text, time-picker | [display.md](skills/material-web/references/display.md), [data-table.md](skills/material-web/references/data-table.md), [lists.md](skills/material-web/references/lists.md) |
| Progress | linear-progress, circular-progress, loading-indicator, skeleton | [progress.md](skills/material-web/references/progress.md) |
| Search | search, search-app-bar | [search.md](skills/material-web/references/search.md) |

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
[theming.md](skills/material-web/references/theming.md).

## Light-DOM components

`material-data-table` and `material-breadcrumbs` enhance real server-rendered
markup — a `<table>`, a `<nav>` — instead of owning a shadow root, so their
styling can't be bundled into a JS chunk the way every other component's is.
It ships as `material.css`, loaded the same way as `theme.css`:

```html
<link rel="stylesheet" href="https://unpkg.com/advanced-material-web/css/theme.css">
<link rel="stylesheet" href="https://unpkg.com/advanced-material-web/css/material.css">
```

Skip it and the rest of the library still works — only these two render
unstyled. Any future component built the same server-first way (enhancing
markup that has to exist without JS) joins this file rather than getting its
own.

## Documentation

Each area has a reference under `skills/material-web/references/`:

- [setup.md](skills/material-web/references/setup.md) — loading the library on a page
- [theming.md](skills/material-web/references/theming.md) — tokens and palettes
- [forms.md](skills/material-web/references/forms.md) / [fields.md](skills/material-web/references/fields.md) — form controls and validation
- [navigation.md](skills/material-web/references/navigation.md), [overlays.md](skills/material-web/references/overlays.md), [display.md](skills/material-web/references/display.md), [lists.md](skills/material-web/references/lists.md), [data-table.md](skills/material-web/references/data-table.md), [progress.md](skills/material-web/references/progress.md), [search.md](skills/material-web/references/search.md), [stepper.md](skills/material-web/references/stepper.md)
- [i18n.md](skills/material-web/references/i18n.md) — catalogs and formats
- [integrations.md](skills/material-web/references/integrations.md) — what you wire up (endpoints, persistence, file upload)

Framework packages and editor tooling: [docs/frameworks.md](docs/frameworks.md).

## Development

Build from source and run the dev server:

```sh
git clone https://github.com/viewflow/material
cd material && npm install
npm start        # http://localhost:3333
```

`npm start` runs three watchers: theme bundling, Tailwind for the demo pages, and
Stencil's dev server. Every component has a demo page at
`src/demos/<component>.html`, which is where behavior is checked. There are no unit
tests; the components are mostly CSS, so demo pages carry the test cases.
Watch rebuilds skip the framework wrapper codegen (`MATERIAL_WRAPPERS=0`).

Build the package:

```sh
npm run build       # theme.css + material.css + Stencil dist/ + hydrate/ + tooling JSON + CDN bundle
npm run build:all   # the above, then the four framework adapters under adapters/
```

`npm publish` runs `npm run build:all` first through `prepublishOnly`. The framework adapters are
subpath exports of this same package, not separate ones — see [docs/frameworks.md](docs/frameworks.md).

Add a component:

```sh
npx stencil generate material-card
```

Keep each component's styles in its own shadow root and read `var(--md-sys-color-*)`
directly — `src/global/material.css` is a Tailwind entry for the demo and
showcase pages, plus the source `npm run build:material:pkg` reads to produce
the published `css/material.css` (see [Light-DOM components](#light-dom-components)
above). A component's own shadow-DOM styles never depend on it; only the two
light-DOM components it `@import`s under `layer(components)` do.

## License

`advanced-material-web` is an Open Source project. It uses the AGPL license,
[The GNU Affero General Public License v3.0](http://www.gnu.org/licenses/agpl-3.0.html),
with the additional permissions in [LICENSE_EXCEPTION](./LICENSE_EXCEPTION).

The exception permits you to use this package in a project that has a license
which is not compatible with the AGPL. A proprietary project is included. Your
own code keeps your own license, and you do not release its source. The
condition is that you do not change the source code of this package — importing
the components, styling them through CSS custom properties, and shipping the
bundle as-is all stay within the exception.

If you do change this package, the AGPL applies to your modified version of it.

The license scheme is the same as the license scheme of the GCC Runtime Library.
The text above is a summary. Read [LICENSE_EXCEPTION](./LICENSE_EXCEPTION) for
the conditions.

### Every file carries the notice

The exception applies to a library that "bears a notice placed by the copyright
holder" naming the AGPL and the exception — so every source file carries that
notice in its header, and `npm run license:check` fails the build if one drifts.
`scripts/license-header.mjs` holds the text and stamps it; edit it there, never
file by file.

Minified artifacts (`cdn/material.min.js`, `css/material.css`) drop the per-file
copies and carry the notice once, in a banner at the top.

### Generating code from this package with an LLM

Passing these files to a model — as context, as a prompt, as training data —
copies them, and the copy is governed by the AGPL like any other. The copyright
holder therefore regards code produced that way as a derived work of this
package, whether or not the result is a literal copy.

This is a statement of the copyright holder's position, not an extra condition
bolted onto the AGPL: AGPLv3 section 7 lets a recipient remove added conditions
outside its own enumerated list, so adding one would achieve nothing except
making the license read as something other than AGPL to license scanners.

Rewriting the components with a model in order to avoid the copyleft is the case
this is about. If that is what you need,
[a commercial license](https://viewflow.io/pro.html) removes the copyleft
outright and is the cheaper path.
