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

import { Component, Host, Prop, State, h } from '@stencil/core';

export type MaterialCarouselItemAspect = '16:9' | '9:16' | '1:1' | '3:4';

@Component({
  tag: 'material-carousel-item',
  styleUrl: 'material-carousel-item.css',
  // delegatesFocus so the carousel's roving arrow-key `item.focus()` lands on
  // the inner <a>/<button> (link/clickable variants) rather than being a
  // no-op on the non-focusable host. The plain variant keeps its host
  // tabindex and is focused directly.
  shadow: { delegatesFocus: true },
})
export class MaterialCarouselItem {
  @Prop({ reflect: true }) aspect?: MaterialCarouselItemAspect;
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop({ reflect: true }) clickable = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasText = false;

  private onTextSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    this.hasText = slot.assignedNodes({ flatten: true }).some(
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
    const rel = this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);

    const inner = [
      <slot name="media" />,
      <slot />,
      <div part="text" hidden={!this.hasText}>
        <slot name="headline" onSlotchange={this.onTextSlotChange} />
        <slot name="supporting" onSlotchange={this.onTextSlotChange} />
      </div>,
      <span part="state-layer" aria-hidden="true" />,
    ];

    if (isLink) {
      return (
        <Host>
          <a
            part="surface"
            href={this.disabled ? undefined : this.href}
            role={this.disabled ? 'link' : undefined}
            target={this.target}
            rel={rel}
            aria-label={this.ariaLabel}
            aria-disabled={this.disabled ? 'true' : undefined}
            tabindex={this.disabled ? -1 : 0}
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
      <Host tabindex={this.disabled ? -1 : 0}>
        {/* group + roledescription: the standard carousel-slide semantics,
            and a role that may legitimately carry the aria-label */}
        <div part="surface" role="group" aria-roledescription="slide" aria-label={this.ariaLabel}>
          {inner}
        </div>
      </Host>
    );
  }
}
