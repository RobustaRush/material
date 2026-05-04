# material-slider



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute         | Description | Type                                   | Default        |
| ---------------- | ----------------- | ----------- | -------------------------------------- | -------------- |
| `ariaLabel`      | `aria-label`      |             | `string \| undefined`                  | `undefined`    |
| `disabled`       | `disabled`        |             | `boolean`                              | `false`        |
| `discrete`       | `discrete`        |             | `boolean`                              | `false`        |
| `error`          | `error`           |             | `boolean`                              | `false`        |
| `errorText`      | `error-text`      |             | `string \| undefined`                  | `undefined`    |
| `helpText`       | `help-text`       |             | `string \| undefined`                  | `undefined`    |
| `icon`           | `icon`            |             | `string \| undefined`                  | `undefined`    |
| `label`          | `label`           |             | `string \| undefined`                  | `undefined`    |
| `max`            | `max`             |             | `number`                               | `100`          |
| `min`            | `min`             |             | `number`                               | `0`            |
| `name`           | `name`            |             | `string \| undefined`                  | `undefined`    |
| `orientation`    | `orientation`     |             | `"horizontal" \| "vertical"`           | `'horizontal'` |
| `origin`         | `origin`          |             | `number \| undefined`                  | `undefined`    |
| `readonly`       | `readonly`        |             | `boolean`                              | `false`        |
| `required`       | `required`        |             | `boolean`                              | `false`        |
| `size`           | `size`            |             | `"l" \| "m" \| "s" \| "xl" \| "xs"`    | `'s'`          |
| `step`           | `step`            |             | `number`                               | `1`            |
| `tickLabels`     | `tick-labels`     |             | `boolean`                              | `false`        |
| `value`          | `value`           |             | `number`                               | `0`            |
| `valueFormatter` | --                |             | `((n: number) => string) \| undefined` | `undefined`    |
| `valueHigh`      | `value-high`      |             | `number \| undefined`                  | `undefined`    |
| `valueIndicator` | `value-indicator` |             | `boolean`                              | `true`         |
| `valueLow`       | `value-low`       |             | `number \| undefined`                  | `undefined`    |


## Events

| Event         | Description | Type                                                                          |
| ------------- | ----------- | ----------------------------------------------------------------------------- |
| `valueChange` |             | `CustomEvent<{ value: number; } \| { valueLow: number; valueHigh: number; }>` |
| `valueCommit` |             | `CustomEvent<{ value: number; } \| { valueLow: number; valueHigh: number; }>` |


## Shadow Parts

| Part                | Description |
| ------------------- | ----------- |
| `"container"`       |             |
| `"icon"`            |             |
| `"icon-active"`     |             |
| `"label"`           |             |
| `"seg-active"`      |             |
| `"seg-leading"`     |             |
| `"seg-trailing"`    |             |
| `"stop"`            |             |
| `"tick-label"`      |             |
| `"track"`           |             |
| `"value-indicator"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
