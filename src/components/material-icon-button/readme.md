# material-icon-button



<!-- Auto Generated Below -->


## Properties

| Property              | Attribute             | Description                                                                                                                                                                                                                                                             | Type                                                      | Default     |
| --------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| `ariaLabel`           | `aria-label`          |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `disabled`            | `disabled`            |                                                                                                                                                                                                                                                                         | `boolean`                                                 | `false`     |
| `download`            | `download`            |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `href`                | `href`                |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `icon` _(required)_   | `icon`                |                                                                                                                                                                                                                                                                         | `string`                                                  | `undefined` |
| `name`                | `name`                |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `popoverTarget`       | `popovertarget`       |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `popoverTargetAction` | `popovertargetaction` |                                                                                                                                                                                                                                                                         | `"hide" \| "show" \| "toggle" \| undefined`               | `undefined` |
| `rel`                 | `rel`                 |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `selected`            | `selected`            |                                                                                                                                                                                                                                                                         | `boolean`                                                 | `false`     |
| `selectedIcon`        | `selected-icon`       |                                                                                                                                                                                                                                                                         | `string \| undefined`                                     | `undefined` |
| `shape`               | `shape`               |                                                                                                                                                                                                                                                                         | `"round" \| "square"`                                     | `'round'`   |
| `size`                | `size`                |                                                                                                                                                                                                                                                                         | `"l" \| "m" \| "s" \| "xl" \| "xs"`                       | `'s'`       |
| `softDisabled`        | `soft-disabled`       | Disabled but still focusable/reachable by keyboard and AT, per https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_disabled_controls. Visually identical to `disabled`; the click handler blocks activation instead of the element leaving the tab order. | `boolean`                                                 | `false`     |
| `target`              | `target`              |                                                                                                                                                                                                                                                                         | `"_blank" \| "_parent" \| "_self" \| "_top" \| undefined` | `undefined` |
| `toggle`              | `toggle`              |                                                                                                                                                                                                                                                                         | `boolean`                                                 | `false`     |
| `type`                | `type`                |                                                                                                                                                                                                                                                                         | `"button" \| "reset" \| "submit"`                         | `'button'`  |
| `value`               | `value`               |                                                                                                                                                                                                                                                                         | `string`                                                  | `'on'`      |
| `variant`             | `variant`             |                                                                                                                                                                                                                                                                         | `"filled" \| "outlined" \| "standard" \| "tonal"`         | `'filled'`  |
| `width`               | `width`               |                                                                                                                                                                                                                                                                         | `"default" \| "narrow" \| "wide"`                         | `'default'` |


## Events

| Event            | Description | Type                                  |
| ---------------- | ----------- | ------------------------------------- |
| `selectedChange` |             | `CustomEvent<{ selected: boolean; }>` |


## Shadow Parts

| Part            | Description |
| --------------- | ----------- |
| `"button"`      |             |
| `"state-layer"` |             |
| `"visual"`      |             |


## Dependencies

### Used by

 - [material-autocomplete](../material-autocomplete)
 - [material-calendar](../material-calendar)
 - [material-date-field](../material-date-field)
 - [material-date-range-field](../material-date-range-field)
 - [material-datetime-field](../material-datetime-field)
 - [material-dialog](../material-dialog)
 - [material-dropzone](../material-dropzone)
 - [material-file-field](../material-file-field)
 - [material-number-field](../material-number-field)
 - [material-search](../material-search)
 - [material-select](../material-select)
 - [material-side-sheet](../material-side-sheet)
 - [material-textfield](../material-textfield)
 - [material-time-field](../material-time-field)
 - [material-time-picker](../material-time-picker)
 - [material-transfer](../material-transfer)

### Graph
```mermaid
graph TD;
  material-autocomplete --> material-icon-button
  material-calendar --> material-icon-button
  material-date-field --> material-icon-button
  material-date-range-field --> material-icon-button
  material-datetime-field --> material-icon-button
  material-dialog --> material-icon-button
  material-dropzone --> material-icon-button
  material-file-field --> material-icon-button
  material-number-field --> material-icon-button
  material-search --> material-icon-button
  material-select --> material-icon-button
  material-side-sheet --> material-icon-button
  material-textfield --> material-icon-button
  material-time-field --> material-icon-button
  material-time-picker --> material-icon-button
  material-transfer --> material-icon-button
  style material-icon-button fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
