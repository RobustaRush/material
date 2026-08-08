# Consumer-provided integrations — what you wire up

The library ships behavior, emits events, and reads endpoints **you** provide. It never owns your data, storage, or auth. This file lists every consumer-side responsibility — read it before assuming a component talks to your backend by itself.

## Baseline (every page)

`theme.css` + a theme class on `<html>`, the Material Symbols Outlined font, the ESM bundle. See `references/setup.md`.

## Remote data endpoints

These components fetch from an endpoint you host, appending the query and expecting a JSON array. You own the URL, filtering, paging, and auth.

- `material-autocomplete src="/api/…"` — server filters, `?q=` appended (rename with `query-param`); tune `debounce` / `min-chars`.
- `material-search src="…"` — same contract for the search view.
- `material-tree src="…"` — lazy children fetched as `src?parent=<value>` on expand; or omit `src` and handle the `materialTreeLoad` event to insert children yourself.
- `material-command-palette` — supply `commands` (JS array) or slotted items.

## Server persistence (you handle the events)

These components change the DOM but persist nothing — listen and issue your own request (with your framework's CSRF/auth):

- `material-data-table` — `materialSort`, `materialColumnResize`, `materialColumnReorder`, `materialSelectionChange`, `materialGroupToggle`, `materialCellEdit`. The table re-sorts/re-orders visually; saving column widths, order, or edited cells is yours.
- `material-pagination` — either `href-template` (real links your server routes) or the `materialPageChange` event (you fetch the page).
- `material-stepper` server-driven mode — `materialStepClick` (cancelable) → you `preventDefault()` and submit your own step-navigation request.

## File upload (material-dropzone)

The dropzone posts files with the surrounding form for a normal multipart submit. For **async** upload you run the transfer yourself — `fetch`/`XHR` per file — and drive the UI with `setProgress(file, fraction | "done")`. The component renders progress; it does not upload.

## Internationalization

See `references/i18n.md`. Define `window.gettext` / `pgettext` / `get_format` and the init flag before the bundle loads to use your own catalogs. Without them, strings fall back to English and formats to `Intl` for `<html lang>` — no wiring required.

## Not in the library

No map/geometry field and no chart components ship today. Both are roadmap items designed to be engine-agnostic (an adapter for maps, an MD3 token bridge for ECharts) — don't reach for a `material-*` tag for either; use the engine directly.

## The rule of thumb

If it needs your database, your auth, your API keys, or a multi-hundred-KB engine, it stays on your side — the component reaches it through an endpoint, an event, or an adapter, never by bundling it.
