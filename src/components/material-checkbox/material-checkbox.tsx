import {
  Component,
  Element,
  Event,
  EventEmitter,
  Method,
  Prop,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 spec: container 18dp / corner 2dp / icon 18dp / target 48dp / state-layer 40dp.
// The button is a 1×1 inline-grid; the 40px state-layer and 18px box share the
// single cell so both auto-center without absolute positioning. Tailwind opacity
// steps 10/15 stand in for the spec's 8/12 — close enough by design.

const TARGET_BASE =
  'group inline-grid place-items-center w-12 h-12 rounded-full ' +
  'border-0 bg-transparent p-0 m-0 cursor-pointer ' +
  'focus:outline-none focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

const STATE_LAYER_BASE =
  '[grid-area:1/1] w-10 h-10 rounded-full transition-colors pointer-events-none';

const STATE_LAYER_OFF =
  'group-hover:bg-on-surface/10 group-focus-visible:bg-on-surface/15 group-active:bg-on-surface/15';

const STATE_LAYER_ON =
  'group-hover:bg-primary/10 group-focus-visible:bg-primary/15 group-active:bg-primary/15';

const STATE_LAYER_ERR =
  'group-hover:bg-error/10 group-focus-visible:bg-error/15 group-active:bg-error/15';

const BOX_BASE =
  '[grid-area:1/1] relative inline-flex items-center justify-center ' +
  'w-[18px] h-[18px] rounded-sm transition-colors box-border';

const BOX_OFF = 'border-2 border-on-surface-variant bg-transparent';
const BOX_ON = 'bg-primary text-on-primary';
const BOX_OFF_ERR = 'border-2 border-error bg-transparent';
const BOX_ON_ERR = 'bg-error text-on-error';

@Component({
  tag: 'material-checkbox',
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

  @Event() checkedChange!: EventEmitter<{ checked: boolean; indeterminate: boolean }>;

  // Captured once before first render — reflected props rewrite the live
  // attributes after every toggle, so `hasAttribute('checked')` can't tell us
  // the form-default state at reset time.
  private defaultChecked = false;
  private defaultIndeterminate = false;

  componentWillLoad() {
    this.defaultChecked = this.checked;
    this.defaultIndeterminate = this.indeterminate;
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    this.syncFormValue();
  }

  @Watch('checked')
  @Watch('indeterminate')
  @Watch('value')
  syncFormValue() {
    this.internals.setFormValue(this.checked && !this.indeterminate ? this.value : null);
    this.internals.ariaChecked = this.indeterminate ? 'mixed' : String(this.checked);
  }

  formResetCallback() {
    this.checked = this.defaultChecked;
    this.indeterminate = this.defaultIndeterminate;
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
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggle();
    }
  };

  render() {
    const isOn = this.checked || this.indeterminate;
    const icon = this.indeterminate ? 'remove' : 'check';
    const inError = this.error;

    const stateLayerCls = inError
      ? STATE_LAYER_ERR
      : isOn
      ? STATE_LAYER_ON
      : STATE_LAYER_OFF;

    const boxCls = inError
      ? isOn
        ? BOX_ON_ERR
        : BOX_OFF_ERR
      : isOn
      ? BOX_ON
      : BOX_OFF;

    // errorText replaces helpText when in error; either may be empty.
    // The id is referenced by aria-describedby only when text is present.
    const descId = 'description';
    const subText = inError ? this.errorText : this.helpText;
    const subToneCls = inError ? 'text-error' : 'text-on-surface-variant';

    const button = (
      <button
        type="button"
        role="checkbox"
        class={TARGET_BASE}
        disabled={this.disabled}
        aria-checked={this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false'}
        aria-label={this.ariaLabel ?? (this.label ? undefined : 'checkbox')}
        aria-labelledby={!this.ariaLabel && this.label ? 'label' : null}
        aria-required={this.required ? 'true' : null}
        aria-invalid={inError ? 'true' : null}
        aria-describedby={subText ? descId : null}
        onClick={() => this.toggle()}
        onKeyDown={this.handleKeyDown}
      >
        <span
          class={`${STATE_LAYER_BASE} ${stateLayerCls}`}
          aria-hidden="true"
        ></span>
        <span class={`${BOX_BASE} ${boxCls}`}>
          {/* Always rendered so the check can animate in — a conditionally
              rendered mark can't transition. Revealed left-to-right via
              clip-path at 200ms standard easing (MD3 selection-control motion). */}
          <span
            class={
              'material-symbols text-[18px] leading-none ' +
              'transition-[clip-path] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ' +
              (isOn ? '[clip-path:inset(0)]' : '[clip-path:inset(0_100%_0_0)]')
            }
            aria-hidden="true"
          >
            {icon}
          </span>
        </span>
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
      <label class="inline-flex items-start gap-2 select-none cursor-pointer">
        {button}
        <span class="flex flex-col">
          <span id="label" class="mt-3 leading-6 text-base text-on-surface">{this.label}</span>
          {subText && (
            <span id={descId} class={`mt-1 leading-4 text-xs ${subToneCls}`}>
              {subText}
            </span>
          )}
        </span>
      </label>
    );
  }
}
