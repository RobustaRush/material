# material-chip



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute       | Description                                                                                                                                                                                                                                                             | Type                                                      | Default     |
| -------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| `ariaLabel`    | `aria-label`    |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `disabled`     | `disabled`      |                                                                                                                                                                                                                                                                         | `boolean`                                                 | `false`     |
| `download`     | `download`      |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `elevated`     | `elevated`      |                                                                                                                                                                                                                                                                         | `boolean`                                                 | `false`     |
| `href`         | `href`          |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `icon`         | `icon`          |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `label`        | `label`         |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `name`         | `name`          |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `rel`          | `rel`           |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `selected`     | `selected`      |                                                                                                                                                                                                                                                                         | `boolean`                                                 | `false`     |
| `softDisabled` | `soft-disabled` | Disabled but still focusable/reachable by keyboard and AT, per https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_disabled_controls. Visually identical to `disabled`; the click handler blocks activation instead of the element leaving the tab order. | `boolean`                                                 | `false`     |
| `tabbable`     | `tabbable`      | Roving-tabindex slot, driven by material-chip-set (mirrors material-radio's `focusable`). When false the primary action leaves the tab order (tabindex -1); the trailing remove action is always -1 — it's reached by arrow keys within the chip, never by Tab.         | `boolean`                                                 | `true`      |
| `target`       | `target`        |                                                                                                                                                                                                                                                                         | `"_blank" \| "_parent" \| "_self" \| "_top" \| undefined` | `undefined` |
| `trailingIcon` | `trailing-icon` |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `value`        | `value`         |                                                                                                                                                                                                                                                                         | `string`                                                  | `'on'`      |
| `variant`      | `variant`       |                                                                                                                                                                                                                                                                         | `"assist" \| "filter" \| "input" \| "suggestion"`         | `'assist'`  |


## Events

| Event            | Description | Type                                  |
| ---------------- | ----------- | ------------------------------------- |
| `remove`         |             | `CustomEvent<void>`                   |
| `selectedChange` |             | `CustomEvent<{ selected: boolean; }>` |


## Methods

### `setFocus(opts?: { trailing?: boolean; }) => Promise<void>`

Focus the chip's primary action, or its trailing remove action with
`{ trailing: true }`. Used by material-chip-set's arrow-key navigation,
which can't reach into another component's shadow DOM directly.

#### Parameters

| Name   | Type                                                | Description |
| ------ | --------------------------------------------------- | ----------- |
| `opts` | `{ trailing?: boolean \| undefined; } \| undefined` |             |

#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part     | Description |
| -------- | ----------- |
| `"chip"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
