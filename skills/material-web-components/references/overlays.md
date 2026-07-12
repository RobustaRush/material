# Dialogs, sheets, menus & feedback — material-dialog, material-bottom-sheet, material-side-sheet, material-menu, material-tooltip, material-snackbar

Overlay and transient-UI components. Dialogs and sheets share one declarative trigger convention; menus use the native Popover API; snackbars are driven from JS.

## material-dialog

Modal dialog built on the native `<dialog>` (top layer, scrim, Esc to cancel).

**Open it** with `data-dialog-target="<dialog-id>"` on any trigger element (also native `command`/`commandfor`, or the `show()` method). **Close it** with `data-dialog-close` inside the dialog; `data-dialog-close="<value>"` sets `returnValue`.

```html
<material-button label="Delete file…" data-dialog-target="d-confirm"></material-button>

<material-dialog id="d-confirm" alert headline="Delete file?" icon="delete">
  Are you sure you want to delete <strong>report-2026.pdf</strong>?
  <div slot="actions">
    <material-button variant="text" label="Cancel" data-dialog-close></material-button>
    <material-button variant="filled" label="Delete" data-dialog-close="confirm"></material-button>
  </div>
</material-dialog>
```

- `headline`, `icon`, `alert` (compact alert dialog), `dismissible` (allow scrim/Esc dismiss), `variant` (`adaptive` default | `basic` | `full-screen` — check readme for the full set), `position` (`center` default | `top`/`bottom`/`top-start`… for anchored placement), `open`, `return-value`.
- Slots: default = body, `slot="actions"` = button row.
- Events: `materialDialogOpen`, `materialDialogClose` (`{returnValue}` — read which button closed it), `materialDialogCancel` (Esc/scrim). Methods: `show()`, `close(returnValue?)`.

## material-bottom-sheet

Sheet anchored to the bottom edge; opens/closes with the **same** `data-dialog-target` / `data-dialog-close` triggers, or `el.open = true` / `show()`.

```html
<material-button label="Share" data-dialog-target="share"></material-button>
<material-bottom-sheet id="share" drag-handle variant="modal">
  … content …
</material-bottom-sheet>
```

- `variant` — `modal` (default, scrim, blocks page) | `standard` (page stays interactive).
- `drag-handle` + `drag-handle-label`, `expanded` (start full-height), `dismissible`, `open`, `return-value`.
- Events: `materialSheetOpen` / `materialSheetClose` (`{returnValue}`) / `materialSheetCancel`. Methods: `show()`, `close(returnValue?)`.

## material-side-sheet

Trailing-edge panel. Same triggers/methods as bottom-sheet.

```html
<material-side-sheet id="std-sheet" variant="standard" headline="SKU-1042" show-close>
  … content …
  <div slot="actions"><material-button variant="filled" label="Edit"></material-button></div>
</material-side-sheet>
```

- `variant` — `adaptive` (default; modal on narrow, inline panel ≥ wide) | `modal` | `standard` (in-flow, page shifts).
- `headline`, `show-close` + `close-label`, `dismissible`, `open`. Same three sheet events + `show()`/`close()`.

## material-menu (+ material-menu-item)

Anchored command menu. Trigger with the native Popover API: put `popovertarget="<menu-id>"` on the trigger button and `anchor="#<trigger-id>"` on the menu (positions it against that element).

```html
<material-button id="t1" label="Edit…" trailing-icon="expand_more" popovertarget="m1"></material-button>
<material-menu id="m1" anchor="#t1">
  <material-menu-item label="Cut" leading-icon="content_cut" trailing-text="⌘X" value="cut"></material-menu-item>
  <material-menu-item label="Copy" leading-icon="content_copy" value="copy"></material-menu-item>
  <material-divider></material-divider>
  <material-menu-item label="Delete" leading-icon="delete" disabled value="delete"></material-menu-item>
</material-menu>
```

- Menu: `anchor` (CSS selector for the anchor element), `placement` (`bottom-center` default, `bottom-start`, `top-end`, …), `offset`, `max-height`, `open`, `menu-role` (`menu` default | `listbox` — only set `listbox` when hosting selectable options). Events: `materialMenuOpen` / `materialMenuClose`. Methods: `show(anchorEl?)`, `hide()`.
- Item: `label`, `value`, `leading-icon` / `trailing-icon`, `trailing-text` (shortcut hint), `supporting-text`, `disabled`, `keep-open` (don't close on click, e.g. a toggle row), `divider` (`top`/`bottom` to draw a separator).
- Selection: listen on the menu for `materialMenuSelect` (`{value}`); per-item there's `materialMenuItemActivate` (`{keepOpen}`).

## material-tooltip

Plain hover/focus tooltip. Attach either by **wrapping** the trigger or by **id reference** with `for`.

```html
<!-- Wrap -->
<material-tooltip text="Edit">
  <material-icon-button icon="edit" aria-label="Edit"></material-icon-button>
</material-tooltip>

<!-- Reference by id -->
<material-icon-button id="tt-search" icon="search" aria-label="Search"></material-icon-button>
<material-tooltip for="tt-search" text="Search"></material-tooltip>
```

- `text`, `for` (trigger element id), `placement` (`bottom` default, `top`, `left`, `right`, …), `delay` / `hide-delay` (ms), `offset`, `persistent` (stay open on hover-into the tooltip), `variant` (`plain` default | `rich`).
- Events: `tooltipShow` / `tooltipHide`.

## material-snackbar (+ material-snackbar-host)

Transient bottom message. For app-wide snackbars, place one `material-snackbar-host` and enqueue from JS — it serializes messages and handles the ARIA live region.

```html
<material-snackbar-host placement="bottom"></material-snackbar-host>
<script>
  const host = document.querySelector('material-snackbar-host');
  host.enqueue({ message: 'Saved.' });                                   // transient
  host.enqueue({ message: 'Archived.', actionLabel: 'Undo' });           // with action
  host.enqueue({ message: 'Save failed.', closable: true, duration: 0 }); // sticky + ×
  // Re-enqueue with the same id to update a live message in place:
  host.enqueue({ id: 'save', message: 'Saving…', duration: 0 });
  setTimeout(() => host.enqueue({ id: 'save', message: 'Saved.' }), 800);
</script>
```

- Host: `placement`, `live` (`polite` | `assertive`). Methods: `enqueue(req)`, `replace(id, req)`, `clear()`.
- `enqueue` request: `{ message, actionLabel?, closable?, duration?, id? }` (`duration: 0` = no auto-dismiss).
- Standalone `material-snackbar` (single, not hosted): `message`, `action-label`, `closable`, `duration`, `open`; events `materialSnackbarAction`, `materialSnackbarClose` (`{reason}`), `materialSnackbarOpen`; methods `show()`, `close(reason?)`.
