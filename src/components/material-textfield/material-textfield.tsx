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

export type MaterialTextfieldVariant = 'filled' | 'outlined';
export type MaterialTextfieldType =
  | 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

// MD3 spec — container 56dp / supporting-text top 4dp / horizontal padding 16dp
// (12dp with icons) / icon size 24dp.
//
// Floating label is animated entirely by Tailwind variants — no JS state.
// The input always carries a placeholder (defaults to a single space) so
// `:placeholder-shown` reliably reports "is empty".
//
// Drives state via the `group` container, not the `peer` modifier:
// `group-focus-within:` for focus, `group-has-[input:not(:placeholder-shown)]:`
// for populated. This survives wrapper divs around the input (needed for
// inline prefix/suffix).
//
// Outlined variant uses the native <fieldset>/<legend> notch trick: the
// legend's intrinsic width creates a real gap in the top border, which means
// the field can sit on any background without painting a fake label cutout.
// The visible <label> is rendered separately and absolutely positioned over
// that gap when shrunk.

const SUPPORT_BASE = 'flex justify-between gap-4 mt-1 px-4 text-xs leading-4';

@Component({
  tag: 'material-textfield',
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
  @Prop() prefix?: string;
  @Prop() suffix?: string;
  @Prop() maxLength?: number;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() change!: EventEmitter<{ value: string }>;
  @Event({ eventName: 'input' }) inputEvent!: EventEmitter<{ value: string }>;

  // Captured before first render so the form-default survives later writes
  // through the reflected-prop pipeline.
  private defaultValue = '';
  private inputEl?: HTMLInputElement;

  componentWillLoad() {
    this.defaultValue = this.value;
  }

  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
    this.syncFormValue();
  }

  @Watch('value')
  syncFormValue() {
    this.internals.setFormValue(this.value ?? '');
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
    this.inputEvent.emit({ value: this.value });
  };

  private handleChange = () => {
    this.change.emit({ value: this.value });
  };

  render() {
    const { variant, label, helpText, errorText, error,
            prefix, suffix, leadingIcon, trailingIcon, maxLength } = this;

    const subText = error ? errorText : helpText;
    const showCounter = typeof maxLength === 'number';
    const subToneCls = error ? 'text-error' : 'text-on-surface-variant';
    const labelLeft = leadingIcon ? 'left-12' : 'left-4';

    // Input baseline classes — same for both variants.
    // The placeholder is never null: it's the signal for `:placeholder-shown`
    // which drives the label float. When the user supplies one we still hide
    // it at rest so it doesn't fight the centered label, then reveal it on
    // focus.
    const inputBase =
      'peer bg-transparent outline-none border-0 m-0 p-0 ' +
      'text-on-surface text-base ' +
      'placeholder:text-on-surface-variant placeholder:opacity-0 ' +
      'focus:placeholder:opacity-100 ' +
      'disabled:cursor-not-allowed disabled:text-on-surface/40';

    // Affixes appear only when the field is "open" — focused or populated.
    // Per MD3, prefix/suffix sit alongside the input text, not the centered
    // label, so they fade in together with the float.
    const affixBase =
      'text-base text-on-surface-variant whitespace-nowrap select-none ' +
      'transition-opacity duration-150 opacity-0 ' +
      'group-focus-within:opacity-100 ' +
      'group-has-[input:not(:placeholder-shown)]:opacity-100';

    // Label resting style — centered, base size, on-surface-variant.
    const labelRest =
      `absolute ${labelLeft} top-1/2 -translate-y-1/2 ` +
      'pointer-events-none origin-left transition-all duration-150 ' +
      'text-base';

    // Color rules at rest / focused / error. Error tone wins over focus tone.
    const labelTone = error
      ? 'text-error'
      : 'text-on-surface-variant group-focus-within:text-primary';

    // Float-up trigger: focused OR populated.
    //   group-focus-within = container has any focused descendant.
    //   group-has-[input:not(:placeholder-shown)] = input has a value.
    // Each variant×utility combo is written out as a contiguous literal
    // because Tailwind v4's source scanner only finds whole class names that
    // appear verbatim in source files.

    const renderLeadingIcon = () => leadingIcon && (
      <span class={`absolute left-3 top-1/2 -translate-y-1/2 material-symbols text-2xl pointer-events-none ${error ? 'text-error' : 'text-on-surface-variant'}`}
            aria-hidden="true">
        {leadingIcon}
      </span>
    );
    const renderTrailingIcon = () => trailingIcon && (
      <span class={`absolute right-3 top-1/2 -translate-y-1/2 material-symbols text-2xl pointer-events-none ${error ? 'text-error' : 'text-on-surface-variant'}`}
            aria-hidden="true">
        {trailingIcon}
      </span>
    );

    const renderInput = (extraCls: string) => (
      <input
        ref={el => (this.inputEl = el)}
        class={`${inputBase} ${extraCls}`}
        type={this.type}
        name={this.name}
        value={this.value}
        placeholder={this.placeholder ?? ' '}
        disabled={this.disabled}
        required={this.required}
        readonly={this.readOnly}
        maxLength={maxLength}
        aria-label={this.ariaLabel ?? (label ? undefined : 'textfield')}
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
      // Filled: surface-container-highest fill, rounded-top, bottom indicator.
      // Shrunk label position: top-2 (8dp), text-xs.
      const labelShrunk =
        'group-focus-within:top-2 group-focus-within:translate-y-0 group-focus-within:text-xs ' +
        'group-has-[input:not(:placeholder-shown)]:top-2 ' +
        'group-has-[input:not(:placeholder-shown)]:translate-y-0 ' +
        'group-has-[input:not(:placeholder-shown)]:text-xs';

      // Bottom indicator: 1dp at rest, 2dp on focus, primary on focus, error
      // wins. Use a sibling span so layout never shifts between 1px and 2px.
      const indicatorCls = error
        ? 'h-0.5 bg-error'
        : 'h-px bg-on-surface-variant ' +
          'group-hover:bg-on-surface ' +
          'group-focus-within:h-0.5 group-focus-within:bg-primary';

      // Horizontal padding adapts to leading icon / prefix / suffix /
      // trailing icon. The flex container holds icon-side padding; the input
      // (and any prefix/suffix span) take the inner edge padding so prefix
      // hugs the input.
      const innerL = leadingIcon ? 'pl-12' : (prefix ? 'pl-4' : '');
      const innerR = trailingIcon ? 'pr-12' : (suffix ? 'pr-4' : '');
      const inputL = leadingIcon ? '' : (prefix ? 'pl-1' : 'pl-4');
      const inputR = trailingIcon ? '' : (suffix ? 'pr-1' : 'pr-4');

      // MD3 spec: 24dp top padding (label area when shrunk) + 24dp value
      // line-box + 8dp bottom padding = 56dp container. Prefix/suffix span
      // uses self-stretch + matching pt-6 pb-2 so it shares the input's
      // vertical content area — text baselines align, unlike a plain `pb-2`
      // span that sits at the container's bottom.
      const affixFilled = `${affixBase} self-stretch pt-6 pb-2`;

      return (
        <div class="block w-full">
          <div class="group relative w-full h-14 rounded-t bg-surface-container-highest hover:bg-surface-container-high transition-colors">
            {renderLeadingIcon()}
            {renderTrailingIcon()}
            <div class={`flex items-end h-full ${innerL} ${innerR}`}>
              {prefix && (
                <span class={affixFilled} aria-hidden="true">{prefix}</span>
              )}
              {renderInput(`w-full h-full pt-6 pb-2 ${inputL} ${inputR}`)}
              {suffix && (
                <span class={affixFilled} aria-hidden="true">{suffix}</span>
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

    // Outlined: transparent fill, fieldset+legend creates a real notch.
    // Shrunk label position: top-0 (sits on top border), text-xs. With a
    // leading icon, the rest label sits at left-12 (after the icon) to align
    // with the input value, but when floated it slides back to left-4 so it
    // sits over the icon column — matching every other floated label.
    const labelShrunkOutlined =
      'group-focus-within:top-0 group-focus-within:text-xs ' +
      'group-has-[input:not(:placeholder-shown)]:top-0 ' +
      'group-has-[input:not(:placeholder-shown)]:text-xs' +
      (leadingIcon
        ? ' group-focus-within:left-4 group-has-[input:not(:placeholder-shown)]:left-4'
        : '');

    const fieldsetTone = error
      ? 'border-2 border-error'
      : 'border border-outline group-hover:border-on-surface ' +
        'group-focus-within:border-2 group-focus-within:border-primary';

    // The fieldset's border lives inside the container, so its border-left
    // pushes the legend (and the notch) right by the border width. Match
    // the legend's negative margin-left to the border width so the notch
    // sits 4px left of the floated label (which is always at left-4 when
    // shrunk, regardless of leading icon).
    const legendOffset = error
      ? '-ml-[2px]'
      : '-ml-px group-focus-within:-ml-[2px]';

    const innerL = leadingIcon ? 'pl-12' : '';
    const innerR = trailingIcon ? 'pr-12' : '';
    const inputL = leadingIcon ? '' : (prefix ? 'pl-1' : 'pl-4');
    const inputR = trailingIcon ? '' : (suffix ? 'pr-1' : 'pr-4');

    return (
      <div class="block w-full">
        <div class="group relative w-full h-14">
          {renderLeadingIcon()}
          {renderTrailingIcon()}
          <div class={`flex items-center h-full ${innerL} ${innerR}`}>
            {prefix && (
              <span class={`${affixBase} pl-4`} aria-hidden="true">{prefix}</span>
            )}
            {/*
              leading-14 (line-height 56dp) forces the line box to fill the
              container so the value text is vertically centered regardless
              of the browser's <input> defaults (Chrome and Safari position
              the line at the top with a normal line-height when the input
              has an explicit height greater than the natural line-box).
            */}
            {renderInput(`w-full h-full leading-14 ${inputL} ${inputR}`)}
            {suffix && (
              <span class={`${affixBase} pr-4`} aria-hidden="true">{suffix}</span>
            )}
          </div>
          {label && (
            <label class={`${labelRest} ${labelShrunkOutlined} ${labelTone}`}>
              {label}{this.required ? ' *' : ''}
            </label>
          )}
          {/*
            <fieldset>'s top border is interrupted natively by <legend>'s
            intrinsic width. Animate the legend's inner span between
            max-w-[0.01px] (no gap) and max-w-full (gap matches the visible
            label) to open and close the notch in sync with the floating
            label. Both the legend and its inner span inherit visibility
            hidden — they only reserve width to carve the notch; the visible
            label is rendered as the absolutely-positioned <label> above.
          */}
          <fieldset
            aria-hidden="true"
            class={`absolute inset-0 m-0 px-3 pt-0 pointer-events-none rounded text-left ${fieldsetTone}`}>
            {label && (
              // h-0 + overflow-visible collapses the legend's vertical extent
              // to zero, so the fieldset's top border draws at y=0 of the
              // container — flush with the floating label's center. Without
              // this, Chrome positions the border at the legend's vertical
              // center (~7px down for a 12px legend), pushing the rectangle
              // visibly below the label.
              <legend class={`invisible block h-0 overflow-visible p-0 text-xs leading-none ${legendOffset}`}>
                {/*
                  Constrain the inner span (not the legend element) — browsers
                  reset legend's max-width to 100% as a UA style, so a class
                  on the legend itself loses to the cascade. The span sits
                  inside the legend with `inline-block`, so its width dictates
                  the notch width via the legend's content extent.
                  No horizontal padding: with box-sizing: border-box Tailwind
                  defaults, padding would force a minimum width that leaves a
                  visible gap in the top border at rest.
                */}
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
