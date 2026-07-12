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

// MD3 spec: container 18dp / corner 2dp / icon 18dp / target 48dp / state-layer 40dp.
// The button is a 1×1 inline-grid; the 40px state-layer and 18px box share the
// single cell so both auto-center without absolute positioning. State-layer
// opacities follow the spec's 8% (hover) / 10% (focus, pressed) tokens.

@Component({
  tag: 'material-checkbox',
  styleUrl: 'material-checkbox.css',
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
  /** Visual-only mode for composed widgets (a selectable list row): the inner
   *  button leaves the tab order — the enclosing widget drives the state and
   *  carries the semantics (aria-selected on the option). Still posts with
   *  the form. Set by material-list-item, rarely by hand. */
  @Prop({ reflect: true }) nested = false;

  @Event() checkedChange!: EventEmitter<{ checked: boolean; indeterminate: boolean }>;

  // Captured once before first render — reflected props rewrite the live
  // attributes after every toggle, so `hasAttribute('checked')` can't tell us
  // the form-default state at reset time.
  private defaultChecked = false;
  private defaultIndeterminate = false;

  componentWillLoad() {
    this.defaultChecked = this.checked;
    this.defaultIndeterminate = this.indeterminate;
  }

  connectedCallback() {
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('checked')
  @Watch('indeterminate')
  @Watch('value')
  syncFormValue() {
    this.internals.setFormValue(this.checked && !this.indeterminate ? this.value : null);
    this.internals.ariaChecked = this.indeterminate ? 'mixed' : String(this.checked);
  }

  // A required checkbox is only satisfied when it submits a value — i.e. checked
  // and not indeterminate (a mixed box submits null, same as native).
  @Watch('required')
  @Watch('checked')
  @Watch('indeterminate')
  @Watch('error')
  @Watch('errorText')
  syncValidity() {
    if (this.error) {
      this.internals.setValidity(
        { customError: true },
        this.errorText || 'Invalid',
      );
    } else if (this.required && !(this.checked && !this.indeterminate)) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please check this box.',
      );
    } else {
      this.internals.setValidity({});
    }
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
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

    const stateLayerCls = inError ? 'state-layer err' : isOn ? 'state-layer on' : 'state-layer off';
    const boxCls = inError
      ? isOn ? 'box on-err' : 'box off-err'
      : isOn ? 'box on' : 'box off';

    // errorText replaces helpText when in error; either may be empty.
    // The id is referenced by aria-describedby only when text is present.
    const descId = 'description';
    const subText = inError ? this.errorText : this.helpText;

    const visuals = [
      <span class={stateLayerCls} aria-hidden="true"></span>,
      <span class={boxCls}>
        {/* Always rendered so the check can animate in — a conditionally
            rendered mark can't transition. Revealed left-to-right via
            clip-path at 200ms standard easing (MD3 selection-control motion). */}
        <span class={isOn ? 'mark revealed' : 'mark'} aria-hidden="true">
          {icon}
        </span>
      </span>,
    ];

    // nested: no widget at all — a focusable/role-bearing element inside a
    // composed widget (listbox option) is a nested-interactive violation even
    // with tabindex="-1". Pointer clicks still toggle; the enclosing widget
    // owns keyboard and semantics.
    const button = this.nested ? (
      <span class="target" aria-hidden="true" onClick={() => !this.disabled && this.toggle()}>
        {visuals}
      </span>
    ) : (
      <button
        type="button"
        role="checkbox"
        class="target"
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
        {visuals}
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
      <label class={this.disabled ? 'row disabled' : 'row'}>
        {button}
        <span class="text-col">
          <span id="label" class="primary-label">{this.label}</span>
          {subText && (
            <span id={descId} class={inError ? 'sub-text error' : 'sub-text normal'}>
              {subText}
            </span>
          )}
        </span>
      </label>
    );
  }
}
