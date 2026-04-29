import { Component, Element, Prop, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

@Component({
  tag: 'material-button',
  shadow: true,
})
export class MaterialButton {
  @Element() el!: HTMLElement;

  @Prop() label = 'Button';

  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
  }

  render() {
    return (
      <button class="rounded-full px-6 py-2.5 bg-primary text-on-primary hover:opacity-90 transition">
        {this.label}
      </button>
    );
  }
}
