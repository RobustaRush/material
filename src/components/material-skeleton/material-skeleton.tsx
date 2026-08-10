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

import { Component, Host, Prop, h } from '@stencil/core';

// Skeleton loader — shimmer placeholder shown while a fragment loads.
// No M3 spec exists; sizes are em-based so a skeleton dropped into any text
// context matches the type scale around it.
//
// Three primitives only — composite layouts (card, list row, table row) are
// composed from them with utility classes in the consuming markup; see the
// demo page. Pairs with Unpoly via `up-placeholder`:
//
//   <a href="/orders/" up-target=".list"
//      up-placeholder="<material-skeleton lines='4'></material-skeleton>">
//
// The host is aria-hidden: a skeleton is decoration, the loading state
// itself should be announced by the region being swapped (aria-busy).

@Component({
  tag: 'material-skeleton',
  styleUrl: 'material-skeleton.css',
  shadow: true,
})
export class MaterialSkeleton {
  /** Shape: stacked text lines (default), a circle (avatar), or a filled
   *  rectangle (image, card media). Circle and rectangle size from the host
   *  element — override with classes or inline style. */
  @Prop({ reflect: true }) variant: 'text' | 'circular' | 'rectangular' = 'text';

  /** Text variant: number of lines; with several, the last one is shorter. */
  @Prop() lines = 1;

  render() {
    const count = this.variant === 'text' ? Math.max(1, this.lines) : 1;
    return (
      <Host aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div class={{ bone: true, short: this.variant === 'text' && count > 1 && i === count - 1 }}></div>
        ))}
      </Host>
    );
  }
}
