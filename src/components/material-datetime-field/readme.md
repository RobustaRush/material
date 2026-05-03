# material-datetime-field



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute       | Description                                                                                                          | Type                        | Default      |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------ |
| `cancelLabel`  | `cancel-label`  |                                                                                                                      | `string`                    | `''`         |
| `dateLabel`    | `date-label`    |                                                                                                                      | `string`                    | `''`         |
| `disabled`     | `disabled`      |                                                                                                                      | `boolean`                   | `false`      |
| `error`        | `error`         |                                                                                                                      | `boolean`                   | `false`      |
| `errorText`    | `error-text`    |                                                                                                                      | `string \| undefined`       | `undefined`  |
| `format`       | `format`        |                                                                                                                      | `string`                    | `''`         |
| `helpText`     | `help-text`     |                                                                                                                      | `string \| undefined`       | `undefined`  |
| `inputFormats` | --              |                                                                                                                      | `string[] \| undefined`     | `undefined`  |
| `invalidLabel` | `invalid-label` |                                                                                                                      | `string`                    | `''`         |
| `label`        | `label`         |                                                                                                                      | `string \| undefined`       | `undefined`  |
| `maxDate`      | `max-date`      | Latest selectable date as `YYYY-MM-DD`. Empty = no upper bound.                                                      | `string`                    | `''`         |
| `maxTime`      | `max-time`      | Latest time-of-day as `HH:MM`, applied to *every* day in range.                                                      | `string`                    | `''`         |
| `minDate`      | `min-date`      | Earliest selectable date as `YYYY-MM-DD`. Empty = no lower bound.                                                    | `string`                    | `''`         |
| `minTime`      | `min-time`      | Earliest time-of-day as `HH:MM`, applied to *every* day in range (business-hours semantics). Empty = no lower bound. | `string`                    | `''`         |
| `mode`         | `mode`          | `'12'` or `'24'`. Defaults to the locale via Intl.                                                                   | `"12" \| "24" \| undefined` | `undefined`  |
| `name`         | `name`          |                                                                                                                      | `string \| undefined`       | `undefined`  |
| `okLabel`      | `ok-label`      |                                                                                                                      | `string`                    | `''`         |
| `openLabel`    | `open-label`    |                                                                                                                      | `string`                    | `''`         |
| `placeholder`  | `placeholder`   |                                                                                                                      | `string \| undefined`       | `undefined`  |
| `precision`    | `precision`     | Time step granularity as `HH:MM`. Default `00:01` allows any minute.                                                 | `string`                    | `'00:01'`    |
| `readOnly`     | `readonly`      |                                                                                                                      | `boolean`                   | `false`      |
| `required`     | `required`      |                                                                                                                      | `boolean`                   | `false`      |
| `timeLabel`    | `time-label`    |                                                                                                                      | `string`                    | `''`         |
| `value`        | `value`         | ISO `YYYY-MM-DDTHH:MM`. Always the canonical form for form posts.                                                    | `string`                    | `''`         |
| `variant`      | `variant`       |                                                                                                                      | `"filled" \| "outlined"`    | `'outlined'` |


## Events

| Event         | Description | Type                              |
| ------------- | ----------- | --------------------------------- |
| `valueChange` |             | `CustomEvent<{ value: string; }>` |


## Dependencies

### Depends on

- [material-textfield](../material-textfield)
- [material-icon-button](../material-icon-button)
- [material-dialog](../material-dialog)
- [material-calendar](../material-calendar)
- [material-time-picker](../material-time-picker)
- [material-button](../material-button)

### Graph
```mermaid
graph TD;
  material-datetime-field --> material-textfield
  material-datetime-field --> material-icon-button
  material-datetime-field --> material-dialog
  material-datetime-field --> material-calendar
  material-datetime-field --> material-time-picker
  material-datetime-field --> material-button
  material-textfield --> material-icon-button
  material-dialog --> material-icon-button
  material-calendar --> material-icon-button
  material-time-picker --> material-icon-button
  material-time-picker --> material-button
  style material-datetime-field fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
