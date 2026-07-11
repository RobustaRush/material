import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';

// MD3 Expressive navigation rail — collapsed (96dp) and expanded (220–360dp)
// variants in a single component. Items are slotted (<material-navigation-item>);
// the rail propagates its `expanded` state to each slotted item by setting
// their `variant` prop, so item layout switches between vertical and horizontal.
//
// Spec: docs/wiki/specs/google-material/navigation-rail/specs.md
//
// Modality (spec "Expanded layout" configurations):
//   standard — rail sits in the page flow; expanding pushes content aside
//   modal    — expanded panel overlays content inside a native <dialog>
//              (top layer, ::backdrop scrim, focus trap, Esc — same approach
//              as material-dialog); the collapsed footprint stays in flow so
//              content never reflows
//   auto     — standard at/above `breakpoint`, hidden-when-collapsed + modal
//              below it (MD3 adaptive guidance for compact windows)
//
// The expanded width defaults to 220dp (13.75rem); tune it within the spec's
// 220–360dp range via `--material-rail-expanded-width` on the host.
//
// Section headers: slot any element with `data-section-header` between items —
// the rail shows it only while expanded (spec: 12dp top / 8dp bottom padding).
//
// Out of scope (see plan): collapsed↔expanded item morph motion, predictive
// back, expandable group sub-items (idea-expandable-tree-nav.md).

export type MaterialNavigationRailAlignment = 'top' | 'center';
export type MaterialNavigationRailModality = 'standard' | 'modal' | 'auto';
export type MaterialNavigationRailActivation = 'auto' | 'manual';

@Component({
  tag: 'material-navigation-rail',
  styleUrl: 'material-navigation-rail.css',
  shadow: true,
})
export class MaterialNavigationRail {
  @Element() el!: HTMLElement;

  /** Expanded (220dp+, horizontal items) vs collapsed (96dp, vertical items). */
  @Prop({ reflect: true, mutable: true }) expanded = false;

  /** Vertical alignment of the items group. Menu/FAB stay top-aligned per spec. */
  @Prop() alignment: MaterialNavigationRailAlignment = 'top';

  /** `standard` — expanding pushes content aside. `modal` — the expanded
   *  panel overlays content (top layer + scrim); content never reflows.
   *  `auto` — standard at/above `breakpoint`, hidden + modal below it. */
  @Prop({ reflect: true }) modality: MaterialNavigationRailModality = 'standard';

  /** Spec config "hide when collapsed": collapsing removes the rail from view
   *  entirely (width animates to 0). The reopen affordance must live outside
   *  the rail (e.g. an app-bar hamburger calling `expand()`). */
  @Prop({ reflect: true }) hideOnCollapse = false;

  /** Hides the rail entirely regardless of `expanded`. Programmatic axis for
   *  immersive views; independent from `hideOnCollapse`. */
  @Prop({ reflect: true, mutable: true }) concealed = false;

  /** Title shown in the expanded header, next to the toggle. Rich content via
   *  `slot="title"` overrides it. Hidden while collapsed. */
  @Prop() label?: string;

  /** aria-label of the built-in toggle button. */
  @Prop() toggleLabel = 'Toggle navigation';

  /** Viewport width (px) below which `modality="auto"` switches to
   *  hidden-when-collapsed + modal. Default 600 = MD3 compact boundary. */
  @Prop() breakpoint = 600;

  /** aria-label of the nav landmark. */
  @Prop({ attribute: 'aria-label' }) ariaLabel = 'Primary';

  /** `auto` — clicking an item makes it the single active one (and closes the
   *  modal panel). `manual` — the host app drives `active` itself. */
  @Prop() activation: MaterialNavigationRailActivation = 'auto';

  /** Emitted whenever `expanded` or `concealed` changes, however triggered. */
  @Event() materialRailToggle!: EventEmitter<{ expanded: boolean; concealed: boolean }>;

  @State() private isCompact = false;
  @State() private hasMenuSlot = false;

  private dialogEl?: HTMLDialogElement;
  private mql?: MediaQueryList;
  private mqlHandler?: (e: MediaQueryListEvent) => void;
  private pendingToggleFocus = false;

  componentWillLoad() {
    this.setupMqlIfNeeded();
  }

  connectedCallback() {
    this.syncItems();
    this.detectMenuSlot();
  }

  disconnectedCallback() {
    this.teardownMql();
    if (this.dialogEl) {
      this.dialogEl.removeEventListener('close', this.handleDialogClose);
      this.dialogEl.removeEventListener('click', this.handleDialogClick);
      if (this.dialogEl.open) this.dialogEl.close();
    }
  }

  componentDidRender() {
    // The header is keyed per layout, so toggling recreates the built-in
    // toggle button; restore focus to it after the switch (keyboard users
    // would otherwise drop to <body>).
    if (this.pendingToggleFocus) {
      this.pendingToggleFocus = false;
      this.el.shadowRoot
        ?.querySelector<HTMLElement>('button[aria-expanded]')
        ?.focus();
    }

    // <dialog> open state must be driven imperatively; sync it after the
    // slots have (re)projected into the panel.
    const dlg = this.dialogEl;
    if (!dlg) return;
    const shouldBeOpen = this.isModalOpen();
    if (shouldBeOpen && !dlg.open) {
      dlg.showModal();
    } else if (!shouldBeOpen && dlg.open) {
      dlg.close();
    }
  }

  /** Expand the rail (opens the modal panel in modal modality). */
  @Method()
  async expand(): Promise<void> {
    this.expanded = true;
  }

  /** Collapse the rail (hides it entirely with `hide-on-collapse`). */
  @Method()
  async collapse(): Promise<void> {
    this.expanded = false;
  }

  /** Toggle between expanded and collapsed. */
  @Method()
  async toggle(): Promise<void> {
    this.expanded = !this.expanded;
  }

  /** Hide the rail entirely (sets `concealed`). */
  @Method()
  async conceal(): Promise<void> {
    this.concealed = true;
  }

  /** Show a concealed rail again. */
  @Method()
  async reveal(): Promise<void> {
    this.concealed = false;
  }

  @Watch('expanded')
  onExpandedChange() {
    this.syncItems();
    this.emitToggle();
  }

  @Watch('concealed')
  onConcealedChange() {
    this.emitToggle();
  }

  @Watch('modality')
  @Watch('breakpoint')
  onMqlConfigChange() {
    this.teardownMql();
    this.setupMqlIfNeeded();
  }

  // Single-selection management: clicking an item activates it and closes the
  // modal panel (choosing a destination dismisses an overlay drawer).
  @Listen('materialSelect')
  handleItemSelect(ev: CustomEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target || target.tagName !== 'MATERIAL-NAVIGATION-ITEM') return;
    if (this.activation === 'auto') {
      this.el.querySelectorAll('material-navigation-item').forEach((it) => {
        (it as HTMLElement & { active: boolean }).active = it === target;
      });
      if (this.isModalOpen()) this.expanded = false;
    }
  }

  // Arrow-key navigation between items and group headers (Home/End jump to
  // the edges). Items inside closed groups are skipped. Everything stays in
  // the tab order; arrows are an enhancement, not roving tabindex.
  @Listen('keydown')
  handleKeydown(ev: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key)) return;
    const from = (ev.target as HTMLElement | null)?.closest?.(
      'material-navigation-item, material-navigation-group',
    );
    if (!from) return;
    type NavStop = HTMLElement & { disabled?: boolean; setFocus: () => Promise<void> };
    const stops = (Array.from(
      this.el.querySelectorAll('material-navigation-item, material-navigation-group'),
    ) as NavStop[]).filter((el) => {
      if (el.disabled) return false;
      const group = el.parentElement?.closest('material-navigation-group');
      return !group || group.open;
    });
    const idx = stops.indexOf(from as NavStop);
    if (idx < 0 || stops.length === 0) return;
    ev.preventDefault();
    const next =
      ev.key === 'ArrowDown' ? (idx + 1) % stops.length :
      ev.key === 'ArrowUp' ? (idx - 1 + stops.length) % stops.length :
      ev.key === 'Home' ? 0 : stops.length - 1;
    stops[next].setFocus();
  }

  private emitToggle() {
    this.materialRailToggle.emit({ expanded: this.expanded, concealed: this.concealed });
  }

  private syncItems() {
    const variant = this.expanded ? 'rail-expanded' : 'rail-collapsed';
    this.el.querySelectorAll('material-navigation-item').forEach((it) => {
      (it as HTMLElement & { variant: string }).variant = variant;
    });
    this.el.querySelectorAll('material-navigation-group').forEach((g) => {
      g.variant = variant;
    });
    // Section headers don't fit the 96dp collapsed rail — expanded-only per spec.
    this.el.querySelectorAll<HTMLElement>('[data-section-header]').forEach((elm) => {
      elm.hidden = !this.expanded;
    });
  }

  private detectMenuSlot() {
    this.hasMenuSlot = !!this.el.querySelector(':scope > [slot="menu"]');
  }

  private handleSlotChange = () => this.syncItems();
  private handleMenuSlotChange = () => this.detectMenuSlot();

  // Slotted children in `menu` toggle the rail by default — that's the menu
  // button's whole purpose per MD3. Opt out with `data-no-rail-toggle` on the
  // slotted element if you want to drive `expanded` yourself.
  private handleMenuClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-no-rail-toggle]')) return;
    this.expanded = !this.expanded;
  };

  private handleToggleClick = () => {
    this.expanded = !this.expanded;
    this.pendingToggleFocus = true;
  };

  private handleDialogClose = () => {
    if (this.expanded) this.expanded = false;
  };

  // Native <dialog> doesn't dismiss on backdrop click; the click lands on the
  // dialog element itself with coordinates outside its content box.
  private handleDialogClick = (ev: MouseEvent) => {
    const dlg = this.dialogEl;
    if (!dlg || ev.target !== dlg) return;
    const rect = dlg.getBoundingClientRect();
    const inside =
      ev.clientX >= rect.left && ev.clientX <= rect.right &&
      ev.clientY >= rect.top && ev.clientY <= rect.bottom;
    if (!inside) dlg.close();
  };

  private setDialogRef = (el?: HTMLDialogElement) => {
    if (!el || el === this.dialogEl) return;
    this.dialogEl = el;
    el.addEventListener('close', this.handleDialogClose);
    el.addEventListener('click', this.handleDialogClick);
  };

  private setupMqlIfNeeded() {
    if (this.modality !== 'auto' || typeof window === 'undefined') return;
    this.mql = window.matchMedia(`(max-width: ${this.breakpoint - 1}px)`);
    this.isCompact = this.mql.matches;
    this.mqlHandler = (e) => {
      this.isCompact = e.matches;
    };
    this.mql.addEventListener('change', this.mqlHandler);
  }

  private teardownMql() {
    if (this.mql && this.mqlHandler) {
      this.mql.removeEventListener('change', this.mqlHandler);
    }
    this.mql = undefined;
    this.mqlHandler = undefined;
  }

  private isModal(): boolean {
    return this.modality === 'modal' || (this.modality === 'auto' && this.isCompact);
  }

  private isModalOpen(): boolean {
    return this.isModal() && this.expanded && !this.concealed;
  }

  // Built-in toggle, rendered when nothing is slotted into `menu`. A plain
  // shadow button (not material-icon-button) so aria-expanded sits on the
  // real <button> element.
  private renderToggle() {
    return (
      <button
        type="button"
        class="toggle"
        aria-expanded={this.expanded ? 'true' : 'false'}
        aria-label={this.toggleLabel}
        onClick={this.handleToggleClick}
      >
        <span class="state-layer" aria-hidden="true" />
        <span class="icon" aria-hidden="true">
          {this.expanded ? 'menu_open' : 'menu'}
        </span>
      </button>
    );
  }

  // Collapsed: toggle centered at top. Expanded: header row — title at the
  // leading edge, toggle at the trailing edge (per MD3 the menu icon flips
  // meaning to "collapse" when the rail is open).
  private renderHeader(expandedLayout: boolean) {
    const menuSlot = (
      <div onClick={this.handleMenuClick} class="menu-wrapper">
        <slot name="menu" onSlotchange={this.handleMenuSlotChange} />
      </div>
    );
    const toggle = this.hasMenuSlot ? null : this.renderToggle();

    if (expandedLayout) {
      return (
        <div key="header-expanded" class="header-expanded">
          <span class="title rail-morph-in">
            <slot name="title">{this.label}</slot>
          </span>
          {menuSlot}
          {toggle}
        </div>
      );
    }
    return (
      <div key="header-collapsed" class="header-collapsed">
        {menuSlot}
        {toggle}
      </div>
    );
  }

  // Items area uses px-2 (8dp) so the indicator pill (56dp) fits centered
  // inside a 96dp rail (96 - 16 = 80, indicator 56dp leaves 12dp/side gutter).
  private renderContent(expandedLayout: boolean) {
    const itemsAlign = this.alignment === 'center' ? 'align-center' : 'align-start';
    return [
      this.renderHeader(expandedLayout),
      <div class={expandedLayout ? 'fab-expanded' : 'fab-collapsed'}>
        <slot name="fab" />
      </div>,
      <div class={`items ${itemsAlign}`}>
        <slot onSlotchange={this.handleSlotChange} />
      </div>,
      <div class="bottom">
        <slot name="bottom" onSlotchange={this.handleSlotChange} />
      </div>,
    ];
  }

  render() {
    const autoCompact = this.modality === 'auto' && this.isCompact;
    const modal = this.isModal();
    const modalOpen = this.isModalOpen();

    // Footprint the rail keeps in the page flow. Collapsed = 96dp; expanded
    // standard = 220dp default (spec range 220–360 via custom property).
    // Modal never reflows content, so its footprint stays collapsed-sized.
    const collapsedWidth =
      this.concealed || this.hideOnCollapse || autoCompact ? '0px' : '6rem';
    const shellWidth =
      !modal && this.expanded && !this.concealed
        ? 'var(--material-rail-expanded-width, 13.75rem)'
        : collapsedWidth;
    const shellGone = shellWidth === '0px';

    return (
      <Host>
        <nav
          class={shellGone ? 'shell gone' : 'shell'}
          style={{ width: shellWidth }}
          aria-label={this.ariaLabel}
          aria-hidden={shellGone || modalOpen ? 'true' : undefined}
        >
          {!modalOpen && this.renderContent(!modal && this.expanded)}
        </nav>
        <dialog class="rail-dialog" ref={this.setDialogRef} aria-label={this.ariaLabel}>
          {modalOpen && (
            <nav class="modal-nav" aria-label={this.ariaLabel}>
              {this.renderContent(true)}
            </nav>
          )}
        </dialog>
      </Host>
    );
  }
}
