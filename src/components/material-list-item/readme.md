# material-list-item



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute         | Description                                                                                                                                                                                                                                                                                                       | Type                          | Default     |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------- |
| `active`         | `active`          | Master-detail "currently open / focused" highlight, distinct from `selected`. In `selection-trigger="control"` mode the parent list manages this automatically: the most recently activated item is `active`, others are not. Visually subtler than `selected` so checked rows still stand out from the open one. | `boolean`                     | `false`     |
| `disabled`       | `disabled`        |                                                                                                                                                                                                                                                                                                                   | `boolean`                     | `false`     |
| `divider`        | `divider`         |                                                                                                                                                                                                                                                                                                                   | `"bottom" \| "none" \| "top"` | `'none'`    |
| `href`           | `href`            |                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `label`          | `label`           |                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `leadingIcon`    | `leading-icon`    |                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `overline`       | `overline`        |                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `selected`       | `selected`        |                                                                                                                                                                                                                                                                                                                   | `boolean`                     | `false`     |
| `supportingText` | `supporting-text` |                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `trailingIcon`   | `trailing-icon`   |                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `trailingText`   | `trailing-text`   |                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |
| `value`          | `value`           |                                                                                                                                                                                                                                                                                                                   | `string \| undefined`         | `undefined` |


## Events

| Event                      | Description                                              | Type                                                                            |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `materialListItemActivate` | Internal: tells the parent list this item was activated. | `CustomEvent<{ value?: string \| undefined; checked?: boolean \| undefined; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
