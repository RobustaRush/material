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

import { Component, Element, Event, EventEmitter, Host, Prop, h } from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';

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
  /** id of the tabpanel this tab controls (ARIA tab↔panel association). */
  @Prop() panel?: string;
  @Prop({ reflect: true, mutable: true }) selected = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true, mutable: true }) variant: MaterialTabVariant = 'primary';
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  /** Internal — set by parent for roving tabindex. */
  @Prop({ mutable: true }) tabbable = false;

  /** Internal: parent listens to coordinate selection. */
  @Event({ bubbles: true, composed: true })
  materialTabActivate!: EventEmitter<{ value?: string }>;

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

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
  }

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
    const hasIcon = !!this.icon;

    // Inner content stack hugs the label/icon column horizontally so the
    // primary indicator can be anchored to its width (min 24dp, inset 2dp
    // each side). It stretches to full cell height so the indicator (in
    // material-tabs) sits at the bottom of the tab cell, just above the
    // divider — not flush against the label baseline.
    const stackCls = hasIcon ? 'stack column' : 'stack';

    // The active indicator is no longer rendered per-tab. A single indicator
    // lives in <material-tabs> and slides between tabs (see material-tabs.tsx).
    // For the primary variant it hugs this tab's content column, so expose the
    // stack via part="content" for the parent to measure.

    // Badge anchor: when icon is present, hug the icon glyph and overlap by 6dp
    // (translate covers both the -50% vertical center-on-edge and the 6px
    // trailing overlap). When label-only, the badge sits inline as a sibling
    // of the label with a 4dp gap.
    const iconAndBadge = hasIcon ? (
      <span class="icon-badge">
        <span class="icon" style={this.iconStyle()} aria-hidden="true">
          {this.icon}
        </span>
        <span class="badge-slot">
          <slot name="badge" />
        </span>
      </span>
    ) : null;

    const inner = (
      <span class={stackCls} part="content">
        {iconAndBadge}
        {hasIcon ? (
          <span class="label">{this.label}</span>
        ) : (
          <span class="label-row">
            <span class="label">{this.label}</span>
            <slot name="badge" />
          </span>
        )}
      </span>
    );

    const body = [
      <span class="state-layer" aria-hidden="true"></span>,
      <span class="md-ripple" aria-hidden="true"></span>,
      inner,
    ];

    const isLink = !!this.href && !this.disabled;
    const Tag: any = isLink ? 'a' : 'button';

    const props: Record<string, unknown> = {
      class: hasIcon ? 'root tall' : 'root',
      role: 'tab',
      'aria-selected': this.selected ? 'true' : 'false',
      'aria-disabled': this.disabled ? 'true' : null,
      'aria-label': this.ariaLabel,
      'aria-controls': this.panel,
      tabindex: this.tabbable && !this.disabled ? 0 : -1,
      'data-ripple': true,
      onClick: this.handleClick,
      onKeyDown: this.handleKeyDown,
    };
    if (isLink) {
      props.href = this.href;
    } else {
      props.type = 'button';
      props.disabled = this.disabled;
    }

    // Host is presentational so the inner role="tab" element is the effective
    // direct child of the parent's role="tablist" in the flattened a11y tree.
    return <Host role="presentation">{h(Tag, props, body)}</Host>;
  }
}
