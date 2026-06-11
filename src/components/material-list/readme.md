# material-list



<!-- Auto Generated Below -->


## Properties

| Property           | Attribute           | Description | Type                            | Default      |
| ------------------ | ------------------- | ----------- | ------------------------------- | ------------ |
| `dense`            | `dense`             |             | `boolean`                       | `false`      |
| `selection`        | `selection`         |             | `"multi" \| "none" \| "single"` | `'none'`     |
| `selectionTrigger` | `selection-trigger` |             | `"control" \| "row"`            | `'row'`      |
| `variant`          | `variant`           |             | `"baseline" \| "expressive"`    | `'baseline'` |


## Events

| Event                | Description                                                                   | Type                                                                            |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `materialListSelect` | Fires when an item is activated. For multi, `checked` reflects the new state. | `CustomEvent<{ value?: string \| undefined; checked?: boolean \| undefined; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
