# material-navigation-rail



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute          | Description                                                                                                                                                                                               | Type                              | Default               |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------- |
| `activation`     | `activation`       | `auto` — clicking an item makes it the single active one (and closes the modal panel). `manual` — the host app drives `active` itself.                                                                    | `"auto" \| "manual"`              | `'auto'`              |
| `alignment`      | `alignment`        | Vertical alignment of the items group. Menu/FAB stay top-aligned per spec.                                                                                                                                | `"center" \| "top"`               | `'top'`               |
| `ariaLabel`      | `aria-label`       | aria-label of the nav landmark.                                                                                                                                                                           | `string`                          | `'Primary'`           |
| `breakpoint`     | `breakpoint`       | Viewport width (px) below which `modality="auto"` switches to hidden-when-collapsed + modal. Default 600 = MD3 compact boundary.                                                                          | `number`                          | `600`                 |
| `concealed`      | `concealed`        | Hides the rail entirely regardless of `expanded`. Programmatic axis for immersive views; independent from `hideOnCollapse`.                                                                               | `boolean`                         | `false`               |
| `expanded`       | `expanded`         | Expanded (220dp+, horizontal items) vs collapsed (96dp, vertical items).                                                                                                                                  | `boolean`                         | `false`               |
| `hideOnCollapse` | `hide-on-collapse` | Spec config "hide when collapsed": collapsing removes the rail from view entirely (width animates to 0). The reopen affordance must live outside the rail (e.g. an app-bar hamburger calling `expand()`). | `boolean`                         | `false`               |
| `label`          | `label`            | Title shown in the expanded header, next to the toggle. Rich content via `slot="title"` overrides it. Hidden while collapsed.                                                                             | `string \| undefined`             | `undefined`           |
| `modality`       | `modality`         | `standard` — expanding pushes content aside. `modal` — the expanded panel overlays content (top layer + scrim); content never reflows. `auto` — standard at/above `breakpoint`, hidden + modal below it.  | `"auto" \| "modal" \| "standard"` | `'standard'`          |
| `toggleLabel`    | `toggle-label`     | aria-label of the built-in toggle button.                                                                                                                                                                 | `string`                          | `'Toggle navigation'` |


## Events

| Event                | Description                                                            | Type                                                      |
| -------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| `materialRailToggle` | Emitted whenever `expanded` or `concealed` changes, however triggered. | `CustomEvent<{ expanded: boolean; concealed: boolean; }>` |


## Methods

### `collapse() => Promise<void>`

Collapse the rail (hides it entirely with `hide-on-collapse`).

#### Returns

Type: `Promise<void>`



### `conceal() => Promise<void>`

Hide the rail entirely (sets `concealed`).

#### Returns

Type: `Promise<void>`



### `expand() => Promise<void>`

Expand the rail (opens the modal panel in modal modality).

#### Returns

Type: `Promise<void>`



### `reveal() => Promise<void>`

Show a concealed rail again.

#### Returns

Type: `Promise<void>`



### `toggle() => Promise<void>`

Toggle between expanded and collapsed.

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
