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
  State,
  Watch,
  h,
} from '@stencil/core';
import { trackAnchored } from '../../utils/anchor-position';

export type MaterialFabMenuSize = 'small' | 'medium' | 'large';
export type MaterialFabMenuColorSet = 'primary' | 'secondary' | 'tertiary';

let fabMenuId = 0;

@Component({
  tag: 'material-fab-menu',
  styleUrl: 'material-fab-menu.css',
  shadow: true,
})
export class MaterialFabMenu {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) size: MaterialFabMenuSize = 'medium';
  @Prop({ reflect: true }) colorSet: MaterialFabMenuColorSet = 'primary';
  @Prop() icon = 'add';
  @Prop() closeIcon = 'close';
  @Prop({ mutable: true, reflect: true }) open = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  /** When true, the FAB fades out as the page scrolls near its bottom edge. */
  @Prop({ reflect: true, attribute: 'hide-near-end' }) hideNearEnd = false;
  /** Distance from the document bottom (in px) at which the FAB starts to hide. */
  @Prop({ attribute: 'hide-offset' }) hideOffset = 80;

  @Event() materialFabMenuOpen!: EventEmitter<void>;
  @Event() materialFabMenuClose!: EventEmitter<void>;

  @State() rendered = false;

  private panelId = `material-fab-menu-panel-${++fabMenuId}`;
  private fabEl?: HTMLButtonElement;
  private panelEl?: HTMLElement;
  private cleanupTrack?: () => void;
  // When the menu closes we normally return focus to the FAB; on Tab we let the
  // browser move focus onward instead (spec: Tab moves on, not back).
  private returnFocusToFab = true;

  connectedCallback() {
    this.rendered = true;
    if (this.hideNearEnd) this.attachScrollListener();
  }

  disconnectedCallback() {
    this.cleanupTrack?.();
    this.detachScrollListener();
  }

  @Watch('hideNearEnd')
  onHideNearEndChange(v: boolean) {
    if (v) this.attachScrollListener();
    else {
      this.detachScrollListener();
      this.el.removeAttribute('near-end');
    }
  }

  private attachScrollListener() {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll);
    this.onScroll();
  }

  private detachScrollListener() {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
  }

  private onScroll = () => {
    const doc = document.documentElement;
    const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
    const nearEnd = remaining <= this.hideOffset;
    if (nearEnd) this.el.setAttribute('near-end', '');
    else this.el.removeAttribute('near-end');
  };

  @Watch('open')
  syncOpen(open: boolean) {
    const panel = this.panelEl;
    if (!panel) return;
    const isOpen = panel.matches(':popover-open');
    if (open && !isOpen) {
      (panel as HTMLElement & { showPopover: () => void }).showPopover();
    } else if (!open && isOpen) {
      (panel as HTMLElement & { hidePopover: () => void }).hidePopover();
    }
  }

  @Method()
  async show() { this.open = true; }

  @Method()
  async hide() { this.open = false; }

  @Method()
  async toggle() { this.open = !this.open; }

  private handleFabClick = () => {
    this.open = !this.open;
  };

  private handlePanelToggle = (ev: Event) => {
    const e = ev as ToggleEvent;
    const opening = e.newState === 'open';
    this.open = opening;
    if (opening) {
      if (this.panelEl && this.fabEl) {
        this.cleanupTrack = trackAnchored(this.panelEl, this.fabEl, {
          placement: 'top-end',
          offset: 4,
        });
      }
      requestAnimationFrame(() => this.focusFirstItem());
      this.materialFabMenuOpen.emit();
    } else {
      this.cleanupTrack?.();
      this.cleanupTrack = undefined;
      if (this.returnFocusToFab && this.fabEl) this.fabEl.focus();
      this.returnFocusToFab = true;
      this.materialFabMenuClose.emit();
    }
  };

  private getItems(): HTMLElement[] {
    return Array.from(
      this.el.querySelectorAll<HTMLElement>('material-fab-menu-item:not([disabled])'),
    );
  }

  private focusFirstItem() {
    const items = this.getItems();
    if (items.length) items[0].focus();
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (!this.panelEl?.matches(':popover-open')) return;
    const items = this.getItems();
    if (!items.length) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active.closest('material-fab-menu-item') as HTMLElement) : -1;

    const focusItem = (i: number) => {
      const n = items.length;
      const j = ((i % n) + n) % n;
      items[j].focus();
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(idx < 0 ? 0 : idx + 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(idx < 0 ? items.length - 1 : idx - 1);
        return;
      case 'Home':
        e.preventDefault();
        focusItem(0);
        return;
      case 'End':
        e.preventDefault();
        focusItem(items.length - 1);
        return;
      case 'Tab':
        // Let the browser move focus onward — don't preventDefault and don't
        // return focus to the FAB.
        this.returnFocusToFab = false;
        this.open = false;
        return;
    }
  }

  @Listen('materialFabMenuItemActivate')
  handleActivate() {
    this.open = false;
  }

  render() {
    return (
      <Host>
        <div
          class="panel"
          part="panel"
          id={this.panelId}
          popover="auto"
          ref={(el) => (this.panelEl = el)}
          onToggle={this.handlePanelToggle}
          role="menu"
          aria-orientation="vertical"
        >
          <slot />
        </div>
        <button
          type="button"
          class="fab"
          part="fab"
          aria-haspopup="menu"
          aria-expanded={String(this.open)}
          aria-controls={this.panelId}
          aria-label={this.ariaLabel ?? 'Toggle menu'}
          ref={(el) => (this.fabEl = el)}
          onClick={this.handleFabClick}
        >
          <span class="state-layer" aria-hidden="true"></span>
          <span class="icon" aria-hidden="true">
            {this.open ? this.closeIcon : this.icon}
          </span>
        </button>
      </Host>
    );
  }
}
