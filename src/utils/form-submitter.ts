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
 *    as the `submitter` argument — a FACE isn't an `HTMLButtonElement` /
 *    `HTMLInputElement`. See https://github.com/WICG/webcomponents/issues/814
 *    and material-web's labs/behaviors/form-submitter.ts (lines 116–131),
 *    which answers this by patching the dispatched `SubmitEvent.submitter` to
 *    the host element.
 *
 *    We don't, because `submitter` is not merely informational: React 19,
 *    SvelteKit's `enhance()` and React Router all pass it straight to
 *    `new FormData(form, submitter)`, and that constructor throws
 *    "The specified element is not a submit button" on anything the platform
 *    didn't produce — the page dies inside the framework's own listener. So we
 *    submit through a real `<button type="submit">`, created for this one
 *    submission inside the host element. Listeners that want the control read
 *    `event.submitter.closest('material-button')`; the button is nameless, so
 *    it contributes nothing of its own to the entry list, and the data still
 *    comes from the hidden input below.
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
  /** The form-associated custom element being clicked. The transient submitter
   *  button is created inside it, so a listener reaches the control with
   *  `event.submitter.closest('material-button')`. */
  hostElement: HTMLElement;
  /** Contributes name/value to FormData for this one submission, like a
   *  native submit button does when it's the submitter. Only added when
   *  `name` is set. */
  name?: string;
  value?: string;
  /** Set when the control targets a form by id (`form="…"`) instead of by
   *  ancestry. The transient submitter needs the same attribute — otherwise
   *  its form owner is whatever form encloses the host, which is usually
   *  none, and `requestSubmit()` rejects it. */
  formId?: string;
}

/**
 * The form a submit/reset control acts on: the one named by `form="id"` when
 * that attribute is set, else the ancestor form the element is associated
 * with.
 *
 * The `form` content attribute is not honoured for form-associated custom
 * elements — their association follows the DOM tree — so a control that wants
 * `<button form="id">` parity resolves it here. Submit/reset controls only: a
 * *field* can't be redirected this way, because its value reaches the form
 * through ElementInternals, which is bound to the ancestor form.
 */
export function resolveSubmitterForm(
  el: HTMLElement,
  internals: ElementInternals,
  formId?: string,
): HTMLFormElement | null {
  if (!formId) return internals.form;
  const root = el.getRootNode() as Document | ShadowRoot;
  const target = (root as Document).getElementById?.(formId);
  // globalThis.HTMLFormElement, because a bare `HTMLFormElement` here would be
  // the DOM lib type, not the runtime constructor, under Stencil's transpile.
  return target instanceof globalThis.HTMLFormElement ? target : null;
}

/** Submits `form` through a transient native button, so `SubmitEvent.submitter`
 *  is something the platform accepts. See the module doc comment for why the
 *  host element can't be the submitter itself. */
function submitForm(
  form: HTMLFormElement,
  { hostElement, name, value, formId }: FormSubmitterOptions,
) {
  // Contribute name/value to FormData like a native submit button does when
  // it's the submitter. ElementInternals can't act as a submitter, so add a
  // transient hidden input for this one submission; the form is serialized
  // synchronously inside requestSubmit(), so we can remove it right after.
  // It stays an input rather than moving onto the submitter button below: a
  // button contributes only when it submits, so consumers that serialize the
  // form themselves — htmx, a bare `new FormData(form)` — would lose the pair.
  let hidden: HTMLInputElement | undefined;
  if (name) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = name;
    hidden.value = value ?? '';
    form.appendChild(hidden);
  }

  // Lives inside the host, so `event.submitter.closest('material-button')`
  // finds the control. Nameless — the hidden input above already carries the
  // data, and a named submitter would send it twice. `value` is mirrored
  // anyway for listeners that read it off the submitter, which is how
  // material-dialog resolves its return value.
  const submitter = document.createElement('button');
  submitter.type = 'submit';
  submitter.hidden = true;
  if (value !== undefined) submitter.value = value;
  if (formId) submitter.setAttribute('form', formId);
  hostElement.appendChild(submitter);

  form.requestSubmit(submitter);

  submitter.remove();
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
  afterDispatch(clickEvent, () => {
    if (type === 'submit') submitForm(form, options);
    else form.reset();
  });
}

/**
 * Runs `action` once `event` has finished dispatching — unless anything called
 * `preventDefault()` by then, in which case it never runs.
 *
 * Shared by the submit-button click path and text-field implicit submission:
 * both have to let listeners that haven't run yet cancel the action, and
 * neither can use `queueMicrotask()` to wait for them (see point 2 in the
 * module doc comment).
 */
export function afterDispatch(event: Event, action: () => void) {
  let settled = false;
  const abort = new AbortController();
  const settle = () => {
    if (settled) return;
    settled = true;
    abort.abort();
    if (event.defaultPrevented) return;
    action();
  };

  // The last event target of the composed path receives the event last (in
  // the bubble phase), so a once-listener there fires after every other
  // listener has run. Branching mirrors the reference's dispatch-hooks.ts.
  const path = event.composedPath();
  const lastNode: EventTarget =
    event.composed && event.bubbles
      ? path[path.length - 1]
      : !event.bubbles
        ? path[0]
        : (path[0] as Node).getRootNode();
  lastNode.addEventListener(event.type, settle, { once: true, signal: abort.signal });

  // stopPropagation would keep the last-node listener from ever firing, but a
  // native button still submits when propagation is stopped (only
  // preventDefault cancels). Settle synchronously when propagation is
  // interrupted, like the reference does.
  const patchStop = (superMethod: Event['stopPropagation']) =>
    function (this: Event) {
      superMethod.call(this);
      settle();
    };
  event.stopPropagation = patchStop(event.stopPropagation);
  event.stopImmediatePropagation = patchStop(event.stopImmediatePropagation);
}

/**
 * Native implicit-submission parity for a single-line text control: Enter in a
 * real `<input>` submits its form, but these inputs live in a shadow root, so
 * the form never sees the keypress and the gesture is simply lost.
 *
 * Deferred to the end of the dispatch like the button path, so a composing
 * component that treats Enter as its own (material-select opening its menu, a
 * date field confirming a picker) still wins by calling `preventDefault()` —
 * its handler sits on an ancestor and therefore runs *after* the inner input's.
 *
 * Only submits when the form has a submit button. Native also submits a
 * button-less form that has just one field, but a button-less form with several
 * is *not* submitted by Enter — and quietly submitting one would be a worse
 * failure than under-implementing the rule. A control that wants Enter to
 * submit regardless can call `form.requestSubmit()` itself, as
 * material-search does.
 */
// Mind the defaults: like a native <button>, material-button and
// material-split-button are submitters with no `type` attribute at all, while
// material-fab and material-icon-button default to "button" and only count when
// they say so.
const SUBMIT_BUTTON_SELECTOR = [
  'button:not([type])',
  'button[type="submit"]',
  'input[type="submit"]',
  'input[type="image"]',
  'material-button:not([type])',
  'material-button[type="submit"]',
  'material-split-button:not([type])',
  'material-split-button[type="submit"]',
  'material-fab[type="submit"]',
  'material-icon-button[type="submit"]',
].join(',');

/** A submit button counts whether it sits inside the form or points at it with
 *  `form="id"` — the dialog layout puts the Save button in the actions slot,
 *  outside the form it submits, and Enter has to reach it there too. */
function hasSubmitButton(form: HTMLFormElement): boolean {
  if (form.querySelector(SUBMIT_BUTTON_SELECTOR)) return true;
  if (!form.id) return false;
  const root = form.getRootNode() as Document | ShadowRoot;
  const associated = root.querySelectorAll?.(`[form="${CSS.escape(form.id)}"]`) ?? [];
  return Array.from(associated).some((el) => el.matches(SUBMIT_BUTTON_SELECTOR));
}

export function handleImplicitSubmission(
  keyEvent: KeyboardEvent,
  form: HTMLFormElement | null | undefined,
) {
  if (keyEvent.key !== 'Enter' || keyEvent.defaultPrevented) return;
  if (keyEvent.altKey || keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.shiftKey) return;
  if (!form || !hasSubmitButton(form)) return;
  afterDispatch(keyEvent, () => form.requestSubmit());
}
