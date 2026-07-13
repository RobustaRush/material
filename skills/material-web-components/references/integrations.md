# Consumer-provided integrations — what you wire up

The library is server-first and backend-agnostic: it ships behavior, emits events, and reads endpoints **you** provide. It never owns your data, storage, auth, map tiles, or heavy third-party engines. Where a third-party engine is unavoidable (maps, charts) the library ships a thin **reference integration** (adapter / token bridge) you opt into — the engine itself stays on your side, out of the bundle. This file lists every consumer-side responsibility.

## Baseline (every page)

See `references/setup.md`. You provide: `theme.css` + a theme class on `<html>`, the Material Symbols Outlined font, and the ESM bundle. Nothing renders themed without these.

## Remote data endpoints

Several components fetch from an endpoint you host; they append the query and expect a JSON array. You own the URL, filtering, paging, and auth.

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

The dropzone posts files with the surrounding form for a normal multipart submit. For **async** upload you run the transfer: call your `fetch`/`XHR` per file and drive the UI with `setProgress(file, fraction | "done")`. The component renders the progress; it does not upload.

## Internationalization

See `references/i18n.md`. To use your own catalogs/formats, define `window.gettext` / `pgettext` / `get_format` and set the init flag before the bundle loads. Otherwise strings fall back to English and formats to `Intl` for `<html lang>` — no wiring required.

## Maps / geometry — planned (see REVIEW.md P6)

`material-geometry-field` (Django `contrib.gis` types) is **engine-agnostic by design**: core carries zero map dependency. You bring the map — the engine (Leaflet, MapLibre, …), the tiles (`tile-url` + attribution), version, and API keys are all yours — and attach a `GeometryEditorAdapter` (`el.adapter = …`). The library ships a **Terra Draw** reference adapter as an optional package covering Leaflet/MapLibre/OpenLayers; the interface is documented so you can back it with any engine. Value posts as GeoJSON or WKT/EWKT (`format`). Not yet built.

## Charts — planned (see REVIEW.md P4)

The library will ship an MD3 **token bridge** for ECharts (colors, typography, tooltip surface) plus a few KPI widgets — **not** a chart engine. You bring ECharts; the bridge themes it. Not yet built.

## The rule of thumb

If it needs your database, your auth, your API keys, or a multi-hundred-KB engine, it stays on your side and the component integrates with it through an endpoint, an event, or an adapter — never by bundling it.
