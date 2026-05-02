import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 spec: icon 20dp / target 48dp / state-layer 40dp.
// Selection state, focus order and form value are owned by <material-radio-group>.
// This component renders the visual + emits a select intent on click/Space.
// The group sets `checked`, `tabindex`, `error`, `disabled` as a property.

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

const RING_BASE =
  '[grid-area:1/1] inline-flex items-center justify-center ' +
  'w-5 h-5 rounded-full border-2 box-border transition-colors';

const RING_OFF = 'border-on-surface-variant';
const RING_ON = 'border-primary';
const RING_ERR = 'border-error';

@Component({
  tag: 'material-radio',
  shadow: true,
})
export class MaterialRadio {
  @Element() el!: HTMLElement;

  @Prop({ mutable: true, reflect: true }) checked = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop() value!: string;
  @Prop() label?: string;
  @Prop({ attribute: 'label-position' }) labelPosition: 'trailing' | 'leading' = 'trailing';
  @Prop({ reflect: true }) error = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event({ bubbles: true, composed: true })
  radioSelect!: EventEmitter<{ value: string }>;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  private select = () => {
    if (this.disabled || this.checked) return;
    this.radioSelect.emit({ value: this.value });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      this.select();
    }
  };

  render() {
    const isOn = this.checked;
    const inError = this.error;

    const stateLayerCls = inError
      ? STATE_LAYER_ERR
      : isOn
      ? STATE_LAYER_ON
      : STATE_LAYER_OFF;

    const ringCls = inError ? RING_ERR : isOn ? RING_ON : RING_OFF;
    const dotCls = inError ? 'bg-error' : 'bg-primary';

    const button = (
      <button
        type="button"
        role="radio"
        class={TARGET_BASE}
        disabled={this.disabled}
        aria-checked={String(isOn)}
        aria-label={this.ariaLabel ?? (this.label ? undefined : 'radio')}
        onClick={this.select}
        onKeyDown={this.handleKeyDown}
      >
        <span class={`${STATE_LAYER_BASE} ${stateLayerCls}`} aria-hidden="true"></span>
        <span class={`${RING_BASE} ${ringCls}`}>
          {isOn && (
            <span class={`w-2.5 h-2.5 rounded-full ${dotCls}`} aria-hidden="true"></span>
          )}
        </span>
      </button>
    );

    if (!this.label) return button;

    // items-start + mt-3 mirrors material-checkbox: 48dp target anchors to the
    // top of the row, the primary label drops 12px so its first line vertically
    // centers against the 20dp ring.
    const reverse = this.labelPosition === 'leading' ? 'flex-row-reverse' : '';
    return (
      <label class={`inline-flex items-start gap-2 select-none cursor-pointer ${reverse}`}>
        {button}
        <span class="mt-3 leading-6 text-base text-on-surface">{this.label}</span>
      </label>
    );
  }
}
