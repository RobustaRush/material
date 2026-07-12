# material-command-palette



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute     | Description                                                                                           | Type                         | Default     |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- | ----------- |
| `commands`    | --            | Commands from JS; slotted material-options are merged in after these.                                 | `CommandItem[] \| undefined` | `undefined` |
| `emptyLabel`  | `empty-label` |                                                                                                       | `string`                     | `''`        |
| `hotkey`      | `hotkey`      | Global shortcut: 'mod+k' (⌘K on macOS, Ctrl+K elsewhere) or '' to disable and open only via `show()`. | `string`                     | `'mod+k'`   |
| `placeholder` | `placeholder` |                                                                                                       | `string \| undefined`        | `undefined` |
| `upTarget`    | `up-target`   | `up-target` copied to the navigation anchor for href commands.                                        | `string \| undefined`        | `undefined` |


## Events

| Event             | Description                                               | Type                                              |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `materialCommand` | Cancelable: preventDefault() to suppress href navigation. | `CustomEvent<{ id: string; item: CommandItem; }>` |
| `openChange`      |                                                           | `CustomEvent<{ open: boolean; }>`                 |


## Methods

### `hide() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `show() => Promise<void>`



#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
