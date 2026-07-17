# material-textarea



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute       | Description | Type                     | Default      |
| -------------- | --------------- | ----------- | ------------------------ | ------------ |
| `ariaLabel`    | `aria-label`    |             | `string \| undefined`    | `undefined`  |
| `autoResize`   | `auto-resize`   |             | `boolean`                | `false`      |
| `disabled`     | `disabled`      |             | `boolean`                | `false`      |
| `error`        | `error`         |             | `boolean`                | `false`      |
| `errorText`    | `error-text`    |             | `string \| undefined`    | `undefined`  |
| `helpText`     | `help-text`     |             | `string \| undefined`    | `undefined`  |
| `label`        | `label`         |             | `string \| undefined`    | `undefined`  |
| `maxLength`    | `max-length`    |             | `number \| undefined`    | `undefined`  |
| `maxRows`      | `max-rows`      |             | `number \| undefined`    | `undefined`  |
| `minRows`      | `min-rows`      |             | `number \| undefined`    | `undefined`  |
| `name`         | `name`          |             | `string \| undefined`    | `undefined`  |
| `placeholder`  | `placeholder`   |             | `string \| undefined`    | `undefined`  |
| `readOnly`     | `readonly`      |             | `boolean`                | `false`      |
| `required`     | `required`      |             | `boolean`                | `false`      |
| `rows`         | `rows`          |             | `number`                 | `3`          |
| `trailingIcon` | `trailing-icon` |             | `string \| undefined`    | `undefined`  |
| `value`        | `value`         |             | `string`                 | `''`         |
| `variant`      | `variant`       |             | `"filled" \| "outlined"` | `'outlined'` |
| `wideTrailing` | `wide-trailing` |             | `boolean`                | `false`      |


## Events

| Event         | Description | Type                              |
| ------------- | ----------- | --------------------------------- |
| `valueChange` |             | `CustomEvent<{ value: string; }>` |
| `valueInput`  |             | `CustomEvent<{ value: string; }>` |


## Methods

### `checkValidity() => Promise<boolean>`

Constraint validation, like a native textarea.

#### Returns

Type: `Promise<boolean>`



### `reportValidity() => Promise<boolean>`

Constraint validation. An invalid result renders the MD3 inline error
instead of the native bubble — see the `invalid` listener below.

#### Returns

Type: `Promise<boolean>`



### `setCustomValidity(message: string) => Promise<void>`

Sets a custom validity message, like a native textarea's
`setCustomValidity()`. See material-textfield for the contract.

#### Parameters

| Name      | Type     | Description |
| --------- | -------- | ----------- |
| `message` | `string` |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
