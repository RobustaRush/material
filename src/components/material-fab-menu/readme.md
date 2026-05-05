# material-fab-menu



<!-- Auto Generated Below -->


## Properties

| Property    | Attribute    | Description | Type                                     | Default     |
| ----------- | ------------ | ----------- | ---------------------------------------- | ----------- |
| `ariaLabel` | `aria-label` |             | `string \| undefined`                    | `undefined` |
| `closeIcon` | `close-icon` |             | `string`                                 | `'close'`   |
| `colorSet`  | `color-set`  |             | `"primary" \| "secondary" \| "tertiary"` | `'primary'` |
| `icon`      | `icon`       |             | `string`                                 | `'add'`     |
| `open`      | `open`       |             | `boolean`                                | `false`     |
| `size`      | `size`       |             | `"large" \| "medium" \| "small"`         | `'medium'`  |


## Events

| Event                  | Description | Type                |
| ---------------------- | ----------- | ------------------- |
| `materialFabMenuClose` |             | `CustomEvent<void>` |
| `materialFabMenuOpen`  |             | `CustomEvent<void>` |


## Methods

### `hide() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `show() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `toggle() => Promise<void>`



#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part      | Description |
| --------- | ----------- |
| `"fab"`   |             |
| `"panel"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
