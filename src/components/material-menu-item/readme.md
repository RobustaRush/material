# material-menu-item



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute         | Description                                                    | Type                          | Default     |
| ---------------- | ----------------- | -------------------------------------------------------------- | ----------------------------- | ----------- |
| `disabled`       | `disabled`        |                                                                | `boolean`                     | `false`     |
| `divider`        | `divider`         |                                                                | `"bottom" \| "none" \| "top"` | `'none'`    |
| `keepOpen`       | `keep-open`       | When true, activating the item does NOT close the parent menu. | `boolean`                     | `false`     |
| `label`          | `label`           |                                                                | `string \| undefined`         | `undefined` |
| `leadingIcon`    | `leading-icon`    |                                                                | `string \| undefined`         | `undefined` |
| `selected`       | `selected`        |                                                                | `boolean`                     | `false`     |
| `supportingText` | `supporting-text` |                                                                | `string \| undefined`         | `undefined` |
| `trailingIcon`   | `trailing-icon`   |                                                                | `string \| undefined`         | `undefined` |
| `trailingText`   | `trailing-text`   |                                                                | `string \| undefined`         | `undefined` |
| `value`          | `value`           |                                                                | `string \| undefined`         | `undefined` |


## Events

| Event                      | Description                                                                                                                  | Type                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `materialMenuItemActivate` | Internal: tells the parent menu whether to close.                                                                            | `CustomEvent<{ keepOpen: boolean; }>`           |
| `materialMenuSelect`       | Selection event with the item's `value`. Bubbles + composed so listeners on the host page see it across the shadow boundary. | `CustomEvent<{ value?: string \| undefined; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
