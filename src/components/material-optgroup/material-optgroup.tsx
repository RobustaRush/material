import { Component, Host, Prop, h } from '@stencil/core';

// Non-interactive grouping wrapper for `material-option` children inside
// `material-select`. Renders a small-caps section header above its options.

@Component({
  tag: 'material-optgroup',
  styleUrl: 'material-optgroup.css',
  shadow: true,
})
export class MaterialOptgroup {
  @Prop() label = '';

  render() {
    return (
      <Host role="group" aria-label={this.label}>
        {this.label && (
          <div class="label" aria-hidden="true">
            {this.label}
          </div>
        )}
        <slot />
      </Host>
    );
  }
}
