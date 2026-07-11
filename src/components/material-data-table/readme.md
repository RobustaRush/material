# material-data-table

Progressive enhancement over a server-rendered `<table>` — built for Django +
Unpoly fragment swaps, but the markup contract works from any framework. The
component never renders or reorders rows; it wires behavior around the light
DOM and re-syncs via MutationObserver when a fragment replaces the rows.
Styles live in the document stylesheet (`material.css`), not in a shadow root.

```html
<material-data-table sticky-header class="max-h-[70vh]">
  <table>
    <thead><tr>
      <th class="cell-select">
        <material-checkbox data-select-all aria-label="Select all"></material-checkbox>
      </th>
      <!-- server-driven sort: plain links + aria-sort on the active column -->
      <th aria-sort="ascending"><a href="?o=number">Number</a></th>
      <!-- client-driven sort: a button instead of a link emits materialSort -->
      <th data-sort="total" class="numeric"><button type="button">Total</button></th>
    </tr></thead>
    <tbody>
      <tr data-row-link>
        <td class="cell-select">
          <material-checkbox name="selected" value="42" aria-label="Select PO-042"></material-checkbox>
        </td>
        <td><a href="/orders/42/">PO-042</a></td>
        <td class="numeric">$12,000</td>
      </tr>
      <!-- empty queryset: <tr><td class="empty" colspan="3">No results</td></tr> -->
    </tbody>
  </table>
  <footer>…pagination…</footer>
</material-data-table>
```

Markup contract:

- `material-checkbox[data-select-all]` in `<thead>` — select-all with
  indeterminate state; a row's checkbox is `[data-row-select]` or the first
  checkbox in the row's first cell. Checkboxes are form-associated, so bulk
  actions are a plain form POST (`request.POST.getlist('selected')`).
- `th a` — server-driven sorting; mark the active column with `aria-sort`.
  `th[data-sort]` with a `<button>` (no link) emits `materialSort` instead.
- `tr[data-row-link]` — clicks on row dead space proxy to the row's first
  `<a href>` (Unpoly attributes on it keep working); clicks on interactive
  elements are left alone.
- Cell modifiers: `numeric` (end-aligned, tabular digits), `cell-select`,
  `td.empty` (centered empty state).

<!-- Auto Generated Below -->


## Properties

| Property       | Attribute       | Description                                                                                                                      | Type      | Default |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| `dense`        | `dense`         | Tighter row heights (40dp rows / 44dp header) for dense listings.                                                                | `boolean` | `false` |
| `loading`      | `loading`       | Dim the body and ignore pointer input while a fragment loads.                                                                    | `boolean` | `false` |
| `stickyHeader` | `sticky-header` | Keep <thead> pinned while the body scrolls — pair with a max-height (class or style) on the host, which is the scroll container. | `boolean` | `false` |


## Events

| Event                     | Description                                                                                                                                                                                                                    | Type                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `materialSelectionChange` | Emitted whenever the set of checked rows changes — user toggles, a select-all sweep, or a fragment swap replacing the rows.                                                                                                    | `CustomEvent<DataTableSelectionDetail>` |
| `materialSort`            | Emitted on click inside `th[data-sort]` that contains no link (links mean server-driven sorting and are left to the browser/Unpoly). The consumer reorders its data and re-renders; this component never reorders rows itself. | `CustomEvent<DataTableSortDetail>`      |


## Methods

### `clearSelection() => Promise<void>`

Uncheck every row (and the header checkbox).

#### Returns

Type: `Promise<void>`



### `getSelected() => Promise<string[]>`

`value` of every checked row checkbox.

#### Returns

Type: `Promise<string[]>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
