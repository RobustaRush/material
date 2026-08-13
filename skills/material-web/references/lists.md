# Lists, tree & transfer — material-list, material-tree, material-transfer, material-divider

Collection components. Lists and trees enhance server-rendered rows; `material-transfer` is a form-associated dual-listbox.

## material-list (+ material-list-item)

Vertical list. The list owns selection mode and keyboard roving; items are slotted `material-list-item`s.

```html
<material-list>
  <material-list-item label="Wi-Fi" leading-icon="wifi"
                      trailing-text="Robusta-5G" trailing-icon="chevron_right"></material-list-item>
  <material-list-item label="Bluetooth" leading-icon="bluetooth" divider="top"></material-list-item>
</material-list>
```

- List: `selection` — `none` (default) | `single` | `multi`; `selection-trigger` (`control` = only the checkbox/radio toggles, vs whole-row); `activation` (`manual` default — the list only emits and you own `active`; `auto` — the list keeps one row highlighted, for master-detail markup with no state of its own); `dense`; `variant` (`baseline` | `expressive`).
- Event: `materialListSelect` (`{value}`) when selection changes.

**Selectable list** — put a `material-checkbox` (multi) or `material-radio` (single) in `slot="leading"`; the list drives its state and accessibility. Set `selected` + the control's `checked` on the initially-chosen rows.

```html
<material-list selection="multi" aria-label="Filters">
  <material-list-item value="unread" label="Unread">
    <material-checkbox slot="leading"></material-checkbox>
  </material-list-item>
  <material-list-item value="starred" label="Starred" selected>
    <material-checkbox slot="leading" checked></material-checkbox>
  </material-list-item>
</material-list>
```

- Item: `label`, `value`, `leading-icon` / `trailing-icon`, `trailing-text`, `supporting-text`, `overline`, `disabled`, `selected`, `active`, `divider` (`top` / `bottom` separator), `href` (renders the row as a navigation link). Slots: `leading` / `trailing` for custom content (checkbox, avatar, switch).
- Event: `materialListItemActivate` (`{value}`) when a row is clicked/Entered.
- Gotcha: don't give slotted checkboxes their own `name` in a selectable list — the list/item manage form value. For a plain navigation list, `href` on items is enough.

## material-tree

Hierarchical list. The container is `material-tree`; nodes are slotted `material-tree-item`s. Supports nested markup **or** flat rows with an explicit `level`.

```html
<material-tree aria-label="Categories" selectable>
  <material-tree-item value="electronics" label="Electronics" icon="devices" expanded>
    <material-tree-item value="phones" label="Phones" icon="smartphone">
      <material-tree-item value="android" label="Android"></material-tree-item>
    </material-tree-item>
    <material-tree-item value="audio" label="Audio" disabled></material-tree-item>
  </material-tree-item>
</material-tree>
```

- Container: `selectable` (tri-state checkboxes on every node), `name` (posts one form entry per checked value), `cascade` (default **true** — checking a parent checks its descendants; set `cascade="false"` for independent checkboxes), `dense`, `src` + `query-param` (default `parent`) for lazy loading, `aria-label`.
- Node (`material-tree-item`): `value`, `label`, `icon`, `expanded`, `disabled`, `supporting-text`, `has-children` (mark a node expandable before its children exist — for lazy load), `level` (0-based, for flat/pre-flattened rows instead of nesting), `checked` / `indeterminate`, `loading`.
- Events (fired by items, listen on the tree): `materialTreeToggle` (`{value, expanded}`), `materialTreeChecked` (`{value, checked}`), `materialTreeActivate` (`{value}`). The tree itself emits `materialSelectionChange` (`{values, count}`).
- Tree methods: `getSelected()`, `clearSelection()`, `expandAll()`, `collapseAll()`.
- **Lazy children:** mark parents `has-children`. With `src` set, expanding a node fetches `src?parent=<value>` (JSON array of child nodes) automatically. Without `src`, the tree emits `materialTreeLoad` (`{value}`) and you append `material-tree-item` children yourself.

## material-transfer

Dual-listbox: available ⇄ chosen, form-associated. Options are slotted `material-option`s (or a JS `options` array).

```html
<form>
  <material-transfer name="members" required filter
                     available-label="All users" chosen-label="Project members">
    <material-option value="1">Anna Petersen</material-option>
    <material-option value="2" selected>Robert Chen</material-option>
    <material-option value="7" disabled>Grace Patel (inactive)</material-option>
  </material-transfer>
</form>
```

- `name` posts one entry per chosen value; `values` (string array) is the source of truth. `selected` on an option seeds the chosen side.
- `available-label` / `chosen-label`, `filter` (per-side search box), `required`, `disabled`, `size` (visible rows), `options` (set from JS instead of slotting).
- Event: `valueChange` (`{values}`). Method: `getValues()`.

## material-divider

```html
<material-divider></material-divider>
<material-divider inset="middle"></material-divider>
```

- `orientation` (`horizontal` default | `vertical`), `inset` (`none` default | `inset` | `middle`).
- Inside a list, prefer the item's `divider="top"` attribute over a standalone divider so list semantics stay intact.
