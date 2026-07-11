# material-navigation-group



<!-- Auto Generated Below -->


## Properties

| Property             | Attribute     | Description                                                                      | Type                                  | Default           |
| -------------------- | ------------- | -------------------------------------------------------------------------------- | ------------------------------------- | ----------------- |
| `ariaLabel`          | `aria-label`  |                                                                                  | `string \| undefined`                 | `undefined`       |
| `icon`               | `icon`        |                                                                                  | `string \| undefined`                 | `undefined`       |
| `label` _(required)_ | `label`       |                                                                                  | `string`                              | `undefined`       |
| `open`               | `open`        | Open (children visible) vs closed.                                               | `boolean`                             | `false`           |
| `storageKey`         | `storage-key` | Persist the open state in localStorage under `material-nav-group:<storage-key>`. | `string \| undefined`                 | `undefined`       |
| `variant`            | `variant`     | Set by the parent rail, like material-navigation-item's variant.                 | `"rail-collapsed" \| "rail-expanded"` | `'rail-expanded'` |


## Events

| Event                 | Description | Type                              |
| --------------------- | ----------- | --------------------------------- |
| `materialGroupToggle` |             | `CustomEvent<{ open: boolean; }>` |


## Methods

### `setFocus() => Promise<void>`

Focus the header button — used by the rail's arrow-key navigation.

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
