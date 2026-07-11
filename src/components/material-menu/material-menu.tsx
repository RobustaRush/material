import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  Watch,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';
import {
  AnchorPlacement,
  trackAnchored,
} from '../../utils/anchor-position';

// MD3 vertical menu (Standard color). Uses the native HTML Popover API for
// open/close, light-dismiss, and top-layer rendering. The host element itself
// gets popover="auto", so consumers can wire any trigger via popovertarget:
//
//   <material-icon-button icon="more_vert" popovertarget="my-menu"></material-icon-button>
//   <material-menu id="my-menu" anchor="#trigger">
//     <material-menu-item label="Cut" leading-icon="content_cut"></material-menu-item>
//     ...
//   </material-menu>

@Component({
  tag: 'material-menu',
  styleUrl: 'material-menu.css',
  shadow: true,
})
export class MaterialMenu {
  @Element() el!: HTMLElement;

  /** CSS selector or element id (without #) of the anchor. If omitted, the
   *  popover invoker (set by the browser when opened via popovertarget) is used. */
  @Prop() anchor?: string;

  @Prop({ reflect: true }) placement: AnchorPlacement = 'bottom-start';
  @Prop() offset = 4;
  /** Hard cap on menu height in px; viewport room is the other ceiling. */
  @Prop() maxHeight?: number;

  /** Reflects open state. Toggling this prop drives the popover. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** ARIA role for the popup container. `menu` for a real command menu (the
   *  default); `listbox` when hosting selectable options (e.g. material-select),
   *  where `option` children are only valid inside a listbox. */
  @Prop() menuRole: 'menu' | 'listbox' = 'menu';

  @Event() materialMenuOpen!: EventEmitter<void>;
  @Event() materialMenuClose!: EventEmitter<void>;

  private cleanupTrack?: () => void;
  private invoker: Element | null = null;
  private typeahead = '';
  private typeaheadTimer = 0;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    // popover="auto" on the host gives top-layer + light-dismiss + Escape for free.
    if (!this.el.hasAttribute('popover')) this.el.setAttribute('popover', 'auto');
    this.el.addEventListener('toggle', this.handleToggle);
  }

  disconnectedCallback() {
    this.el.removeEventListener('toggle', this.handleToggle);
    this.cleanupTrack?.();
  }

  @Watch('open')
  syncOpen(open: boolean) {
    // Stencil already mirrors the prop to the attribute; drive the popover state.
    const isOpen = this.el.matches(':popover-open');
    if (open && !isOpen) (this.el as HTMLElement & { showPopover: () => void }).showPopover();
    else if (!open && isOpen) (this.el as HTMLElement & { hidePopover: () => void }).hidePopover();
  }

  /** Open the menu. Resolves the anchor from `el` arg, the `anchor` prop, or the popover invoker. */
  @Method()
  async show(anchorEl?: Element) {
    if (anchorEl) this.invoker = anchorEl;
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
  }

  private resolveAnchor(): Element | null {
    if (this.anchor) {
      const sel = this.anchor.startsWith('#') || this.anchor.includes(' ')
        ? this.anchor
        : `#${this.anchor}`;
      const found = document.querySelector(sel);
      if (found) return found;
    }
    // ToggleEvent.source is set by the browser when popover was opened via popovertarget.
    return this.invoker;
  }

  private handleToggle = (ev: Event) => {
    const e = ev as ToggleEvent & { source?: Element };
    const opening = e.newState === 'open';
    if (opening) {
      if (e.source) this.invoker = e.source;
      const anchor = this.resolveAnchor();
      this.open = true;
      if (anchor) {
        this.cleanupTrack = trackAnchored(this.el, anchor, {
          placement: this.placement,
          offset: this.offset,
          maxHeight: this.maxHeight,
        });
      }
      requestAnimationFrame(() => this.focusFirstItem());
      this.materialMenuOpen.emit();
    } else {
      this.open = false;
      this.cleanupTrack?.();
      this.cleanupTrack = undefined;
      const returnTo = this.invoker as HTMLElement | null;
      this.invoker = null;
      if (returnTo && typeof returnTo.focus === 'function') returnTo.focus();
      this.materialMenuClose.emit();
    }
  };

  private getItems(): HTMLElement[] {
    return Array.from(
      this.el.querySelectorAll<HTMLElement>('material-menu-item:not([disabled])'),
    );
  }

  // Typeahead-matchable text for an item: prefer the `label` prop (rendered in
  // shadow DOM, so absent from light-DOM textContent), fall back to slotted text.
  private itemText(it: HTMLElement): string {
    const label = (it as HTMLElement & { label?: string }).label;
    return (label || it.textContent || '').trim();
  }

  private focusFirstItem() {
    const items = this.getItems();
    if (items.length) items[0].focus();
  }

  private focusItem(items: HTMLElement[], idx: number) {
    if (!items.length) return;
    const i = (idx + items.length) % items.length;
    items[i].focus();
    items[i].scrollIntoView({ block: 'nearest' });
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (!this.el.matches(':popover-open')) return;
    const items = this.getItems();
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active.closest('material-menu-item') as HTMLElement) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusItem(items, idx + 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        this.focusItem(items, idx - 1);
        return;
      case 'Home':
        e.preventDefault();
        this.focusItem(items, 0);
        return;
      case 'End':
        e.preventDefault();
        this.focusItem(items, items.length - 1);
        return;
      case 'Tab':
        // Per WAI-ARIA menu pattern: Tab closes the menu.
        this.open = false;
        return;
    }

    // Typeahead: printable single chars.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.typeahead += e.key.toLowerCase();
      window.clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = window.setTimeout(() => (this.typeahead = ''), 500);
      const match = items.find(it =>
        this.itemText(it).toLowerCase().startsWith(this.typeahead),
      );
      if (match) match.focus();
    }
  }

  @Listen('materialMenuItemActivate')
  handleActivate(e: CustomEvent<{ keepOpen: boolean }>) {
    if (!e.detail.keepOpen) this.open = false;
  }

  render() {
    return (
      <Host role={this.menuRole} aria-orientation="vertical">
        <slot />
      </Host>
    );
  }
}
