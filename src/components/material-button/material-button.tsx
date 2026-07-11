import { Component, Element, Prop, AttachInternals, h } from '@stencil/core';

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
  @Prop() type: MaterialButtonType = 'button';
  // mutable: formDisabledCallback writes this back; without it Stencil warns
  // ("immutable prop was modified from within the component") on every form-
  // disable toggle.
  @Prop({ reflect: true, mutable: true }) disabled = false;
  @Prop({ reflect: true, attribute: 'shape-morph' }) shapeMorph = false;
  /** Resting corner shape. `round` is the pill default; `square` uses the
   *  small rounded-rect resting radius (parity with icon-button's `shape`). */
  @Prop({ reflect: true }) shape: 'round' | 'square' = 'round';
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

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

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
        };
        if (action === 'show') t.showPopover();
        else if (action === 'hide') t.hidePopover();
        else t.togglePopover();
        return;
      }
    }
    const form = this.internals.form;
    if (!form) return;
    if (this.type === 'submit') {
      // Contribute name/value to FormData like a native submit button does when
      // it's the submitter. ElementInternals can't act as a submitter, so add a
      // transient hidden input for this one submission; the form is serialized
      // synchronously inside requestSubmit(), so we can remove it right after.
      let hidden: HTMLInputElement | undefined;
      if (this.name) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = this.name;
        hidden.value = this.value ?? '';
        form.appendChild(hidden);
      }
      form.requestSubmit();
      hidden?.remove();
    } else if (this.type === 'reset') {
      form.reset();
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--ripple-x', `${e.clientX - rect.left}px`);
    btn.style.setProperty('--ripple-y', `${e.clientY - rect.top}px`);
  };

  render() {
    const inner = [
      this.icon && (
        <span class="icon" aria-hidden="true">{this.icon}</span>
      ),
      <slot>{this.label}</slot>,
      this.trailingIcon && (
        <span class="icon" aria-hidden="true">{this.trailingIcon}</span>
      ),
    ];

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
          onClick={this.handleClick}
          onPointerDown={this.handlePointerDown}
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
        onClick={this.handleClick}
        onPointerDown={this.handlePointerDown}
      >
        {inner}
      </button>
    );
  }
}
