# Data table — material-data-table

Wraps a **real, server-rendered `<table>`** and adds behavior: sorting affordances, row selection, virtual scroll, column resize/reorder, pinned columns, group folding, inline editing, and responsive column hiding. It never owns the data — you render the `<table>` (rows, cells, aggregates, form controls) on the server; the component enhances what's there. Everything degrades to a plain table if the script never loads.

```html
<material-data-table>
  <table>
    <thead><tr><th>…</th></tr></thead>
    <tbody><tr><td>…</td></tr></tbody>
  </table>
</material-data-table>
```

Attributes (all boolean unless noted): `sticky-header`, `dense`, `loading`, `virtual`, `resizable`, `reorderable`, `sticky-start="N"` (number). `sticky-header` and `virtual` require a `max-height` on the host (it is the scroll container — set via class or style).

## Column alignment

Add `class="numeric"` to a `<th>`/`<td>` to right-align numbers. That's the only cell class the layout needs; the rest below are behavioral contracts.

## Sorting

Sorting itself is server-driven — make each sortable header's label a link or button, and reflect the current sort with `aria-sort` on the `<th>`. The component emits an event when a header is activated so you can update the query.

```html
<th aria-sort="ascending"><a href="?o=number">PO #</a></th>
<th data-sort="stock" class="numeric"><button type="button">In stock</button></th>
```

- `data-sort="<key>"` names the column in the event (falls back to `data-column`, then index).
- Event: `materialSort` → `{column, direction}` (`direction` is `'ascending'` | `'descending'`). Handle it by reloading/re-querying sorted data (or sort client-side yourself).

## Row selection

Put a checkbox in a `<td class="cell-select">` per row and a select-all checkbox (marked `data-select-all`) in the header cell. Checkboxes may be `material-checkbox` or native `<input type=checkbox>`. Give each row checkbox a `name` + `value` so selections post with a surrounding form.

```html
<thead><tr>
  <th class="cell-select"><material-checkbox data-select-all aria-label="Select all rows"></material-checkbox></th>
  <th>PO #</th>
</tr></thead>
<tbody><tr>
  <td class="cell-select"><material-checkbox name="selected" value="142" aria-label="Select PO-2026-0142"></material-checkbox></td>
  <td>PO-2026-0142</td>
</tr></tbody>
```

- The component wires select-all ↔ per-row state (including the indeterminate middle state).
- Event: `materialSelectionChange` → `{values, count, allSelected}` (`values` = checked row values in DOM order).
- Methods: `getSelected()`, `clearSelection()`.

## Virtual scroll

For thousands of server-rendered rows: `virtual` display:none's off-screen rows behind two spacer rows so scrolling stays cheap. Requires a `max-height` on the host **and uniform row heights** (don't mix row heights, or positions drift).

```html
<material-data-table virtual class="block max-h-[70vh]">
  <table> … thousands of <tr> … </table>
</material-data-table>
```

## Resize & reorder columns

- `resizable` — drag a header cell's trailing edge to resize. Event: `materialColumnResize` → `{column, width}`.
- `reorderable` — drag a header cell sideways to reorder. Event: `materialColumnReorder` → `{column, from, to}`.
- `column` is the `<th>`'s `data-column` / `data-sort`, else its index as a string. Persist width/order server-side from these events; the component moves the DOM but doesn't remember across loads.

## Pinned columns

`sticky-start="N"` keeps the first N columns fixed while the table scrolls horizontally. RTL-correct (pins the leading columns). An edge shadow appears once the body is horizontally scrolled.

```html
<material-data-table sticky-start="2" class="block overflow-x-auto"> … </material-data-table>
```

## Row grouping (server-computed aggregates)

Render group-header rows as `<tr class="row-group" data-group="<key>">` with aggregate cells; the component injects a fold/unfold toggle button and hides/shows the member rows below it.

```html
<tr class="row-group" data-group="west">
  <td colspan="2">West region · 2 orders</td>
  <td class="numeric">$15,580.50</td>
</tr>
<tr><td>…</td><td>…</td><td class="numeric">…</td></tr>   <!-- member rows follow -->
```

- Event: `materialGroupToggle` → `{group, collapsed}`.

## Inline editing

Give a plain form control `class="cell-edit"`; it reads as text until focused, then behaves as an input, and posts with the form. Emits a change event you can relay to the server.

```html
<td class="numeric">
  <input class="cell-edit" name="qty-1" type="number" value="14" aria-label="Quantity for SKU-001">
</td>
```

- Event: `materialCellEdit` → `{name, value}`.

## Responsive columns

Mark lower-priority headers `data-hide-below="<px>"`; the column hides when the **host** (container, not viewport) is narrower than that width. When any column is hidden, the component adds a trailing "…" cell per row that folds out the hidden fields inline — no card stacking, no horizontal scroll needed.

```html
<th>PO #</th>
<th data-hide-below="620">Vendor</th>
<th data-hide-below="480">Date</th>
```

Combine with `sticky-header`, `dense`, and selection freely — the sweep is idempotent, so server-side re-renders (fragment reloads) re-enhance cleanly.
