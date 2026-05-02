import { Component, Element, Host, Prop, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 Badge — notification / count indicator anchored to a host icon.
// Spec: docs/wiki/specs/google-material/badges/specs.md
//
//   value absent / empty → small dot (6×6dp, 3dp radius), `aria-hidden`
//   value present        → large pill (16dp tall, 8dp radius, expands width)
//
// The component renders only the visual; positioning is owned by the host's
// `<slot name="badge">` wrapper (see material-icon-button, material-navigation-item).
// Caller is responsible for clamping `value` to four characters per MD3 — the
// component does not interpret or truncate the string.
//
// For ad-hoc use on a custom icon, wrap in a positioned ancestor:
//
//   <span class="relative inline-flex">
//     <span class="material-symbols">mail</span>
//     <span class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
//       <material-badge value="3"></material-badge>
//     </span>
//   </span>

export type MaterialBadgeColor = 'error' | 'primary' | 'tertiary';

const COLORS: Record<MaterialBadgeColor, string> = {
  error: 'bg-error text-on-error',
  primary: 'bg-primary text-on-primary',
  tertiary: 'bg-tertiary text-on-tertiary',
};

@Component({
  tag: 'material-badge',
  styleUrl: 'material-badge.css',
  shadow: true,
})
export class MaterialBadge {
  @Element() el!: HTMLElement;

  @Prop() value?: string;
  @Prop({ reflect: true }) color: MaterialBadgeColor = 'error';

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  render() {
    const isLarge = this.value != null && this.value !== '';
    const colorCls = COLORS[this.color];

    if (!isLarge) {
      return (
        <Host>
          <span
            class={`inline-block w-[6px] h-[6px] rounded-[3px] ${colorCls}`}
            aria-hidden="true"
          ></span>
        </Host>
      );
    }

    return (
      <Host>
        <span
          class={
            'inline-flex items-center justify-center min-w-4 h-4 rounded-[8px] px-1 ' +
            `text-[11px] leading-4 tracking-[0.5px] font-medium ${colorCls}`
          }
        >
          {this.value}
        </span>
      </Host>
    );
  }
}
