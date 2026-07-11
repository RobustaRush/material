# material-radio



<!-- Auto Generated Below -->


## Properties

| Property             | Attribute        | Description                                                                                                                                                                                               | Type                      | Default      |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------ |
| `ariaLabel`          | `aria-label`     |                                                                                                                                                                                                           | `string \| undefined`     | `undefined`  |
| `checked`            | `checked`        |                                                                                                                                                                                                           | `boolean`                 | `false`      |
| `disabled`           | `disabled`       |                                                                                                                                                                                                           | `boolean`                 | `false`      |
| `error`              | `error`          |                                                                                                                                                                                                           | `boolean`                 | `false`      |
| `focusable`          | `focusable`      | Roving-tabindex slot, driven by material-radio-group. When false the inner button leaves the tab order (tabindex -1). Reactive, so it applies on the next render rather than requiring shadow-DOM access. | `boolean`                 | `true`       |
| `groupDisabled`      | `group-disabled` | Group-level disable, driven by material-radio-group. Kept separate from the per-radio `disabled` so toggling the group off doesn't erase an individually-disabled radio's state.                          | `boolean`                 | `false`      |
| `label`              | `label`          |                                                                                                                                                                                                           | `string \| undefined`     | `undefined`  |
| `labelPosition`      | `label-position` |                                                                                                                                                                                                           | `"leading" \| "trailing"` | `'trailing'` |
| `value` _(required)_ | `value`          |                                                                                                                                                                                                           | `string`                  | `undefined`  |


## Events

| Event         | Description | Type                              |
| ------------- | ----------- | --------------------------------- |
| `radioSelect` |             | `CustomEvent<{ value: string; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
