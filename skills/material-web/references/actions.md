# Buttons & actions — material-button, material-icon-button, material-button-group, material-split-button, material-fab, material-fab-menu, material-chip, material-chip-set

Set `href` (+ optional `target` / `rel` / `download`) on almost any of these and it renders as a real anchor instead of a button. Button-role variants take `type="submit"` inside a `<form>`. All `icon` / `trailing-icon` / `selected-icon` values are Material Symbols names.

## material-button

MD3 common button, five styles.

```html
<material-button variant="filled" label="Save" icon="save"></material-button>
<material-button variant="text" label="Docs" href="/docs"></material-button>
<material-button variant="tonal" label="Submit" type="submit"></material-button>
```

- `variant` — `elevated` | `filled` (default) | `tonal` | `outlined` | `text`.
- `label`, `icon` (leading), `trailing-icon`, `disabled`.
- `type` — `button` (default) | `submit` | `reset`; `name` / `value` post with the form when used as submit.
- `href` + `target` / `rel` / `download` — link mode.
- `shape` (`round` default | `square`), `shape-morph` (animate shape on press), `size` (`xs`–`xl`, default `s`).
- `toggle` — makes it a toggle button; `selected` reflects state, `selectedChange` (`{selected}`) fires.
- `popover-target` / `popover-target-action` — native Popover API wiring (point at a popover element's id).

## material-icon-button

Icon-only; `icon` and `aria-label` are both required.

```html
<material-icon-button icon="delete" variant="standard" aria-label="Delete"></material-icon-button>
<material-icon-button toggle icon="favorite_border" selected-icon="favorite"
                      aria-label="Favorite"></material-icon-button>
```

- `variant` — `standard` | `filled` (default) | `tonal` | `outlined`.
- `toggle` + `selected` + `selected-icon` — two-state button; `selectedChange` (`{selected}`).
- `size` (`xs`–`xl`), `width` (`narrow` | `default` | `wide`), `href` link mode, `type`/`name`/`value` for forms.

## material-button-group

Segmented group with optional single/multi selection. Slot `material-button`s, each with a `value`.

```html
<material-button-group selection-mode="single" variant="connected">
  <material-button value="day" label="Day"></material-button>
  <material-button value="week" label="Week" selected></material-button>
</material-button-group>
```

- `selection-mode` — `none` (default, plain group) | `single` | `multi`.
- `variant` — `standard` | `connected` (joined). `required` for form use. `size`, `shape`.
- Event: `materialSelectionChange` (`{values}` — array of selected child values).

## material-split-button

Primary action + attached menu trigger.

```html
<material-split-button label="Save" icon="save" menu-label="More save options">
  <material-menu-item value="draft" label="Save as draft"></material-menu-item>
  <material-menu-item value="template" label="Save as template"></material-menu-item>
</material-split-button>
```

- `label`, `icon`, `variant` (same set as button), `menu-label` (accessible name for the caret), `href`/`target`/`rel` for the primary as a link, `type`/`name`/`value`.
- Events: `splitAction` (primary clicked), `splitMenuOpen` / `splitMenuClose`. Handle menu-item choice via the slotted `material-menu-item`s (see `references/overlays.md`).

## material-fab

`icon` required.

```html
<material-fab icon="add" variant="primary-container" aria-label="New" size="large"></material-fab>
```

- `variant` — `primary` | `primary-container` (default) | `secondary` | `secondary-container` | `tertiary` | `tertiary-container`.
- `size` — `small` | `medium` (default) | `large`. `href` link mode. `type`/`name`/`value` for forms.
- `hide-near-end` + `hide-offset` — auto-hide as the page scrolls near the bottom, keeping the FAB clear of the footer.
- For an extended FAB with a text label, see the demo; the core is icon-first.

## material-fab-menu (+ material-fab-menu-item)

Speed-dial: a FAB that expands into actions.

```html
<material-fab-menu icon="add" close-icon="close" aria-label="Create">
  <material-fab-menu-item icon="mail" label="Message" value="msg"></material-fab-menu-item>
  <material-fab-menu-item icon="event" label="Event" value="event"></material-fab-menu-item>
</material-fab-menu>
```

- Menu: `icon`, `close-icon`, `color-set` (`primary` default …), `size`, `open`, `hide-near-end`/`hide-offset`. Events: `materialFabMenuOpen` / `materialFabMenuClose`. Methods: `show()` / `hide()` / `toggle()`.
- Item: `icon` + `label` (both required), `value`, `disabled`, `href` link mode. Event: `materialFabMenuItemActivate` (`{value}`).

## material-chip

Compact action/filter/input token.

```html
<material-chip variant="assist" icon="event" label="Add to calendar"></material-chip>
<material-chip variant="filter" label="Unread" selected></material-chip>
<material-chip variant="input" label="tag" trailing-icon="close"></material-chip>
```

- `variant` — `assist` (default) | `filter` | `suggestion` | `input`.
- `label`, `icon` (leading), `trailing-icon`, `elevated`, `disabled`, `href` link mode.
- `selected` + `selectedChange` (`{selected}`) for `filter` chips. `value`/`name` for form participation.
- Event: `remove` — fires when the trailing × on an `input` chip is activated. The chip does **not** self-remove; delete the element in your handler.

## material-chip-set

Layout + keyboard container for chips: `role="toolbar"`, wrapping flex row, 8dp gaps, and a roving tabindex so the whole set is **one** Tab stop with Arrow/Home/End moving between chips (RTL-aware). Wrap any group of chips in it.

```html
<material-chip-set>
  <material-chip variant="filter" label="Unread" selected></material-chip>
  <material-chip variant="filter" label="Starred"></material-chip>
  <material-chip variant="input" label="design" trailing-icon="close"></material-chip>
</material-chip-set>
```

- No attributes, no events — purely structural. Chips keep their own `selected` / `remove` behavior; disabled chips are skipped by arrow navigation.
- Slot changes are picked up automatically, so chips added or removed at runtime rejoin the roving order.
- Arrow keys inside a chip (primary ↔ trailing ×) are handled by the chip itself; only a move that exits the chip reaches the set.
