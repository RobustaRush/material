# material-navigation-item



<!-- Auto Generated Below -->


## Properties

| Property             | Attribute     | Description | Type                                                               | Default            |
| -------------------- | ------------- | ----------- | ------------------------------------------------------------------ | ------------------ |
| `active`             | `active`      |             | `boolean`                                                          | `false`            |
| `activeIcon`         | `active-icon` |             | `string \| undefined`                                              | `undefined`        |
| `ariaLabel`          | `aria-label`  |             | `string \| undefined`                                              | `undefined`        |
| `disabled`           | `disabled`    |             | `boolean`                                                          | `false`            |
| `href`               | `href`        |             | `string \| undefined`                                              | `undefined`        |
| `icon` _(required)_  | `icon`        |             | `string`                                                           | `undefined`        |
| `label` _(required)_ | `label`       |             | `string`                                                           | `undefined`        |
| `value`              | `value`       |             | `string \| undefined`                                              | `undefined`        |
| `variant`            | `variant`     |             | `"bar" \| "bar-horizontal" \| "rail-collapsed" \| "rail-expanded"` | `'rail-collapsed'` |


## Events

| Event            | Description | Type                                            |
| ---------------- | ----------- | ----------------------------------------------- |
| `materialSelect` |             | `CustomEvent<{ value?: string \| undefined; }>` |


## Methods

### `setFocus() => Promise<void>`

Focus the inner button/link — used by the rail's arrow-key navigation.

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
