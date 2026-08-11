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

import { Component, Host, Prop, h } from '@stencil/core';

// Non-interactive grouping wrapper for `material-option` children inside
// `material-select`. Renders a small-caps section header above its options.

@Component({
  tag: 'material-optgroup',
  styleUrl: 'material-optgroup.css',
  shadow: true,
})
export class MaterialOptgroup {
  @Prop() label = '';

  render() {
    return (
      <Host role="group" aria-label={this.label}>
        {this.label && (
          <div class="label" aria-hidden="true">
            {this.label}
          </div>
        )}
        <slot />
      </Host>
    );
  }
}
