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

import { Component, Element, Host, Prop, h } from '@stencil/core';
import { gettext } from '../../utils/i18n';

// Breadcrumbs — light-DOM progressive enhancement like material-data-table:
// the server renders plain links (Unpoly follows them), this component only
// adds nav semantics and marks the last crumb as the current page. No M3
// spec exists; styling (in material.css, components layer) uses
// on-surface-variant text with chevron separators that mirror in RTL.
//
//   <material-breadcrumbs>
//     <a href="/" up-target="main">Home</a>
//     <a href="/purchasing/" up-target="main">Purchasing</a>
//     <span>PO-2026-0142</span>
//   </material-breadcrumbs>

@Component({
  tag: 'material-breadcrumbs',
  shadow: true,
})
export class MaterialBreadcrumbs {
  @Element() el!: HTMLElement;

  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  // Re-runs after Unpoly swaps the crumbs (slotchange).
  private markCurrent = () => {
    const items = Array.from(this.el.children) as HTMLElement[];
    if (!items.length) return;
    if (items.some((el) => el.hasAttribute('aria-current'))) return;
    items[items.length - 1].setAttribute('aria-current', 'page');
  };

  componentWillLoad() {
    this.markCurrent();
  }

  render() {
    return (
      <Host role="navigation" aria-label={this.ariaLabel ?? gettext('Breadcrumbs')}>
        <slot onSlotchange={this.markCurrent} />
      </Host>
    );
  }
}
