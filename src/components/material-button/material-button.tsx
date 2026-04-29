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
      <button class="rounded-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition">
        {this.label}
      </button>
    );
  }
}
