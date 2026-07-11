import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 radiogroup. Owns name/value/form-association and coordinates child
// <material-radio> elements via property assignment. ARIA Authoring Practices
// radiogroup pattern: roving tabindex (selected = 0, others = -1; if none
// selected, first enabled = 0); arrow keys move focus + selection; Home/End
// jump to first/last enabled; selection is immediate (no Space-to-commit).

type RadioEl = HTMLElement & {
  value: string;
  checked: boolean;
  disabled: boolean;
  groupDisabled: boolean;
  focusable: boolean;
  error: boolean;
};

@Component({
  tag: 'material-radio-group',
  shadow: true,
  formAssociated: true,
})
export class MaterialRadioGroup {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ mutable: true, reflect: true }) value?: string;
  @Prop() name?: string;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true }) error = false;
  @Prop() label?: string;
  @Prop({ attribute: 'help-text' }) helpText?: string;
  @Prop({ attribute: 'error-text' }) errorText?: string;
  @Prop({ reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';

  @Event() valueChange!: EventEmitter<{ value: string | undefined }>;

  // Captured pre-render: reflected `value` mirrors live state after every
  // change, so it can't tell us the form-default at reset time.
  private defaultValue?: string;
  private mo?: MutationObserver;

  componentWillLoad() {
    this.defaultValue = this.value;
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    this.syncChildren();
    this.syncFormValue();
    this.syncValidity();
    // Slot mutations (added/removed radios) → re-sync state.
    this.mo = new MutationObserver(() => this.syncChildren());
    this.mo.observe(this.el, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    this.mo?.disconnect();
    this.mo = undefined;
  }

  @Watch('value')
  @Watch('disabled')
  @Watch('error')
  syncChildren() {
    const radios = this.getRadios();
    const hasSelected = radios.some((r) => r.value === this.value);
    const firstIdx = this.firstFocusableIdx(radios);
    radios.forEach((r, i) => {
      r.checked = r.value === this.value;
      r.error = this.error;
      // Group disable is a separate prop so it doesn't clobber a per-radio
      // `disabled` — toggling the group back on restores the original state.
      r.groupDisabled = this.disabled;
      // Roving tabindex via a reactive prop (not shadow-DOM poking, which
      // ran before the child buttons existed and silently no-op'd).
      r.focusable = r.checked || (!hasSelected && firstIdx === i);
    });
  }

  @Watch('value')
  syncFormValue() {
    this.internals.setFormValue(this.value ?? null);
    this.internals.ariaRequired = this.required ? 'true' : null;
    this.internals.ariaInvalid = this.error ? 'true' : null;
  }

  @Watch('required')
  @Watch('value')
  @Watch('error')
  @Watch('errorText')
  syncValidity() {
    if (this.error) {
      this.internals.setValidity(
        { customError: true },
        this.errorText || 'Invalid',
      );
    } else if (this.required && !this.value) {
      this.internals.setValidity(
        { valueMissing: true },
        'Please select an option.',
      );
    } else {
      this.internals.setValidity({});
    }
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.value = this.defaultValue;
  }

  formStateRestoreCallback(state: string | null) {
    this.value = state ?? undefined;
  }

  private getRadios(): RadioEl[] {
    return Array.from(this.el.querySelectorAll<RadioEl>('material-radio'));
  }

  private firstFocusableIdx(radios: RadioEl[]): number {
    return radios.findIndex((r) => !r.disabled);
  }

  @Listen('radioSelect')
  handleSelect(e: CustomEvent<{ value: string }>) {
    if (this.disabled) return;
    const next = e.detail.value;
    if (next === this.value) return;
    this.value = next;
    this.valueChange.emit({ value: next });
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const radios = this.getRadios().filter((r) => !r.disabled);
    if (!radios.length) return;
    const active = document.activeElement as HTMLElement | null;
    const current = active?.closest('material-radio') as RadioEl | null;
    const idx = current ? radios.indexOf(current) : -1;
    let next = idx;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = idx < 0 ? 0 : (idx + 1) % radios.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = idx < 0 ? radios.length - 1 : (idx - 1 + radios.length) % radios.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = radios.length - 1;
        break;
    }
    e.preventDefault();
    const target = radios[next];
    this.value = target.value;
    this.valueChange.emit({ value: target.value });
    // Focus moves after sync so tabindex is already 0 on the target.
    requestAnimationFrame(() => {
      const btn = target.shadowRoot?.querySelector('button') as HTMLButtonElement | null;
      btn?.focus();
    });
  }

  render() {
    const inError = this.error;
    const subText = inError ? this.errorText : this.helpText;
    const subToneCls = inError ? 'text-error' : 'text-on-surface-variant';
    const subId = 'description';
    const labelId = 'group-label';

    const flexDir = this.orientation === 'horizontal' ? 'flex-row gap-4' : 'flex-col';

    return (
      <Host
        role="radiogroup"
        aria-orientation={this.orientation}
        aria-labelledby={this.label ? labelId : null}
        aria-describedby={subText ? subId : null}
      >
        {this.label && (
          <div id={labelId} class="mb-1 text-sm text-on-surface-variant">
            {this.label}
          </div>
        )}
        <div class={`flex ${flexDir}`}>
          <slot />
        </div>
        {subText && (
          <div id={subId} class={`mt-1 px-4 text-xs leading-4 ${subToneCls}`}>
            {subText}
          </div>
        )}
      </Host>
    );
  }
}
