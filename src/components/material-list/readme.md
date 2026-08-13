# material-list



<!-- Auto Generated Below -->


## Properties

| Property           | Attribute           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Type                            | Default      |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------ |
| `activation`       | `activation`        | Who owns `active` — the master-detail highlight on the last-activated row.  `manual` (default): nobody but you. The list emits `materialListSelect` and leaves the prop alone, which is the only thing a declarative framework can work with: React writes a DOM property when the *rendered* value changes, so a row the component marked active can never be cleared from JSX again.  `auto`: the list keeps one row active for you, as it always did — the shorter path for plain HTML and for master-detail layouts that have no other state to drive it from. | `"auto" \| "manual"`            | `'manual'`   |
| `dense`            | `dense`             |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `boolean`                       | `false`      |
| `selection`        | `selection`         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `"multi" \| "none" \| "single"` | `'none'`     |
| `selectionTrigger` | `selection-trigger` |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `"control" \| "row"`            | `'row'`      |
| `variant`          | `variant`           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `"baseline" \| "expressive"`    | `'baseline'` |


## Events

| Event                | Description                                                                   | Type                                                                            |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `materialListSelect` | Fires when an item is activated. For multi, `checked` reflects the new state. | `CustomEvent<{ value?: string \| undefined; checked?: boolean \| undefined; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
