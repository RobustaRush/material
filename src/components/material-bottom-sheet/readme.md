# material-bottom-sheet



<!-- Auto Generated Below -->


## Properties

| Property          | Attribute           | Description                                                                                                               | Type                    | Default   |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------- |
| `dismissible`     | `dismissible`       | Modal only: when false, Esc / scrim click / swipe-down do not close.                                                      | `boolean`               | `true`    |
| `dragHandle`      | `drag-handle`       | Show the drag handle (and enable drag/swipe gestures).                                                                    | `boolean`               | `true`    |
| `dragHandleLabel` | `drag-handle-label` | Accessible name for the drag handle button.                                                                               | `string`                | `''`      |
| `expanded`        | `expanded`          | Expanded (full-height) vs peek state. Reflected so consumers can style against it; toggled by the handle and by dragging. | `boolean`               | `false`   |
| `open`            | `open`              | Reflects open state. Toggling this prop drives showModal()/show()/close().                                                | `boolean`               | `false`   |
| `returnValue`     | `return-value`      | Mirrors the native dialog.returnValue after close.                                                                        | `string`                | `''`      |
| `variant`         | `variant`           |                                                                                                                           | `"modal" \| "standard"` | `'modal'` |


## Events

| Event                 | Description | Type                                    |
| --------------------- | ----------- | --------------------------------------- |
| `materialSheetCancel` |             | `CustomEvent<void>`                     |
| `materialSheetClose`  |             | `CustomEvent<{ returnValue: string; }>` |
| `materialSheetOpen`   |             | `CustomEvent<void>`                     |


## Methods

### `close(returnValue?: string) => Promise<void>`

Close the sheet, optionally setting the return value.

#### Parameters

| Name          | Type                  | Description |
| ------------- | --------------------- | ----------- |
| `returnValue` | `string \| undefined` |             |

#### Returns

Type: `Promise<void>`



### `show() => Promise<void>`

Open the sheet.

#### Returns

Type: `Promise<void>`




## Shadow Parts

| Part      | Description |
| --------- | ----------- |
| `"body"`  |             |
| `"sheet"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
