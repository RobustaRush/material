import { Component, Element, Prop, AttachInternals, h } from '@stencil/core';

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
  @Prop({ reflect: true }) disabled = false;
  @Prop() type: MaterialFabType = 'button';
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
    if (this.type === 'submit') form.requestSubmit();
    else if (this.type === 'reset') form.reset();
  };

  private handlePointerDown = (e: PointerEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--ripple-x', `${e.clientX - rect.left}px`);
    btn.style.setProperty('--ripple-y', `${e.clientY - rect.top}px`);
  };

  render() {
    const inner = (
      <span part="visual">
        <span part="state-layer" aria-hidden="true"></span>
        <span class="icon" aria-hidden="true">{this.icon}</span>
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
