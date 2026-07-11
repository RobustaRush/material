import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

export type MaterialTextareaVariant = 'filled' | 'outlined';

const SUPPORT_BASE = 'flex justify-between gap-4 mt-1 px-4 text-xs leading-4';

const INPUT_BASE =
  'peer block w-full bg-transparent outline-none border-0 m-0 resize-none ' +
  'text-on-surface text-base leading-6 ' +
  'placeholder:text-on-surface-variant placeholder:opacity-0 ' +
  'focus:placeholder:opacity-100 ' +
  'disabled:cursor-not-allowed disabled:text-on-surface/40';

// Line-box height matches MD3 textarea spec (24dp per line).
const LINE_H = 24;

@Component({
  tag: 'material-textarea',
  styleUrl: 'material-textarea.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialTextarea {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() variant: MaterialTextareaVariant = 'outlined';
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
  @Prop() trailingIcon?: string;
  @Prop() wideTrailing = false;
  @Prop() maxLength?: number;
  @Prop() rows = 3;
  @Prop() autoResize = false;
  @Prop() minRows?: number;
  @Prop() maxRows?: number;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() valueChange!: EventEmitter<{ value: string }>;
  @Event() valueInput!: EventEmitter<{ value: string }>;

  private defaultValue = '';
  private textareaEl?: HTMLTextAreaElement;

  componentWillLoad() {
    this.defaultValue = this.value;
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  componentDidLoad() {
    this.applyAutoResize();
  }

  connectedCallback() {
    this.syncFormValue();
  }

  @Watch('value')
  @Watch('disabled')
  syncFormValue() {
    this.internals.setFormValue(this.disabled ? null : (this.value ?? ''));
  }

  @Watch('value')
  syncTextareaValue() {
    // The `value` is seeded as a JSX child, which only sets the textarea's
    // initial content — later programmatic writes never reach the live DOM
    // node. Push them through here. The guard avoids clobbering the caret
    // during user typing (handleInput has already set value === DOM value).
    if (this.textareaEl && this.textareaEl.value !== (this.value ?? '')) {
      this.textareaEl.value = this.value ?? '';
      this.applyAutoResize();
    }
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.value = this.defaultValue;
    if (this.textareaEl) {
      this.textareaEl.value = this.defaultValue;
      this.applyAutoResize();
    }
  }

  formStateRestoreCallback(state: string | null) {
    this.value = state ?? '';
  }

  private applyAutoResize() {
    if (!this.autoResize || !this.textareaEl) return;
    // scrollHeight is content + padding (border-box), so the row minimum/maximum
    // must include the textarea's vertical padding too — otherwise min-rows=3
    // yields ~1.5 visible lines because the padding eats into the line box.
    const cs = getComputedStyle(this.textareaEl);
    const padY = parseFloat(cs.paddingTop || '0') + parseFloat(cs.paddingBottom || '0');
    const min = (this.minRows ?? this.rows) * LINE_H + padY;
    const max = this.maxRows ? this.maxRows * LINE_H + padY : Infinity;
    this.textareaEl.style.height = 'auto';
    const next = Math.max(min, Math.min(this.textareaEl.scrollHeight, max));
    this.textareaEl.style.height = `${next}px`;
    this.textareaEl.style.overflowY =
      this.textareaEl.scrollHeight > max ? 'auto' : 'hidden';
  }

  private handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    this.value = target.value;
    this.valueInput.emit({ value: this.value });
    this.applyAutoResize();
  };

  private handleChange = () => {
    this.valueChange.emit({ value: this.value });
  };

  render() {
    const { variant, label, helpText, errorText, error,
            trailingIcon, maxLength, rows } = this;

    const hasTrailingSlot = !!this.el.querySelector(':scope > [slot="trailing"]');
    const hasTrailingAction = hasTrailingSlot;
    const showStaticTrailing = !!trailingIcon && !hasTrailingAction;
    const reserveTrailing = !!trailingIcon || hasTrailingAction;

    const disabled = this.disabled;
    const subText = error ? errorText : helpText;
    const showCounter = typeof maxLength === 'number';
    const subToneCls = disabled
      ? 'text-on-surface/38'
      : error ? 'text-error' : 'text-on-surface-variant';
    const iconToneCls = disabled
      ? 'text-on-surface/38'
      : error ? 'text-error' : 'text-on-surface-variant';

    const labelTone = disabled
      ? 'text-on-surface/38'
      : error
      ? 'text-error'
      : 'text-on-surface-variant group-focus-within:text-primary';

    // Safari's :has(textarea:not(:placeholder-shown)) doesn't reliably
    // re-evaluate after a programmatic value assignment, leaving the label
    // stuck "down". Mirror the textfield fix: an explicit is-filled class on
    // the group wrapper drives the float too.
    const hasValue = (this.value ?? '') !== '';
    const groupCls = `group${hasValue ? ' is-filled' : ''}`;

    const renderTrailing = () => (
      (showStaticTrailing || hasTrailingAction) && (
        <span class={`absolute right-3 top-3 z-10 inline-flex items-center ${iconToneCls}`}>
          {showStaticTrailing
            ? <span class="material-symbols text-2xl pointer-events-none" aria-hidden="true">{trailingIcon}</span>
            : <slot name="trailing" />}
        </span>
      )
    );

    const innerR = reserveTrailing ? (this.wideTrailing ? 'pr-24' : 'pr-12') : 'pr-4';

    const renderTextarea = (extraCls: string) => (
      <textarea
        ref={el => (this.textareaEl = el)}
        id="input"
        class={`${INPUT_BASE} ${extraCls}`}
        name={this.name}
        rows={rows}
        placeholder={this.placeholder ?? ' '}
        disabled={this.disabled}
        required={this.required}
        readonly={this.readOnly}
        maxLength={maxLength}
        aria-label={this.ariaLabel}
        aria-invalid={error ? 'true' : null}
        aria-describedby={subText ? 'description' : null}
        onInput={this.handleInput}
        onChange={this.handleChange}>{this.value}</textarea>
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
      // Label rests at top-4 (16dp), shrinks via scale-75 (visual ~12dp font)
      // rather than swapping text-base→text-xs. The font-size + line-height
      // interpolation in the latter makes the label box grow asymmetrically
      // mid-animation, reading as a vertical wobble. Scale keeps the layout
      // box constant — only top + transform animate, so motion is smooth.
      const labelRest =
        'absolute left-4 top-4 pointer-events-none origin-top-left ' +
        'transition-all duration-150 text-base';
      const labelShrunk =
        'group-focus-within:top-2 group-focus-within:scale-75 ' +
        'group-[.is-filled]:top-2 group-[.is-filled]:scale-75 ' +
        'group-has-[textarea:not(:placeholder-shown)]:top-2 ' +
        'group-has-[textarea:not(:placeholder-shown)]:scale-75';

      const indicatorCls = disabled
        ? 'h-px bg-on-surface/38'
        : error
        ? 'h-0.5 bg-error'
        : 'h-px bg-on-surface-variant ' +
          'group-hover:bg-on-surface ' +
          'group-focus-within:h-0.5 group-focus-within:bg-primary';

      // Disabled: MD3 filled container is On surface @ 4% (no hover swap).
      const filledBg = disabled
        ? 'bg-on-surface/[0.04]'
        : 'bg-surface-container-highest hover:bg-surface-container-high transition-colors';
      const maskBg = disabled
        ? 'bg-on-surface/[0.04]'
        : 'bg-surface-container-highest group-hover:bg-surface-container-high transition-colors';

      return (
        <div class="block w-full">
          <div class={`${groupCls} relative w-full rounded-t ${filledBg}`}>
            {renderTrailing()}
            {renderTextarea(`pt-6 pb-2 pl-4 ${innerR}`)}
            {/* Surface-colored mask: keeps scrolled textarea text from
                bleeding through behind the floated label. Sits above the
                textarea, below the label. */}
            <span aria-hidden="true"
                  class={`absolute top-0 left-0 right-0 h-6 rounded-t ${maskBg} pointer-events-none`}></span>
            {label && (
              <label htmlFor="input" class={`${labelRest} ${labelShrunk} ${labelTone} z-10`}>
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

    // Outlined: label rests at top-6 left-4 — aligned with the textarea's
    // first input line (pt-6 == 24dp below, per the multi-line spec). Floats
    // to top-0 + -translate-y-2 so the shrunk label sits centred on the top
    // stroke, matching textfield's notch.
    const labelRest =
      'absolute left-4 top-6 pointer-events-none origin-left ' +
      'transition-all duration-150 text-base';
    // Fixed-pixel translate (-translate-y-2 = -8px) instead of -translate-y-1/2:
    // the percentage form bases off the label's own height, which shrinks
    // mid-animation as text-base → text-xs (line-height 24 → 16), and the
    // intermediate translate values overshoot the final resting position.
    const labelShrunkOutlined =
      'group-focus-within:top-0 group-focus-within:-translate-y-2 group-focus-within:text-xs ' +
      'group-[.is-filled]:top-0 group-[.is-filled]:-translate-y-2 group-[.is-filled]:text-xs ' +
      'group-has-[textarea:not(:placeholder-shown)]:top-0 ' +
      'group-has-[textarea:not(:placeholder-shown)]:-translate-y-2 ' +
      'group-has-[textarea:not(:placeholder-shown)]:text-xs';

    const fieldsetTone = disabled
      ? 'border border-on-surface/12'
      : error
      ? 'border-2 border-error'
      : 'border border-outline group-hover:border-on-surface ' +
        'group-focus-within:border-2 group-focus-within:border-primary';

    const legendOffset = error
      ? '-ml-[2px]'
      : '-ml-px group-focus-within:-ml-[2px]';

    return (
      <div class="block w-full">
        <div class={`${groupCls} relative w-full`}>
          {renderTrailing()}
          {/* Clip the textarea's top 24dp so scrolled content can't render
              under the floated label / notch. The pt-6 padding already
              positions text at y=24, so the clip is invisible at rest. */}
          {renderTextarea(`pt-6 pb-4 pl-4 ${innerR} [clip-path:inset(24px_0_0_0)]`)}
          {label && (
            <label htmlFor="input" class={`${labelRest} ${labelShrunkOutlined} ${labelTone}`}>
              {label}{this.required ? ' *' : ''}
            </label>
          )}
          <fieldset
            aria-hidden="true"
            class={`absolute inset-0 m-0 px-3 pt-0 pointer-events-none rounded text-left ${fieldsetTone}`}>
            {label && (
              <legend class={`invisible block h-0 overflow-visible p-0 text-xs leading-none ${legendOffset}`}>
                <span class="inline-block overflow-hidden whitespace-nowrap max-w-[0.01px] transition-[max-width,padding] duration-150 group-focus-within:max-w-full group-focus-within:px-1 group-[.is-filled]:max-w-full group-[.is-filled]:px-1 group-has-[textarea:not(:placeholder-shown)]:max-w-full group-has-[textarea:not(:placeholder-shown)]:px-1">
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
