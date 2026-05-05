# material-fab-menu



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute       | Description                                                                | Type                                     | Default     |
| ------------- | --------------- | -------------------------------------------------------------------------- | ---------------------------------------- | ----------- |
| `ariaLabel`   | `aria-label`    |                                                                            | `string \| undefined`                    | `undefined` |
| `closeIcon`   | `close-icon`    |                                                                            | `string`                                 | `'close'`   |
| `colorSet`    | `color-set`     |                                                                            | `"primary" \| "secondary" \| "tertiary"` | `'primary'` |
| `hideNearEnd` | `hide-near-end` | When true, the FAB fades out as the page scrolls near its bottom edge.     | `boolean`                                | `false`     |
| `hideOffset`  | `hide-offset`   | Distance from the document bottom (in px) at which the FAB starts to hide. | `number`                                 | `80`        |
| `icon`        | `icon`          |                                                                            | `string`                                 | `'add'`     |
| `open`        | `open`          |                                                                            | `boolean`                                | `false`     |
| `size`        | `size`          |                                                                            | `"large" \| "medium" \| "small"`         | `'medium'`  |


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
