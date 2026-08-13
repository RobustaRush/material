# material-chip-set



<!-- Auto Generated Below -->


## Properties

| Property    | Attribute   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Type                            | Default  |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | -------- |
| `selection` | `selection` | How selection behaves across the set.  - `none` (the default) and `multi` — chips toggle independently, which is   what filter chips normally want: filtering by several attributes at once. - `single` — one at a time. Selecting a chip clears the rest, and clicking   the selected one keeps it selected rather than clearing the set, like a   radio group; selectable chips in a single set report `role="radio"`   instead of `checkbox`.  Without this a "view switcher" set — the common sort/filter/view row where exactly one option applies — has to be wired by hand, and a chip that only knows its own state leaves two of them looking selected until the page catches up. | `"multi" \| "none" \| "single"` | `'none'` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
