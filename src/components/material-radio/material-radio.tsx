import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  h,
} from '@stencil/core';

// MD3 spec: icon 20dp / target 48dp / state-layer 40dp.
// Selection state, focus order and form value are owned by <material-radio-group>.
// This component renders the visual + emits a select intent on click/Space.
// The group sets `checked`, `tabindex`, `error`, `disabled` as a property.

@Component({
  tag: 'material-radio',
  styleUrl: 'material-radio.css',
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
  /** Roving-tabindex slot, driven by material-radio-group. When false the
   *  inner button leaves the tab order (tabindex -1). Reactive, so it applies
   *  on the next render rather than requiring shadow-DOM access. */
  @Prop() focusable = true;
  /** Group-level disable, driven by material-radio-group. Kept separate from
   *  the per-radio `disabled` so toggling the group off doesn't erase an
   *  individually-disabled radio's state. */
  @Prop({ reflect: true, attribute: 'group-disabled' }) groupDisabled = false;

  @Event({ bubbles: true, composed: true })
  radioSelect!: EventEmitter<{ value: string }>;

  private select = () => {
    if (this.disabled || this.groupDisabled || this.checked) return;
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

    const stateLayerCls = inError ? 'state-layer err' : isOn ? 'state-layer on' : 'state-layer off';
    const ringCls = inError ? 'ring err' : isOn ? 'ring on' : 'ring off';
    const dotColorCls = inError ? 'error' : 'primary';

    const button = (
      <button
        type="button"
        role="radio"
        class="target"
        disabled={this.disabled || this.groupDisabled}
        tabindex={this.focusable ? 0 : -1}
        aria-checked={String(isOn)}
        aria-label={this.ariaLabel ?? (this.label ? undefined : 'radio')}
        onClick={this.select}
        onKeyDown={this.handleKeyDown}
      >
        <span class={stateLayerCls} aria-hidden="true"></span>
        <span class={ringCls}>
          {/* Always rendered so the dot can scale in — a conditionally rendered
              dot can't transition. 200ms standard easing per MD3 selection-control motion. */}
          <span
            class={`dot ${dotColorCls} ${isOn ? 'on' : ''}`}
            aria-hidden="true"
          ></span>
        </span>
      </button>
    );

    if (!this.label) return button;

    // items-start + mt-3 mirrors material-checkbox: 48dp target anchors to the
    // top of the row, the primary label drops 12px so its first line vertically
    // centers against the 20dp ring.
    const reverse = this.labelPosition === 'leading' ? 'row reverse' : 'row';
    return (
      <label class={reverse}>
        {button}
        <span class="label">{this.label}</span>
      </label>
    );
  }
}
