/*
 * @viewflow/material — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

import {
  Component,
  Element,
  Event,
  EventEmitter,
  Listen,
  Method,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';
import { dispatchNativeEvents, activateOnLabelClick } from '../../utils/form-events';
import { handleInvalidEvent, nativeValidationMessage } from '../../utils/native-validation';

// MD3 spec: container 18dp / corner 2dp / icon 18dp / target 48dp / state-layer 40dp.
// The button is a 1×1 inline-grid; the 40px state-layer and 18px box share the
// single cell so both auto-center without absolute positioning. State-layer
// opacities follow the spec's 8% (hover) / 10% (focus) tokens; pressed is the
// shared ripple's 12% held state layer (utils/ripple.css), not a local rule.

@Component({
  tag: 'material-checkbox',
  styleUrl: 'material-checkbox.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialCheckbox {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ mutable: true, reflect: true }) checked = false;
  @Prop({ mutable: true, reflect: true }) indeterminate = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop() name?: string;
  @Prop() value = 'on';
  @Prop() label?: string;
  @Prop() helpText?: string;
  @Prop({ reflect: true }) error = false;
  @Prop() errorText?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  /** Visual-only mode for composed widgets (a selectable list row): the inner
   *  button leaves the tab order — the enclosing widget drives the state and
   *  carries the semantics (aria-selected on the option). Still posts with
   *  the form. Set by material-list-item, rarely by hand. */
  @Prop({ reflect: true }) nested = false;

  // Inline-validation state — see material-textfield for the rationale
  // (same mechanism, mirrored here). No `role="alert"` markup exists below,
  // so unlike textfield/textarea there's no reannounce-on-repeat step
  // (item 6 — skipped, noted).
  @State() private nativeError = false;
  @State() private nativeErrorText = '';
  @State() private customValidityMessage = '';

  @Event() checkedChange!: EventEmitter<{ checked: boolean; indeterminate: boolean }>;

  // Captured once before first render — reflected props rewrite the live
  // attributes after every toggle, so `hasAttribute('checked')` can't tell us
  // the form-default state at reset time.
  private defaultChecked = false;
  private defaultIndeterminate = false;

  // `disabled` value going into the render that's about to run — captured in
  // componentWillUpdate() (before `this.disabled` is read by render()), one
  // render behind. Plain field, not @State: it must never itself trigger a
  // render. Exposed to CSS as `prev-disabled` so a render where `disabled`
  // just changed (in either direction) — including one where `checked` also
  // changed in the same update — never animates the box/mark motion.
  private lastDisabled = false;
  private prevDisabled = false;

  componentWillLoad() {
    this.defaultChecked = this.checked;
    this.defaultIndeterminate = this.indeterminate;
    this.lastDisabled = this.disabled;
  }

  componentWillUpdate() {
    this.prevDisabled = this.lastDisabled;
    this.lastDisabled = this.disabled;
  }

  connectedCallback() {
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('checked')
  @Watch('indeterminate')
  @Watch('value')
  syncFormValue() {
    this.internals.setFormValue(this.checked && !this.indeterminate ? this.value : null);
    this.internals.ariaChecked = this.indeterminate ? 'mixed' : String(this.checked);
  }

  // A required checkbox is only satisfied when it submits a value — i.e. checked
  // and not indeterminate (a mixed box submits null, same as native).
  // customValidityMessage (setCustomValidity()) wins over everything else,
  // same as a native input; `nativeError` clears here once the control is
  // valid again (item 3 — this Watch-driven sync is the "next validity sync"
  // hook for a component with no per-render mirror step).
  @Watch('required')
  @Watch('checked')
  @Watch('indeterminate')
  @Watch('error')
  @Watch('errorText')
  @Watch('customValidityMessage')
  syncValidity() {
    if (this.customValidityMessage) {
      this.internals.setValidity({ customError: true }, this.customValidityMessage);
      return;
    }
    if (this.error) {
      this.internals.setValidity(
        { customError: true },
        this.errorText || 'Invalid',
      );
      return;
    }
    if (this.required && !(this.checked && !this.indeterminate)) {
      // Replaces the hardcoded English string with the browser's own
      // localized "required checkbox" message (item 5; reference
      // radio-validator.ts:36-67) — falls back to the previous hardcoded
      // text if the probe ever comes back empty.
      this.internals.setValidity(
        { valueMissing: true },
        nativeValidationMessage('checkbox', { required: true, checked: false }) || 'Please check this box.',
      );
      return;
    }
    this.internals.setValidity({});
    this.nativeError = false;
  }

  // Guards checkValidity()'s internals.checkValidity() probe from painting
  // the inline error UI (item 2).
  private suppressInvalid = false;

  /** Constraint validation, like a native checkbox. */
  @Method()
  async checkValidity(): Promise<boolean> {
    this.suppressInvalid = true;
    const valid = this.internals.checkValidity();
    this.suppressInvalid = false;
    return valid;
  }

  /** Constraint validation. An invalid result renders the MD3 inline error
   *  instead of the native bubble — see the `invalid` listener below. */
  @Method()
  async reportValidity(): Promise<boolean> {
    return this.internals.reportValidity();
  }

  /** Sets a custom validity message, like a native checkbox's
   *  `setCustomValidity()`. See material-textfield for the contract. */
  @Method()
  async setCustomValidity(message: string): Promise<void> {
    this.customValidityMessage = message ?? '';
    // Fold into internals synchronously — see material-textfield's
    // setCustomValidity() for why this can't wait for the next @Watch pass.
    this.syncValidity();
  }

  @Listen('invalid')
  handleInvalid(e: Event) {
    const report = handleInvalidEvent(e, this.el, this.internals, this.suppressInvalid);
    if (!report) return;
    this.nativeError = true;
    this.nativeErrorText = report.message;
    if (report.shouldFocus) {
      this.el.shadowRoot?.querySelector('button')?.focus();
    }
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.checked = this.defaultChecked;
    this.indeterminate = this.defaultIndeterminate;
    // A native reported-invalid state doesn't survive a form reset either
    // (see material-textfield's formResetCallback).
    this.nativeError = false;
    this.nativeErrorText = '';
  }

  formStateRestoreCallback(state: string | null) {
    this.checked = state === this.value;
    this.indeterminate = false;
  }

  /** Programmatically toggle the checkbox as if a user clicked it.
   *  Mirrors a real interaction: respects `disabled`, clears `indeterminate`
   *  on first toggle, and emits `checkedChange`. Use this when another
   *  component (e.g. a list-item handling Space) needs to drive the
   *  checkbox without faking shadow-DOM clicks. */
  @Method()
  async toggle(): Promise<void> {
    if (this.disabled) return;
    if (this.indeterminate) {
      this.indeterminate = false;
      this.checked = true;
    } else {
      this.checked = !this.checked;
    }
    this.checkedChange.emit({ checked: this.checked, indeterminate: this.indeterminate });
    // Native semantics: a checkbox fires input+change together on toggle.
    dispatchNativeEvents(this.el, { input: true, change: true });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggle();
    }
  };

  private ripple?: RippleHandle;
  private teardownLabelActivation?: () => void;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
    // External <label for="…"> / internals.labels click activation: toggle
    // and focus the inner control (a no-op in `nested` mode — no button).
    this.teardownLabelActivation = activateOnLabelClick(this.el, () => {
      this.toggle();
      this.el.shadowRoot?.querySelector('button')?.focus();
    });
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
    this.teardownLabelActivation?.();
    this.teardownLabelActivation = undefined;
  }

  render() {
    const isOn = this.checked || this.indeterminate;
    const icon = this.indeterminate ? 'remove' : 'check';
    const inError = this.error || this.nativeError;

    const stateLayerCls = inError ? 'state-layer err' : isOn ? 'state-layer on' : 'state-layer off';
    const boxClasses = {
      box: true,
      on: !inError && isOn,
      off: !inError && !isOn,
      'on-err': inError && isOn,
      'off-err': inError && !isOn,
      'prev-disabled': this.prevDisabled,
    };

    // errorText replaces helpText when in error; either may be empty, in
    // which case it falls back to helpText rather than showing nothing
    // (reference field.ts:63-65). errorText folds in nativeErrorText so a
    // native/reported invalid paints even without a caller-set errorText.
    const descId = 'description';
    const errorText = this.errorText || this.nativeErrorText;
    const subText = (inError && errorText) ? errorText : this.helpText;

    const visuals = [
      <span class={stateLayerCls} aria-hidden="true">
        {!this.nested && <span class="md-ripple" aria-hidden="true"></span>}
      </span>,
      <span class={boxClasses}>
        {/* Always rendered so the check can animate in — a conditionally
            rendered mark can't transition. Revealed left-to-right via
            clip-path, asymmetric per MD3 selection-control motion (350ms
            decelerate in / 150ms accelerate out). */}
        <span class={{ mark: true, revealed: isOn, 'prev-disabled': this.prevDisabled }} aria-hidden="true">
          {icon}
        </span>
      </span>,
    ];

    // nested: no widget at all — a focusable/role-bearing element inside a
    // composed widget (listbox option) is a nested-interactive violation even
    // with tabindex="-1". Pointer clicks still toggle; the enclosing widget
    // owns keyboard and semantics.
    const button = this.nested ? (
      <span class="target" aria-hidden="true" onClick={() => !this.disabled && this.toggle()}>
        {visuals}
      </span>
    ) : (
      <button
        type="button"
        role="checkbox"
        class="target"
        disabled={this.disabled}
        aria-checked={this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false'}
        aria-label={this.ariaLabel ?? (this.label ? undefined : 'checkbox')}
        aria-labelledby={!this.ariaLabel && this.label ? 'label' : null}
        aria-required={this.required ? 'true' : null}
        aria-invalid={inError ? 'true' : null}
        aria-describedby={subText ? descId : null}
        data-ripple
        onClick={() => this.toggle()}
        onKeyDown={this.handleKeyDown}
      >
        {visuals}
      </button>
    );

    if (!this.label) return button;

    // Layout: items-start anchors the 48dp target to the top of the row, and
    // mt-3 (12px) drops the primary label by half-target − half-line-height so
    // its first line vertically centers with the checkbox box. Toggling
    // helpText/errorText only adds/removes content *below* the primary label —
    // the box and primary label never move. Across siblings, set items-start
    // on the row to keep all primary labels aligned.
    return (
      <label class={this.disabled ? 'row disabled' : 'row'}>
        {button}
        <span class="text-col">
          <span id="label" class="primary-label">{this.label}</span>
          {subText && (
            <span id={descId} class={inError ? 'sub-text error' : 'sub-text normal'}>
              {subText}
            </span>
          )}
        </span>
      </label>
    );
  }
}
