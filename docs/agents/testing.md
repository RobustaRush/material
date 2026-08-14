# Testing

Stencil's integrated test runner (`stencil test --spec --e2e`, wired to `npm test`). It's
deprecated for Stencil v5 (successor: `@stencil/vitest` / `@stencil/playwright`), but it's the
stable, working option today — the vitest path was tried first and dropped; see "Why not
@stencil/vitest" below.

## The one rule that decides spec vs e2e

**If the component has `@AttachInternals()` / `formAssociated: true`, it goes in `.e2e.tsx`, not
`.spec.tsx`.**

Neither Stencil's mock-doc (used by `newSpecPage`) nor jsdom implement `ElementInternals`'
form-association methods (`setFormValue`, `setValidity`, `checkValidity`, `reportValidity`) — both
throw `TypeError: this.internals.setFormValue is not a function`. This isn't a corner case: most
of these components call `syncFormValue()` unconditionally from `connectedCallback`, so *any*
render — even a trivial "does it show the label" test — throws before the test body runs. Real
browsers (what `newE2EPage` drives, via Puppeteer) implement `ElementInternals` fully.

Components currently affected (check `grep -l AttachInternals src/components/*/*.tsx` if this
list drifts): `material-autocomplete`, `material-button`, `material-checkbox`, `material-chip`,
`material-dropzone`, `material-fab`, `material-file-field`, `material-icon-button`,
`material-json-field`, `material-radio`, `material-radio-group`, `material-rich-text`,
`material-search`, `material-search-app-bar`, `material-select`, `material-slider`,
`material-split-button`, `material-switch`, `material-textarea`, `material-textfield`,
`material-transfer`, `material-tree`.

Everything else — presentational components, layout/composition components, anything that
doesn't touch `this.internals` — gets `.spec.tsx` first (fast, no browser). Give it `.e2e.tsx`
too, additionally, only for behavior mock-doc genuinely can't exercise: real focus/keyboard nav
across shadow-DOM boundaries, layout math (`getBoundingClientRect`, popover positioning), or
multi-component composition.

## File layout

Colocate with the component, Stencil's own convention:

```
src/components/material-foo/
  material-foo.tsx
  material-foo.css
  material-foo.spec.tsx   # newSpecPage — mock-doc, no AttachInternals usage
  material-foo.e2e.tsx     # newE2EPage — real headless Chromium via Puppeteer
  readme.md
```

## Worker count and browser

Specs are stable at `--maxWorkers=4`. Run e2e at `--maxWorkers=1`: the Stencil/Puppeteer e2e
runner intermittently saturates Chromium at 4 workers and fails inside `page.setContent()` with
`App did not load within 30000ms`, even for trivial components. That failure is runner load, not a
component assertion failure.

On macOS 26, Puppeteer 21's default Chromium 121 can crash before tests start. `stencil.config.ts`
therefore points Stencil at the newest installed `chrome-headless-shell` in Puppeteer's cache, and
uses a per-run temp profile with Chromium sandbox/crashpad disabled. A caller can still override
this with `PUPPETEER_EXECUTABLE_PATH` or `CHROME_PATH`.

## spec.tsx pattern (`newSpecPage`)

```tsx
import { newSpecPage } from '@stencil/core/testing';
import { MaterialFoo } from './material-foo';

describe('material-foo', () => {
  it('renders …', async () => {
    const page = await newSpecPage({
      components: [MaterialFoo],
      html: `<material-foo label="x"></material-foo>`,
    });
    // page.root, page.root.shadowRoot, page.rootInstance, page.waitForChanges()
  });
});
```

## e2e.tsx pattern (`newE2EPage`)

```tsx
import { newE2EPage } from '@stencil/core/testing';

describe('material-foo', () => {
  it('…', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-foo></material-foo>`);
    const button = await page.find('material-foo >>> button'); // >>> pierces shadow DOM
    const changeSpy = await page.spyOnEvent('fooChange');
    await button.click();
    await page.waitForChanges();
    expect(changeSpy).toHaveReceivedEventDetail({ /* … */ });
  });
});
```

For form participation / validity / native form reset, drive it through a real `<form>` in
`setContent` and read state with `page.evaluate(() => new FormData(...))` — don't reach for
`page.rootInstance` (that's spec-only); use `el.getProperty('someProp')` instead.

## What to cover per component

- Default render + each documented `@Prop` combination that changes markup/attributes.
- `@Event` emissions: correct name, correct detail, correct trigger (and *not* emitted when
  disabled/soft-disabled).
- `@Method()`s.
- Form-associated components only (e2e): `setFormValue` contribution, `formResetCallback`,
  `formDisabledCallback` (via a real `<fieldset disabled>`), constraint validation
  (`checkValidity`/`reportValidity`/`setCustomValidity`) where the component implements it.
- Keyboard activation parity with the native element it's replacing (Space/Enter on a button-like
  control, arrow-key nav in a listbox/group), a11y attributes (`aria-*`) that the component sets
  itself, not visual/CSS assertions.

Don't test Stencil internals (that props exist, that render runs) or CSS visuals — test the
component's documented contract (`readme.md`'s prop/event/method tables are the contract).

## Framework integration tests (React/Vue/Angular/Svelte adapters)

The adapters (`adapters/react`, `adapters/vue`, `adapters/angular`, `adapters/svelte`) are
generated by Stencil's own output-target codegen — the same generator across every component, not
component-specific code. Don't re-test per component; test the shared binding mechanism once per
framework, on one representative element per binding pattern (see `VALUE_ELEMENTS` /
`CHECKED_ELEMENTS` in `stencil.config.ts`):

- **Angular**: `ValueAccessor`/`BooleanValueAccessor`/`NumberValueAccessor`/`RadioValueAccessor`
  (`adapters/angular/src/lib/*.ts`) — `ControlValueAccessor.writeValue`/`registerOnChange`/
  `setDisabledState` against a `FormControl`.
- **Vue**: `componentModels` v-model wiring (`material-textfield` for value, `material-checkbox`
  for checked, `material-radio-group`/`material-slider` for their custom event/attr pairs).
- **React**: prop → attribute passthrough, event → `on*Change` callback prop, ref forwarding, and
  the SSR hydration path (`dist-hydrate-script` / `components.server.ts`) for one form-associated
  element.

These are judgment-call edge cases, not exhaustive per-prop coverage — the per-component contract
is already covered by that component's own spec/e2e tests.

## Why not @stencil/vitest

Tried first (it's Stencil's own recommended successor). Two blockers surfaced before any component
tests were written:

1. Its bundled "stencil" test environment (mock-doc, same as `newSpecPage`) hit the identical
   `ElementInternals` gap above — but silently: instead of throwing, affected tests hung until
   `render()`'s hydration-detection timed out (5s), with no indication of the real cause.
2. Even for non-form components, `render()`'s hydration wait was flaky across separate CLI
   invocations of the *same* test — passed once, timed out on retry — with the dist build
   otherwise identical.

Revisit once `@stencil/vitest` is less new and #2 is gone; the `ElementInternals` gap (#1) is a
platform-emulation limitation (confirmed the same failure in bare jsdom), not specific to this
package, and won't go away without a real browser regardless of runner.

## Puppeteer version pin

`@stencil/core@4.43.4`'s bundled e2e runner calls `puppeteer.executablePath()` synchronously;
Puppeteer made that method async somewhere after v21. Newer `puppeteer` (tested: v25) makes
`newE2EPage()` fail immediately with `Browser was not found at the configured executablePath
([object Promise])`. Keep `puppeteer` pinned to a version whose `executablePath()` is still sync
until Stencil's runner is retired.
