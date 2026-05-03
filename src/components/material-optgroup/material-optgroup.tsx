import { Component, Element, Host, Prop, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// Non-interactive grouping wrapper for `material-option` children inside
// `material-select`. Renders a small-caps section header above its options.

@Component({
  tag: 'material-optgroup',
  styleUrl: 'material-optgroup.css',
  shadow: true,
})
export class MaterialOptgroup {
  @Element() el!: HTMLElement;

  @Prop() label = '';

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  render() {
    return (
      <Host role="group" aria-label={this.label}>
        {this.label && (
          <div
            class="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-on-surface-variant select-none"
            aria-hidden="true"
          >
            {this.label}
          </div>
        )}
        <slot />
      </Host>
    );
  }
}
