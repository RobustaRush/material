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

// MD3 Badge — notification / count indicator anchored to a host icon.
// Spec: docs/wiki/specs/google-material/badges/specs.md
//
//   value absent / empty → small dot (6×6dp, 3dp radius), `aria-hidden`
//   value present        → large pill (16dp tall, 8dp radius, expands width)
//
// The component renders only the visual; positioning is owned by the host's
// `<slot name="badge">` wrapper (see material-icon-button, material-navigation-item).
// Caller is responsible for clamping `value` to four characters per MD3 — the
// component does not interpret or truncate the string.
//
// For ad-hoc use on a custom icon, wrap in a positioned ancestor:
//
//   <span style="position: relative; display: inline-flex">
//     <span class="material-symbols">mail</span>
//     <span style="position: absolute; top: 0; right: 0; transform: translate(50%, -50%)">
//       <material-badge value="3"></material-badge>
//     </span>
//   </span>

export type MaterialBadgeColor = 'error' | 'primary' | 'tertiary';

@Component({
  tag: 'material-badge',
  styleUrl: 'material-badge.css',
  shadow: true,
})
export class MaterialBadge {
  @Prop() value?: string;
  @Prop({ reflect: true }) color: MaterialBadgeColor = 'error';

  render() {
    const isLarge = this.value != null && this.value !== '';

    if (!isLarge) {
      return (
        <Host>
          <span class="dot" aria-hidden="true"></span>
        </Host>
      );
    }

    return (
      <Host>
        <span class="pill">{this.value}</span>
      </Host>
    );
  }
}
