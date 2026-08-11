# @viewflow/material-react

React bindings for [`@viewflow/material`](https://github.com/viewflow/material) — 72 Material 3
web components, wrapped so props, events and refs behave like ordinary React.

Generated from the component sources on every release, so the wrappers never drift from the elements.

## Install

```sh
npm install @viewflow/material @viewflow/material-react
```

## Page setup

The wrappers only bind behaviour. A page still needs the theme tokens and the icon font — see the
[main README](https://github.com/viewflow/material#quick-start):

```tsx
// app entry
import '@viewflow/material/theme.css';
```

```html
<html lang="en" class="light">
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">
```

## Use

```tsx
import { useState } from 'react';
import { MaterialTextfield, MaterialButton, MaterialSelect, MaterialOption } from '@viewflow/material-react';

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
- The components stay **form-associated**: inside a plain `<form>` they post real values and take part
  in constraint validation, controlled or not.

## Server rendering (Next.js, Remix, Vite)

Components render to real HTML with declarative shadow DOM on the server — no flash of unstyled
custom elements. Add `@stencil/ssr` and wrap your config:

```js
// next.config.mjs
import stencilSSR from '@stencil/ssr/next';

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default stencilSSR({
  module: import('@viewflow/material-react'),
  from: '@viewflow/material-react',
  hydrateModule: import('@viewflow/material/hydrate'),
  serializeShadowRoot: 'declarative-shadow-dom',
})(nextConfig);
```

Vite/Remix use the `stencilSSR` plugin and webpack uses `StencilSSRWebpackPlugin` with the same
options — see the [`@stencil/ssr` docs](https://www.npmjs.com/package/@stencil/ssr).

Without that plugin the wrappers are client components (they carry `'use client'`), which works but
renders nothing until hydration.

## Component reference

Attributes, events and methods for every component live in
[`src/components/<tag>/readme.md`](https://github.com/viewflow/material/tree/main/src/components).

## License

AGPL-3.0-or-later, with the [Viewflow Library Exception](https://github.com/viewflow/material/blob/main/LICENSE_EXCEPTION).
