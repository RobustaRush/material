# material-radio-group



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute     | Description | Type                         | Default      |
| ------------- | ------------- | ----------- | ---------------------------- | ------------ |
| `disabled`    | `disabled`    |             | `boolean`                    | `false`      |
| `error`       | `error`       |             | `boolean`                    | `false`      |
| `errorText`   | `error-text`  |             | `string \| undefined`        | `undefined`  |
| `helpText`    | `help-text`   |             | `string \| undefined`        | `undefined`  |
| `label`       | `label`       |             | `string \| undefined`        | `undefined`  |
| `name`        | `name`        |             | `string \| undefined`        | `undefined`  |
| `orientation` | `orientation` |             | `"horizontal" \| "vertical"` | `'vertical'` |
| `required`    | `required`    |             | `boolean`                    | `false`      |
| `value`       | `value`       |             | `string \| undefined`        | `undefined`  |


## Events

| Event         | Description | Type                                           |
| ------------- | ----------- | ---------------------------------------------- |
| `valueChange` |             | `CustomEvent<{ value: string \| undefined; }>` |


## Methods

### `checkValidity() => Promise<boolean>`

Constraint validation, like a native radio group.

#### Returns

Type: `Promise<boolean>`



### `reportValidity() => Promise<boolean>`

Constraint validation. An invalid result renders the MD3 inline error
instead of the native bubble — see the `invalid` listener below.

#### Returns

Type: `Promise<boolean>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
