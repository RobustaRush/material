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

import { Component, Element, Prop, Watch, AttachInternals, h } from '@stencil/core';
import { installRipple, RippleHandle } from '../../utils/ripple';
import { handleFormSubmitterClick, resolveSubmitterForm } from '../../utils/form-submitter';

export type MaterialFabSize = 'small' | 'medium' | 'large';
export type MaterialFabVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'primary-container'
  | 'secondary-container'
  | 'tertiary-container';
export type MaterialFabType = 'submit' | 'reset' | 'button';

@Component({
  tag: 'material-fab',
  styleUrl: 'material-fab.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialFab {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop({ reflect: true }) size: MaterialFabSize = 'medium';
  @Prop({ reflect: true }) variant: MaterialFabVariant = 'primary-container';
  @Prop() icon!: string;
  /** When set, the FAB renders "extended": icon + text label side by side in a
   *  pill, instead of the icon-only circle/square. `size` is ignored while
   *  extended — the reference always uses the base (small) height/shape.
   *  Setting/clearing it at runtime animates the width and label fade. */
  @Prop() label?: string;
  @Prop({ reflect: true }) disabled = false;
  @Prop() type: MaterialFabType = 'button';
  /** Native `<button form="id">` parity: submit or reset the form with that
   *  id instead of the enclosing one — the dialog layout, where the button
   *  sits in the actions slot beside the form rather than inside it. The
   *  `form` content attribute is not honoured for custom elements, so this
   *  prop stands in for it. */
  @Prop() form?: string;
  @Prop() name?: string;
  @Prop() value?: string;
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop() download?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  @Prop({ attribute: 'popovertarget' }) popoverTarget?: string;
  @Prop({ attribute: 'popovertargetaction' }) popoverTargetAction?: 'toggle' | 'show' | 'hide';
  /** When true, the FAB fades out as the page scrolls near its bottom edge,
   *  so it stops covering the last rows of content. */
  @Prop({ reflect: true, attribute: 'hide-near-end' }) hideNearEnd = false;
  /** Distance from the document bottom (in px) at which the FAB starts to hide. */
  @Prop({ attribute: 'hide-offset' }) hideOffset = 80;

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  private get isExtended(): boolean {
    return !!this.label && this.label.trim().length > 0;
  }

  @Watch('label')
  onLabelChange() {
    this.syncExtendedAttr();
  }

  private syncExtendedAttr() {
    this.el.toggleAttribute('extended', this.isExtended);
  }

  connectedCallback() {
    // Set before the first paint so a FAB that starts extended doesn't
    // animate in from the collapsed state.
    this.syncExtendedAttr();
    if (this.hideNearEnd) this.attachScrollListener();
  }

  disconnectedCallback() {
    this.detachScrollListener();
    this.ripple?.destroy();
    this.ripple = undefined;
  }

  @Watch('hideNearEnd')
  onHideNearEndChange(v: boolean) {
    if (v) this.attachScrollListener();
    else {
      this.detachScrollListener();
      this.el.removeAttribute('near-end');
    }
  }

  private attachScrollListener() {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll);
    this.onScroll();
  }

  private detachScrollListener() {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
  }

  private onScroll = () => {
    const doc = document.documentElement;
    const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
    const nearEnd = remaining <= this.hideOffset;
    if (nearEnd) this.el.setAttribute('near-end', '');
    else this.el.removeAttribute('near-end');
  };

  private handleClick = (e: MouseEvent) => {
    if (this.disabled) {
      e.preventDefault();
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
    const form = resolveSubmitterForm(this.el, this.internals, this.form);
    if (!form) return;
    if (this.type === 'submit' || this.type === 'reset') {
      handleFormSubmitterClick(e, form, this.type, {
        hostElement: this.el,
        name: this.name,
        value: this.value,
        formId: this.form,
      });
    }
  };

  private ripple?: RippleHandle;

  componentDidLoad() {
    this.ripple = installRipple(this.el.shadowRoot!);
  }

  render() {
    const inner = (
      <span part="visual">
        <span class="md-ripple" aria-hidden="true"></span>
        <span part="state-layer" aria-hidden="true"></span>
        <span class="icon" aria-hidden="true">{this.icon}</span>
        <span class="label-track">
          <span class="label">{this.label}</span>
        </span>
      </span>
    );

    if (this.href) {
      const rel =
        this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);
      return (
        <a
          href={this.disabled ? undefined : this.href}
          target={this.target}
          rel={rel}
          download={this.download}
          aria-label={this.ariaLabel}
          aria-disabled={this.disabled ? 'true' : undefined}
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
        type={this.type}
        disabled={this.disabled}
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
