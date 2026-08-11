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

import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  h,
} from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';

// MD3 list item. Heights follow the baseline spec:
//   1-line  56dp  (text-only / leading icon)
//   2-line  72dp  (label + supporting-text)
//   3-line  88dp  (overline + label + supporting-text, top-aligned)
// Slots: leading | (default = label) | trailing — slotted content overrides
// the matching icon/text props for richer cases (avatar, image, checkbox,
// switch).

@Component({
  tag: 'material-list-item',
  styleUrl: 'material-list-item.css',
  shadow: true,
})
export class MaterialListItem {
  @Element() el!: HTMLElement;

  @Prop() label?: string;
  @Prop() overline?: string;
  @Prop() supportingText?: string;
  @Prop() leadingIcon?: string;
  @Prop() trailingIcon?: string;
  @Prop() trailingText?: string;
  @Prop() value?: string;
  @Prop() href?: string;

  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true, mutable: true }) selected = false;
  /** Master-detail "currently open / focused" highlight, distinct from `selected`.
   *  In `selection-trigger="control"` mode the parent list manages this
   *  automatically: the most recently activated item is `active`, others
   *  are not. Visually subtler than `selected` so checked rows still stand
   *  out from the open one. */
  @Prop({ reflect: true, mutable: true }) active = false;
  @Prop({ reflect: true }) divider: 'top' | 'bottom' | 'none' = 'none';
  /** Internal — set by the parent list for roving tabindex. */
  @Prop({ mutable: true }) tabbable = false;

  /** Internal: tells the parent list this item was activated. */
  @Event({ bubbles: true, composed: true })
  materialListItemActivate!: EventEmitter<{ value?: string; checked?: boolean }>;

  /** True when the light DOM has real headline content for the default
   *  slot — an unslotted element or non-whitespace text. */
  private hasDefaultContent(): boolean {
    return Array.from(this.el.childNodes).some((n) =>
      (n.nodeType === Node.ELEMENT_NODE && !(n as Element).hasAttribute('slot')) ||
      (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''));
  }

  // In a selectable list the row (role=option, aria-selected) is the single
  // interactive stop; a slotted leading checkbox is its visual — it must not
  // be a second tab stop / nested widget inside the option. It stays a real
  // form control (posts with the form) and is driven by row click / Space.
  componentDidRender() {
    const list = this.el.closest('material-list');
    const sel = list?.getAttribute('selection');
    if (sel !== 'single' && sel !== 'multi') return;
    const cb = this.el.querySelector<HTMLElement>(':scope > material-checkbox[slot="leading"]');
    if (cb) {
      cb.setAttribute('nested', '');
      cb.setAttribute('aria-hidden', 'true');
    }
  }

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
  }

  private parentVariant(): 'baseline' | 'expressive' {
    const list = this.el.closest('material-list') as HTMLElement | null;
    return (list?.getAttribute('variant') as 'baseline' | 'expressive') || 'baseline';
  }

  private parentDense(): boolean {
    const list = this.el.closest('material-list') as HTMLElement | null;
    return !!list && list.hasAttribute('dense');
  }

  private activate = (e?: Event) => {
    if (this.disabled) return;
    const list = this.el.closest('material-list');
    const trigger = list?.getAttribute('selection-trigger') ?? 'row';
    const leading = this.el.querySelector<HTMLElement>(':scope > [slot="leading"]');

    // selection-trigger="control" — the leading control is independent. If
    // the click landed inside it, let the control handle itself (its own
    // change event drives selection). Otherwise emit a plain activate so
    // the consumer can treat row click as "open" without toggling anything.
    if (trigger === 'control') {
      if (e && leading && e.composedPath().includes(leading)) return;
      this.materialListItemActivate.emit({ value: this.value });
      return;
    }

    // selection-trigger="row" (default) — row click toggles a leading checkbox.
    const tag = leading?.tagName.toLowerCase();
    let checked: boolean | undefined;
    if (leading && (tag === 'material-checkbox') && e && !e.composedPath().includes(leading)) {
      const cb = leading as HTMLElement & { checked: boolean };
      cb.checked = !cb.checked;
      checked = cb.checked;
    } else if (leading && tag === 'material-checkbox') {
      checked = (leading as HTMLElement & { checked: boolean }).checked;
    }
    this.materialListItemActivate.emit({ value: this.value, checked });
  };

  private handleClick = (e: MouseEvent) => {
    // Anchor handles its own activation; just emit the event.
    if (this.href) {
      this.materialListItemActivate.emit({ value: this.value });
      return;
    }
    this.activate(e);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.href) {
        (this.el.shadowRoot?.querySelector('a') as HTMLAnchorElement | null)?.click();
      } else {
        this.activate(e);
      }
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      // In control mode Space toggles a leading checkbox (bulk-select gesture)
      // without changing which row is active. Falls through to activate when
      // there is no leading checkbox to toggle, or in row-trigger mode.
      const list = this.el.closest('material-list');
      const trigger = list?.getAttribute('selection-trigger') ?? 'row';
      if (trigger === 'control') {
        const cb = this.el.querySelector(':scope > material-checkbox[slot="leading"]') as
          | (HTMLElement & { toggle?: () => Promise<void> })
          | null;
        if (cb?.toggle) {
          cb.toggle();
          return;
        }
      }
      this.activate(e);
    }
  };

  render() {
    const expressive = this.parentVariant() === 'expressive';
    const dense = this.parentDense();
    const twoLine = !!this.supportingText;
    const threeLine = !!this.overline && !!this.supportingText;

    // selected (checked) wins visually over active (master-detail open).
    // active uses a tinted secondary surface so checked rows still stand out
    // (full container) next to active rows (half-tinted container).
    const rowCls = [
      'row',
      threeLine ? 'three-line' : twoLine ? 'two-line' : 'one-line',
      dense ? 'dense' : '',
      expressive ? 'expressive' : '',
      this.selected ? 'selected' : '',
      !this.selected && this.active ? 'active' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    const inner = (
      <div class={rowCls} data-ripple aria-disabled={this.disabled ? 'true' : null}>
        <span class="state-layer" aria-hidden="true"></span>
        <span class="md-ripple" aria-hidden="true"></span>

        <span class="leading">
          <slot name="leading">
            {this.leadingIcon && (
              <span class="icon" aria-hidden="true">
                {this.leadingIcon}
              </span>
            )}
          </slot>
        </span>

        <span class="text">
          {this.overline && (
            <span class="overline">
              {this.overline}
            </span>
          )}
          <span class="label">
            {/* Not slot fallback: whitespace between slotted children (e.g. a
                trailing icon-button on its own line) counts as assigned text
                and would suppress the fallback, silently eating `label`. */}
            <slot />
            {!this.hasDefaultContent() && this.label}
          </span>
          {twoLine && (
            <span class="supporting-text">
              {this.supportingText}
            </span>
          )}
        </span>

        <span class="trailing">
          <slot name="trailing">
            {this.trailingText && (
              <span class="trailing-text">{this.trailingText}</span>
            )}
            {this.trailingIcon && (
              <span class="icon trailing-icon" aria-hidden="true">
                {this.trailingIcon}
              </span>
            )}
          </slot>
        </span>
      </div>
    );

    // ARIA role: both single- and multi-select present as listbox options with
    // aria-selected (a role="option" is invalid outside a listbox, and
    // menuitemcheckbox is invalid outside a menu). Plain lists → listitem.
    const list = this.el.closest('material-list');
    const sel = list?.getAttribute('selection');
    const selectable = sel === 'single' || sel === 'multi';
    const role = selectable ? 'option' : 'listitem';
    const ariaSelected = selectable ? (this.selected ? 'true' : 'false') : null;

    return (
      <Host
        role={role}
        aria-selected={ariaSelected}
        aria-disabled={this.disabled ? 'true' : null}
        tabindex={this.disabled ? -1 : this.tabbable ? 0 : -1}
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
      >
        {this.href ? (
          <a
            href={this.href}
            class="link"
            tabIndex={-1}
          >
            {inner}
          </a>
        ) : (
          inner
        )}
      </Host>
    );
  }
}
