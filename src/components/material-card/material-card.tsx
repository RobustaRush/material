import { Component, Element, Prop, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

export type MaterialCardVariant = 'elevated' | 'filled' | 'outlined';

const VARIANT_CLASSES: Record<MaterialCardVariant, string> = {
  elevated: 'bg-surface-container-low shadow',
  filled: 'bg-surface-container-highest',
  outlined: 'bg-surface border border-outline-variant',
};

@Component({
  tag: 'material-card',
  shadow: true,
})
export class MaterialCard {
  @Element() el!: HTMLElement;

  @Prop() variant: MaterialCardVariant = 'elevated';

  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
  }

  render() {
    return (
      <div class={`rounded-xl p-6 text-on-surface ${VARIANT_CLASSES[this.variant]}`}>
        <slot />
      </div>
    );
  }
}
