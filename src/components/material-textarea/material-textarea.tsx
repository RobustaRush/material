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

export type MaterialTextareaVariant = 'filled' | 'outlined';

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
    const tone = disabled ? 'disabled' : error ? 'error' : 'idle';

    // Safari's :has(textarea:not(:placeholder-shown)) doesn't reliably
    // re-evaluate after a programmatic value assignment, leaving the label
    // stuck "down". Mirror the textfield fix: an explicit is-filled class on
    // the shell drives the float too.
    const hasValue = (this.value ?? '') !== '';
    const shellBase = hasValue ? 'shell is-filled' : 'shell';

    const renderTrailing = () => (
      (showStaticTrailing || hasTrailingAction) && (
        <span class={`trailing ${tone}`}>
          {showStaticTrailing
            ? <span class="icon" aria-hidden="true">{trailingIcon}</span>
            : <slot name="trailing" />}
        </span>
      )
    );

    const trailingStyle: { [k: string]: string } = {
      paddingRight: reserveTrailing ? (this.wideTrailing ? '6rem' : '3rem') : '1rem',
    };

    const renderTextarea = (variantCls: string) => (
      <textarea
        ref={el => (this.textareaEl = el)}
        id="input"
        class={`input ${variantCls}`}
        style={trailingStyle}
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

    if (variant === 'filled') {
      return (
        <div class="wrapper">
          <div class={`${shellBase} filled ${tone}`}>
            {renderTrailing()}
            {renderTextarea('filled')}
            {/* Surface-colored mask: keeps scrolled textarea text from
                bleeding through behind the floated label. Sits above the
                textarea, below the label. */}
            <span aria-hidden="true" class="mask"></span>
            {label && (
              <label htmlFor="input" class={`label filled ${tone}`}>
                {label}{this.required ? ' *' : ''}
              </label>
            )}
            <span class={`indicator ${tone}`} aria-hidden="true"></span>
          </div>
          {renderSupporting()}
        </div>
      );
    }

    // Outlined: label rests aligned with the textarea's first input line
    // (24dp below the top edge, per the multi-line spec). Floats up to sit
    // centred on the top stroke, matching textfield's notch.
    return (
      <div class="wrapper">
        <div class={`${shellBase} outlined`}>
          {renderTrailing()}
          {/* Clip the textarea's top 24dp so scrolled content can't render
              under the floated label / notch. The top padding already
              positions text at y=24, so the clip is invisible at rest. */}
          {renderTextarea('outlined')}
          {label && (
            <label htmlFor="input" class={`label outlined ${tone}`}>
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
