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
  h,
} from '@stencil/core';

// MD3 chip set — role="toolbar" wrapping slotted <material-chip> children,
// with roving tabindex (exactly one chip is a Tab stop) and RTL-aware
// ArrowLeft/Right + Home/End between chips. Same roving-tabindex shape as
// material-radio-group/material-list: a `tabbable` prop on the child, synced
// here rather than poked into shadow DOM directly.
// Reference: chip-set.ts:41-146.
//
// Intra-chip navigation (primary ↔ trailing remove action) is handled by
// material-chip itself, which stops propagation for the direction that stays
// inside the chip — only the direction that would exit the chip reaches this
// keydown handler.

type ChipEl = HTMLElement & {
  tabbable: boolean;
  setFocus: (opts?: { trailing?: boolean }) => Promise<void>;
};

@Component({
  tag: 'material-chip-set',
  styleUrl: 'material-chip-set.css',
  shadow: true,
})
export class MaterialChipSet {
  @Element() el!: HTMLElement;

  connectedCallback() {
    this.syncRoving();
  }

  private handleSlotChange = () => this.syncRoving();

  private allChips(): ChipEl[] {
    return Array.from(this.el.querySelectorAll<ChipEl>('material-chip'));
  }

  private enabledChips(): ChipEl[] {
    return Array.from(this.el.querySelectorAll<ChipEl>('material-chip:not([disabled])'));
  }

  private currentChip(): ChipEl | null {
    const active = (this.el.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null;
    const chip = active?.closest('material-chip') as ChipEl | null;
    // Only chips inside this set count — a focused chip elsewhere in the
    // document must not become the roving target (syncRoving would then set
    // every slotted chip to tabbable=false, dropping the set from tab order).
    return chip && this.el.contains(chip) ? chip : null;
  }

  // Roving tabindex: exactly one chip is a Tab stop — the currently focused
  // enabled chip, else the first enabled chip.
  private syncRoving() {
    const all = this.allChips();
    if (!all.length) return;
    const enabled = this.enabledChips();
    const current = this.currentChip();
    const target = (current && !current.hasAttribute('disabled') ? current : undefined)
      ?? enabled[0];
    for (const chip of all) chip.tabbable = chip === target;
  }

  private handleFocusIn = () => this.syncRoving();

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    const isLeft = e.key === 'ArrowLeft';
    const isRight = e.key === 'ArrowRight';
    const isHome = e.key === 'Home';
    const isEnd = e.key === 'End';
    if (!isLeft && !isRight && !isHome && !isEnd) return;

    const all = this.allChips();
    if (all.length < 2) return;

    e.preventDefault();

    if (isHome || isEnd) {
      const enabled = this.enabledChips();
      if (!enabled.length) return;
      const target = isHome ? enabled[0] : enabled[enabled.length - 1];
      target.setFocus({ trailing: isEnd });
      this.syncRoving();
      return;
    }

    const isRtl = getComputedStyle(this.el).direction === 'rtl';
    const forwards = isRtl ? isLeft : isRight;
    const current = this.currentChip();

    if (!current) {
      const enabled = this.enabledChips();
      if (!enabled.length) return;
      const next = forwards ? enabled[0] : enabled[enabled.length - 1];
      next.setFocus({ trailing: !forwards });
      this.syncRoving();
      return;
    }

    const currentIndex = all.indexOf(current);
    if (currentIndex < 0) return;
    let nextIndex = forwards ? currentIndex + 1 : currentIndex - 1;
    // Search for the next enabled sibling. If we wrap back to the starting
    // chip, there's nothing else to focus.
    while (nextIndex !== currentIndex) {
      if (nextIndex >= all.length) nextIndex = 0;
      else if (nextIndex < 0) nextIndex = all.length - 1;

      const nextChip = all[nextIndex];
      if (nextChip.hasAttribute('disabled')) {
        nextIndex += forwards ? 1 : -1;
        continue;
      }
      nextChip.setFocus({ trailing: !forwards });
      this.syncRoving();
      break;
    }
  }

  render() {
    return (
      <Host role="toolbar" onFocusin={this.handleFocusIn}>
        <slot onSlotchange={this.handleSlotChange} />
      </Host>
    );
  }
}
