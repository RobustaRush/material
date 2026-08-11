# Roadmap review — remaining gaps to a commercial CRM/ERP-grade library

Snapshot of the gap analysis from 2026-07-12. Items already delivered are not
listed (data-table v1, autocomplete, date-range picker; pagination, number /
masked fields, rich-text, breadcrumbs, avatar, command palette are being
delivered alongside this file). Grouped by priority for CRM/ERP use.

## P1 — data layer (the ERP core)

- **data-table v2** — ✅ done (2026-07-12), same component/contract, +2.2 KB gz:
  `virtual` windowed rows over the server-rendered tbody (spacer rows, DOM and
  form state untouched), `resizable`/`reorderable` header drags with
  materialColumnResize/Reorder for server persistence, `sticky-start="N"`
  pinned columns, `tr.row-group` fold/unfold of server-computed aggregates,
  `.cell-edit` inline editing over plain form controls (materialCellEdit),
  responsive columns (`th[data-hide-below]`, container-based) with a per-row
  "…" inline fold-out for the hidden fields — no card stacking.
- **material-tree** — ✅ done (2026-07-12): expand/collapse, tri-state
  cascade selection (form-posts one entry per checked value), lazy children
  (`src?parent=` JSON or `materialTreeLoad`), nested markup or flat
  mptt-style rows with `level`, aligned trailing cells, ARIA tree keyboard
  nav. Remaining ideas: drag-to-reorder, typeahead.
- **material-transfer / dual listbox** — ✅ done (2026-07-12): two panels +
  move buttons, per-side search, form-posts chosen values (getlist), keyboard
  support, RTL.

## P2 — input coverage

- **File dropzone** — ✅ done (2026-07-12): material-dropzone — DnD +
  browse, native input posts with the form (FILES.getlist), image previews,
  accept/max-size/max-files + cancelable add hook, setProgress() per-file
  upload UI. material-file-field stays the compact ClearableFileInput
  wrapper.
- **Docked date picker** — ✅ done (2026-07-12): material-date-field
  picker="auto|docked|modal" — docked dropdown commits on date click,
  auto-modal on compact viewports. (Time pickers stay dialog-only — M3 has
  no docked time variant.)
- **Number formatting depth** — ✅ done (2026-07-12): currency="USD|EUR|…"
  mode (Intl symbol/digits placement), Django DECIMAL_SEPARATOR /
  THOUSAND_SEPARATOR win over Intl when jsi18n is loaded.
- **JSON editor** — ✅ done (2026-07-13): material-json-field — compact JSON
  tree editor (no syntax-highlighter, plain-DOM `.cell-edit` leaves, ~5.2 KB
  gz). Full structural editing (add/remove/rename keys, reorder array items,
  change value type), form-associated (posts one JSON string, always valid),
  readonly viewer mode. 0 axe WCAG 2.2 AA violations.

## P3 — surfaces and patterns (M3 catalog completion)

- **Bottom sheet** — ✅ done (2026-07-12): material-bottom-sheet — modal
  (native dialog scrim/top-layer) + standard (page stays interactive);
  drag handle peek↔full↔dismiss, flick-to-dismiss, click/Enter toggles,
  640dp max width; same data-dialog-target triggers.
- **Side sheet** — ✅ done (2026-07-12): material-side-sheet — modal
  trailing-edge dialog, standard in-flow panel (host animates inline-size),
  adaptive (standard ≥840px) with open state surviving the swap; RTL via
  logical properties. Field-service showcase uses it as the record detail.
- **Search view** — ✅ done (2026-07-12): `material-search` ships the full
  MD3 Search pair — contained pill bar + search view (docked popover on
  desktop, full-screen overlay on compact), slotted/JS/remote suggestion
  sources, sections, clear ×, form-associated, Unpoly-visible href items.
- **Rich tooltip** — MD3 variant with subhead + actions (plain exists).

## P4 — product polish patterns (outside M3, expected in enterprise UI)

- **Skeleton loader** — ✅ done (2026-07-12): material-skeleton — three
  primitives (text lines / circular / rectangular, em-based sizes),
  composites are plain markup; RTL-aware shimmer, reduced-motion pulse
  fallback, Unpoly `up-placeholder` recipe. 0.8 KB gz.
- **Empty state** — icon/illustration + headline + action pattern component.
- **Timeline / activity feed** — record history, the heart of a CRM; entries
  with avatar, timestamp, grouped by day.
- **Kanban / drag-and-drop** — CRM pipeline boards; ship a sortable-list
  primitive first (keyboard-accessible DnD), board on top.
- **Stepper / wizard** — ✅ done (2026-07-12): material-stepper +
  material-step — M2 anatomy, M3 tokens; horizontal/vertical, linear or
  free-order; client-side next/back (document-delegated
  data-stepper-next/back) gated on constraint validation, or a pure
  server-driven indicator for django-formtools (`active`/`completed`/`error`
  from the template, cancelable materialStepClick → wizard_goto_step).
  material-textfield/textarea now mirror inner-input validity onto
  ElementInternals (checkValidity/reportValidity), so required fields
  actually gate submits.
- **Charts** — do NOT build a chart engine; ship an MD3 token bridge for
  ECharts (colors, typography, tooltip surface) + 2–3 ready KPI widgets
  (stat card with trend, sparkline) like the ERP showcase draws by hand.

## P5 — library infrastructure (blocks "commercial", more than components do)

- **Tests** — visual-regression via Playwright screenshots of the existing
  demo pages (cheap, matches the demo-pages-as-test-suite convention);
  unit tests only where real logic lives (date parsing, mask engine,
  fuzzy match).
- **Docs site** — generate from the per-component readmes (already
  auto-generated by Stencil) + live demo embeds; changelog, semver,
  npm publish pipeline.
- **Django integration package** — form widgets that render these components
  from `forms.Field` definitions; this is the adminui product on top of the
  library and the main commercial differentiator.
- **A11y statement** — ✅ audit done (2026-07-12): axe-core (WCAG 2.2 AA
  tags) swept all 56 demos + 4 showcases via playwright-cli — **0 violations
  on every page** after fixing: nested-interactive in selectable lists
  (material-checkbox `nested` mode renders a non-widget visual), select /
  autocomplete chip roles + ≥24px remove targets, slider/list/select
  accessible names, tooltip cross-shadow aria refs (+ inert), side-sheet
  closed-state inert, data-table group rows (injected toggle button carries
  aria-expanded) + focusable scroll region, calendar outside-day contrast,
  disabled-link roles, carousel slide semantics, demo density/dir toggle
  target size. Remaining for "commercial": wire the sweep into CI
  (scratchpad script → repo script + exit code) and write the per-component
  WCAG statement doc.
- **RTL** — ✅ done (2026-07-12): library-wide sweep converted physical
  properties to logical ones, added `:dir(rtl)` transform/clip-path flips
  (slider, switch, tabs badges, split-button, icon-button badge), made
  anchored-popover alignment logical, and fixed carousel math + arrow keys.
  Demo pages have a persistent LTR/RTL toggle next to Theme/Density.
- **Licensing** — currently AGPL-3.0; decide dual-licensing (AGPL +
  commercial) before promoting third-party commercial use.
- **i18n** — ✅ done (2026-07-12), docs/i18n.md: deliberately NO shipped
  catalogs — three-tier resolution (Django jsi18n → Intl → English msgid),
  label props always win, Django `JavaScriptCatalog` + `get_format` wiring
  and msgid-extraction recipe documented; non-Django shim example included.
- **Density/theming docs** — the A−/A/A+ rem system and Material Theme
  Builder re-skin flow are implemented but undocumented for consumers.

## P6 — GIS / spatial fields (engine-agnostic, bring-your-own-map) — proposed, not started

Map-based editors for the OpenGIS geometry types Django's `contrib.gis`
exposes (PointField … GeometryCollectionField, plus RasterField). Pure
client-side geometry manipulation — Django form-widget integration is a
**separate project**; here we invent the UX and ship the JS.

**Engine-agnostic via an adapter — the consumer brings the map (preferred
over bundling one).** Core `material-geometry-field` carries ZERO map
dependency and can live in the MAIN bundle (a few KB): it owns the value,
form association, validation, undo/redo, the parts model, the Material
toolbar / parts-list UI, a11y, and a raw lat/lng fallback editor. All map
rendering + projection + vertex hit-testing sits behind a small
`GeometryEditorAdapter` interface (`mount`, `project`/`unproject`,
`renderGeometry(geojson, editState)`, drawing-mode events, `fitBounds`,
`destroy`). The consumer attaches an adapter for whatever engine they already
run — `el.adapter = new SomeAdapter(map)` — so the map engine (Leaflet ~40 KB
gz, MapLibre ~200 KB gz), tiles, version, and API keys are entirely theirs;
nothing map-related enters our bundle. Without an adapter the field still
works headless (posts/validates the value, raw-coordinate editing); the
visual map appears once an adapter is attached.

**Don't reimplement vertex editing.** The interface relocates the hard 60 %
(draw / edit / hit-test) into the adapter — it doesn't remove it. Writing an
adapter per engine from scratch = writing the whole map integration. So lean
on **Terra Draw** (engine-agnostic across Leaflet / MapLibre / OpenLayers,
covers all these geometry types) for the reference adapter — one thin adapter
then serves multiple engines. Ship it as an optional subpath
(`advanced-material-web/geo-terradraw`) and document the interface so others
can bring a different engine.

**One component, `type` prop — not eight.** A single `material-geometry-field`
with `type="point|linestring|polygon|multipoint|multilinestring|multipolygon
|geometry|geometrycollection"` selecting the active tool set, mirroring the
material-date-field/number-field "one element, many modes" pattern. Keeps the
geo bundle lean and the API small.

**Value contract.** Form-associated; posts geometry as text under `name`.
`format="geojson|wkt|ewkt"` (default GeoJSON — trivial `JSON.parse` in JS;
WKT/EWKT for Django parity, since its widgets default to WKT). `srid` prop
(default 4326). `value` in/out; `readonly` = viewer; `required`/`disabled`.
Tiles are consumer-supplied (`tile-url` + attribution slot) — bundle no tile
provider (API keys / attribution / cost aren't ours to embed).

**Shared chrome.** Toolbar (pan / draw / edit-vertices / delete / clear /
fit-to-data), undo/redo, empty state, keyboard-accessible vertex editing,
lat/lng type-in fallback for point. Emits `valueChange` (serialized) +
`materialGeometryChange` (parsed).

Per-type UX to design/build:

- **PointField** — click to drop one marker, drag to move; synced lat/lng
  inputs. (Geocode/search = Django-integration territory, skip.)
- **LineStringField** — click to add vertices in order; drag to move, click a
  vertex to delete, midpoint handles to insert; double-click/Enter finishes.
  Show length.
- **PolygonField** — like line but closes the ring; drag/insert/delete
  vertices; secondary "add hole" mode for interior rings; show area.
- **MultiPointField** — many independent markers + a parts list.
- **MultiLineStringField** — "new line" starts another part; parts list.
- **MultiPolygonField** — several polygons, each with its own holes; parts
  list.
- **GeometryField** (base) — a geometry-type picker, then the matching single
  tool; accepts any one geometry.
- **GeometryCollectionField** — "add geometry" menu (point/line/polygon/…);
  heterogeneous parts coexist as layers in a parts list.
- **RasterField** — DEFER. PostGIS-only, no interchange standard, GDALRaster
  is server-side; at most a read-only extent/thumbnail preview if given a URL.
  Not an editor for v1.

**Open decisions.** (a) Which reference adapter(s) to publish — Terra Draw
(one adapter, multi-engine) is the strong default; whether to also ship
engine-native adapters (Leaflet-Geoman, mapbox-gl-draw) for consumers who
already depend on those. Engine choice itself is now the CONSUMER's — we
bundle none. (b) `GeometryEditorAdapter` interface shape — freeze it before
building the first adapter, since third-party engines depend on its
stability. Value format is settled: GeoJSON (JS-native default) + WKT/EWKT
(Django parity) via `format`.
