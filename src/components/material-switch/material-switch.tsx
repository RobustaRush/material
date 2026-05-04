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

@Component({
  tag: 'material-switch',
  styleUrl: 'material-switch.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialSwitch {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ mutable: true, reflect: true }) checked = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) readonly = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true }) error = false;

  @Prop() name?: string;
  @Prop() value = 'on';

  @Prop() label?: string;
  @Prop() helpText?: string;
  @Prop() errorText?: string;

  @Prop({ reflect: true }) icon?: string;
  @Prop({ reflect: true, attribute: 'icon-unchecked' }) iconUnchecked?: string;

  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() checkedChange!: EventEmitter<{ checked: boolean }>;

  private defaultChecked = false;

  componentWillLoad() {
    this.defaultChecked = this.checked;
  }

  connectedCallback() {
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('checked')
  @Watch('value')
  @Watch('name')
  syncFormValue() {
    this.internals.setFormValue(this.checked ? this.value : null);
    this.internals.ariaChecked = String(this.checked);
  }

  @Watch('required')
  @Watch('checked')
  @Watch('error')
  @Watch('errorText')
  syncValidity() {
    if (this.error) {
      this.internals.setValidity(
        { customError: true },
        this.errorText || 'Invalid',
      );
    } else if (this.required && !this.checked) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please turn on this switch.',
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
  }

  formStateRestoreCallback(state: string | null) {
    this.checked = state === this.value;
  }

  private toggle = () => {
    if (this.disabled || this.readonly) return;
    this.checked = !this.checked;
    this.checkedChange.emit({ checked: this.checked });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggle();
    }
  };

  render() {
    const subText = this.error ? this.errorText : this.helpText;
    const subId = subText ? 'sub' : undefined;
    const labelId = this.label ? 'label' : undefined;
    const iconShown = this.checked ? this.icon : this.iconUnchecked;

    const button = (
      <button
        part="switch"
        type="button"
        role="switch"
        class="switch"
        aria-checked={String(this.checked)}
        aria-label={this.ariaLabel ?? (this.label ? undefined : 'switch')}
        aria-labelledby={!this.ariaLabel && labelId ? labelId : undefined}
        aria-required={this.required ? 'true' : null}
        aria-invalid={this.error ? 'true' : null}
        aria-readonly={this.readonly ? 'true' : null}
        aria-describedby={subId}
        disabled={this.disabled}
        onClick={this.toggle}
        onKeyDown={this.handleKeyDown}
      >
        <span class="track" aria-hidden="true">
          <span class="state-layer"></span>
          <span class="handle">
            {iconShown && <span class="icon">{iconShown}</span>}
          </span>
        </span>
      </button>
    );

    if (!this.label && !subText) {
      return <div class="root">{button}</div>;
    }

    return (
      <div class="root has-text">
        <div class="text-col">
          {this.label && (
            <span id={labelId} part="label" class="label">
              {this.label}
              {this.required && <span class="required-mark" aria-hidden="true">*</span>}
            </span>
          )}
          {subText && (
            <div
              id={subId}
              part={this.error ? 'error-text' : 'help-text'}
              class={{ subtext: true, error: this.error }}
            >
              {subText}
            </div>
          )}
        </div>
        {button}
      </div>
    );
  }
}
