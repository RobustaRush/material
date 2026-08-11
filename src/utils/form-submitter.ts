/*
 * advanced-material-web — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

/**
 * Native `<button type="submit">` submit/reset parity for form-associated
 * custom elements (material-button, material-split-button, material-fab).
 *
 * Two problems this works around:
 *
 * 1. `form.requestSubmit(submitter)` rejects a form-associated custom element
 *    as the `submitter` argument ("parameter 1 is not of type 'HTMLElement'"
 *    in spec terms — a FACE isn't an `HTMLButtonElement`/`HTMLInputElement`).
 *    So we call `requestSubmit()` with no argument and instead patch the
 *    dispatched `SubmitEvent.submitter` to point at the host element via a
 *    capture-phase, once-only 'submit' listener added right before
 *    `requestSubmit()` runs. See https://github.com/WICG/webcomponents/issues/814
 *    and material-web's labs/behaviors/form-submitter.ts (lines 116–131).
 *
 * 2. Native `<button type="submit">` only submits if its click wasn't
 *    prevented — and "prevented" includes later listeners on the same click,
 *    not just ones that ran before the button's own handler. A synchronous
 *    `form.requestSubmit()` inside our click handler can't observe listeners
 *    that haven't run yet. A microtask is NOT enough either: on a trusted
 *    click the microtask queue drains after every listener invocation (the
 *    JS stack empties between listeners), so a queued microtask runs before
 *    later listeners — e.g. one on the host element — get to
 *    `preventDefault()`. Instead we detect the true end of the dispatch the
 *    way material-web's `afterDispatch` hook does (internal/events/
 *    dispatch-hooks.ts): a once-listener on the last event target of the
 *    composed path, plus `stopPropagation` patches — a native button still
 *    submits when propagation is stopped; only `preventDefault()` cancels.
 */

export interface FormSubmitterOptions {
  /** The form-associated custom element acting as submitter/resetter —
   *  becomes `SubmitEvent.submitter`. */
  hostElement: HTMLElement;
  /** Contributes name/value to FormData for this one submission, like a
   *  native submit button does when it's the submitter. Only added when
   *  `name` is set. */
  name?: string;
  value?: string;
}

/** Patches the next 'submit' event's `submitter` to `hostElement`, then
 *  requests submission. See the module doc comment for why this is needed
 *  instead of `form.requestSubmit(hostElement)`. */
function submitForm(form: HTMLFormElement, { hostElement, name, value }: FormSubmitterOptions) {
  form.addEventListener(
    'submit',
    (submitEvent: Event) => {
      Object.defineProperty(submitEvent, 'submitter', {
        configurable: true,
        enumerable: true,
        value: hostElement,
      });
    },
    { capture: true, once: true },
  );

  // Contribute name/value to FormData like a native submit button does when
  // it's the submitter. ElementInternals can't act as a submitter, so add a
  // transient hidden input for this one submission; the form is serialized
  // synchronously inside requestSubmit(), so we can remove it right after.
  let hidden: HTMLInputElement | undefined;
  if (name) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = name;
    hidden.value = value ?? '';
    form.appendChild(hidden);
  }
  form.requestSubmit();
  hidden?.remove();
}

/**
 * Call from a `type="submit"`/`type="reset"` control's click handler, after
 * the disabled/href/popover early-returns. Defers the actual submit/reset
 * until the click has finished dispatching, so other listeners on the same
 * click (including ones the host page adds) get a chance to
 * `preventDefault()` first — matching native `<button type="submit">`
 * semantics. See the module doc comment for why this needs an end-of-dispatch
 * listener rather than `queueMicrotask()`.
 */
export function handleFormSubmitterClick(
  clickEvent: MouseEvent,
  form: HTMLFormElement,
  type: 'submit' | 'reset',
  options: FormSubmitterOptions,
) {
  let settled = false;
  const abort = new AbortController();
  const settle = () => {
    if (settled) return;
    settled = true;
    abort.abort();
    if (clickEvent.defaultPrevented) return;
    if (type === 'submit') submitForm(form, options);
    else form.reset();
  };

  // The last event target of the composed path receives the event last (in
  // the bubble phase), so a once-listener there fires after every other
  // listener has run. Branching mirrors the reference's dispatch-hooks.ts.
  const path = clickEvent.composedPath();
  const lastNode: EventTarget =
    clickEvent.composed && clickEvent.bubbles
      ? path[path.length - 1]
      : !clickEvent.bubbles
        ? path[0]
        : (path[0] as Node).getRootNode();
  lastNode.addEventListener('click', settle, { once: true, signal: abort.signal });

  // stopPropagation would keep the last-node listener from ever firing, but a
  // native button still submits when propagation is stopped (only
  // preventDefault cancels). Settle synchronously when propagation is
  // interrupted, like the reference does.
  const patchStop = (superMethod: Event['stopPropagation']) =>
    function (this: Event) {
      superMethod.call(this);
      settle();
    };
  clickEvent.stopPropagation = patchStop(clickEvent.stopPropagation);
  clickEvent.stopImmediatePropagation = patchStop(clickEvent.stopImmediatePropagation);
}
