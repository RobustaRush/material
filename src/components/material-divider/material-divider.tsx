import { Component, Element, Host, Prop, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

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
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) inset: DividerInset = 'none';
  @Prop({ reflect: true }) orientation: DividerOrientation = 'horizontal';

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  render() {
    const vertical = this.orientation === 'vertical';
    const cls = vertical
      ? 'block self-stretch w-px bg-outline-variant'
      : [
          'block h-px bg-outline-variant',
          this.inset === 'inset' ? 'ml-4' : '',
          this.inset === 'middle' ? 'mx-4' : '',
        ].join(' ');

    return (
      <Host
        role="separator"
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
      >
        <span class={cls} aria-hidden="true"></span>
      </Host>
    );
  }
}
