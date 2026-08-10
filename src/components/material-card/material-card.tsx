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

import { Component, Host, Prop, State, h } from '@stencil/core';

export type MaterialCardVariant = 'elevated' | 'filled' | 'outlined';

@Component({
  tag: 'material-card',
  styleUrl: 'material-card.css',
  shadow: true,
})
export class MaterialCard {
  @Prop({ reflect: true }) variant: MaterialCardVariant = 'elevated';
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop() download?: string;
  @Prop({ reflect: true }) clickable = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasActions = false;

  private onActionsSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    this.hasActions = slot.assignedNodes({ flatten: true }).some(
      (n) =>
        n.nodeType === Node.ELEMENT_NODE ||
        (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''),
    );
  };

  private onBlockedClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  render() {
    const isLink = !!this.href;
    const isButton = !isLink && this.clickable;
    const rel =
      this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);

    const inner = [
      <slot name="media" />,
      <div part="content">
        <slot name="headline" />
        <slot name="subhead" />
        <slot name="supporting" />
        <slot />
      </div>,
      <div part="actions" hidden={!this.hasActions}>
        <slot name="actions" onSlotchange={this.onActionsSlotChange} />
      </div>,
      <span part="state-layer" aria-hidden="true" />,
    ];

    if (isLink) {
      return (
        <Host>
          <a
            part="surface"
            href={this.disabled ? undefined : this.href}
            target={this.target}
            rel={rel}
            download={this.download}
            aria-label={this.ariaLabel}
            aria-disabled={this.disabled ? 'true' : undefined}
            tabindex={this.disabled ? -1 : undefined}
            onClick={this.disabled ? this.onBlockedClick : undefined}
          >
            {inner}
          </a>
        </Host>
      );
    }

    if (isButton) {
      return (
        <Host>
          <button
            part="surface"
            type="button"
            disabled={this.disabled}
            aria-label={this.ariaLabel}
          >
            {inner}
          </button>
        </Host>
      );
    }

    return (
      <Host>
        <div part="surface" aria-label={this.ariaLabel}>
          {inner}
        </div>
      </Host>
    );
  }
}
