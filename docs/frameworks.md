# Framework packages and editor tooling

`@viewflow/material` is a set of custom elements, so it already runs in any framework. The packages
below exist for the parts a framework can't do well on its own: typed props, real event bindings,
two-way binding, and server rendering.

Everything here is **generated from the component sources during `npm run build`** — the wrappers
cannot drift from the elements, and none of it is committed.

## The packages

| Package | Framework | Two-way binding | SSR |
| --- | --- | --- | --- |
| `@viewflow/material-react` | React 18+ | controlled props | declarative shadow DOM via `@stencil/ssr` |
| `@viewflow/material-vue` | Vue 3.5+ | `v-model` | automatic (Nuxt), via the hydrate module |
| `@viewflow/material-angular` | Angular 19+ | `ControlValueAccessor` | tags only, no pre-rendered shadow content |
| `@viewflow/material-svelte` | Svelte 5 | `bind:value` / `bind:checked` | tags only, no pre-rendered shadow content |

Each has its own README with install and usage. All four are versioned in lockstep with the core
package and declare it as a peer dependency.

### Which controls support two-way binding

Driven by `VALUE_ELEMENTS` / `CHECKED_ELEMENTS` in `stencil.config.ts`, shared by all four targets:
the text-like fields, `select`, `autocomplete`, `radio-group` and `slider` bind `value`;
`checkbox` and `switch` bind `checked`.

`material-date-range-field` and `material-transfer` are deliberately excluded — they emit
`{start, end}` and `{values}` respectively, so there is no single value to bind. Handle them with an
explicit `valueChange` listener.

## Server rendering

`dist-hydrate-script` produces `@viewflow/material/hydrate`, which renders any component to HTML off
the DOM:

```js
import { renderToString } from '@viewflow/material/hydrate';

const { html } = await renderToString('<material-button label="Save" variant="filled"></material-button>', {
  serializeShadowRoot: 'declarative-shadow-dom',
});
```

React and Vue wire that up for you (see their READMEs). Angular and Svelte render the tags and let
the elements upgrade on the client; the hydrate module is there if you want to pre-render yourself.

## Editor and tooling metadata

Generated into `dist/` and published with the core package:

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
  "html.customData": ["./node_modules/@viewflow/material/dist/html-data.json"]
}
```

## How the build fits together

`npm run build` (core package):

1. Tailwind builds `theme.css` and `material.css`.
2. `stencil build` emits `dist/`, `loader/`, `hydrate/`, the readmes, the tooling JSON, and the four
   framework wrappers into `packages/*/src`.
3. `scripts/patch-custom-element-types.mjs` fixes the custom-elements typings (below).
4. `scripts/build-web-types.mjs` derives `web-types.json` from `docs.json`.
5. `scripts/build-cdn.mjs` bundles the single-file CDN build.

`npm run build:packages` then syncs versions and builds each framework package.
`npm run build:all` does both, in order.

`npm start` sets `MATERIAL_WRAPPERS=0` so watch rebuilds skip wrapper codegen.

### Two things worth knowing

**The typings patch.** Stencil emits `interface X extends Components.X, HTMLElement {}` for each
custom element. Where a `@Prop()` shadows something `HTMLElement` already has — `ariaLabel` (ARIA
reflection makes it a real DOM property typed `string | null`, while a Stencil prop is
`string | undefined`), plus `prefix` and `focus` — the two bases conflict and the interface no
longer satisfies `HTMLElement`, which every generated React wrapper requires. The patch script
applies the same `Omit<…>` that Stencil already uses for methods in `dist/types`, computed from the
real `HTMLElement` members rather than a hand-kept list. It also re-exports `Components` and `JSX`
from `dist/components/index.d.ts`, which `auto-define-custom-elements` leaves out.

**The Svelte target is ours.** `@stencil/svelte-output-target` is still 0.0.3 and calls the Svelte
3/4 compiler API, which Svelte 5 rejects outright. `scripts/svelte-output-target.mjs` generates
Svelte 5 source instead — the normal way Svelte libraries publish, so there is no build step and no
compiled runtime pinned to one Svelte version.
