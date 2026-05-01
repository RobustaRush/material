import { Component, Element, Prop, Watch, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 Expressive navigation rail — collapsed (96dp) and expanded (220–360dp)
// variants in a single component. Items are slotted (<material-navigation-item>);
// the rail propagates its `expanded` state to each slotted item by setting
// their `variant` prop, so item layout switches between vertical and horizontal.
//
// Spec: docs/wiki/specs/google-material/navigation-rail/specs.md
//
// Out of scope (see plan): motion-переходы collapsed↔expanded, predictive back,
// expandable group sub-items (idea-expandable-tree-nav.md).

export type MaterialNavigationRailAlignment = 'top' | 'center';
export type MaterialNavigationRailModality = 'standard' | 'modal';

@Component({
  tag: 'material-navigation-rail',
  shadow: true,
})
export class MaterialNavigationRail {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true, mutable: true }) expanded = false;
  @Prop() alignment: MaterialNavigationRailAlignment = 'top';
  @Prop() modality: MaterialNavigationRailModality = 'standard';
  @Prop({ reflect: true }) hideOnCollapse = false;

  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
    this.syncItems();
  }

  @Watch('expanded')
  syncItems() {
    const variant = this.expanded ? 'rail-expanded' : 'rail-collapsed';
    this.el
      .querySelectorAll('material-navigation-item')
      .forEach((it) => {
        (it as HTMLElement & { variant: string }).variant = variant;
      });
  }

  private handleSlotChange = () => this.syncItems();

  // Slotted children in `menu` toggle the rail by default — that's the menu
  // button's whole purpose per MD3. Opt out with `data-no-rail-toggle` on the
  // slotted element if you want to drive `expanded` yourself.
  private handleMenuClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-no-rail-toggle]')) return;
    this.expanded = !this.expanded;
  };

  render() {
    const hidden = this.hideOnCollapse && !this.expanded;
    if (hidden) return null;

    // Collapsed = 96dp; Expanded = 220dp (lower bound of 220–360 spec range).
    const width = this.expanded ? 'w-[220px]' : 'w-24';

    const itemsAlign =
      this.alignment === 'center' ? 'justify-center' : 'justify-start';

    // Items area uses px-2 (8dp) so the indicator pill (56dp) fits centered
    // inside a 96dp rail (96 - 16 = 80, indicator 56dp leaves 12dp/side gutter).
    return (
      <nav
        class={
          `${width} h-full bg-surface text-on-surface flex flex-col py-2 ` +
          'transition-[width] duration-200 ease-out'
        }
        aria-label="Primary"
      >
        <div class="flex flex-col items-center gap-2 px-2">
          <div onClick={this.handleMenuClick} class="contents">
            <slot name="menu" />
          </div>
          <slot name="fab" />
        </div>

        <div class={`flex-1 flex flex-col gap-1 px-2 mt-3 ${itemsAlign}`}>
          <slot onSlotchange={this.handleSlotChange} />
        </div>

        <div class="flex flex-col gap-1 px-2">
          <slot name="bottom" onSlotchange={this.handleSlotChange} />
        </div>
      </nav>
    );
  }
}
