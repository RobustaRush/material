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
  Watch,
  h,
} from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';

// MD3-styled option for `material-select`. Visually mirrors a
// `material-menu-item` (48dp single-line, 64dp two-line) but emits its own
// `materialOptionSelect` event so a parent select can intercept without
// colliding with the menu's `materialMenuSelect` channel.

@Component({
  tag: 'material-option',
  styleUrl: 'material-option.css',
  shadow: true,
})
export class MaterialOption {
  @Element() el!: HTMLElement;

  @Prop() value = '';
  @Prop() label?: string;
  @Prop() leadingIcon?: string;
  @Prop() trailingIcon?: string;
  @Prop() supportingText?: string;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ mutable: true, reflect: true }) selected = false;
  // Set by parent material-select (not declared as attribute). When true,
  // renders a checkbox glyph and emits `materialOptionToggle` instead of
  // `materialOptionSelect`, and Enter/Space don't close the menu.
  @Prop({ mutable: true }) multi = false;

  @Event({ bubbles: true, composed: true })
  materialOptionSelect!: EventEmitter<{ value: string }>;

  @Event({ bubbles: true, composed: true })
  materialOptionToggle!: EventEmitter<{ value: string; selected: boolean }>;

  // Request-selection channel (reference selectOptionController.ts:105-127):
  // lets a parent material-select notice `option.selected = true/false` set
  // *programmatically* from outside (SSR hydration aside, the only other
  // writers are the select's own `applySelection()` and click/keyboard,
  // which already go through materialOptionSelect/materialOptionToggle).
  // Guarded two ways against feeding back into a loop with
  // `applySelection()`: `loaded` skips the initial attribute-driven set, and
  // the select's own handlers no-op when its value/values already agree
  // with the event (which they do the instant `applySelection()` is the one
  // doing the writing, since it always runs *after* the select's own state
  // is updated).
  @Event({ bubbles: true, composed: true })
  materialOptionRequestSelection!: EventEmitter<{ value: string }>;

  @Event({ bubbles: true, composed: true })
  materialOptionRequestDeselection!: EventEmitter<{ value: string }>;

  private loaded = false;

  private activate = (e?: Event) => {
    if (this.disabled) return;
    e?.stopPropagation();
    if (this.multi) {
      this.materialOptionToggle.emit({ value: this.value, selected: !this.selected });
    } else {
      this.materialOptionSelect.emit({ value: this.value });
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.activate(e);
    }
  };

  // Don't steal focus from whatever opened the menu — the host (e.g.
  // material-select) manages focus restoration. Letting the click move
  // focus first makes the textfield's floating label flicker down then up.
  private handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
  };

  @Watch('selected')
  onSelectedChange(next: boolean) {
    // Not yet mounted: this is the initial `selected` attribute being
    // hydrated into the prop, not an external write — nothing to notify.
    if (!this.loaded) return;
    if (next) {
      this.materialOptionRequestSelection.emit({ value: this.value });
    } else {
      this.materialOptionRequestDeselection.emit({ value: this.value });
    }
  }

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
    this.loaded = true;
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
  }

  render() {
    const twoLine = !!this.supportingText;
    // In multi mode, render a 20dp checkbox glyph. If a leading-icon is
    // already set, place the checkbox at the trailing edge to avoid
    // overlap; otherwise place it leading.
    const checkGlyph = this.multi && (
      <span class="check-icon" aria-hidden="true">
        {this.selected ? 'check_box' : 'check_box_outline_blank'}
      </span>
    );
    const checkAtTrailing = this.multi && !!this.leadingIcon;
    return (
      <Host
        role="option"
        tabindex={this.disabled ? -1 : 0}
        aria-disabled={this.disabled ? 'true' : null}
        aria-selected={this.selected ? 'true' : 'false'}
        aria-checked={this.multi ? (this.selected ? 'true' : 'false') : null}
        onClick={this.activate}
        onMouseDown={this.handleMouseDown}
        onKeyDown={this.handleKeyDown}
      >
        <div
          class={[
            'row',
            twoLine ? 'two-line' : '',
            this.disabled ? 'disabled' : '',
            this.selected ? 'selected' : '',
          ].filter(Boolean).join(' ')}
          data-ripple
          aria-disabled={this.disabled ? 'true' : null}
        >
          <span class="state-layer" aria-hidden="true"></span>
          <span class="md-ripple" aria-hidden="true"></span>

          <span class="leading">
            <slot name="leading">
              {this.leadingIcon ? (
                <span class="icon" aria-hidden="true">
                  {this.leadingIcon}
                </span>
              ) : (this.multi ? checkGlyph : null)}
            </slot>
          </span>

          <span class="text">
            <span class="label">
              <slot>{this.label}</slot>
            </span>
            {twoLine && (
              <span class="supporting-text">
                <slot name="supporting-text">{this.supportingText}</slot>
              </span>
            )}
          </span>

          <span class="trailing">
            <slot name="trailing">
              {this.trailingIcon && (
                <span class="icon" aria-hidden="true">
                  {this.trailingIcon}
                </span>
              )}
            </slot>
            {checkAtTrailing && <span class="trailing-check">{checkGlyph}</span>}
          </span>
        </div>
      </Host>
    );
  }
}
