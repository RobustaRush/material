# material-json-field



<!-- Auto Generated Below -->


## Properties

| Property    | Attribute    | Description                                                                | Type                  | Default     |
| ----------- | ------------ | -------------------------------------------------------------------------- | --------------------- | ----------- |
| `ariaLabel` | `aria-label` |                                                                            | `string \| undefined` | `undefined` |
| `disabled`  | `disabled`   |                                                                            | `boolean`             | `false`     |
| `error`     | `error`      |                                                                            | `boolean`             | `false`     |
| `errorText` | `error-text` |                                                                            | `string \| undefined` | `undefined` |
| `helpText`  | `help-text`  |                                                                            | `string \| undefined` | `undefined` |
| `label`     | `label`      |                                                                            | `string \| undefined` | `undefined` |
| `name`      | `name`       |                                                                            | `string \| undefined` | `undefined` |
| `readonly`  | `readonly`   |                                                                            | `boolean`             | `false`     |
| `required`  | `required`   |                                                                            | `boolean`             | `false`     |
| `value`     | `value`      | Serialized JSON. Source of truth in/out; posts with the form under `name`. | `string`              | `'{}'`      |


## Events

| Event         | Description | Type                              |
| ------------- | ----------- | --------------------------------- |
| `valueChange` |             | `CustomEvent<{ value: string; }>` |


## Methods

### `getJson() => Promise<Json>`

Current value as a parsed object (convenience over parsing `value`).

#### Returns

Type: `Promise<Json>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
