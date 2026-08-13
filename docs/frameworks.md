# Framework subpaths and editor tooling

`advanced-material-web` is a set of custom elements, so it already runs in any framework with one
line of configuration — see the main README's [Frameworks](../README.md#frameworks) section. The
subpaths below exist for the parts a framework can't do well on its own: typed props, real event
bindings, two-way binding, and server rendering — no separate install, same package.

Everything here is **generated from the component sources during `npm run build:all`** — the
adapters cannot drift from the elements, and none of it is committed.

## The subpaths

| Subpath | Framework | Two-way binding | SSR |
| --- | --- | --- | --- |
| `advanced-material-web/react` | React 18+ | controlled props | declarative shadow DOM via `@stencil/ssr` (`/react/ssr`) |
| `advanced-material-web/vue` | Vue 3.5+ | `v-model` | automatic (Nuxt), via the hydrate module |
| `advanced-material-web/angular` | Angular 19+ | `ControlValueAccessor` | tags only, no pre-rendered shadow content |
| `advanced-material-web/svelte` | Svelte 5 | `bind:value` / `bind:checked` | tags only, no pre-rendered shadow content |

### React

```tsx
import { useState } from 'react';
import { MaterialTextfield, MaterialButton, MaterialSelect, MaterialOption } from 'advanced-material-web/react';

export function ContactForm() {
  const [email, setEmail] = useState('');

  return (
    <form>
      <MaterialTextfield
        name="email"
        type="email"
        label="Email"
        required
        value={email}
        onValueChange={(e) => setEmail(e.detail.value)}
      />
      <MaterialSelect name="country" label="Country">
        <MaterialOption value="us">United States</MaterialOption>
        <MaterialOption value="de">Germany</MaterialOption>
      </MaterialSelect>
      <MaterialButton type="submit" label="Save" />
    </form>
  );
}
```

- **Props** are camelCase (`helpText`, `leadingIcon`) and are set as DOM properties, so arrays and
  objects (`options`, `commands`) pass through without serialising.
- **Events** are `on` + the event name (`onValueChange`, `onMaterialStepChange`) and receive the real
  `CustomEvent` — the payload is on `event.detail`.
- **Refs** give you the custom element itself, so `@Method()` members are directly callable:
  `ref.current?.reportValidity()`.

Server rendering (Next.js, Remix, Vite) goes through `advanced-material-web/react/ssr` and
`@stencil/ssr`:

```js
// next.config.mjs
import stencilSSR from '@stencil/ssr/next';

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default stencilSSR({
  module: import('advanced-material-web/react/ssr'),
  from: 'advanced-material-web/react',
  hydrateModule: import('advanced-material-web/hydrate'),
  serializeShadowRoot: 'declarative-shadow-dom',
})(nextConfig);
```

Vite/Remix use the `stencilSSR` plugin and webpack uses `StencilSSRWebpackPlugin` with the same
options — see the [`@stencil/ssr` docs](https://www.npmjs.com/package/@stencil/ssr). Without that
plugin the components are client components (they carry `'use client'`), which works but renders
nothing until hydration.

### Vue

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MaterialTextfield, MaterialSelect, MaterialOption, MaterialButton } from 'advanced-material-web/vue';

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

`v-model` works on the controls that carry a single value — the text-like fields, `select`,
`autocomplete`, `radio-group`, `slider` (`value`) and `checkbox` / `switch` (`checked`).

Server rendering (Nuxt) needs no configuration: each component picks its implementation at import
time — in the browser it binds the custom element, on the server it renders through
`advanced-material-web/hydrate` into declarative shadow DOM.

### Angular

```ts
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MaterialTextfield, MaterialSelect, MaterialOption, MaterialButton } from 'advanced-material-web/angular';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, MaterialTextfield, MaterialSelect, MaterialOption, MaterialButton],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <material-textfield formControlName="email" label="Email" type="email" required />
      <material-select formControlName="country" label="Country">
        <material-option value="us">United States</material-option>
        <material-option value="de">Germany</material-option>
      </material-select>
      <material-button type="submit" label="Save" />
    </form>
  `,
})
export class ContactComponent {
  form = new FormGroup({
    email: new FormControl(''),
    country: new FormControl('us'),
  });

  save() { console.log(this.form.value); }
}
```

- **Selectors are the tag names** (`material-textfield`), so templates read like plain HTML while
  still being type-checked against the component's inputs. No NgModule.
- **Change detection is detached** on every wrapper; property writes run outside `NgZone`.
- `DIRECTIVES` exports every wrapper as an array, for importing them all at once.

Angular SSR renders the components as their tags with projected content, and they upgrade on the
client — Stencil has no first-class Angular hydration path, but `advanced-material-web/hydrate`
is there if you want to pre-render the shadow content yourself.

### Svelte

```svelte
<script>
  import { MaterialTextfield, MaterialSelect, MaterialOption, MaterialButton } from 'advanced-material-web/svelte';

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

Ships as `.svelte` source — your bundler compiles it, so there is no prebuilt runtime pinned to a
Svelte version. SSR renders the tags with no pre-rendered shadow content, same as Angular.

### Common to all four

- **Events** carry the real `CustomEvent`, payload on `event.detail` (or `$event.detail` in
  Angular templates) — nothing framework-specific is invented.
- The components stay **form-associated**: inside a plain `<form>` they post real values and take
  part in constraint validation, wrapped or not.
- Attributes, events and methods for every component live in
  [`src/components/<tag>/readme.md`](https://github.com/viewflow/material/tree/main/src/components).

## Which controls support two-way binding

Driven by `VALUE_ELEMENTS` / `CHECKED_ELEMENTS` in `stencil.config.ts`, shared by all four targets:
the text-like fields, `select`, `autocomplete`, `radio-group` and `slider` bind `value`;
`checkbox` and `switch` bind `checked`.

`material-date-range-field` and `material-transfer` are deliberately excluded — they emit
`{start, end}` and `{values}` respectively, so there is no single value to bind. Handle them with an
explicit `valueChange` listener.

## Server rendering

`dist-hydrate-script` produces `advanced-material-web/hydrate`, which renders any component to HTML
off the DOM:

```js
import { renderToString } from 'advanced-material-web/hydrate';

const { html } = await renderToString('<material-button label="Save" variant="filled"></material-button>', {
  serializeShadowRoot: 'declarative-shadow-dom',
});
```

React and Vue wire that up for you (above). Angular and Svelte render the tags and let the elements
upgrade on the client; the hydrate module is there if you want to pre-render yourself.

## Editor and tooling metadata

Generated into `dist/` and published with the package:

| File | Format | Consumers |
| --- | --- | --- |
| `dist/html-data.json` | VS Code custom data | attribute completion and hover docs in plain HTML and Django templates |
| `dist/web-types.json` | JetBrains web-types | the same, in WebStorm / PyCharm / IntelliJ |
| `dist/custom-elements.json` | Custom Elements Manifest | Storybook, doc generators, most editor plugins |
| `dist/docs.json` | Stencil docs-json | the source the two above are generated from |

`custom-elements.json` and `web-types.json` are advertised through the `customElements` and
`web-types` fields in `package.json`, so tools that look for them find them without configuration.
JetBrains IDEs pick web-types up automatically.

VS Code needs one setting:

```json
// .vscode/settings.json
{
  "html.customData": ["./node_modules/advanced-material-web/dist/html-data.json"]
}
```

## How the build fits together

`npm run build` (core package):

1. The four stylesheets under `css/`: Tailwind compiles `theme.css` and `tokens.css`,
   `scripts/build-tailwind-preset.mjs` publishes `tailwind.css` uncompiled (consumers' own Tailwind
   reads its `@theme` directives), and `scripts/build-material-css.mjs` bundles `material.css`.
2. `stencil build` emits `dist/`, `loader/`, `hydrate/`, the readmes, the tooling JSON, and the four
   framework adapters' generated source into `adapters/*/src`.
3. `scripts/patch-custom-element-types.mjs` fixes the custom-elements typings (below).
4. `scripts/build-web-types.mjs` derives `web-types.json` from `docs.json`.
5. `scripts/build-cdn.mjs` bundles the single-file CDN build.

`npm run build:adapters` then compiles each framework adapter (`tsc` for React and Vue, `ng-packagr`
for Angular; Svelte ships source, so there's nothing to compile). `npm run build:all` does both, in
order — this is what `npm publish` runs, through `prepublishOnly`.

`npm start` sets `MATERIAL_WRAPPERS=0` so watch rebuilds skip adapter codegen.

### Two things worth knowing

**The typings patch.** Stencil emits `interface X extends Components.X, HTMLElement {}` for each
custom element. Where a `@Prop()` shadows something `HTMLElement` already has — `ariaLabel` (ARIA
reflection makes it a real DOM property typed `string | null`, while a Stencil prop is
`string | undefined`), plus `prefix` and `focus` — the two bases conflict and the interface no
longer satisfies `HTMLElement`, which every generated React adapter requires. The patch script
applies the same `Omit<…>` that Stencil already uses for methods in `dist/types`, computed from the
real `HTMLElement` members rather than a hand-kept list. It also re-exports `Components` and `JSX`
from `dist/components/index.d.ts`, which `auto-define-custom-elements` leaves out.

**The Svelte target is ours.** `@stencil/svelte-output-target` is still 0.0.3 and calls the Svelte
3/4 compiler API, which Svelte 5 rejects outright. `scripts/svelte-output-target.mjs` generates
Svelte 5 source instead — the normal way Svelte libraries publish, so there is no build step and no
compiled runtime pinned to one Svelte version.
