/*
 * @viewflow/material — Material 3 web components
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
  Host,
  Listen,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';

// MD3 Expressive (flexible) navigation bar — 3–5 primary destinations at the
// bottom edge of compact/medium windows. Items are the shared
// <material-navigation-item>; the bar propagates its orientation to them:
//
//   vertical   — compact windows: label under icon, items equally fill the
//                container width (spec "dynamic width")
//   horizontal — medium windows: 40dp pill wrapping icon+label, fixed-width
//                items centered in the bar (spec "dynamic margin")
//   auto       — vertical below `breakpoint`, horizontal at/above it
//
// Spec: docs/wiki/specs/google-material/navigation-bar/specs.md
// Pairing rule (guidelines): never show a navigation bar and a navigation
// rail simultaneously.

export type MaterialNavigationBarOrientation = 'vertical' | 'horizontal' | 'auto';
export type MaterialNavigationBarActivation = 'auto' | 'manual';

@Component({
  tag: 'material-navigation-bar',
  styleUrl: 'material-navigation-bar.css',
  shadow: true,
})
export class MaterialNavigationBar {
  @Element() el!: HTMLElement;

  /** Item layout: `vertical` (compact), `horizontal` (medium), or `auto` —
   *  vertical below `breakpoint`, horizontal at/above it. */
  @Prop({ reflect: true }) orientation: MaterialNavigationBarOrientation = 'vertical';

  /** Viewport width (px) at which `orientation="auto"` switches from
   *  vertical to horizontal items. Default 600 = MD3 compact→medium boundary. */
  @Prop() breakpoint = 600;

  /** aria-label of the nav landmark. */
  @Prop({ attribute: 'aria-label' }) ariaLabel = 'Primary';

  /** `auto` — clicking an item makes it the single active one.
   *  `manual` — the host app drives `active` itself. */
  @Prop() activation: MaterialNavigationBarActivation = 'auto';

  @State() private isMedium = false;

  private mql?: MediaQueryList;
  private mqlHandler?: (e: MediaQueryListEvent) => void;

  componentWillLoad() {
    this.setupMqlIfNeeded();
  }

  connectedCallback() {
    this.syncItems();
  }

  disconnectedCallback() {
    this.teardownMql();
  }

  @Watch('orientation')
  @Watch('breakpoint')
  onMqlConfigChange() {
    this.teardownMql();
    this.setupMqlIfNeeded();
    this.syncItems();
  }

  @Watch('isMedium')
  onIsMediumChange() {
    this.syncItems();
  }

  // Single-selection management, same contract as material-navigation-rail.
  @Listen('materialSelect')
  handleItemSelect(ev: CustomEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target || target.tagName !== 'MATERIAL-NAVIGATION-ITEM') return;
    if (this.activation === 'auto') {
      this.el.querySelectorAll('material-navigation-item').forEach((it) => {
        it.active = it === target;
      });
    }
  }

  // Arrow-key navigation between items; Left/Right follow the visual order,
  // so they invert in RTL. Home/End jump to the edges.
  @Listen('keydown')
  handleKeydown(ev: KeyboardEvent) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(ev.key)) return;
    const from = (ev.target as HTMLElement | null)?.closest?.('material-navigation-item');
    if (!from) return;
    const items = Array.from(
      this.el.querySelectorAll('material-navigation-item'),
    ).filter((it) => !it.disabled);
    const idx = items.indexOf(from);
    if (idx < 0 || items.length === 0) return;
    ev.preventDefault();
    const rtl = getComputedStyle(this.el).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    const next =
      ev.key === forward ? (idx + 1) % items.length :
      ev.key === backward ? (idx - 1 + items.length) % items.length :
      ev.key === 'Home' ? 0 : items.length - 1;
    items[next].setFocus();
  }

  private effectiveOrientation(): 'vertical' | 'horizontal' {
    if (this.orientation === 'auto') return this.isMedium ? 'horizontal' : 'vertical';
    return this.orientation;
  }

  private syncItems() {
    const variant = this.effectiveOrientation() === 'horizontal' ? 'bar-horizontal' : 'bar';
    this.el.querySelectorAll('material-navigation-item').forEach((it) => {
      it.variant = variant;
    });
  }

  private handleSlotChange = () => this.syncItems();

  private setupMqlIfNeeded() {
    if (this.orientation !== 'auto' || typeof window === 'undefined') return;
    this.mql = window.matchMedia(`(min-width: ${this.breakpoint}px)`);
    this.isMedium = this.mql.matches;
    this.mqlHandler = (e) => {
      this.isMedium = e.matches;
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

  render() {
    const horizontal = this.effectiveOrientation() === 'horizontal';
    return (
      // data-orientation drives the ::slotted item sizing in the stylesheet:
      // vertical items flex-fill equally, horizontal items keep fixed width
      // with the group centered (extra space goes to the container ends).
      <Host data-orientation={horizontal ? 'horizontal' : 'vertical'}>
        <nav
          class={horizontal ? 'bar horizontal' : 'bar'}
          aria-label={this.ariaLabel}
        >
          <slot onSlotchange={this.handleSlotChange} />
        </nav>
      </Host>
    );
  }
}
