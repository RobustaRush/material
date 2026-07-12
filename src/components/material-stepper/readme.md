# material-stepper



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute     | Description                                                        | Type                         | Default        |
| ------------- | ------------- | ------------------------------------------------------------------ | ---------------------------- | -------------- |
| `linear`      | `linear`      | Steps must be completed in order — header jumps ahead are blocked. | `boolean`                    | `true`         |
| `orientation` | `orientation` | Header layout; vertical puts each step's content under its header. | `"horizontal" \| "vertical"` | `'horizontal'` |


## Events

| Event                | Description                                                                                                                       | Type                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `materialStepChange` | Emitted after the active step changed (next/back/goTo/header click).                                                              | `CustomEvent<StepChangeDetail>` |
| `materialStepClick`  | Emitted on a header click before any navigation — preventDefault() to take over (e.g. post wizard_goto_step to a formtools view). | `CustomEvent<StepClickDetail>`  |


## Methods

### `back() => Promise<boolean>`

Go back one step (no validation).

#### Returns

Type: `Promise<boolean>`



### `goTo(to: number, validate?: boolean) => Promise<boolean>`

Jump to a step by index; `validate` gates on the current step.

#### Parameters

| Name       | Type      | Description |
| ---------- | --------- | ----------- |
| `to`       | `number`  |             |
| `validate` | `boolean` |             |

#### Returns

Type: `Promise<boolean>`



### `next() => Promise<boolean>`

Advance one step after the active step's controls validate.

#### Returns

Type: `Promise<boolean>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
