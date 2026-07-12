# Form controls — material-textfield, material-textarea, material-select, material-autocomplete, material-checkbox, material-radio-group, material-switch, material-slider

The core inputs. All are form-associated: read the shared contract first, then the per-component sections.

## Form association & validation (shared)

Every control here is a form-associated custom element. Given a `name` and placed in a plain `<form>`, it posts a real value, resets with the form, and participates in constraint validation.

- `name` — form field name. `value` — current value (string, except slider = number). Multi-value controls (`material-select multiple`, `material-autocomplete multiple`) also expose `values` (string array) and post one entry per selected value.
- `required` — blocks submit until satisfied, exactly like a native input.
- `error` (boolean) + `error-text` — force the error visual and message (e.g. from server-side validation). `help-text` — assistive text shown below when not in error.
- `disabled`, `readonly` (attribute is `readonly`; the checkbox/radio have no readonly).
- `label` — floating/associated label. `aria-label` — accessible name when there's no visible label.
- Only `material-textfield` and `material-textarea` expose `checkValidity()` / `reportValidity()` as public async methods (`Promise<boolean>`). The others validate through the form and their internal `ElementInternals`; call the form's own `reportValidity()` or `requestSubmit()` to trigger native bubbles.

```html
<form>
  <material-textfield name="email" type="email" label="Email" required></material-textfield>
  <material-button type="submit" label="Save"></material-button>
</form>
```

## material-textfield

Single-line text input, MD3 filled/outlined.

```html
<material-textfield name="user" label="Username" variant="outlined"
                    leading-icon="person" help-text="No spaces" required></material-textfield>
```

- `variant` — `"filled"` | `"outlined"` (default `outlined`).
- `type` — `text` | `email` | `password` | `number` | `tel` | `url` | `search`.
- `leading-icon` / `trailing-icon` (Material Symbols names), `leading-text` / `trailing-text` (e.g. `$`, `.00`), `password-toggle` (show/hide eye for `type=password`), `placeholder`, `max-length`.
- Events: `valueChange` (`{value}`, on commit/blur) and `valueInput` (`{value}`, per keystroke).
- For formatted numbers/masks/dates use the dedicated components in `references/fields.md`, not `type=number`.

## material-textarea

Multi-line variant of textfield.

```html
<material-textarea name="notes" label="Notes" auto-resize min-rows="3" max-rows="10"></material-textarea>
```

- `auto-resize` grows the field with content between `min-rows` and `max-rows`; `rows` sets a fixed height instead.
- Same `variant`, `error`/`help-text`, `valueChange`/`valueInput` as textfield.

## material-select

Dropdown built from slotted `material-option` children (a real MD3 menu, not a native `<select>`).

```html
<material-select name="country" label="Country" clearable>
  <material-option value="us" leading-icon="flag">United States</material-option>
  <material-optgroup label="Europe">
    <material-option value="de">Germany</material-option>
  </material-optgroup>
</material-select>
```

- `multiple` — checkbox options, renders chips, posts one entry per value; source of truth is `values` (string array).
- `clearable` (adds an × ), `placeholder`, `variant`, `leading-icon`.
- Event: `valueChange` (`{value, values}`), `openChange` (`{open}`).
- `material-option`: `value` (required), `leading-icon` / `trailing-icon`, `supporting-text`, `disabled`, `selected`. `material-optgroup`: just `label`.
- Type-ahead works both open (list filter) and closed (jump to match). For typeahead over a large or remote set, use `material-autocomplete`.

## material-autocomplete

Textfield + suggestion list. Options come from slotted `material-option`s, a JS `options` array, or a remote endpoint.

```html
<!-- Slotted (client-side filter) -->
<material-autocomplete name="vendor" label="Vendor" clearable>
  <material-option value="acme">Acme Corp</material-option>
  <material-option value="globex">Globex Ltd</material-option>
</material-autocomplete>

<!-- Remote: server filters, ?q= appended to src -->
<material-autocomplete name="country" src="/api/countries" label="Country"
                       multiple min-chars="2"></material-autocomplete>
```

- `src` — remote JSON endpoint; the query string is appended as `?q=` (override the param name with `query-param`). `debounce` (ms, default ~250), `min-chars` (0 = fetch on open). Slotted/`options` lists then only seed the label cache.
- `options` — set from JS instead of slotting: array of `{value, label, ...}`.
- `multiple` — chips + one form entry per value (`values` is the source of truth, `value` is a CSV mirror).
- `clearable`, `loading-label`, `no-results-label`.
- Events: `materialSearch` (`{query}`, fires when the user types — use to drive custom fetching), `valueChange` (`{value, values}`), `openChange` (`{open}`).

## material-checkbox

```html
<material-checkbox name="tos" value="yes" label="I agree" required></material-checkbox>
```

- `checked`, `indeterminate` (mixed state; posts nothing, like native), `value` (posted when checked, default `"on"`).
- `label`, `help-text`, `error`/`error-text`.
- Event: `checkedChange` (`{checked, indeterminate}`). Method: `toggle()`.
- `nested` (boolean) — visual-only mode: the inner control leaves the tab order so an enclosing widget (a selectable list row) owns focus and semantics while the box still posts with the form. Set automatically by `material-list-item`; you rarely set it by hand.

## material-radio-group (+ material-radio)

The group is the form-associated element; radios are its slotted children. Don't give individual radios a `name`.

```html
<material-radio-group name="plan" label="Plan" value="pro" orientation="horizontal">
  <material-radio value="free" label="Free"></material-radio>
  <material-radio value="pro" label="Pro"></material-radio>
</material-radio-group>
```

- Group: `name`, `value` (selected radio's value), `label`, `orientation` (`vertical` default | `horizontal`), `required`, `error`/`error-text`, `help-text`. Event: `valueChange` (`{value}`).
- `material-radio`: `value` (required), `label`, `label-position` (`trailing` default | `leading`), `disabled`. The group drives arrow-key roving focus and ARIA — don't wire radios individually.

## material-switch

On/off toggle; same form contract as checkbox.

```html
<material-switch name="notify" label="Email notifications" checked
                 icon="check" icon-unchecked="close"></material-switch>
```

- `checked`, `value`, `label`, `error`/`error-text`/`help-text`, `readonly`.
- `icon` / `icon-unchecked` — optional glyphs inside the handle for each state.
- Event: `checkedChange` (`{checked}`).

## material-slider

Numeric slider; `value` is a **number**.

```html
<material-slider name="volume" label="Volume" min="0" max="100" step="5"
                 discrete tick-labels></material-slider>
<!-- Two-thumb range: use value-low / value-high, no plain value -->
<material-slider name="price" value-low="20" value-high="70"></material-slider>
```

- `min`, `max`, `step`, `value` (single thumb) or `value-low` + `value-high` (range).
- `discrete` (snap + show value bubble), `tick-labels`, `value-indicator`, `orientation` (`horizontal` | `vertical`), `size` (`xs`–`xl`), `origin` (fill anchor for centered/diverging sliders), `icon`.
- `value-formatter` — a JS function property (set via `el.valueFormatter = n => ...`) to format the bubble.
- Events: `valueChange` (`{value}` or `{valueLow, valueHigh}`, live drag) and `valueCommit` (same shape, on release — use this to persist).
