# @viewflow/material-svelte

Svelte 5 bindings for [`@viewflow/material`](https://github.com/viewflow/material) — 72 Material 3
web components with `bind:` support, generated from the component sources on every release.

## Install

```sh
npm install @viewflow/material @viewflow/material-svelte
```

## Page setup

The wrappers only bind behaviour. A page still needs the theme tokens and the icon font — see the
[main README](https://github.com/viewflow/material#quick-start):

```js
// +layout.svelte / main.js
import '@viewflow/material/theme.css';
```

## Use

```svelte
<script>
  import { MaterialTextfield, MaterialSelect, MaterialOption, MaterialButton } from '@viewflow/material-svelte';

  let email = $state('');
  let country = $state('us');
</script>

<form>
  <MaterialTextfield bind:value={email} name="email" type="email" label="Email" required />
  <MaterialSelect bind:value={country} name="country" label="Country">
    <MaterialOption value="us">United States</MaterialOption>
    <MaterialOption value="de">Germany</MaterialOption>
  </MaterialSelect>
  <MaterialButton type="submit" label="Save" />
</form>
```

- **`bind:value`** works on the controls that carry a single value — the text-like fields, `select`,
  `autocomplete`, `radio-group` and `slider`; `checkbox` and `switch` use `bind:checked`.
  `date-range-field` and `transfer` emit `{start, end}` and `{values}`, so handle those with
  `onValueChange` instead.
- **Props** are camelCase (`helpText`, `leadingIcon`) and are set as DOM properties, so arrays and
  objects pass through unserialised.
- **Events** are callback props named `on` + the event name (`onValueChange`,
  `onMaterialStepChange`), receiving the real `CustomEvent` with the payload on `event.detail`.
- **`bind:element`** hands you the custom element, so `@Method()` members are callable:
  `await element.reportValidity()`.
- The components stay **form-associated**: inside a plain `<form>` they post real values and take
  part in constraint validation.

The package ships `.svelte` source — your bundler compiles it, so there is no prebuilt runtime to
keep in step with your Svelte version.

## Server rendering

The wrappers compile in SSR mode and emit their tags, then the elements upgrade and style themselves
on the client. Stencil has no Svelte hydration path, so the shadow content is not pre-rendered;
`@viewflow/material/hydrate` ships in the core package if you want to do that yourself.

## Component reference

Attributes, events and methods for every component live in
[`src/components/<tag>/readme.md`](https://github.com/viewflow/material/tree/main/src/components).

## License

AGPL-3.0-or-later, with the [Viewflow Library Exception](https://github.com/viewflow/material/blob/main/LICENSE_EXCEPTION).
