import { Component, Element, Event, EventEmitter, Host, Prop, h } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 tab — child of <material-tabs>. The parent owns selection coordination,
// keyboard nav, and roving tabindex; this component renders the visual tab cell
// and emits `materialTabActivate` when clicked or activated via Space/Enter.
//
// Anatomy per spec (docs/wiki/specs/google-material/tabs/specs.md):
//   - Container heights: 48dp (label only) / 64dp (icon + label, stacked)
//   - Icon size 24dp; label 14pt / 20pt line / weight 500 / tracking 0.1pt
//   - Primary indicator: 3dp tall, 3px top-rounded, hugs label width, min 24dp,
//     inset 2dp each side
//   - Secondary indicator: 2dp tall, full tab-cell width, no rounding
//   - Badge: anchored at icon top-trailing (6dp overlap when icon present),
//     or trailing the label (4dp gap when label-only)

export type MaterialTabVariant = 'primary' | 'secondary';

@Component({
  tag: 'material-tab',
  styleUrl: 'material-tab.css',
  shadow: true,
})
export class MaterialTab {
  @Element() el!: HTMLElement;

  @Prop() label!: string;
  @Prop() icon?: string;
  @Prop() value?: string;
  @Prop() href?: string;
  @Prop({ reflect: true, mutable: true }) selected = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true, mutable: true }) variant: MaterialTabVariant = 'primary';
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  /** Internal — set by parent for roving tabindex. */
  @Prop({ mutable: true }) tabbable = false;

  /** Internal: parent listens to coordinate selection. */
  @Event({ bubbles: true, composed: true })
  materialTabActivate!: EventEmitter<{ value?: string }>;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  private activate = () => {
    if (this.disabled) return;
    this.materialTabActivate.emit({ value: this.value });
  };

  private handleClick = (e: MouseEvent) => {
    if (this.disabled) {
      e.preventDefault();
      return;
    }
    this.activate();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      // Anchor: let the browser fire its native click for Enter (handles href);
      // for Space we need to invoke click ourselves since <a> doesn't bind it.
      if (this.href) {
        if (e.key === ' ') {
          e.preventDefault();
          (this.el.shadowRoot?.querySelector('a') as HTMLAnchorElement | null)?.click();
        }
        return;
      }
      e.preventDefault();
      this.activate();
    }
  };

  // Material Symbols stack uses FILL@0 by default; toggle FILL=1 inline when
  // selected (same trick as material-navigation-item).
  private iconStyle() {
    return this.selected ? { fontVariationSettings: '"FILL" 1' } : {};
  }

  render() {
    const isPrimary = this.variant === 'primary';
    const hasIcon = !!this.icon;

    // Cell padding: per token tables, content sits in vertical center; the
    // 48dp / 64dp container heights drive layout. State-layer is rectangular,
    // so no overflow-hidden / rounding-clip concerns.
    const cellHeight = hasIcon ? 'h-16' : 'h-12';

    // Active label/icon color:
    //   primary  selected → text-primary
    //   secondary selected → text-on-surface
    //   either   inactive → text-on-surface-variant
    const activeColor = isPrimary ? 'text-primary' : 'text-on-surface';
    const colorCls = this.selected ? activeColor : 'text-on-surface-variant';

    const stateLayer =
      'absolute inset-0 pointer-events-none bg-current opacity-0 transition-opacity ' +
      'group-hover/t:opacity-[0.08] group-focus-visible/t:opacity-[0.10] group-active/t:opacity-[0.10]';

    const focusRing =
      'focus:outline-none focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-[-3px]';

    const root =
      `group/t relative flex items-center justify-center w-full ${cellHeight} px-4 ` +
      `bg-transparent border-0 m-0 cursor-pointer no-underline select-none ` +
      `transition-colors ${colorCls} ${focusRing} ` +
      `disabled:cursor-not-allowed disabled:opacity-40`;

    // Inner content stack hugs the label/icon column horizontally so the
    // primary indicator can be anchored to its width (min 24dp, inset 2dp
    // each side). It stretches to full cell height (`h-full`) so the
    // indicator at `bottom-0` sits at the bottom of the tab cell, just above
    // the divider — not flush against the label baseline.
    const stackCls = hasIcon
      ? 'relative inline-flex flex-col items-center justify-center gap-1 h-full'
      : 'relative inline-flex items-center justify-center gap-1 h-full';

    // Active indicator:
    //   primary   → 3dp tall, 3px top-rounded, full width of stack (which already
    //               hugs label/icon), min-w-[24px], inset 2dp from each side via
    //               left-0.5 right-0.5 (negative bottom keeps it above the divider).
    //   secondary → 2dp tall, full tab-cell width (rendered outside the stack).
    const primaryIndicator = (
      <span
        class={
          'absolute -bottom-px left-0.5 right-0.5 h-[3px] min-w-[24px] ' +
          'rounded-t-[3px] bg-primary'
        }
        aria-hidden="true"
      />
    );

    const secondaryIndicator = (
      <span
        class="absolute -bottom-px inset-x-0 h-[2px] bg-primary"
        aria-hidden="true"
      />
    );

    // Badge anchor: when icon is present, hug the icon glyph and overlap by 6dp
    // (translate-y-1/2 puts the badge's center on the icon's top edge; -mr-1.5
    // gives the 6dp overlap toward the trailing edge). When label-only, the
    // badge sits inline as a sibling of the label with a 4dp (gap-1) gap.
    const iconAndBadge = hasIcon ? (
      <span class="relative inline-flex">
        <span
          class="material-symbols leading-none text-[24px]"
          style={this.iconStyle()}
          aria-hidden="true"
        >
          {this.icon}
        </span>
        <span class="absolute top-0 right-0 -translate-y-1/2 translate-x-[6px] pointer-events-none z-10">
          <slot name="badge" />
        </span>
      </span>
    ) : null;

    const labelCls =
      'text-sm font-medium tracking-[0.1px] leading-5 whitespace-nowrap';

    const inner = (
      <span class={stackCls}>
        {iconAndBadge}
        {hasIcon ? (
          <span class={labelCls}>{this.label}</span>
        ) : (
          <span class="inline-flex items-center gap-1">
            <span class={labelCls}>{this.label}</span>
            <slot name="badge" />
          </span>
        )}
        {this.selected && isPrimary ? primaryIndicator : null}
      </span>
    );

    const body = [
      <span class={stateLayer} aria-hidden="true"></span>,
      inner,
      this.selected && !isPrimary ? secondaryIndicator : null,
    ];

    const isLink = !!this.href && !this.disabled;
    const Tag: any = isLink ? 'a' : 'button';

    const props: Record<string, unknown> = {
      class: root,
      role: 'tab',
      'aria-selected': this.selected ? 'true' : 'false',
      'aria-disabled': this.disabled ? 'true' : null,
      'aria-label': this.ariaLabel,
      tabindex: this.tabbable && !this.disabled ? 0 : -1,
      onClick: this.handleClick,
      onKeyDown: this.handleKeyDown,
    };
    if (isLink) {
      props.href = this.href;
    } else {
      props.type = 'button';
      props.disabled = this.disabled;
    }

    return <Host>{h(Tag, props, body)}</Host>;
  }
}
