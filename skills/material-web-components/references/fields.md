# Specialized fields — material-number-field, material-masked-field, material-date-field, material-date-range-field, material-time-field, material-datetime-field, material-time-picker, material-calendar, material-file-field, material-dropzone, material-rich-text, material-json-field

Formatted, picker-backed, and file inputs. All are form-associated (a `name` posts a real value; `required` / `error` / `error-text` / `help-text` / `label` / `variant` work as in `references/forms.md`). Date/time and number formats follow the page locale automatically — see `references/i18n.md`; the props below only override when you need to. The **posted value is always a plain machine string** (ISO date, dot-decimal number, digits), regardless of how it's displayed.

## material-number-field

Number input with grouping, decimals, and a currency display mode.

```html
<material-number-field name="qty" label="Quantity" min="0" step="1"></material-number-field>
<material-number-field name="price" label="Price" currency="USD" decimals="2"></material-number-field>
<material-number-field name="weight" label="Weight" suffix="kg" grouping></material-number-field>
```

- `min`, `max`, `step`, `decimals`, `grouping` (thousands separators), `locale` (override page locale), `prefix` / `suffix` (static text inside the field).
- `currency` — ISO 4217 code (`"USD"`, `"JPY"`); symbol placement, grouping, and fraction digits come from `Intl` (explicit `decimals` wins). The posted value stays a plain dot-decimal string.
- Event: `valueChange` (`{value, number}`). `value` is the string; `number` is the parsed number.

## material-masked-field

Fixed-pattern text input (phone, card, plate). `mask` is **required**.

```html
<material-masked-field name="phone" label="Phone" mask="(###) ###-####"></material-masked-field>
<material-masked-field name="card" label="Card" mask="#### #### #### ####"></material-masked-field>
```

- `mask` — `#` = digit, `A` = letter, `*` = alphanumeric; other characters are literals (e.g. `"A ### AA"`, `"**-####"`).
- `unmask` — post the raw value (digits only) instead of the formatted string.
- Event: `valueChange` (`{value, raw, complete}`) — `value` formatted, `raw` unmasked, `complete` true when the mask is fully filled.

## material-date-field

Single date; text entry plus a picker surface. Posts ISO `YYYY-MM-DD`.

```html
<material-date-field name="due" label="Due date"></material-date-field>
<material-date-field name="d" label="Modal only" picker="modal" min="2026-01-01" max="2026-12-31"></material-date-field>
```

- `picker` — `auto` (default: docked dropdown on desktop, modal dialog on compact) | `docked` | `modal`.
- `min` / `max` (ISO), `format` (display format override), `input-formats` (accepted typed formats), `headline` (dialog title).
- Event: `valueChange` (`{value}`, ISO).

## material-date-range-field

Start + end in one field. Posts two values.

```html
<material-date-range-field name="period" label="Period" clearable></material-date-range-field>
```

- `start-value` / `end-value` (ISO), `min` / `max`, `clearable`, `format`, `headline`.
- Event: `valueChange` (`{start, end}`). Give it a `name`; it posts start/end as the form expects (check the posted keys in your handler).

## material-time-field

Time entry + dial picker. Posts `HH:MM[:SS]`.

```html
<material-time-field name="at" label="Time" mode="24"></material-time-field>
```

- `mode` — `"12"` (default) | `"24"`. `precision` (`minute` | `second`), `minimum` / `maximum`, `format`, `input-formats`, `headline`.
- Event: `valueChange` (`{value}`).

## material-datetime-field

Combined date + time in one control.

```html
<material-datetime-field name="starts" label="Starts" mode="24"></material-datetime-field>
```

- `min-date` / `max-date`, `min-time` / `max-time`, `mode`, `precision`, `date-label` / `time-label` (sub-field labels).
- Event: `valueChange` (`{value}`, ISO datetime).

## material-time-picker (standalone)

The dial/input time picker surface without a field wrapper — embed it in your own dialog.

```html
<material-time-picker mode="24" view="dial"></material-time-picker>
```

- `view` (`dial` | `input`), `mode`, `precision`, `minimum` / `maximum`, `hide-actions` (no OK/Cancel), `headline`.
- Events: `valueChange` (`{value}`, live), `pickerOk` (`{value}`), `pickerCancel`, `viewChange` (`{view}`).

## material-calendar (standalone)

Inline month grid — for embedding a calendar directly (the date fields use one internally).

```html
<material-calendar value="2026-07-11" first-day-of-week="1"></material-calendar>
<material-calendar range></material-calendar>
```

- `value` (single) or `range` + `start-value` / `end-value`. `display-month` (`YYYY-MM` shown), `min` / `max`, `min-year` / `max-year`, `first-day-of-week` (0=Sun), `dense`, `locale`.
- Events: `dateSelect` (`{value}`), `rangeSelect` (`{start, end}`), `displayMonthChange` (`{value}`).

## material-file-field

Compact file input that posts with the form; shows the chosen file with change/clear/download affordances. `name` **required**.

```html
<material-file-field name="avatar" label="Avatar" accept="image/*"></material-file-field>
<material-file-field name="docs" label="Documents" multiple></material-file-field>
```

- `accept` (native syntax, e.g. `"image/*,.pdf"`), `multiple`.
- Event: `fileChange` (`{file}` or file list).

## material-dropzone

Drag-and-drop upload area with previews and per-file progress. `name` **required**; posts real files with the form.

```html
<material-dropzone name="uploads" multiple accept="image/*,.pdf"
                   max-files="5" max-size="5242880"></material-dropzone>
```

- `accept`, `multiple`, `max-files`, `max-size` (bytes).
- Events: `fileChange` (`{files, added, removed}`), `materialFileAdd` (`{file}`, cancelable to reject), `materialFileReject` (`{file, reason}`).
- Methods: `getFiles()`, `clear()`, `setProgress(file, fraction | "done")` — drive an upload progress bar per file.

## material-rich-text

Minimal rich-text editor; posts HTML as the field value.

```html
<material-rich-text name="note" label="Note" required></material-rich-text>
```

- `value` (HTML string), `readonly`, `error` / `error-text`.
- Events: `valueChange` (`{value}`, on commit) and `valueInput` (`{value}`, live).

## material-json-field

Compact JSON editor rendered as a Material tree — no syntax-highlighter, ~5 KB gz. Objects/arrays are collapsible rows; every leaf is edited in place. Full structural editing: add/remove/rename keys, add/remove/reorder array items, and change a value's type. The output is always valid JSON (edits mutate a model, not text) and posts as **one** form field.

```html
<form>
  <material-json-field name="config" label="Config"
                       value='{"theme":"dark","retries":3,"enabled":true}'></material-json-field>
</form>
<script>
  const jf = document.querySelector('material-json-field');
  jf.addEventListener('valueChange', (e) => console.log(e.detail.value)); // serialized string
  jf.getJson().then((obj) => console.log(obj));                            // parsed value
</script>
```

- `value` — the JSON string (in/out, and what posts under `name`). Set large documents from JS (`el.value = JSON.stringify(obj)`) rather than a huge attribute.
- `readonly` — collapsible viewer, no editors (good for API payloads / audit data). `disabled`, `required` (invalid when the document is empty — `{}`, `[]`, `""`), `error` / `error-text` / `help-text`, `label`.
- Per-row editing: hover (or focus) a row for **add child** (`+`), **move up/down**, and **remove**; the type selector converts a value (string ↔ number ↔ boolean ↔ null ↔ object ↔ array); object keys are editable text in place.
- Event: `valueChange` (`{value}`, serialized) on every edit. Method: `getJson()` → the parsed value.
- Invalid JSON passed in `value` shows an error state instead of throwing; fix it via `value` or by re-setting it.
