# material-number-field



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute       | Description                                                                                            | Type                     | Default      |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------ | ------------ |
| `decimals`     | `decimals`      | Fraction digits shown/kept. Defaults to the step's precision (step 0.01 → 2).                          | `number \| undefined`    | `undefined`  |
| `disabled`     | `disabled`      |                                                                                                        | `boolean`                | `false`      |
| `error`        | `error`         |                                                                                                        | `boolean`                | `false`      |
| `errorText`    | `error-text`    |                                                                                                        | `string \| undefined`    | `undefined`  |
| `grouping`     | `grouping`      | Group thousands in the visible text (via Intl, `locale` or page locale). The posted value stays plain. | `boolean`                | `false`      |
| `helpText`     | `help-text`     |                                                                                                        | `string \| undefined`    | `undefined`  |
| `invalidLabel` | `invalid-label` |                                                                                                        | `string`                 | `''`         |
| `label`        | `label`         |                                                                                                        | `string \| undefined`    | `undefined`  |
| `locale`       | `locale`        |                                                                                                        | `string`                 | `''`         |
| `max`          | `max`           |                                                                                                        | `number \| undefined`    | `undefined`  |
| `min`          | `min`           |                                                                                                        | `number \| undefined`    | `undefined`  |
| `name`         | `name`          |                                                                                                        | `string \| undefined`    | `undefined`  |
| `placeholder`  | `placeholder`   |                                                                                                        | `string \| undefined`    | `undefined`  |
| `prefix`       | `prefix`        | Static text inside the field, e.g. a currency sign or unit.                                            | `string \| undefined`    | `undefined`  |
| `readOnly`     | `readonly`      |                                                                                                        | `boolean`                | `false`      |
| `required`     | `required`      |                                                                                                        | `boolean`                | `false`      |
| `step`         | `step`          |                                                                                                        | `number`                 | `1`          |
| `suffix`       | `suffix`        |                                                                                                        | `string \| undefined`    | `undefined`  |
| `value`        | `value`         | Canonical value — dot-decimal string ("1234.5"), empty = no value.                                     | `string`                 | `''`         |
| `variant`      | `variant`       |                                                                                                        | `"filled" \| "outlined"` | `'outlined'` |


## Events

| Event         | Description | Type                                                      |
| ------------- | ----------- | --------------------------------------------------------- |
| `valueChange` |             | `CustomEvent<{ value: string; number: number \| null; }>` |


## Dependencies

### Depends on

- [material-textfield](../material-textfield)
- [material-icon-button](../material-icon-button)

### Graph
```mermaid
graph TD;
  material-number-field --> material-textfield
  material-number-field --> material-icon-button
  material-textfield --> material-icon-button
  style material-number-field fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
