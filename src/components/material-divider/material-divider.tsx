import { Component, Host, Prop, h } from '@stencil/core';

// MD3 divider — 1dp line in `outline-variant`, used to group content.
// Spec: docs/wiki/specs/google-material/divider/specs.md
//
//   inset="none"   → full-width (default)
//   inset="inset"  → 16dp leading indent (anchors to icons/avatars)
//   inset="middle" → 16dp indent on both sides
//   orientation="vertical" → 1dp vertical line, stretches to parent height

export type DividerInset = 'none' | 'inset' | 'middle';
export type DividerOrientation = 'horizontal' | 'vertical';

@Component({
  tag: 'material-divider',
  styleUrl: 'material-divider.css',
  shadow: true,
})
export class MaterialDivider {
  @Prop({ reflect: true }) inset: DividerInset = 'none';
  @Prop({ reflect: true }) orientation: DividerOrientation = 'horizontal';

  render() {
    const vertical = this.orientation === 'vertical';

    return (
      <Host
        role="separator"
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
      >
        <span class="line" aria-hidden="true"></span>
      </Host>
    );
  }
}
