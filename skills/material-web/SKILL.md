---
name: material-web
description: Build UIs with @viewflow/material — 72 Material 3 web components (forms, data-table, JSON editor, dialogs, navigation, date/time pickers, stepper, tree, search, carousel, snackbar). Server-first and form-associated: components enhance plain HTML and post real values through a normal <form>, themeable via CSS custom properties with no build step. Use whenever the user is building a page, form, table, dialog, or app shell with these <material-*> elements, wiring one into a project, or asking which component fits a UI need.
---

## What this is

`@viewflow/material` — 72 Material 3 custom elements (`<material-*>`). Each ships its own shadow-DOM CSS inside a lazy-loaded JS chunk: no framework, no bundler required.

Four properties shape every component, and they are not the defaults you'd assume:

- **Server-first** — components enhance server-rendered markup (a real `<table>` inside `material-data-table`, real `<option>`s inside `material-select`). They add behavior; they never own a client-side data model or fetch your data for you.
- **Form-associated** — every input is a form-associated custom element. `name` + a plain `<form>` = a real posted value, real constraint validation, real form reset. No hidden inputs.
- **Themed by cascade** — all color and size come from `--md-sys-color-*` / rem tokens that inherit into shadow DOM. One class on `<html>` swaps the theme; root font-size rescales density.
- **RTL-native** — `dir="rtl"` on any subtree flips layout, motion, and keyboard direction. No attribute involved.

## How to use this skill

1. Read `references/setup.md` first — the page wiring is load-bearing and identical for every component.
2. Open the reference for your component below; it carries the exact attributes, events, and methods.
3. Not covered there? The authoritative API is `src/components/<tag>/readme.md` in the repo; live demos are `src/demos/<tag>.html`.

## Component map

| Reference | Components |
| --- | --- |
| `forms.md` | `textfield` `textarea` `select` (+`option`, `optgroup`) `autocomplete` `checkbox` `radio-group` (+`radio`) `switch` `slider` |
| `fields.md` | `number-field` `masked-field` `date-field` `date-range-field` `time-field` `datetime-field` `time-picker` `calendar` `file-field` `dropzone` `rich-text` `json-field` |
| `actions.md` | `button` `icon-button` `button-group` `split-button` `fab` `fab-menu` (+`fab-menu-item`) `chip` `chip-set` |
| `navigation.md` | `app-bar` `search-app-bar` `toolbar` `tabs` (+`tab`) `navigation-bar` `navigation-rail` `navigation-item` `navigation-group` `breadcrumbs` `pagination` |
| `overlays.md` | `dialog` `bottom-sheet` `side-sheet` `menu` (+`menu-item`) `tooltip` `snackbar` (+`snackbar-host`) |
| `data-table.md` | `data-table` — sorting, selection, virtual scroll, resize/reorder, pinned columns, grouping, inline edit, responsive columns |
| `lists.md` | `list` (+`list-item`) `tree` (+`tree-item`) `transfer` `divider` |
| `progress.md` | `linear-progress` `circular-progress` `loading-indicator` `skeleton` |
| `search.md` | `search` `command-palette` |
| `stepper.md` | `stepper` (+`step`) — client-validated wizard or server-driven indicator |
| `display.md` | `card` `carousel` (+`carousel-item`) `avatar` `avatar-group` `badge` |

All tags are prefixed `material-` (`material-textfield`, `material-data-table`).

Cross-cutting: `theming.md` (six contrast themes, rem density, re-skinning, RTL) · `i18n.md` (string and format resolution) · `integrations.md` (what *you* wire up: endpoints, persistence, uploads, catalogs).

## Choosing a component

- Text → `textfield`; multi-line → `textarea`; number/currency → `number-field`; phone/card pattern → `masked-field`.
- One of many → `select`; typeahead or remote → `autocomplete`; large two-sided pick → `transfer`.
- Date → `date-field`; range → `date-range-field`; inline month grid → `calendar`.
- Tabular → `data-table` (wrap a real `<table>`); hierarchical → `tree`; a JSON/config object → `json-field`.
- Transient message → `snackbar`; modal decision → `dialog`; side panel → `side-sheet`; mobile action tray → `bottom-sheet`.
- Loading placeholder → `skeleton`; progress → `linear-progress` / `circular-progress`.
