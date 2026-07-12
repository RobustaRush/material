# Stepper / wizard — material-stepper, material-step

Multi-step flow. Two modes with the same anatomy: a **client-side wizard** (all steps in one form, validated locally) or a **server-driven indicator** (the server renders one step per request and you relay header clicks).

## Anatomy

`material-stepper` wraps `material-step` children; each step's content is its default-slot markup.

```html
<material-stepper id="wiz">
  <material-step label="Contact" value="contact" active>… fields …</material-step>
  <material-step label="Shipping" value="shipping">… fields …</material-step>
  <material-step label="Review" value="review">… summary …</material-step>
</material-stepper>
```

- Stepper: `orientation` (`horizontal` default | `vertical` — vertical puts each step's content under its own header), `linear` (default **true**: steps must be completed in order and header jumps ahead are blocked; set `linear="false"` for free navigation).
- Step: `label`, `value` (stable id used in events and `go-to`), `supporting-text`, and the reflected state attributes `active` (the visible step), `completed`, `error`, `disabled`. Exactly one step should start `active`.
- Methods on the stepper: `next()`, `back()`, `goTo(to)` (index or value). Event: `materialStepChange` — `{from, to, fromValue, toValue}` (fires after any change: next/back/goTo/header click).

## Client-side wizard (one form, local validation)

Put the whole stepper inside one `<form>`. Advance/retreat with **declarative triggers on any button** — `data-stepper-next` and `data-stepper-back`. `data-stepper-next` gates on the active step's constraint validation: if a `required`/invalid field fails, it shows the native validation bubble and does **not** advance. Because every step stays in the DOM, a final `type="submit"` posts all steps' fields at once.

```html
<form id="wiz-form">
  <material-stepper id="wiz"> … steps as above … </material-stepper>

  <div class="actions">
    <material-button label="Back" data-stepper-back type="button"></material-button>
    <material-button id="wiz-next" label="Next" data-stepper-next type="button"></material-button>
    <material-button id="wiz-submit" label="Place order" type="submit" class="hidden"></material-button>
  </div>
</form>

<script>
  const wiz = document.getElementById('wiz');
  const nextBtn = document.getElementById('wiz-next');
  const submitBtn = document.getElementById('wiz-submit');
  // Swap Next → Submit on the last step
  wiz.addEventListener('materialStepChange', (e) => {
    const last = e.detail.to === 2;              // last step index
    nextBtn.classList.toggle('hidden', last);
    submitBtn.classList.toggle('hidden', !last);
  });
</script>
```

- The trigger buttons live anywhere in the document — they don't have to be inside the stepper. Keep them `type="button"` so they don't submit the form; only the final button is `type="submit"`.
- Gating uses the same constraint validation as the form controls (`required`, `error`, `checkValidity()`), so it works with any `material-*` input or native input in the step.

## Server-driven indicator (one step per request)

The server renders the current step and sets each step's `active` / `completed` / `error` from its own state; the stepper is then just a progress indicator. Header clicks emit a **cancelable** `materialStepClick` (`{index, value}`) — call `preventDefault()` (so the component does no local navigation) and submit your own navigation request to load that step.

```html
<material-stepper id="ft" linear>
  <material-step label="Account" value="account" completed></material-step>
  <material-step label="Profile" value="profile" active></material-step>
  <material-step label="Confirm" value="confirm"></material-step>
</material-stepper>
<script>
  document.getElementById('ft').addEventListener('materialStepClick', (e) => {
    e.preventDefault();                 // server owns navigation
    goToWizardStep(e.detail.value);     // your request that reloads that step
  });
</script>
```

- Here the step bodies are usually empty — the server renders only the active step's real form elsewhere on the page. `error` on a step turns its header red for server-side validation failures.
