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

import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

export type MaterialAvatarSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type MaterialAvatarColor =
  | 'auto'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'primary-container'
  | 'secondary-container'
  | 'tertiary-container'
  | 'surface';

// Avatar — image / initials / icon fallback in a circle. Not an MD3-spec
// component (Material never shipped one); tokens follow the container/
// on-container pairs. `color="auto"` hashes the name so a given user gets
// a stable color without the server picking one.
//
//   <material-avatar name="Grace Hopper"></material-avatar>          → "GH"
//   <material-avatar name="Grace" src="/u/7.jpg"></material-avatar>  → photo
//   <material-avatar icon="support_agent"></material-avatar>         → glyph

const AUTO_COLORS: MaterialAvatarColor[] = [
  'primary-container',
  'secondary-container',
  'tertiary-container',
];

@Component({
  tag: 'material-avatar',
  styleUrl: 'material-avatar.css',
  shadow: true,
})
export class MaterialAvatar {
  @Element() el!: HTMLElement;

  /** Full name — drives derived initials, auto color and the aria-label. */
  @Prop() name?: string;

  /** Override the derived initials (max ~2 chars look right). */
  @Prop() initials?: string;

  /** Image URL; falls back to initials/icon while loading or on error. */
  @Prop() src?: string;

  /** Material Symbols glyph used when there is no name and no image. */
  @Prop() icon = 'person';

  /** xs=24dp s=32dp m=40dp (default) l=48dp xl=64dp — rem-based. */
  @Prop({ reflect: true }) size: MaterialAvatarSize = 'm';

  @Prop({ reflect: true }) color: MaterialAvatarColor = 'auto';

  @State() imageFailed = false;

  @Watch('src')
  onSrcChange() {
    this.imageFailed = false;
  }

  private derivedInitials(): string {
    if (this.initials) return this.initials;
    const words = (this.name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const first = [...words[0]][0] ?? '';
    const last = words.length > 1 ? [...words[words.length - 1]][0] ?? '' : '';
    return (first + last).toLocaleUpperCase();
  }

  private effectiveColor(): MaterialAvatarColor {
    if (this.color !== 'auto') return this.color;
    const key = this.name ?? this.initials ?? '';
    if (!key) return 'surface';
    let hash = 0;
    for (const ch of key) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
    return AUTO_COLORS[hash % AUTO_COLORS.length];
  }

  render() {
    const initials = this.derivedInitials();
    const showImage = !!this.src && !this.imageFailed;
    const label = this.name || this.initials;
    return (
      <Host
        role="img"
        aria-label={label ?? undefined}
        aria-hidden={label ? undefined : 'true'}
        data-color={this.effectiveColor()}
      >
        <span class="circle">
          {showImage ? (
            <img
              src={this.src}
              alt=""
              loading="lazy"
              onError={() => (this.imageFailed = true)}
            />
          ) : initials ? (
            <span class="initials">{initials}</span>
          ) : (
            <span class="icon" aria-hidden="true">{this.icon}</span>
          )}
        </span>
      </Host>
    );
  }
}
