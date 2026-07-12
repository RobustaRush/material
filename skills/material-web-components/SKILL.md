---
name: material-web-components
description: Build UIs with @robustarush/material — 70 Material 3 web components (forms, data-table, dialogs, navigation, date/time pickers, stepper, tree, search, carousel, snackbar). Server-first and form-associated: components enhance plain HTML and post real values through a normal <form>, themeable via CSS custom properties with no build step. Use whenever the user is building a page, form, table, dialog, or app shell with these <material-*> elements, wiring one into a project, or asking which component fits a UI need.
---

## What this is

`@robustarush/material` is a library of 70 Material 3 custom elements (`<material-*>`). Each ships its own shadow-DOM CSS bundled into a lazy-loaded JS chunk — no required stylesheet fetch, no bundler, no framework. Load `theme.css` + the ESM bundle, put a theme class on `<html>`, and use the tags. See `references/setup.md` **first** for the exact page wiring — it is load-bearing and the same for every component.

Design principles that shape how you use every component:

- **Server-first.** Components enhance server-rendered markup — a real `<table>` inside `material-data-table`, real `<option>`s inside `material-select`, a real `<form>` around inputs. They add behavior; they do not own a client-side data model.
- **Form-associated.** Every input is a form-associated custom element: give it a `name`, drop it in a `<form>`, and it posts a real value, participates in constraint validation (`required`, `error`), and resets with the form. No hidden inputs.
- **Theme via cascade.** All color/size come from `--md-sys-color-*` / rem tokens that inherit into shadow DOM. Swap the theme by swapping one class; rescale density by changing root font-size. See `references/theming.md`.
- **RTL-native.** `dir="rtl"` on any subtree flips layout, motion, and keyboard direction automatically.

## How to use this skill

1. Read `references/setup.md` before writing any markup — it defines the page wiring and the conventions (kebab-case attributes, `CustomEvent` naming, boolean attributes) that every component follows.
2. Find the component in the map below and open its reference for exact attributes, events, methods, and a working snippet.
3. Every attribute/event/method in the references is verified against the component's generated `readme.md`. If you need a prop not covered, the authoritative API table is `src/components/<tag>/readme.md` in the repo; live demos are `src/demos/<tag>.html`.

## Component map

**`references/forms.md` — form controls**
`material-textfield` · `material-textarea` · `material-select` (+`material-option`, `material-optgroup`) · `material-autocomplete` · `material-checkbox` · `material-radio-group` (+`material-radio`) · `material-switch` · `material-slider`

**`references/fields.md` — specialized & formatted fields**
`material-number-field` · `material-masked-field` · `material-date-field` · `material-date-range-field` · `material-time-field` · `material-datetime-field` · `material-time-picker` · `material-calendar` · `material-file-field` · `material-dropzone` · `material-rich-text`

**`references/actions.md` — buttons & actions**
`material-button` · `material-icon-button` · `material-button-group` · `material-split-button` · `material-fab` · `material-fab-menu` (+`material-fab-menu-item`) · `material-chip`

**`references/navigation.md` — navigation & app shell**
`material-app-bar` · `material-search-app-bar` · `material-toolbar` · `material-tabs` (+`material-tab`) · `material-navigation-bar` · `material-navigation-rail` · `material-navigation-item` · `material-navigation-group` · `material-breadcrumbs` · `material-pagination`

**`references/overlays.md` — dialogs, sheets, menus, feedback**
`material-dialog` · `material-bottom-sheet` · `material-side-sheet` · `material-menu` (+`material-menu-item`) · `material-tooltip` · `material-snackbar` (+`material-snackbar-host`)

**`references/data-table.md` — data table**
`material-data-table` — sorting, selection, virtual scroll, resize/reorder, pinned columns, grouping, inline edit, responsive columns.

**`references/lists.md` — lists, tree & transfer**
`material-list` (+`material-list-item`) · `material-tree` · `material-transfer` · `material-divider`

**`references/progress.md` — progress & loading**
`material-linear-progress` · `material-circular-progress` · `material-loading-indicator` · `material-skeleton`

**`references/search.md` — search & command palette**
`material-search` · `material-command-palette`

**`references/stepper.md` — stepper / wizard**
`material-stepper` (+`material-step`) — client-side validated wizard or server-driven step indicator.

**`references/display.md` — cards, media & status**
`material-card` · `material-carousel` (+`material-carousel-item`) · `material-avatar` · `material-avatar-group` · `material-badge`

**`references/theming.md` — theming, density & RTL**
The six MD3 contrast themes, the A−/A/A+ rem density system, re-skinning via Material Theme Builder, and RTL.

**`references/i18n.md` — internationalization**
How component strings and date/number formats resolve (locale globals → `Intl` → English), and label props that override everything.

## Choosing a component (common needs)

- Text input → `material-textfield`; multi-line → `material-textarea`; number/currency → `material-number-field`; phone/card mask → `material-masked-field`.
- Pick one of many → `material-select`; with typeahead/remote → `material-autocomplete`; huge two-sided pick → `material-transfer`.
- Date → `material-date-field`; range → `material-date-range-field`; inline month grid → `material-calendar`.
- Tabular data → `material-data-table` (wrap a real `<table>`); hierarchical → `material-tree`.
- Transient message → `material-snackbar`; modal decision → `material-dialog`; side panel → `material-side-sheet`; mobile action tray → `material-bottom-sheet`.
- Multi-step form → `references/stepper.md`.
- Loading placeholder → `material-skeleton`; progress → `material-linear-progress` / `material-circular-progress`.
