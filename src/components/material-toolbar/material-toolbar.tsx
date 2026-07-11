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
    // `aria-orientation` completes the toolbar role contract so AT announces the
    // arrow-key axis. A roving-tabindex focus contract is intentionally NOT
    // implemented here: toolbar children are arbitrary slotted controls
    // (material-button / material-icon-button / …) whose focusable inner element
    // lives in their own shadow root, so the toolbar cannot retabindex them to
    // create a single Tab stop the way a same-DOM roving toolbar would. Each
    // control therefore stays an independent Tab stop, which is a valid ARIA
    // fallback for a toolbar of composite widgets.
    return (
      <Host role="toolbar" aria-orientation={this.orientation}>
        <div part="container">
          <slot />
        </div>
      </Host>
    );
  }
}
