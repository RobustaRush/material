import { Component, Element, Event, EventEmitter, Method, Prop, h, Host } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 Expressive navigation item — shared by navigation-rail (collapsed/expanded)
// and (future) navigation-bar / navigation-drawer. Anatomy is identical across
// these parents; only the layout (vertical vs horizontal) and active-indicator
// dimensions change, driven by `variant`.
//
// Sizing per spec:
//   rail-collapsed : 96dp container, 56×32 indicator hugging icon, label below
//   rail-expanded  : 220–360dp container, 56dp full-width row, icon+label inline
//   bar            : same vertical anatomy as rail-collapsed (used by nav-bar)

export type MaterialNavigationItemVariant =
  | 'rail-collapsed'
  | 'rail-expanded'
  | 'bar';

@Component({
  tag: 'material-navigation-item',
  shadow: true,
})
export class MaterialNavigationItem {
  @Element() el!: HTMLElement;

  @Prop() icon!: string;
  @Prop() activeIcon?: string;
  @Prop() label!: string;
  @Prop() href?: string;
  @Prop() value?: string;
  @Prop({ reflect: true, mutable: true }) active = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) variant: MaterialNavigationItemVariant = 'rail-collapsed';
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialSelect!: EventEmitter<{ value?: string }>;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
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

  // MD3 state layer (8% / 10% / 10%) — rides the host button via `group/n:` modifiers
  // on the parent <a>/<button>. Lives inside the indicator container so the layer
  // morphs with the pill shape.
  private stateLayer() {
    return (
      <span
        class={
          'absolute inset-0 pointer-events-none bg-current opacity-0 transition-opacity ' +
          'group-hover/n:opacity-[0.08] group-focus-visible/n:opacity-[0.10] group-active/n:opacity-[0.10]'
        }
        aria-hidden="true"
      />
    );
  }

  private renderCollapsed() {
    const indicator = [
      'relative inline-flex items-center justify-center overflow-hidden',
      'w-14 h-8 rounded-full transition-colors',
      this.active
        ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-transparent text-on-surface-variant',
    ].join(' ');

    // Badge slot lives OUTSIDE the indicator's overflow-hidden box; the wrapper
    // hugs the indicator so anchoring stays at the indicator's top-trailing edge.
    // Keyed so variant switches replace the subtree instead of patching it —
    // patched reuse makes transition-* classes animate from the old element's
    // computed values (visible dark flash on the state layer).
    return (
      <span key="collapsed" class="flex flex-col items-center justify-center w-full py-2 gap-1">
        <span class="relative inline-flex">
          <span class={indicator}>
            {this.stateLayer()}
            <span
              class="material-symbols leading-none text-[1.5rem] relative"
              style={this.iconStyle()}
              aria-hidden="true"
            >
              {this.iconName()}
            </span>
          </span>
          <span class="absolute top-0 end-2 translate-x-1/2 rtl:-translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            <slot name="badge" />
          </span>
        </span>
        <span
          class={
            'text-xs leading-tight text-center px-1 ' +
            (this.active
              ? 'text-secondary font-medium'
              : 'text-on-surface-variant')
          }
        >
          {this.label}
        </span>
      </span>
    );
  }

  private renderExpanded() {
    // Leading padding sits on the row, not the icon: .material-symbols forces
    // `direction: ltr` (icon-font ligatures), so padding-inline-start on the
    // icon itself resolves as LEFT padding even in RTL context.
    const row = [
      'relative flex items-center w-full h-14 overflow-hidden ps-4',
      'rounded-full transition-colors',
      this.active
        ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-transparent text-on-surface-variant',
    ].join(' ');

    return (
      <span key="expanded" class={row}>
        {this.stateLayer()}
        <span
          class="material-symbols leading-none text-[1.5rem] relative"
          style={this.iconStyle()}
          aria-hidden="true"
        >
          {this.iconName()}
        </span>
        <span
          class={
            'relative ms-3 text-sm truncate ' +
            // Active label inherits on-secondary-container from the pill row
            // (the container sets it); only the weight changes.
            (this.active ? 'font-medium' : '')
          }
        >
          {this.label}
        </span>
        <span class="relative ms-auto pe-4 flex items-center">
          <slot name="badge" />
        </span>
      </span>
    );
  }

  render() {
    const isLink = !!this.href && !this.disabled;
    const Tag: any = isLink ? 'a' : 'button';

    const root =
      'group/n block w-full bg-transparent border-0 p-0 m-0 text-start no-underline ' +
      'cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-[-2px] ' +
      'disabled:cursor-not-allowed disabled:opacity-40';

    const props: Record<string, unknown> = {
      class: root,
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
      this.variant === 'rail-expanded'
        ? this.renderExpanded()
        : this.renderCollapsed();

    return <Host>{h(Tag, props, body)}</Host>;
  }
}
