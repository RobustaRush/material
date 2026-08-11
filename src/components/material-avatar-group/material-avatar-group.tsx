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

import { Component, Element, Host, Prop, State, h } from '@stencil/core';
import type { MaterialAvatarSize } from '../material-avatar/material-avatar';

// Overlapping stack of material-avatars with a "+N" overflow chip.
//
//   <material-avatar-group max="3" size="s">
//     <material-avatar name="Grace Hopper"></material-avatar>
//     <material-avatar name="Ada Lovelace"></material-avatar>
//     …
//   </material-avatar-group>
//
// The group forces its `size` onto slotted avatars so a server template
// doesn't have to repeat it. Avatars beyond `max` are hidden and counted
// into the overflow chip.

@Component({
  tag: 'material-avatar-group',
  styleUrl: 'material-avatar-group.css',
  shadow: true,
})
export class MaterialAvatarGroup {
  @Element() el!: HTMLElement;

  /** Max visible avatars; the rest collapse into "+N". 0 = show all. */
  @Prop() max = 4;

  /** Size applied to every slotted avatar and the overflow chip. */
  @Prop({ reflect: true }) size: MaterialAvatarSize = 'm';

  @State() overflow = 0;

  private avatars(): HTMLElement[] {
    return Array.from(this.el.querySelectorAll<HTMLElement>(':scope > material-avatar'));
  }

  private sync = () => {
    const avatars = this.avatars();
    const names: string[] = [];
    avatars.forEach((a, i) => {
      (a as HTMLElement & { size: MaterialAvatarSize }).size = this.size;
      const hide = this.max > 0 && i >= this.max;
      a.toggleAttribute('hidden', hide);
      if (hide) {
        const n = a.getAttribute('name');
        if (n) names.push(n);
      }
    });
    this.overflow = this.max > 0 ? Math.max(0, avatars.length - this.max) : 0;
    this.overflowNames = names.join(', ');
  };

  private overflowNames = '';

  componentWillLoad() {
    this.sync();
  }

  render() {
    return (
      <Host role="group">
        <slot onSlotchange={this.sync} />
        {this.overflow > 0 && (
          <material-avatar
            class="overflow"
            initials={`+${this.overflow}`}
            color="surface"
            size={this.size}
            title={this.overflowNames || undefined}
            aria-label={this.overflowNames || `+${this.overflow}`}
          />
        )}
      </Host>
    );
  }
}
