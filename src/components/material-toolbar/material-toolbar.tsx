import { Component, Host, Prop, h } from '@stencil/core';

export type MaterialToolbarVariant = 'docked' | 'floating';
export type MaterialToolbarColor = 'standard' | 'vibrant';
export type MaterialToolbarOrientation = 'horizontal' | 'vertical';

@Component({
  tag: 'material-toolbar',
  styleUrl: 'material-toolbar.css',
  shadow: true,
})
export class MaterialToolbar {
  @Prop({ reflect: true }) variant: MaterialToolbarVariant = 'docked';
  @Prop({ reflect: true }) color: MaterialToolbarColor = 'standard';
  @Prop({ reflect: true }) orientation: MaterialToolbarOrientation = 'horizontal';

  render() {
    return (
      <Host role="toolbar">
        <div part="container">
          <slot />
        </div>
      </Host>
    );
  }
}
