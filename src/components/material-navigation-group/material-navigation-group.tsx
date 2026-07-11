import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  Watch,
  h,
} from '@stencil/core';

// Expandable group for the navigation rail — an accordion of nested
// <material-navigation-item>s, patterned after the m3.material.io sidebar
// (docs/wiki/specs/google-material/navigation-rail/idea-expandable-tree-nav.md).
// Not an MD3-spec component; MD3 stops at static section headers.
//
// A11y follows the APG "disclosure navigation" pattern — button[aria-expanded]
// controlling a contained list — rather than a full ARIA tree: tree/treeitem
// roles would have to span three shadow boundaries (rail → group → item) and
// the flat-tree role composition is unreliable across browsers.
//
// In a collapsed rail the group renders like a collapsed item; activating it
// expands the parent rail and opens the group (sub-items have nowhere to go
// in a 96dp rail). With `storage-key` the open state survives reloads.

export type MaterialNavigationGroupVariant = 'rail-collapsed' | 'rail-expanded';

@Component({
  tag: 'material-navigation-group',
  styleUrl: 'material-navigation-group.css',
  shadow: true,
})
export class MaterialNavigationGroup {
  @Element() el!: HTMLElement;

  @Prop() icon?: string;
  @Prop() label!: string;

  /** Open (children visible) vs closed. */
  @Prop({ reflect: true, mutable: true }) open = false;

  /** Persist the open state in localStorage under
   *  `material-nav-group:<storage-key>`. */
  @Prop({ attribute: 'storage-key' }) storageKey?: string;

  /** Set by the parent rail, like material-navigation-item's variant. */
  @Prop({ reflect: true }) variant: MaterialNavigationGroupVariant = 'rail-expanded';

  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialGroupToggle!: EventEmitter<{ open: boolean }>;

  private variantChanged = false;

  componentWillLoad() {
    if (this.storageKey && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`material-nav-group:${this.storageKey}`);
      if (stored !== null) this.open = stored === '1';
    }
  }

  @Watch('open')
  onOpenChange() {
    if (this.storageKey && typeof localStorage !== 'undefined') {
      localStorage.setItem(
        `material-nav-group:${this.storageKey}`,
        this.open ? '1' : '0',
      );
    }
    this.materialGroupToggle.emit({ open: this.open });
  }

  @Watch('variant')
  onVariantChange(newValue: string, oldValue: string) {
    if (oldValue !== undefined && newValue !== oldValue) this.variantChanged = true;
  }

  /** Focus the header button — used by the rail's arrow-key navigation. */
  @Method()
  async setFocus(): Promise<void> {
    this.el.shadowRoot?.querySelector<HTMLElement>('button')?.focus();
  }

  private handleClick = () => {
    // A 96dp rail can't show sub-items: opening a group from the collapsed
    // state expands the parent rail alongside.
    if (this.variant === 'rail-collapsed') {
      this.el.closest('material-navigation-rail')?.expand();
      this.open = true;
      return;
    }
    this.open = !this.open;
  };

  private morphClass() {
    return this.variantChanged ? ' morph-in' : '';
  }

  private stateLayer() {
    return <span class="state-layer" aria-hidden="true" />;
  }

  // Same anatomy as a collapsed navigation item; the chevron is omitted —
  // activation always expands, so aria-expanded stays false until then.
  private renderCollapsed() {
    return (
      <button
        type="button"
        key="collapsed"
        class="root"
        aria-expanded="false"
        aria-label={this.ariaLabel ?? this.label}
        onClick={this.handleClick}
      >
        <span class={'item-collapsed' + this.morphClass()}>
          <span class="indicator">
            {this.stateLayer()}
            {this.icon && (
              <span class="icon" aria-hidden="true">
                {this.icon}
              </span>
            )}
          </span>
          <span class="label-collapsed">{this.label}</span>
        </span>
      </button>
    );
  }

  private renderExpanded() {
    return [
      <button
        type="button"
        key="expanded"
        class="root"
        aria-expanded={this.open ? 'true' : 'false'}
        aria-controls="group-items"
        aria-label={this.ariaLabel ?? this.label}
        onClick={this.handleClick}
      >
        <span class={'item-expanded' + this.morphClass()}>
          {this.stateLayer()}
          {this.icon && (
            <span class="icon" aria-hidden="true">
              {this.icon}
            </span>
          )}
          <span class={this.icon ? 'label-expanded with-icon' : 'label-expanded'}>
            {this.label}
          </span>
          <span class="chevron" aria-hidden="true">
            arrow_drop_down
          </span>
        </span>
      </button>,
      // Height animates via grid-template-rows 0fr→1fr; `inert` (not
      // visibility) keeps closed content unfocusable without hiding it
      // mid-animation.
      <div
        id="group-items"
        class="group-items"
        style={{ gridTemplateRows: this.open ? '1fr' : '0fr' }}
        inert={!this.open}
        aria-hidden={this.open ? undefined : 'true'}
      >
        <div class="group-items-inner">
          {/* Indent so a sub-item's label (own ps-4) starts under the header
              label: header = ps-4 + 24dp icon + ms-3 gap = 52dp text offset,
              children container adds the missing 36dp (52 − 16). */}
          <div class={this.icon ? 'group-children with-icon' : 'group-children'}>
            <slot />
          </div>
        </div>
      </div>,
    ];
  }

  render() {
    return (
      <Host>
        {this.variant === 'rail-expanded' ? this.renderExpanded() : this.renderCollapsed()}
      </Host>
    );
  }
}
