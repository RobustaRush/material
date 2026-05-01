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
import { adoptMaterialStyles } from '../../utils/adopted-styles';

export type MaterialTextfieldVariant = 'filled' | 'outlined';
export type MaterialTextfieldType =
  | 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

// Implementation rationale (placeholder-shown trick, fieldset/legend notch,
// leading-14, label-shift over icon, etc.):
// docs/wiki/projects/material-textfield-notes.md

const SUPPORT_BASE = 'flex justify-between gap-4 mt-1 px-4 text-xs leading-4';

const INPUT_BASE =
  'peer bg-transparent outline-none border-0 m-0 p-0 ' +
  'text-on-surface text-base ' +
  'placeholder:text-on-surface-variant placeholder:opacity-0 ' +
  'focus:placeholder:opacity-100 ' +
  'disabled:cursor-not-allowed disabled:text-on-surface/40';

const AFFIX_BASE =
  'text-base text-on-surface-variant whitespace-nowrap select-none ' +
  'transition-opacity duration-150 opacity-0 ' +
  'group-focus-within:opacity-100 ' +
  'group-has-[input:not(:placeholder-shown)]:opacity-100';

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
    // Block first render until the shared Tailwind sheet is adopted.
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    this.syncFormValue();
  }

  @Watch('value')
  @Watch('disabled')
  syncFormValue() {
    this.internals.setFormValue(this.disabled ? null : (this.value ?? ''));
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

    const subText = error ? errorText : helpText;
    const showCounter = typeof maxLength === 'number';
    const subToneCls = error ? 'text-error' : 'text-on-surface-variant';
    const iconToneCls = error ? 'text-error' : 'text-on-surface-variant';
    const labelLeft = hasLeading ? 'left-12' : 'left-4';

    const labelRest =
      `absolute ${labelLeft} top-1/2 -translate-y-1/2 ` +
      'pointer-events-none origin-left transition-all duration-150 ' +
      'text-base';

    const labelTone = error
      ? 'text-error'
      : 'text-on-surface-variant group-focus-within:text-primary';

    const renderIcon = (side: 'left' | 'right', name?: string) => name && (
      <span
        class={`absolute ${side === 'left' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 material-symbols text-2xl pointer-events-none ${iconToneCls}`}
        aria-hidden="true">
        {name}
      </span>
    );

    // Leading slot — when provided, replaces the static leading-icon span.
    // Same 12dp-from-edge positioning so it lines up with the icon spec.
    const renderLeadingSlot = () => hasLeadingSlot && (
      <span class={`absolute left-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center ${iconToneCls}`}>
        <slot name="leading" />
      </span>
    );

    // Interactive trailing area — sized to keep the visual icon ~12dp from
    // the right edge, matching the static trailing-icon position. Uses a
    // size-s icon-button (40dp visual inside a 48dp tap target).
    const renderTrailingAction = () => hasTrailingAction && (
      <span class="absolute right-1 top-1/2 -translate-y-1/2 z-10">
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

    const renderInput = (extraCls: string) => (
      <input
        ref={el => (this.inputEl = el)}
        class={`${INPUT_BASE} ${extraCls} ${this.dimmed ? 'text-on-surface/40 line-through' : ''}`}
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
      <div class={SUPPORT_BASE}>
        <span id="description" class={subToneCls}
              role={error ? 'alert' : undefined}>
          {subText}
        </span>
        {showCounter && (
          <span class="text-on-surface-variant ml-auto tabular-nums">
            {(this.value?.length ?? 0)}/{maxLength}
          </span>
        )}
      </div>
    );

    if (variant === 'filled') {
      const labelShrunk =
        'group-focus-within:top-2 group-focus-within:translate-y-0 group-focus-within:text-xs ' +
        'group-has-[input:not(:placeholder-shown)]:top-2 ' +
        'group-has-[input:not(:placeholder-shown)]:translate-y-0 ' +
        'group-has-[input:not(:placeholder-shown)]:text-xs';

      const indicatorCls = error
        ? 'h-0.5 bg-error'
        : 'h-px bg-on-surface-variant ' +
          'group-hover:bg-on-surface ' +
          'group-focus-within:h-0.5 group-focus-within:bg-primary';

      const innerL = hasLeading ? 'pl-12' : (leadingText ? 'pl-4' : '');
      const innerR = reserveTrailing ? (this.wideTrailing ? 'pr-24' : 'pr-12') : (trailingText ? 'pr-4' : '');
      const inputL = hasLeading ? '' : (leadingText ? 'pl-1' : 'pl-4');
      const inputR = reserveTrailing ? '' : (trailingText ? 'pr-1' : 'pr-4');
      const affixFilled = `${AFFIX_BASE} self-stretch pt-6 pb-2`;

      return (
        <div class="block w-full">
          <div class="group relative w-full h-14 rounded-t bg-surface-container-highest hover:bg-surface-container-high transition-colors">
            {showStaticLeading && renderIcon('left', leadingIcon)}
            {renderLeadingSlot()}
            {showStaticTrailing && renderIcon('right', trailingIcon)}
            {renderTrailingAction()}
            <div class={`flex items-end h-full ${innerL} ${innerR}`}>
              {leadingText && (
                <span class={affixFilled} aria-hidden="true">{leadingText}</span>
              )}
              {renderInput(`w-full h-full pt-6 pb-2 ${inputL} ${inputR}`)}
              {trailingText && (
                <span class={affixFilled} aria-hidden="true">{trailingText}</span>
              )}
            </div>
            {label && (
              <label class={`${labelRest} ${labelShrunk} ${labelTone}`}>
                {label}{this.required ? ' *' : ''}
              </label>
            )}
            <span class={`absolute left-0 right-0 bottom-0 pointer-events-none ${indicatorCls}`}
                  aria-hidden="true"></span>
          </div>
          {renderSupporting()}
        </div>
      );
    }

    // Outlined: floated label slides to left-4 (over the icon column) so it
    // aligns with the notch, regardless of leading-icon presence.
    const labelShrunkOutlined =
      'group-focus-within:top-0 group-focus-within:text-xs ' +
      'group-has-[input:not(:placeholder-shown)]:top-0 ' +
      'group-has-[input:not(:placeholder-shown)]:text-xs' +
      (hasLeading
        ? ' group-focus-within:left-4 group-has-[input:not(:placeholder-shown)]:left-4'
        : '');

    const fieldsetTone = error
      ? 'border-2 border-error'
      : 'border border-outline group-hover:border-on-surface ' +
        'group-focus-within:border-2 group-focus-within:border-primary';

    // Counter the fieldset's border-left width so the notch lines up with
    // the floated label at left-4. Doubles when the border thickens on focus.
    const legendOffset = error
      ? '-ml-[2px]'
      : '-ml-px group-focus-within:-ml-[2px]';

    const innerL = hasLeading ? 'pl-12' : '';
    const innerR = reserveTrailing ? (this.wideTrailing ? 'pr-24' : 'pr-12') : '';
    const inputL = hasLeading ? '' : (leadingText ? 'pl-1' : 'pl-4');
    const inputR = reserveTrailing ? '' : (trailingText ? 'pr-1' : 'pr-4');

    return (
      <div class="block w-full">
        <div class="group relative w-full h-14">
          {showStaticLeading && renderIcon('left', leadingIcon)}
          {renderLeadingSlot()}
          {showStaticTrailing && renderIcon('right', trailingIcon)}
          {renderTrailingAction()}
          <div class={`flex items-center h-full ${innerL} ${innerR}`}>
            {leadingText && (
              <span class={`${AFFIX_BASE} pl-4`} aria-hidden="true">{leadingText}</span>
            )}
            {renderInput(`w-full h-full leading-14 ${inputL} ${inputR}`)}
            {trailingText && (
              <span class={`${AFFIX_BASE} pr-4`} aria-hidden="true">{trailingText}</span>
            )}
          </div>
          {label && (
            <label class={`${labelRest} ${labelShrunkOutlined} ${labelTone}`}>
              {label}{this.required ? ' *' : ''}
            </label>
          )}
          <fieldset
            aria-hidden="true"
            class={`absolute inset-0 m-0 px-3 pt-0 pointer-events-none rounded text-left ${fieldsetTone}`}>
            {label && (
              <legend class={`invisible block h-0 overflow-visible p-0 text-xs leading-none ${legendOffset}`}>
                <span class="inline-block overflow-hidden whitespace-nowrap max-w-[0.01px] transition-[max-width,padding] duration-150 group-focus-within:max-w-full group-focus-within:px-1 group-has-[input:not(:placeholder-shown)]:max-w-full group-has-[input:not(:placeholder-shown)]:px-1">
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
