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
import { dispatchNativeEvents, activateOnLabelClick } from '../../utils/form-events';
import { handleInvalidEvent } from '../../utils/native-validation';

export type MaterialTextfieldVariant = 'filled' | 'outlined';
export type MaterialTextfieldType =
  | 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

// Implementation rationale (placeholder-shown trick, fieldset/legend notch,
// leading-14, label-shift over icon, etc.):
// docs/wiki/projects/material-textfield-notes.md
//
// The floating label / affix visibility / legend notch are driven purely by
// CSS state (:focus-within, :has(input:not(:placeholder-shown)), plus an
// `.is-filled` fallback class for Safari — see material-textfield.css).

@Component({
  tag: 'material-textfield',
  styleUrl: 'material-textfield.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialTextfield {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() variant: MaterialTextfieldVariant = 'outlined';
  @Prop() type: MaterialTextfieldType = 'text';
  @Prop() label?: string;
  @Prop() name?: string;
  @Prop({ mutable: true }) value = '';
  @Prop() placeholder?: string;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ reflect: true }) error = false;
  @Prop() leadingIcon?: string;
  @Prop() trailingIcon?: string;
  // Built-in show/hide toggle for type=password. When set, an interactive
  // trailing icon-button is rendered and the input type flips between
  // 'password' and 'text' based on local state.
  @Prop() passwordToggle = false;
  // Visually grays + strikes-through the input value (e.g. for a deferred
  // "clear" state in composed components like material-file-field). The
  // input stays focusable and accessible.
  @Prop() dimmed = false;
  // Reserve extra right-side padding (pr-24 instead of pr-12) so a trailing
  // slot can host two icon-buttons side by side.
  @Prop() wideTrailing = false;

  @State() private passwordVisible = false;
  // Inline-validation state — see the `invalid`-listener rationale on
  // `handleInvalid` below. `customValidityMessage` mirrors the native
  // `setCustomValidity()` contract: non-empty always wins over constraint
  // checks and makes the control invalid until cleared with `''`.
  @State() private nativeError = false;
  @State() private nativeErrorText = '';
  @State() private customValidityMessage = '';
  // Re-render the supporting text's `role="alert"` off, then on again next
  // frame, so an unchanged error message still gets re-announced (reference
  // field.ts:170-176).
  @State() private refreshErrorAlert = false;
  @Prop() leadingText?: string;
  @Prop() trailingText?: string;
  @Prop() maxLength?: number;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() valueChange!: EventEmitter<{ value: string }>;
  @Event() valueInput!: EventEmitter<{ value: string }>;

  // Captured before first render so the form-default survives reflected-prop
  // writes (hasAttribute('value') no longer reports the original at reset).
  private defaultValue = '';
  private inputEl?: HTMLInputElement;

  componentWillLoad() {
    this.defaultValue = this.value;
  }

  connectedCallback() {
    this.syncFormValue();
  }

  @Watch('value')
  @Watch('disabled')
  syncFormValue() {
    this.internals.setFormValue(this.disabled ? null : (this.value ?? ''));
    // Safari (and some older WebKit builds) don't re-evaluate
    // :placeholder-shown when the input's value is changed via the JSX
    // value= prop alone — which leaves the floating label stuck "down"
    // after a programmatic value update. Sync the property explicitly.
    const next = this.value ?? '';
    if (this.inputEl && this.inputEl.value !== next) {
      this.inputEl.value = next;
    }
  }

  // Mirror the inner input's constraint validation onto the host's
  // ElementInternals so form.checkValidity(), submit gating and the stepper
  // see required/type/pattern violations. Runs after every render — the
  // inner input is always the source of truth. Also where `nativeError`
  // clears once the control becomes valid again (item 3 — there's no
  // dedicated "form said we're valid now" hook without patching the form,
  // so this per-render mirror is the sync point instead). Also called
  // directly from setCustomValidity() so the standard native pattern —
  // `setCustomValidity(msg); reportValidity()` — sees the new message
  // synchronously, without waiting for a render to come back around.
  componentDidRender() {
    this.syncValidity();
  }

  private syncValidity() {
    const input = this.inputEl;
    if (!input) return;
    if (this.disabled) {
      this.internals.setValidity({});
      this.nativeError = false;
      return;
    }
    if (this.customValidityMessage) {
      this.internals.setValidity({ customError: true }, this.customValidityMessage, input);
      return;
    }
    if (input.validity.valid) {
      this.internals.setValidity({});
      this.nativeError = false;
      return;
    }
    const v = input.validity;
    this.internals.setValidity(
      {
        valueMissing: v.valueMissing,
        typeMismatch: v.typeMismatch,
        patternMismatch: v.patternMismatch,
        tooLong: v.tooLong,
        tooShort: v.tooShort,
        rangeUnderflow: v.rangeUnderflow,
        rangeOverflow: v.rangeOverflow,
        stepMismatch: v.stepMismatch,
        badInput: v.badInput,
      },
      input.validationMessage,
      input,
    );
  }

  // Guards checkValidity()'s internals.checkValidity() probe from painting
  // the inline error UI — only a real report (reportValidity() / form
  // submit) should do that (item 2; reference on-report-validity.ts:152-157).
  private suppressInvalid = false;

  /** Constraint validation, like a native input. */
  @Method()
  async checkValidity(): Promise<boolean> {
    this.suppressInvalid = true;
    const valid = this.internals.checkValidity();
    this.suppressInvalid = false;
    return valid;
  }

  /** Constraint validation. Unlike a native input, an invalid result renders
   *  the MD3 inline error (error + errorText) instead of the native bubble —
   *  see the `invalid` listener below. */
  @Method()
  async reportValidity(): Promise<boolean> {
    return this.internals.reportValidity();
  }

  /** Sets a custom validity message, like a native input's
   *  `setCustomValidity()`. Non-empty always wins over constraint checks and
   *  keeps the control invalid — until cleared by calling this again with
   *  `''`. Only takes effect in the UI on the next report (reportValidity()
   *  or a form submit attempt), matching native behavior. */
  @Method()
  async setCustomValidity(message: string): Promise<void> {
    this.customValidityMessage = message ?? '';
    // Fold into internals synchronously — @State → render → componentDidRender
    // would otherwise only catch up a microtask later, after this method's
    // own Promise has already resolved, so a caller's immediately-following
    // reportValidity() would still see the previous validity.
    this.syncValidity();
  }

  // ElementInternals dispatches `invalid` on the host (not the inner input,
  // which isn't itself a listed form control). Suppress the native popup and
  // paint our own inline error/errorText instead (item 1; reference
  // on-report-validity.ts + text-field.ts:799-810). The full "first invalid
  // control in the form" focus behavior requires patching
  // form.reportValidity()/requestSubmit() (reference :225-373) — out of
  // scope here; `shouldFocusInvalid` is a same-pass approximation instead
  // (see utils/native-validation.ts).
  @Listen('invalid')
  handleInvalid(e: Event) {
    const report = handleInvalidEvent(e, this.el, this.internals, this.suppressInvalid);
    if (!report) return;
    const prevText = this.errorText || this.nativeErrorText;
    this.nativeError = true;
    this.nativeErrorText = report.message;
    if (prevText && prevText === (this.errorText || this.nativeErrorText)) {
      this.refreshErrorAlert = true;
      requestAnimationFrame(() => { this.refreshErrorAlert = false; });
    }
    if (report.shouldFocus) this.inputEl?.focus();
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.value = this.defaultValue;
    if (this.inputEl) this.inputEl.value = this.defaultValue;
    // A native input's reported-invalid state doesn't survive a form reset
    // either (reference text-field.ts's reset()) — setCustomValidity()
    // deliberately isn't cleared here, matching native setCustomValidity().
    this.nativeError = false;
    this.nativeErrorText = '';
  }

  formStateRestoreCallback(state: string | null) {
    this.value = state ?? '';
  }

  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.value = target.value;
    this.valueInput.emit({ value: this.value });
  };

  private handleChange = () => {
    this.valueChange.emit({ value: this.value });
    // The inner input's own 'input' event is already composed and escapes
    // the shadow root unmodified — don't double-fire it. Its 'change' is
    // bubbles-only (not composed), so it dies at the shadow boundary; re-fire
    // it from the host.
    dispatchNativeEvents(this.el, { change: true });
  };

  private togglePassword = (e: CustomEvent<{ selected: boolean }>) => {
    this.passwordVisible = e.detail.selected;
  };

  private teardownLabelActivation?: () => void;

  componentDidLoad() {
    // External <label for="…"> / internals.labels click activation: the
    // inner <label htmlFor="input"> only wires clicks within the shadow
    // tree — an outside label needs this to reach the inner input.
    this.teardownLabelActivation = activateOnLabelClick(this.el, () => {
      this.inputEl?.focus();
    });
  }

  disconnectedCallback() {
    this.teardownLabelActivation?.();
    this.teardownLabelActivation = undefined;
  }

  render() {
    const { variant, label, helpText,
            leadingText, trailingText, leadingIcon, trailingIcon, maxLength } = this;

    // `error`/`errorText` fold in native-invalid state so reportValidity()
    // and setCustomValidity() paint through the same mechanism a caller-set
    // `error` prop does (item 1). An empty errorText falls back to helpText
    // rather than showing nothing (reference field.ts:63-65).
    const error = this.error || this.nativeError;
    const errorText = this.errorText || this.nativeErrorText;

    const showPwdToggle = this.passwordToggle && this.type === 'password';
    const hasTrailingSlot = !!this.el.querySelector(':scope > [slot="trailing"]');
    const hasLeadingSlot = !!this.el.querySelector(':scope > [slot="leading"]');
    const hasTrailingAction = showPwdToggle || hasTrailingSlot;
    const hasLeading = !!leadingIcon || hasLeadingSlot;
    const effectiveType = showPwdToggle && this.passwordVisible ? 'text' : this.type;
    const showStaticTrailing = !!trailingIcon && !hasTrailingAction;
    const showStaticLeading = !!leadingIcon && !hasLeadingSlot;
    const reserveTrailing = !!trailingIcon || hasTrailingAction;

    const disabled = this.disabled;
    const subText = (error && errorText) ? errorText : helpText;
    const showCounter = typeof maxLength === 'number';
    // Tone drives color across icon/label/indicator/fieldset — disabled wins
    // over error, error wins over the idle (hover/focus-reactive) state.
    const tone = disabled ? 'disabled' : error ? 'error' : 'idle';
    const labelSideCls = hasLeading ? 'leading' : 'no-leading';

    const renderIcon = (side: 'leading' | 'trailing', name?: string) => name && (
      <span class={`icon ${side} ${tone}`} aria-hidden="true">{name}</span>
    );

    // Leading slot — when provided, replaces the static leading-icon span.
    // Same 12dp-from-edge positioning so it lines up with the icon spec.
    const renderLeadingSlot = () => hasLeadingSlot && (
      <span class={`leading-slot ${tone}`}>
        <slot name="leading" />
      </span>
    );

    // Interactive trailing area — sized to keep the visual icon ~12dp from
    // the right edge, matching the static trailing-icon position. Uses a
    // size-s icon-button (40dp visual inside a 48dp tap target).
    const renderTrailingAction = () => hasTrailingAction && (
      <span class="trailing-action">
        {showPwdToggle ? (
          <material-icon-button
            size="s"
            variant="standard"
            toggle
            selected={this.passwordVisible}
            icon="visibility"
            selected-icon="visibility_off"
            disabled={this.disabled}
            aria-label={this.passwordVisible ? 'Hide password' : 'Show password'}
            onSelectedChange={this.togglePassword as any}
            // The toggle icon-button now dispatches its own native
            // input/change on selection — stop them here so a show/hide
            // click isn't mistaken for the textfield's own value changing.
            onInput={(e: Event) => e.stopPropagation()}
            onChange={(e: Event) => e.stopPropagation()}
          />
        ) : (
          <slot name="trailing" />
        )}
      </span>
    );

    const renderInput = (variantCls: string, style: { [k: string]: string }) => (
      <input
        ref={el => (this.inputEl = el)}
        id="input"
        class={this.dimmed ? `input ${variantCls} dimmed` : `input ${variantCls}`}
        style={style}
        type={effectiveType}
        name={this.name}
        value={this.value}
        placeholder={this.placeholder ?? ' '}
        disabled={this.disabled}
        required={this.required}
        readonly={this.readOnly}
        maxLength={maxLength}
        aria-label={this.ariaLabel}
        aria-invalid={error ? 'true' : null}
        aria-describedby={subText ? 'description' : null}
        onInput={this.handleInput}
        onChange={this.handleChange}
      />
    );

    const renderSupporting = () => (subText || showCounter) && (
      <div class="supporting">
        <span id="description" class={tone}
              role={error && !this.refreshErrorAlert ? 'alert' : undefined}>
          {subText}
        </span>
        {showCounter && (
          <span class="counter">
            {(this.value?.length ?? 0)}/{maxLength}
          </span>
        )}
      </div>
    );

    // Treat any non-empty `value` prop as "filled" — explicit class on the
    // shell, in addition to :placeholder-shown. Safari's :has() +
    // :placeholder-shown doesn't reliably re-evaluate after a programmatic
    // value assignment, leaving the label stuck "down".
    const hasValue = (this.value ?? '') !== '';
    const shellBase = hasValue ? 'shell is-filled' : 'shell';

    // Container/input padding depends on which of {icon, slot, text, none}
    // occupies each side — purely a function of props, so it's computed as
    // inline style rather than a CSS class (the pseudo-state-driven parts —
    // focus-within / :has / is-filled — live in the stylesheet instead).
    const rowStyle: { [k: string]: string } = {};
    if (hasLeading) rowStyle.paddingLeft = '3rem';
    else if (leadingText) rowStyle.paddingLeft = '1rem';
    if (reserveTrailing) rowStyle.paddingRight = this.wideTrailing ? '6rem' : '3rem';
    else if (trailingText) rowStyle.paddingRight = '1rem';

    const inputStyle: { [k: string]: string } = {};
    if (!hasLeading) inputStyle.paddingLeft = leadingText ? '0.25rem' : '1rem';
    if (!reserveTrailing) inputStyle.paddingRight = trailingText ? '0.25rem' : '1rem';

    if (variant === 'filled') {
      return (
        <div class="wrapper">
          <div class={`${shellBase} filled ${disabled ? 'disabled' : 'tf-state-layer'}`}>
            {showStaticLeading && renderIcon('leading', leadingIcon)}
            {renderLeadingSlot()}
            {showStaticTrailing && renderIcon('trailing', trailingIcon)}
            {renderTrailingAction()}
            <div class="field-row" style={rowStyle}>
              {leadingText && (
                <span class="affix filled" aria-hidden="true">{leadingText}</span>
              )}
              {renderInput('filled', inputStyle)}
              {trailingText && (
                <span class="affix filled" aria-hidden="true">{trailingText}</span>
              )}
            </div>
            {label && (
              <label htmlFor="input" class={`label filled ${labelSideCls} ${tone}`}>
                {label}{this.required ? ' *' : ''}
              </label>
            )}
            <span class={`indicator ${tone}`} aria-hidden="true"></span>
          </div>
          {renderSupporting()}
        </div>
      );
    }

    // Outlined: floated label slides to left-4 (over the icon column) so it
    // aligns with the notch, regardless of leading-icon presence — handled
    // in CSS via the higher-specificity `.label.outlined.leading` override.
    return (
      <div class="wrapper">
        <div class={`${shellBase} outlined`}>
          {showStaticLeading && renderIcon('leading', leadingIcon)}
          {renderLeadingSlot()}
          {showStaticTrailing && renderIcon('trailing', trailingIcon)}
          {renderTrailingAction()}
          <div class="field-row" style={rowStyle}>
            {leadingText && (
              <span class="affix" style={{ paddingLeft: '1rem' }} aria-hidden="true">{leadingText}</span>
            )}
            {renderInput('outlined', inputStyle)}
            {trailingText && (
              <span class="affix" style={{ paddingRight: '1rem' }} aria-hidden="true">{trailingText}</span>
            )}
          </div>
          {label && (
            <label htmlFor="input" class={`label outlined ${labelSideCls} ${tone}`}>
              {label}{this.required ? ' *' : ''}
            </label>
          )}
          <fieldset aria-hidden="true" class={`fieldset ${tone}`}>
            {label && (
              <legend class={error ? 'legend error' : 'legend idle'}>
                <span class="legend-text">
                  {label}{this.required ? ' *' : ''}
                </span>
              </legend>
            )}
          </fieldset>
        </div>
        {renderSupporting()}
      </div>
    );
  }
}
