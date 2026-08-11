/*
 * advanced-material-web — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

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
import {
  AnchorLike,
  AnchorPlacement,
  trackAnchored,
} from '../../utils/anchor-position';
import { createTypeahead, TypeaheadHandle } from '../../utils/typeahead';

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
  private invoker: AnchorLike | null = null;
  private explicitAnchor: AnchorLike | null = null;
  private readonly typeahead: TypeaheadHandle = createTypeahead<HTMLElement>({
    getItems: () => this.getItems(),
    getText: it => this.itemText(it),
    isActive: it => it === document.activeElement,
    onMatch: it => {
      it.focus();
      it.scrollIntoView({ block: 'nearest' });
    },
  });
  // Only return focus to the invoker when the menu was dismissed via the
  // keyboard (Tab/Escape) or by selecting an item — NOT when the user
  // light-dismissed it by clicking elsewhere (that would yank focus away
  // from wherever they clicked).
  private restoreFocusOnClose = false;

  connectedCallback() {
    // popover="auto" on the host gives top-layer + light-dismiss + Escape for free.
    if (!this.el.hasAttribute('popover')) this.el.setAttribute('popover', 'auto');
    this.el.addEventListener('toggle', this.handleToggle);
  }

  disconnectedCallback() {
    this.el.removeEventListener('toggle', this.handleToggle);
    this.cleanupTrack?.();
    this.typeahead.destroy();
  }

  @Watch('open')
  syncOpen(open: boolean) {
    // Stencil already mirrors the prop to the attribute; drive the popover state.
    const isOpen = this.el.matches(':popover-open');
    if (open && !isOpen) (this.el as HTMLElement & { showPopover: () => void }).showPopover();
    else if (!open && isOpen) (this.el as HTMLElement & { hidePopover: () => void }).hidePopover();
  }

  /** Open the menu. Resolves the anchor from `el` arg, the `anchor` prop, or the
   *  popover invoker. The argument only has to report a rect, so a pointer
   *  position works as well as an element:
   *
   *      row.addEventListener('contextmenu', (e) => {
   *        e.preventDefault();
   *        menu.show({ getBoundingClientRect: () =>
   *          new DOMRect(e.clientX, e.clientY, 0, 0) });
   *      });
   */
  @Method()
  async show(anchorEl?: AnchorLike) {
    if (anchorEl) {
      this.invoker = anchorEl;
      // Kept apart from `invoker` so it can outrank the `anchor` prop: a caller
      // naming an anchor at the call site means it for this opening, whatever
      // the markup says. One menu can then serve both a toolbar button and a
      // right-click at the pointer.
      this.explicitAnchor = anchorEl;
    }
    this.open = true;
  }

  @Method()
  async hide() {
    this.open = false;
  }

  private resolveAnchor(): AnchorLike | null {
    if (this.explicitAnchor) return this.explicitAnchor;
    if (this.anchor) {
      // Only auto-prefix `#` for a bare HTML id; leave any real CSS selector
      // (class, attribute, descendant, id already prefixed) untouched.
      const isBareId = /^[A-Za-z_][\w-]*$/.test(this.anchor);
      const sel = isBareId ? `#${this.anchor}` : this.anchor;
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
      this.restoreFocusOnClose = false;
      requestAnimationFrame(() => this.focusFirstItem());
      this.materialMenuOpen.emit();
    } else {
      this.open = false;
      this.cleanupTrack?.();
      this.cleanupTrack = undefined;
      // A virtual anchor is a plain object with no focus() — the guard below
      // covers it, so the menu simply leaves focus where it was.
      const returnTo = this.invoker as HTMLElement | null;
      this.invoker = null;
      this.explicitAnchor = null;
      // Refocus the invoker only for keyboard/Escape/selection dismissals;
      // on a light-dismiss (outside click) leave focus where the user put it.
      if (this.restoreFocusOnClose && returnTo && typeof returnTo.focus === 'function') {
        returnTo.focus();
      }
      this.restoreFocusOnClose = false;
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

  // Capture-phase: runs before the event reaches the focused menu item, so
  // that a mid-buffer Space (consumed by the typeahead) never falls through
  // to the item's own Enter/Space activation handler.
  @Listen('keydown', { capture: true })
  handleCaptureKeyDown(e: KeyboardEvent) {
    if (!this.el.matches(':popover-open')) return;
    this.typeahead.onKeydown(e);
    if (e.defaultPrevented) e.stopPropagation();
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
        this.restoreFocusOnClose = true;
        this.open = false;
        return;
      case 'Escape':
        // The popover closes itself on Escape; flag it so focus returns to
        // the invoker in the toggle handler.
        this.restoreFocusOnClose = true;
        return;
    }
    // Typeahead itself runs from the capture-phase listener above.
  }

  @Listen('materialMenuItemActivate')
  handleActivate(e: CustomEvent<{ keepOpen: boolean }>) {
    if (!e.detail.keepOpen) {
      // Selecting an item returns focus to the invoker.
      this.restoreFocusOnClose = true;
      this.open = false;
    }
  }

  render() {
    return (
      <Host role={this.menuRole} aria-orientation="vertical">
        <slot />
      </Host>
    );
  }
}
