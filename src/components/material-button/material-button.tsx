import { Component, Element, Prop, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

export type MaterialButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text';

const VARIANT_CLASSES: Record<MaterialButtonVariant, string> = {
  filled: 'bg-primary text-on-primary hover:opacity-90',
  tonal: 'bg-secondary-container text-on-secondary-container hover:opacity-90',
  elevated: 'bg-surface-container-low text-primary shadow hover:shadow-md',
  outlined: 'text-on-surface-variant border border-outline-variant hover:bg-primary/5',
  text: 'text-primary hover:bg-primary/10',
};

@Component({
  tag: 'material-button',
  shadow: true,
})
export class MaterialButton {
  @Element() el!: HTMLElement;

  @Prop() label = 'Button';
  @Prop() variant: MaterialButtonVariant = 'filled';
  @Prop() disabled = false;

  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
  }

  render() {
    const base =
      'rounded-full px-6 py-2.5 text-sm font-medium transition ' +
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40';
    return (
      <button class={`${base} ${VARIANT_CLASSES[this.variant]}`} disabled={this.disabled}>
        {this.label}
      </button>
    );
  }
}
