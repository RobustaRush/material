# Search & command palette — material-search, material-command-palette

Full-text search UI and a keyboard-driven command launcher. Both take suggestions from slotted items, a JS array, or a remote endpoint.

## material-search

The MD3 search pair: a contained bar that expands into a search view (docked popover on desktop, full-screen overlay on compact). Form-associated via `name`.

```html
<material-search name="q" placeholder="Search mail">
  <material-option leading-icon="history" data-section="Recent" value="quarterly report">quarterly report</material-option>
  <material-option leading-icon="label" data-section="Labels" value="label:finance"
                  supporting-text="128 conversations">finance</material-option>
  <material-avatar slot="trailing" name="Ann Lee" size="s"></material-avatar>
</material-search>
```

- **Suggestion sources:** slotted `material-option`s (client-side), the `items` array property (set from JS), or `src` (remote JSON endpoint; the query is appended as `?q=`, override the param with `query-param`, tune with `debounce` and `min-chars`).
- Group suggestions into sections with `data-section="<label>"` on each option. `slot="trailing"` holds a trailing element (avatar, icon) in the bar.
- Options: `value`, `leading-icon`, `supporting-text`, and `href` for navigable results.
- `layout` — `auto` (default: full-screen on compact, docked otherwise) | `docked` | `fullscreen`. `clearable`, `placeholder`.
- Events: `materialSearchInput` (`{query}`, per keystroke — drive custom fetching), `materialSearchSubmit` (`{query}`, Enter), `materialSelect` (`{item}`, a suggestion chosen), `openChange` (`{open}`).

## material-command-palette

Cmd/Ctrl-K style launcher. Opened by a hotkey or the `show()` method; commands come from slotted `material-option`s or a `commands` array.

```html
<material-command-palette id="cmdk" hotkey="mod+k" placeholder="Type a command…">
  <material-option value="new-doc" leading-icon="add">New document</material-option>
  <material-option value="settings" leading-icon="settings">Open settings</material-option>
</material-command-palette>
<script>
  const palette = document.getElementById('cmdk');
  document.getElementById('open-btn').addEventListener('click', () => palette.show());
  palette.addEventListener('materialCommand', (e) => run(e.detail.id));
</script>
```

- `hotkey` — key combo that opens it (e.g. `mod+k`, where `mod` is ⌘/Ctrl). `commands` — set from JS instead of slotting (`[{id, label, ...}]`). `placeholder`, `empty-label`.
- Methods: `show()`, `hide()`.
- Events: `materialCommand` (`{id, item}`, a command chosen), `openChange` (`{open}`).
