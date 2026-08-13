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
  Method,
  Prop,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';

export type MaterialChipVariant = 'assist' | 'filter' | 'input' | 'suggestion';

@Component({
  tag: 'material-chip',
  styleUrl: 'material-chip.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialChip {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ reflect: true }) variant: MaterialChipVariant = 'assist';
  @Prop({ reflect: true }) elevated = false;
  @Prop({ reflect: true, mutable: true }) selected = false;
  @Prop({ reflect: true }) disabled = false;
  /** Disabled but still focusable/reachable by keyboard and AT, per
   *  https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_disabled_controls.
   *  Visually identical to `disabled`; the click handler blocks activation
   *  instead of the element leaving the tab order. */
  @Prop({ reflect: true, attribute: 'soft-disabled' }) softDisabled = false;
  @Prop() label?: string;
  @Prop() icon?: string;
  @Prop() trailingIcon?: string;
  @Prop() name?: string;
  @Prop() value = 'on';
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop() download?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  /** Roving-tabindex slot, driven by material-chip-set (mirrors
   *  material-radio's `focusable`). When false the primary action leaves the
   *  tab order (tabindex -1); the trailing remove action is always -1 — it's
   *  reached by arrow keys within the chip, never by Tab. */
  @Prop({ mutable: true }) tabbable = true;

  @Event() selectedChange!: EventEmitter<{ selected: boolean }>;
  @Event() remove!: EventEmitter<void>;

  // Refs to the shadow-DOM interactive elements — set is either
  // [part="chip"] itself (button/anchor variants) or `.body` (input variant's
  // primary action); trailing only exists on the input variant.
  private primaryActionEl?: HTMLButtonElement | HTMLAnchorElement;
  private trailingActionEl?: HTMLButtonElement;
  // True while the trailing action holds focus (the shift-tab trick window).
  // Folded into the rendered tabindex so a re-render triggered mid-window —
  // e.g. chip-set's focusin syncRoving flipping `tabbable` false→true when
  // arrowing backwards into this chip's trailing action — doesn't restore the
  // primary action to the tab order and break the Shift+Tab exit.
  private trailingFocused = false;

  // The shift-tab trick writes primaryActionEl.tabIndex directly, which
  // desyncs Stencil's vdom attribute cache: a later render that computes -1
  // against a cached -1 skips the DOM write, leaving a stale tabindex="0"
  // (two tab stops in the set). Mirror `tabbable` imperatively so the DOM is
  // correct regardless of what the vdom thinks it already applied.
  @Watch('tabbable')
  syncPrimaryTabIndex(tabbable: boolean) {
    if (!this.primaryActionEl || this.trailingFocused) return;
    this.primaryActionEl.tabIndex = tabbable && !this.disabled ? 0 : -1;
  }

  /** Focus the chip's primary action, or its trailing remove action with
   *  `{ trailing: true }`. Used by material-chip-set's arrow-key navigation,
   *  which can't reach into another component's shadow DOM directly. */
  @Method()
  async setFocus(opts?: { trailing?: boolean }): Promise<void> {
    if (this.disabled) return;
    const target = opts?.trailing && this.trailingActionEl ? this.trailingActionEl : this.primaryActionEl;
    target?.focus();
  }

  private defaultSelected = false;

  componentWillLoad() {
    this.defaultSelected = this.selected;
  }

  connectedCallback() {
    this.syncFormValue();
  }

  @Watch('selected')
  @Watch('value')
  @Watch('variant')
  syncFormValue() {
    const selectable = this.variant === 'filter' || this.variant === 'input';
    this.internals.setFormValue(selectable && this.selected ? this.value : null);
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.selected = this.defaultSelected;
  }

  formStateRestoreCallback(state: string | null) {
    this.selected = state === this.value;
  }

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
  }

  private isSelectable() {
    return this.variant === 'filter' || this.variant === 'input';
  }

  // A chip in a single-select set is one of many rather than an independent
  // toggle, so it reports radio instead of checkbox. Read off the parent the way
  // material-list-item reads its list's density and selection trigger.
  private inSingleSet() {
    return this.el.closest('material-chip-set')?.getAttribute('selection') === 'single';
  }

  private toggle = () => {
    if (this.disabled || this.softDisabled) return;
    if (this.isSelectable()) {
      this.selected = !this.selected;
      this.selectedChange.emit({ selected: this.selected });
      // Filter chips only (matches the reference — input chips are not
      // selectable in material-web; this repo made them selectable too, but
      // that's a divergence and not what "native events" was scoped to).
      // Duplicated here instead of importing src/utils/form-events.ts
      // (dispatchNativeEvents) — that file is being introduced by a parallel
      // task; consolidate once it lands.
      if (this.variant === 'filter') {
        // CustomEvent, not Event: the Stencil `Event` decorator import shadows
        // the global Event constructor in this module.
        this.el.dispatchEvent(new CustomEvent('input', { bubbles: true, composed: true }));
        this.el.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: false }));
      }
    }
  };

  // Wraps toggle() for the primary action's onClick. A soft-disabled chip
  // stays native-enabled (so it's keyboard/AT reachable), so unlike disabled
  // it does fire click — stop it from reaching a listener on the host element
  // too, matching material-web's Chip.handleClick.
  private handleClick = (e: MouseEvent) => {
    if (this.softDisabled) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    this.toggle();
  };

  // Link (href) chips aren't selectable, so this only ever blocks navigation
  // — soft-disabled keeps the href (see render()) so the anchor stays a real,
  // focusable link, and this stops the click that would otherwise follow it.
  private handleLinkClick = (e: MouseEvent) => {
    if (this.softDisabled) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    if (this.disabled) e.preventDefault();
  };

  // remove is cancelable (Stencil @Event default) — if a listener calls
  // preventDefault() the chip stays; otherwise it removes itself from the DOM
  // (chips/internal/trailing-icons.ts handleRemoveClick).
  private emitRemove() {
    const event = this.remove.emit();
    if (!event.defaultPrevented) this.el.remove();
  }

  private isRtl(): boolean {
    return getComputedStyle(this.el).direction === 'rtl';
  }

  // Input chips: ArrowLeft/Right moves focus between the primary action and
  // the trailing remove action, RTL-aware. Only handles the direction that
  // stays inside the chip — the other direction is left to bubble up to
  // material-chip-set, which moves focus to the sibling chip
  // (multi-action-chip.ts:79-105).
  private handleMultiActionArrow = (e: KeyboardEvent, fromTrailing: boolean) => {
    if (this.variant !== 'input' || !this.primaryActionEl || !this.trailingActionEl) return;
    const isLeft = e.key === 'ArrowLeft';
    const isRight = e.key === 'ArrowRight';
    if (!isLeft && !isRight) return;
    const forwards = this.isRtl() ? isLeft : isRight;
    if ((forwards && fromTrailing) || (!forwards && !fromTrailing)) return;
    e.preventDefault();
    e.stopPropagation();
    (forwards ? this.trailingActionEl : this.primaryActionEl).focus();
  };

  private handleBodyKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      this.handleMultiActionArrow(e, false);
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggle();
      return;
    }
    // Input chips: Backspace/Delete on the focused chip removes it
    // (chips/accessibility.md § Keyboard). Arrow-key navigation above stays
    // live under soft-disabled (focus movement isn't activation); removal
    // isn't.
    if (this.variant === 'input' && !this.softDisabled && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      this.emitRemove();
    }
  };

  // "Remove {label}" per spec, falling back to the slotted text content.
  private removeLabel(): string {
    const name = this.label ?? this.el.textContent?.trim() ?? '';
    return `Remove ${name}`.trim();
  }

  private handleTrailingClick = (e: MouseEvent) => {
    if (this.softDisabled) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    if (this.disabled) return;
    this.emitRemove();
  };

  private handleTrailingKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      this.handleMultiActionArrow(e, true);
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!this.disabled && !this.softDisabled) this.emitRemove();
    }
  };

  // The shift-tab trick: while the trailing action is focused, temporarily
  // drop the primary action out of the tab order so Shift+Tab exits the chip
  // (to the previous chip / whatever precedes it) instead of landing back on
  // the primary action (multi-action-chip.ts:113-127).
  private handleTrailingFocus = () => {
    const { primaryActionEl, trailingActionEl } = this;
    if (!primaryActionEl || !trailingActionEl) return;
    this.trailingFocused = true;
    primaryActionEl.tabIndex = -1;
    trailingActionEl.addEventListener(
      'focusout',
      () => {
        this.trailingFocused = false;
        primaryActionEl.tabIndex = this.tabbable ? 0 : -1;
      },
      { once: true },
    );
  };

  private renderBodyContents(hasAvatar: boolean) {
    // Filter chips reserve a check glyph that is always in the DOM so it can
    // animate its width/scale in on selection (see .check in the CSS) instead
    // of popping via a conditional render. A custom leading icon suppresses it.
    const showCheck = this.variant === 'filter' && !this.icon;
    const leadingIcon = this.icon;

    return [
      <span class="md-ripple" aria-hidden="true"></span>,
      hasAvatar && (
        <span class="avatar" aria-hidden="true">
          <slot name="avatar" />
        </span>
      ),
      showCheck && (
        <span class="icon leading check" aria-hidden="true">check</span>
      ),
      leadingIcon && (
        <span class="icon leading" aria-hidden="true">{leadingIcon}</span>
      ),
      <span class="label"><slot>{this.label}</slot></span>,
    ];
  }

  render() {
    const selectable = this.isSelectable();
    const role = selectable ? (this.inSingleSet() ? 'radio' : 'checkbox') : undefined;
    const ariaChecked = selectable ? String(this.selected) : undefined;
    const hasAvatar = !!this.el.querySelector('[slot="avatar"]');
    const primaryTabIndex = this.tabbable && !this.trailingFocused ? undefined : -1;

    if (this.href) {
      const rel =
        this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);
      const inner = [
        ...this.renderBodyContents(hasAvatar),
        this.trailingIcon && (
          <span class="icon trailing" aria-hidden="true">{this.trailingIcon}</span>
        ),
      ];
      return (
        <a
          ref={(el) => { this.primaryActionEl = el; }}
          href={this.disabled ? undefined : this.href}
          // a disabled link drops its href — without a role the aria-label
          // would sit on a generic element (mirrors material-icon-button).
          role={this.disabled ? 'link' : undefined}
          target={this.target}
          rel={rel}
          download={this.download}
          aria-label={this.ariaLabel ?? this.label ?? undefined}
          aria-disabled={this.disabled || this.softDisabled ? 'true' : undefined}
          tabindex={this.disabled ? -1 : primaryTabIndex}
          part="chip"
          data-ripple
          onClick={this.handleLinkClick}
        >
          {inner}
        </a>
      );
    }

    if (this.variant === 'input') {
      const trailingName = this.trailingIcon ?? 'close';
      return (
        <div part="chip" class={hasAvatar ? 'has-avatar' : undefined}>
          <button
            ref={(el) => { this.primaryActionEl = el; }}
            type="button"
            class="body"
            disabled={this.disabled}
            aria-disabled={this.softDisabled ? 'true' : undefined}
            role={role}
            aria-checked={ariaChecked}
            aria-label={this.ariaLabel ?? this.label ?? undefined}
            tabindex={primaryTabIndex}
            data-ripple
            onClick={this.handleClick}
            onKeyDown={this.handleBodyKeyDown}
          >
            {this.renderBodyContents(hasAvatar)}
          </button>
          <button
            ref={(el) => { this.trailingActionEl = el; }}
            type="button"
            class="trailing-btn"
            disabled={this.disabled}
            aria-disabled={this.softDisabled ? 'true' : undefined}
            aria-label={this.removeLabel()}
            tabindex={-1}
            data-ripple
            onClick={this.handleTrailingClick}
            onKeyDown={this.handleTrailingKeyDown}
            onFocus={this.handleTrailingFocus}
          >
            <span class="md-ripple" aria-hidden="true"></span>
            <span class="icon" aria-hidden="true">{trailingName}</span>
          </button>
        </div>
      );
    }

    const inner = [
      ...this.renderBodyContents(hasAvatar),
      this.trailingIcon && (
        <span class="icon trailing" aria-hidden="true">{this.trailingIcon}</span>
      ),
    ];
    return (
      <button
        ref={(el) => { this.primaryActionEl = el; }}
        type="button"
        disabled={this.disabled}
        aria-disabled={this.softDisabled ? 'true' : undefined}
        role={role}
        aria-checked={ariaChecked}
        aria-label={this.ariaLabel ?? this.label ?? undefined}
        tabindex={primaryTabIndex}
        part="chip"
        data-ripple
        onClick={this.handleClick}
        onKeyDown={this.handleBodyKeyDown}
      >
        {inner}
      </button>
    );
  }
}
