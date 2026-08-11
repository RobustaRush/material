# @viewflow/material-vue

Vue 3 bindings for [`@viewflow/material`](https://github.com/viewflow/material) — 72 Material 3
web components with `v-model` support, generated from the component sources on every release.

## Install

```sh
npm install @viewflow/material @viewflow/material-vue
```

## Page setup

The wrappers only bind behaviour. A page still needs the theme tokens and the icon font — see the
[main README](https://github.com/viewflow/material#quick-start):

```ts
// main.ts
import '@viewflow/material/theme.css';
```

## Use

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MaterialTextfield, MaterialSelect, MaterialOption, MaterialButton } from '@viewflow/material-vue';

const email = ref('');
const country = ref('us');
</script>

<template>
  <form>
    <MaterialTextfield v-model="email" name="email" type="email" label="Email" required />
    <MaterialSelect v-model="country" name="country" label="Country">
      <MaterialOption value="us">United States</MaterialOption>
      <MaterialOption value="de">Germany</MaterialOption>
    </MaterialSelect>
    <MaterialButton type="submit" label="Save" />
  </form>
</template>
```

- **`v-model`** works on the controls that carry a single value — the text-like fields, `select`,
  `autocomplete`, `radio-group`, `slider` (`value`) and `checkbox` / `switch` (`checked`).
  `date-range-field` and `transfer` are deliberately excluded: they emit `{start, end}` and
  `{values}`, so bind those with an explicit `@valueChange`.
- **Props** are camelCase and set as DOM properties, so `options`, `commands` and other
  array/object props pass through unserialised.
- **Events** are ordinary Vue listeners — `@valueChange="…"`, `@materialStepChange="…"` — receiving
  the real `CustomEvent`, payload on `event.detail`.
- The components stay **form-associated**: inside a plain `<form>` they post real values and take
  part in constraint validation.

## Server rendering (Nuxt)

Nothing to configure. Each wrapper picks its implementation at import time: in the browser it binds
the custom element, on the server it renders the component through
`@viewflow/material/hydrate` into declarative shadow DOM.

## Component reference

Attributes, events and methods for every component live in
[`src/components/<tag>/readme.md`](https://github.com/viewflow/material/tree/main/src/components).

## License

AGPL-3.0-or-later, with the [Viewflow Library Exception](https://github.com/viewflow/material/blob/main/LICENSE_EXCEPTION).
