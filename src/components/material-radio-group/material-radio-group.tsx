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

import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { dispatchNativeEvents } from '../../utils/form-events';
import {
  handleInvalidEvent,
  nativeValidationMessage,
  defineValiditySurface,
} from '../../utils/native-validation';

// MD3 radiogroup. Owns name/value/form-association and coordinates child
// <material-radio> elements via property assignment. ARIA Authoring Practices
// radiogroup pattern: roving tabindex (selected = 0, others = -1; if none
// selected, first enabled = 0); arrow keys move focus + selection; Home/End
// jump to first/last enabled; selection is immediate (no Space-to-commit).

type RadioEl = HTMLElement & {
  value: string;
  checked: boolean;
  disabled: boolean;
  groupDisabled: boolean;
  focusable: boolean;
  error: boolean;
};

@Component({
  tag: 'material-radio-group',
  styleUrl: 'material-radio-group.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialRadioGroup {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ mutable: true, reflect: true }) value?: string;
  @Prop() name?: string;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true }) error = false;
  @Prop() label?: string;
  @Prop({ attribute: 'help-text' }) helpText?: string;
  @Prop({ attribute: 'error-text' }) errorText?: string;
  @Prop({ reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';

  // Inline-validation state — see material-textfield for the rationale
  // (same mechanism, mirrored here). No `role="alert"` markup exists below,
  // so no reannounce-on-repeat step (item 6 — skipped, noted). No
  // setCustomValidity() here — out of scope per task (textfield/textarea/
  // select/checkbox only).
  @State() private nativeError = false;
  @State() private nativeErrorText = '';

  @Event() valueChange!: EventEmitter<{ value: string | undefined }>;

  // Captured pre-render: reflected `value` mirrors live state after every
  // change, so it can't tell us the form-default at reset time.
  private defaultValue?: string;
  private mo?: MutationObserver;

  componentWillLoad() {
    this.defaultValue = this.value;
  }

  connectedCallback() {
    defineValiditySurface(this.el, this.internals);
    this.syncChildren();
    this.syncFormValue();
    this.syncValidity();
    // Slot mutations (added/removed radios) → re-sync state.
    this.mo = new MutationObserver(() => this.syncChildren());
    this.mo.observe(this.el, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    this.mo?.disconnect();
    this.mo = undefined;
  }

  @Watch('value')
  @Watch('disabled')
  @Watch('error')
  @Watch('nativeError')
  syncChildren() {
    const radios = this.getRadios();
    const hasSelected = radios.some((r) => r.value === this.value);
    const firstIdx = this.firstFocusableIdx(radios);
    radios.forEach((r, i) => {
      r.checked = r.value === this.value;
      r.error = this.error || this.nativeError;
      // Group disable is a separate prop so it doesn't clobber a per-radio
      // `disabled` — toggling the group back on restores the original state.
      r.groupDisabled = this.disabled;
      // Roving tabindex via a reactive prop (not shadow-DOM poking, which
      // ran before the child buttons existed and silently no-op'd).
      r.focusable = r.checked || (!hasSelected && firstIdx === i);
    });
  }

  @Watch('value')
  @Watch('required')
  @Watch('error')
  @Watch('nativeError')
  syncFormValue() {
    this.internals.setFormValue(this.value ?? null);
    this.internals.ariaRequired = this.required ? 'true' : null;
    this.internals.ariaInvalid = (this.error || this.nativeError) ? 'true' : null;
  }

  @Watch('required')
  @Watch('value')
  @Watch('error')
  @Watch('errorText')
  syncValidity() {
    if (this.error) {
      this.internals.setValidity(
        { customError: true },
        this.errorText || 'Invalid',
      );
      return;
    }
    if (this.required && !this.value) {
      // Replaces the hardcoded English string with the browser's own
      // localized "required radio" message (item 5; reference
      // radio-validator.ts:36-67) — falls back to the previous hardcoded
      // text if the probe ever comes back empty.
      this.internals.setValidity(
        { valueMissing: true },
        nativeValidationMessage('radio', { required: true, checked: false }) || 'Please select an option.',
      );
      return;
    }
    this.internals.setValidity({});
    this.nativeError = false;
  }

  // Guards checkValidity()'s internals.checkValidity() probe from painting
  // the inline error UI (item 2).
  private suppressInvalid = false;

  /** Constraint validation, like a native radio group. */
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

  @Listen('invalid')
  handleInvalid(e: Event) {
    const report = handleInvalidEvent(e, this.el, this.internals, this.suppressInvalid);
    if (!report) return;
    this.nativeError = true;
    this.nativeErrorText = report.message;
    if (report.shouldFocus) this.focusCurrent();
  }

  // Focuses the group's roving-tabindex target (the checked radio, or the
  // first enabled one) — mirrors the target computed in syncChildren().
  private focusCurrent() {
    const radios = this.getRadios();
    const target = radios.find(r => r.focusable) ?? radios.find(r => !r.disabled);
    (target?.shadowRoot?.querySelector('button') as HTMLButtonElement | null)?.focus();
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.value = this.defaultValue;
    // A native reported-invalid state doesn't survive a form reset either
    // (see material-textfield's formResetCallback).
    this.nativeError = false;
    this.nativeErrorText = '';
  }

  formStateRestoreCallback(state: string | null) {
    this.value = state ?? undefined;
  }

  private getRadios(): RadioEl[] {
    return Array.from(this.el.querySelectorAll<RadioEl>('material-radio'));
  }

  private firstFocusableIdx(radios: RadioEl[]): number {
    return radios.findIndex((r) => !r.disabled);
  }

  @Listen('radioSelect')
  handleSelect(e: CustomEvent<{ value: string }>) {
    if (this.disabled) return;
    const next = e.detail.value;
    if (next === this.value) return;
    this.value = next;
    this.valueChange.emit({ value: next });
    dispatchNativeEvents(this.el, { change: true });
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const radios = this.getRadios().filter((r) => !r.disabled);
    if (!radios.length) return;
    const active = (this.el.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null;
    const current = active?.closest('material-radio') as RadioEl | null;
    const idx = current ? radios.indexOf(current) : -1;
    // In RTL, left/right visually flip; up/down are unaffected.
    const isRtl = getComputedStyle(this.el).direction === 'rtl';
    let key = e.key;
    if (isRtl && key === 'ArrowLeft') key = 'ArrowRight';
    else if (isRtl && key === 'ArrowRight') key = 'ArrowLeft';
    let next = idx;
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = idx < 0 ? 0 : (idx + 1) % radios.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = idx < 0 ? radios.length - 1 : (idx - 1 + radios.length) % radios.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = radios.length - 1;
        break;
    }
    e.preventDefault();
    const target = radios[next];
    // Same guard as handleSelect: landing on the already-selected radio
    // (single-radio group, Home while on the first, ...) moves focus but
    // must not fire valueChange / native change for a no-op selection.
    if (target.value !== this.value) {
      this.value = target.value;
      this.valueChange.emit({ value: target.value });
      dispatchNativeEvents(this.el, { change: true });
    }
    // Focus moves after sync so tabindex is already 0 on the target.
    requestAnimationFrame(() => {
      const btn = target.shadowRoot?.querySelector('button') as HTMLButtonElement | null;
      btn?.focus();
    });
  }

  render() {
    const inError = this.error || this.nativeError;
    const errorText = this.errorText || this.nativeErrorText;
    const subText = (inError && errorText) ? errorText : this.helpText;
    const subId = 'description';
    const labelId = 'group-label';

    return (
      <Host
        role="radiogroup"
        aria-orientation={this.orientation}
        aria-labelledby={this.label ? labelId : null}
        aria-describedby={subText ? subId : null}
      >
        {this.label && (
          <div id={labelId} class="group-label">
            {this.label}
          </div>
        )}
        <div class={this.orientation === 'horizontal' ? 'items horizontal' : 'items'}>
          <slot />
        </div>
        {subText && (
          <div id={subId} class={inError ? 'sub-text error' : 'sub-text normal'}>
            {subText}
          </div>
        )}
      </Host>
    );
  }
}
