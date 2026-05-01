import { Component, Element, Prop, AttachInternals, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

export type MaterialButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text';
export type MaterialButtonType = 'submit' | 'reset' | 'button';
export type MaterialButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';

const VARIANTS: Record<MaterialButtonVariant, string> = {
  filled: 'bg-primary text-on-primary',
  tonal: 'bg-secondary-container text-on-secondary-container',
  elevated: 'bg-surface-container-low text-primary shadow disabled:shadow-none',
  outlined: 'border border-outline-variant text-on-surface-variant',
  text: 'text-primary',
};

// MD3 Expressive sizes — height/padding/label/icon per spec.
// Pressed radius per spec: xs/s 8dp, m 12dp, l/xl 16dp.
const SIZES: Record<MaterialButtonSize, { btn: string; icon: string; pressed: string }> = {
  xs: { btn: 'h-8 px-3 text-xs gap-1',           icon: 'text-[20px]', pressed: 'active:rounded-[8px]'  },
  s:  { btn: 'h-10 px-6 text-sm gap-2',          icon: 'text-[24px]', pressed: 'active:rounded-[8px]'  },
  m:  { btn: 'h-14 px-6 text-base gap-2',        icon: 'text-[24px]', pressed: 'active:rounded-[12px]' },
  l:  { btn: 'h-24 px-12 text-2xl gap-3',        icon: 'text-[32px]', pressed: 'active:rounded-[16px]' },
  xl: { btn: 'h-[136px] px-16 text-3xl gap-4',   icon: 'text-[40px]', pressed: 'active:rounded-[16px]' },
};

const BASE =
  'inline-flex items-center justify-center rounded-full font-medium transition ' +
  'focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2 ' +
  'disabled:opacity-40 disabled:pointer-events-none';

@Component({
  tag: 'material-button',
  styleUrl: 'material-button.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialButton {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() variant: MaterialButtonVariant = 'filled';
  @Prop() size: MaterialButtonSize = 's';
  @Prop() type: MaterialButtonType = 'button';
  @Prop({ reflect: true }) disabled = false;
  @Prop() shapeMorph = false;
  @Prop() label?: string;
  @Prop() icon?: string;
  @Prop() trailingIcon?: string;
  @Prop() name?: string;
  @Prop() value?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  private handleClick = () => {
    if (this.disabled) return;
    const form = this.internals.form;
    if (!form) return;
    if (this.type === 'submit') form.requestSubmit();
    else if (this.type === 'reset') form.reset();
  };

  private handlePointerDown = (e: PointerEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--ripple-x', `${e.clientX - rect.left}px`);
    btn.style.setProperty('--ripple-y', `${e.clientY - rect.top}px`);
  };

  render() {
    const size = SIZES[this.size];
    return (
      <button
        type={this.type}
        disabled={this.disabled}
        aria-label={this.ariaLabel}
        data-variant={this.variant}
        class={`${BASE} ${size.btn} ${VARIANTS[this.variant]} ${this.shapeMorph ? size.pressed : ''}`}
        onClick={this.handleClick}
        onPointerDown={this.handlePointerDown}
      >
        {this.icon && (
          <span class={`material-symbols ${size.icon}`} aria-hidden="true">
            {this.icon}
          </span>
        )}
        <slot>{this.label}</slot>
        {this.trailingIcon && (
          <span class={`material-symbols ${size.icon}`} aria-hidden="true">
            {this.trailingIcon}
          </span>
        )}
      </button>
    );
  }
}
