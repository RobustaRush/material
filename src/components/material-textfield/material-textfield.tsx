import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';

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

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.value = this.defaultValue;
    if (this.inputEl) this.inputEl.value = this.defaultValue;
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
  };

  private togglePassword = (e: CustomEvent<{ selected: boolean }>) => {
    this.passwordVisible = e.detail.selected;
  };

  render() {
    const { variant, label, helpText, errorText, error,
            leadingText, trailingText, leadingIcon, trailingIcon, maxLength } = this;

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
    const subText = error ? errorText : helpText;
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
              role={error ? 'alert' : undefined}>
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
