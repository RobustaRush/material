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
  Event,
  EventEmitter,
  Prop,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';
import { handleFormSubmitterClick } from '../../utils/form-submitter';

export type MaterialButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text';
export type MaterialButtonType = 'submit' | 'reset' | 'button';
export type MaterialButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';

@Component({
  tag: 'material-button',
  styleUrl: 'material-button.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialButton {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ reflect: true }) variant: MaterialButtonVariant = 'filled';
  @Prop({ reflect: true }) size: MaterialButtonSize = 's';
  /** Native `<button>` parity: defaults to `submit` (like a plain `<button>`
   *  in a form), not `button`. Set `type="button"` explicitly to opt out. */
  @Prop() type: MaterialButtonType = 'submit';
  // mutable: formDisabledCallback writes this back; without it Stencil warns
  // ("immutable prop was modified from within the component") on every form-
  // disable toggle.
  @Prop({ reflect: true, mutable: true }) disabled = false;
  /** Disabled but still focusable/reachable by keyboard and AT, per
   *  https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_disabled_controls.
   *  Visually identical to `disabled`; the click handler blocks activation
   *  instead of the element leaving the tab order. */
  @Prop({ reflect: true, attribute: 'soft-disabled' }) softDisabled = false;
  @Prop({ reflect: true, attribute: 'shape-morph' }) shapeMorph = false;
  /** Resting corner shape. `round` is the pill default; `square` uses the
   *  small rounded-rect resting radius (parity with icon-button's `shape`). */
  @Prop({ reflect: true }) shape: 'round' | 'square' = 'round';
  /** Toggle (selectable) button — exposes `aria-pressed`, a selected color
   *  treatment and a shape morph. Enables label-button selection inside
   *  `material-button-group`. */
  @Prop({ reflect: true }) toggle = false;
  @Prop({ mutable: true, reflect: true }) selected = false;
  @Prop() label?: string;
  @Prop() icon?: string;
  @Prop() trailingIcon?: string;
  @Prop() name?: string;
  @Prop() value?: string;
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop() download?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  @Prop({ attribute: 'popovertarget' }) popoverTarget?: string;
  @Prop({ attribute: 'popovertargetaction' }) popoverTargetAction?: 'toggle' | 'show' | 'hide';

  @Event() selectedChange!: EventEmitter<{ selected: boolean }>;

  private defaultSelected = false;

  componentWillLoad() {
    this.defaultSelected = this.selected;
  }

  connectedCallback() {
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  // Toggle buttons contribute name/value to FormData only while selected, like a
  // checkbox. Non-toggle buttons stay form-value-less (they submit via the
  // transient hidden input in handleClick when type="submit").
  @Watch('selected')
  @Watch('toggle')
  @Watch('value')
  @Watch('disabled')
  syncFormValue() {
    if (this.toggle && !this.disabled) {
      this.internals.setFormValue(this.selected ? (this.value ?? 'on') : null);
    } else {
      this.internals.setFormValue(null);
    }
  }

  formResetCallback() {
    if (this.toggle) this.selected = this.defaultSelected;
  }

  formStateRestoreCallback(state: string | null) {
    if (this.toggle) this.selected = state === (this.value ?? 'on');
  }

  private handleClick = (e: MouseEvent) => {
    if (this.softDisabled) {
      // Native <button disabled> never fires click; a soft-disabled button
      // stays enabled so it can, so stop it here — and stop propagation too,
      // matching material-web's Button.handleClick, so a listener on the host
      // element doesn't see activation either.
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    if (this.disabled) {
      e.preventDefault();
      return;
    }
    if (this.toggle) {
      this.selected = !this.selected;
      this.selectedChange.emit({ selected: this.selected });
      return;
    }
    if (this.href) return;
    if (this.popoverTarget) {
      const root = this.el.getRootNode() as Document | ShadowRoot;
      const target = (root as Document).getElementById?.(this.popoverTarget);
      if (target && 'togglePopover' in target) {
        const action = this.popoverTargetAction ?? 'toggle';
        const t = target as HTMLElement & {
          togglePopover: (force?: boolean) => void;
          showPopover: () => void;
          hidePopover: () => void;
          show?: (anchorEl?: Element) => void;
          hide?: () => void;
        };
        // togglePopover() doesn't set ToggleEvent.source, so an anchored
        // material-menu opens top-left. Use its show(anchorEl) method to pass
        // this element as the anchor.
        if (t.localName === 'material-menu' && typeof t.show === 'function') {
          const isOpen = t.matches(':popover-open');
          if (action === 'hide' || (action === 'toggle' && isOpen)) t.hide!();
          else t.show(this.el);
        } else if (action === 'show') t.showPopover();
        else if (action === 'hide') t.hidePopover();
        else t.togglePopover();
        return;
      }
    }
    const form = this.internals.form;
    if (!form) return;
    if (this.type === 'submit' || this.type === 'reset') {
      handleFormSubmitterClick(e, form, this.type, {
        hostElement: this.el,
        name: this.name,
        value: this.value,
      });
    }
  };

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
  }

  disconnectedCallback() {
    this.ripple?.destroy();
    this.ripple = undefined;
  }

  render() {
    const inner = [
      <span class="md-ripple" aria-hidden="true"></span>,
      this.icon && (
        <span class="icon" aria-hidden="true">{this.icon}</span>
      ),
      <slot>{this.label}</slot>,
      this.trailingIcon && (
        <span class="icon" aria-hidden="true">{this.trailingIcon}</span>
      ),
    ];

    // Toggle wins over href: a toggle is a button, so we never render the
    // anchor branch for it (avoids the "toggle silently ignored on a link" trap).
    if (this.href && !this.toggle) {
      const rel =
        this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);
      return (
        <a
          href={this.disabled ? undefined : this.href}
          target={this.target}
          rel={rel}
          download={this.download}
          aria-label={this.ariaLabel}
          aria-disabled={this.disabled || this.softDisabled ? 'true' : undefined}
          tabindex={this.disabled ? -1 : undefined}
          part="button"
          data-ripple
          onClick={this.handleClick}
        >
          {inner}
        </a>
      );
    }

    return (
      <button
        type={this.toggle ? 'button' : this.type}
        disabled={this.disabled}
        aria-pressed={this.toggle ? String(this.selected) : undefined}
        aria-disabled={this.softDisabled ? 'true' : undefined}
        aria-label={this.ariaLabel}
        part="button"
        data-ripple
        onClick={this.handleClick}
      >
        {inner}
      </button>
    );
  }
}
