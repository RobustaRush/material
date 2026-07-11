import { Component, Element, Event, EventEmitter, Method, Prop, Watch, h, Host } from '@stencil/core';

// MD3 Expressive navigation item — shared by navigation-rail (collapsed/expanded)
// and (future) navigation-bar / navigation-drawer. Anatomy is identical across
// these parents; only the layout (vertical vs horizontal) and active-indicator
// dimensions change, driven by `variant`.
//
// Sizing per spec:
//   rail-collapsed : 96dp container, 56×32 indicator hugging icon, label below
//   rail-expanded  : 220–360dp container, 56dp full-width row, icon+label inline
//   bar            : same vertical anatomy as rail-collapsed (nav-bar, compact)
//   bar-horizontal : 40dp pill wrapping icon+label inline (nav-bar, medium)

export type MaterialNavigationItemVariant =
  | 'rail-collapsed'
  | 'rail-expanded'
  | 'bar'
  | 'bar-horizontal';

@Component({
  tag: 'material-navigation-item',
  styleUrl: 'material-navigation-item.css',
  shadow: true,
})
export class MaterialNavigationItem {
  @Element() el!: HTMLElement;

  /** Material Symbols glyph. Optional — sub-items inside
   *  material-navigation-group typically render label-only. */
  @Prop() icon?: string;
  @Prop() activeIcon?: string;
  @Prop() label!: string;
  @Prop() href?: string;
  @Prop() value?: string;
  @Prop({ reflect: true, mutable: true }) active = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) variant: MaterialNavigationItemVariant = 'rail-collapsed';
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialSelect!: EventEmitter<{ value?: string }>;

  // True after the first runtime variant switch — gates the morph-in
  // animation so items don't animate on initial page render.
  private variantChanged = false;

  @Watch('variant')
  onVariantChange(newValue: string, oldValue: string) {
    if (oldValue !== undefined && newValue !== oldValue) this.variantChanged = true;
  }

  private morphClass() {
    return this.variantChanged ? ' morph-in' : '';
  }

  /** Focus the inner button/link — used by the rail's arrow-key navigation. */
  @Method()
  async setFocus(): Promise<void> {
    this.el.shadowRoot?.querySelector<HTMLElement>('a, button')?.focus();
  }

  private handleClick = (e: MouseEvent) => {
    if (this.disabled) {
      e.preventDefault();
      return;
    }
    this.materialSelect.emit({ value: this.value });
  };

  // Material Symbols are loaded with FILL@0; toggle FILL=1 inline for active.
  // Falls back to a separate `activeIcon` glyph name when one is provided.
  private iconStyle() {
    if (this.active && !this.activeIcon) {
      return { fontVariationSettings: '"FILL" 1' };
    }
    return {};
  }

  private iconName() {
    return this.active && this.activeIcon ? this.activeIcon : this.icon;
  }

  // MD3 state layer (8% / 10% / 10%) — hover/focus-visible/active opacity is
  // driven from the root <a>/<button> via CSS descendant selectors (`.root:hover
  // .state-layer` etc. — see the .css file). Lives inside the indicator
  // container so the layer morphs with the pill shape. `pill` variants have no
  // overflow-hidden of their own (it would clip the badge), so their state
  // layer needs its own border-radius.
  private stateLayer(pill = false) {
    return (
      <span class={pill ? 'state-layer pill' : 'state-layer'} aria-hidden="true" />
    );
  }

  private renderCollapsed() {
    // Badge slot lives OUTSIDE the indicator's overflow-hidden box; the wrapper
    // hugs the indicator so anchoring stays at the indicator's top-trailing edge.
    // Keyed so variant switches replace the subtree instead of patching it —
    // patched reuse makes transition-* classes animate from the old element's
    // computed values (visible dark flash on the state layer).
    return (
      <span key="collapsed" class={'item-collapsed' + this.morphClass()}>
        <span class="badge-anchor">
          <span class="indicator">
            {this.stateLayer()}
            {this.iconName() && (
              <span class="icon" style={this.iconStyle()} aria-hidden="true">
                {this.iconName()}
              </span>
            )}
          </span>
          <span class="badge-slot">
            <slot name="badge" />
          </span>
        </span>
        <span class="label-collapsed">{this.label}</span>
      </span>
    );
  }

  private renderExpanded() {
    // Leading padding sits on the row, not the icon: .material-symbols forces
    // `direction: ltr` (icon-font ligatures), so padding-inline-start on the
    // icon itself resolves as LEFT padding even in RTL context.
    return (
      <span key="expanded" class={'item-expanded' + this.morphClass()}>
        {this.stateLayer()}
        {this.iconName() && (
          <span class="icon" style={this.iconStyle()} aria-hidden="true">
            {this.iconName()}
          </span>
        )}
        <span class={this.iconName() ? 'label-expanded with-icon' : 'label-expanded'}>
          {this.label}
        </span>
        <span class="badge-trailing">
          <slot name="badge" />
        </span>
      </span>
    );
  }

  // Nav-bar horizontal item (medium windows): 40dp pill indicator wrapping
  // icon + label inline. Badge overlaps the icon's top-trailing corner per
  // spec; the state layer carries its own radius so the pill needs no
  // overflow-hidden that would clip the badge.
  private renderBarHorizontal() {
    return (
      <span key="bar-horizontal" class={'item-bar-horizontal' + this.morphClass()}>
        <span class="pill">
          {this.stateLayer(true)}
          <span class="badge-anchor">
            {this.iconName() && (
              <span class="icon" style={this.iconStyle()} aria-hidden="true">
                {this.iconName()}
              </span>
            )}
            <span class="badge-slot flush">
              <slot name="badge" />
            </span>
          </span>
          <span class={this.iconName() ? 'label-pill with-icon' : 'label-pill'}>
            {this.label}
          </span>
        </span>
      </span>
    );
  }

  render() {
    const isLink = !!this.href && !this.disabled;
    const Tag: any = isLink ? 'a' : 'button';

    const props: Record<string, unknown> = {
      class: 'root',
      'aria-label': this.ariaLabel ?? this.label,
      'aria-current': this.active ? 'page' : undefined,
      onClick: this.handleClick,
    };
    if (isLink) {
      props.href = this.href;
    } else {
      props.type = 'button';
      props.disabled = this.disabled;
    }

    const body =
      this.variant === 'rail-expanded' ? this.renderExpanded()
      : this.variant === 'bar-horizontal' ? this.renderBarHorizontal()
      : this.renderCollapsed();

    return <Host>{h(Tag, props, body)}</Host>;
  }
}
