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

// Shared helpers for the ElementInternals-based inline validation used by
// material-textfield/-textarea/-select/-checkbox/-radio-group.
//
// Native <input>/<textarea> already localize their own constraint-validation
// messages via the browser; form-associated custom elements that fake a
// constraint (a required checkbox/radio-group with no real <input> backing
// them) don't get that for free. nativeValidationMessage() reads it off a
// throwaway, never-inserted native <input> — same trick as the reference's
// RadioValidator (material-web labs/behaviors/validators/radio-validator.ts:36-67).
//
// shouldFocusInvalid() is the "first invalid control in the form" focus
// heuristic described in on-report-validity.ts:299-315, simplified: that
// reference patches `form.reportValidity`/`requestSubmit` (:225-373) to know
// precisely when a validation pass starts/ends. We don't patch the form.
// Instead we rely on a real ordering guarantee: the browser dispatches
// `invalid` synchronously, in tree order, to every invalid control in a
// single reportValidity()/requestSubmit() pass. If an earlier control's own
// `invalid` handler already moved focus to itself before this one runs,
// `document.activeElement` reflects that. All five components here render
// their real interactive control inside shadow DOM, so a focused descendant
// always retargets `document.activeElement` to the top-level custom-element
// host — and that host automatically matches `:invalid` once its
// ElementInternals validity is set. So "some other control in the form is
// already the first invalid one" reduces to "activeElement is (or sits
// inside) a different, currently-invalid host". `closest`, not `matches`:
// material-radio-group focuses a child <material-radio>, which isn't itself
// validity-bearing — its group host (a light-DOM ancestor) is. `form` and
// `fieldset` are excluded because they match `:invalid` merely by
// CONTAINING an invalid control — a focused submit button inside the form
// must not read as "an invalid control already took focus". This
// under-focuses relative to the full reference (e.g. a plain native
// `<input required>` sibling that hasn't run yet), but is correct for the
// common case and never double-steals focus.
export function shouldFocusInvalid(host: Element): boolean {
  const active = document.activeElement;
  if (!active || active === host) return true;
  try {
    return !active.closest(':invalid:not(form):not(fieldset)');
  } catch {
    return true;
  }
}

export interface InvalidReport {
  /** `internals.validationMessage` at the time of the event — already
   *  folds in any `setCustomValidity()` override, since that's applied to
   *  the internals before this event can fire. */
  message: string;
  shouldFocus: boolean;
}

/**
 * Common body for a component's `invalid` listener: suppresses the native
 * popup, and reports whether this component should paint its own inline
 * error + (per `shouldFocusInvalid`) take focus.
 *
 * Returns `null` when `suppressed` is true — the invalid event was raised by
 * this component's own `checkValidity()` probing `internals.checkValidity()`,
 * which must never paint UI (reference on-report-validity.ts:152-157).
 */
export function handleInvalidEvent(
  e: Event,
  host: Element,
  internals: ElementInternals,
  suppressed: boolean,
): InvalidReport | null {
  if (suppressed) return null;
  const preventedByUser = e.defaultPrevented;
  e.preventDefault();
  return {
    message: internals.validationMessage,
    shouldFocus: !preventedByUser && shouldFocusInvalid(host),
  };
}

/**
 * Mirrors the read-only half of a native form control's validation API onto the
 * host element: `form`, `willValidate`, `validity`, `validationMessage`.
 *
 * `ElementInternals` holds all four, but nothing outside the component can see
 * it, so to anything duck-typing a form control these elements look like they
 * have no validity at all — a form library that reads `field.validity.valid` to
 * render its own message gets `undefined` and silently treats the control as
 * fine. `checkValidity()`/`reportValidity()` stay as they are, `@Method`s
 * returning promises: a synchronous shadow would suit callers that test the
 * result directly (`if (!el.checkValidity())` — a promise is always truthy),
 * but submission is already gated natively through `form.requestSubmit()`
 * before any such caller runs, so the added surprise of an own-property
 * shadowing a documented async method buys nothing.
 *
 * Defined on the element rather than as class getters because both build
 * targets have to agree: in the lazy bundle the element is a generated proxy
 * carrying only `@Prop`/`@Method` members, so a getter on the component class
 * would exist in `dist/components` and be missing from `cdn/material.min.js`.
 *
 * Call from `connectedCallback`. Re-entrant: re-defining is a no-op.
 */
export function defineValiditySurface(host: HTMLElement, internals: ElementInternals) {
  if (Object.prototype.hasOwnProperty.call(host, 'validity')) return;
  const get = <T>(read: () => T) => ({ get: read, configurable: true, enumerable: false });
  Object.defineProperties(host, {
    form: get(() => internals.form),
    willValidate: get(() => internals.willValidate),
    validity: get(() => internals.validity),
    validationMessage: get(() => internals.validationMessage),
  });
}

export type NativeValidationType = 'checkbox' | 'radio' | 'text';

export interface NativeValidationFlags {
  required?: boolean;
  checked?: boolean;
}

// One detached probe per type, reused — validationMessage only depends on
// the flags set immediately before reading it, and everything here runs
// synchronously, so there's no risk of two callers interleaving.
const probes = new Map<NativeValidationType, HTMLInputElement>();

function getProbe(type: NativeValidationType): HTMLInputElement {
  let probe = probes.get(type);
  if (!probe) {
    probe = document.createElement('input');
    probe.type = type;
    // A name is required for the browser to compute grouped radio
    // validation at all — see the reference's Firefox note. We only ever
    // validate a single virtual radio here (required/checked), so the
    // group doesn't need to be attached to the DOM for that to work.
    if (type === 'radio') probe.name = 'native-validation-probe';
    probes.set(type, probe);
  }
  return probe;
}

/**
 * Browser-localized `validationMessage` for a required/missing checkbox,
 * radio or text-like control — computed off a detached `<input>`, never
 * inserted into the document.
 */
export function nativeValidationMessage(
  type: NativeValidationType,
  flags: NativeValidationFlags = {},
): string {
  const probe = getProbe(type);
  probe.required = flags.required ?? true;
  if (type !== 'text') probe.checked = flags.checked ?? false;
  else probe.value = '';
  return probe.validationMessage;
}
