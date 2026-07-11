import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  h,
} from '@stencil/core';

@Component({
  tag: 'material-fab-menu-item',
  styleUrl: 'material-fab-menu-item.css',
  // delegatesFocus lets the group's roving `host.focus()` land on the inner
  // <a>/<button> — without it, focusing the host did nothing.
  shadow: { delegatesFocus: true },
})
export class MaterialFabMenuItem {
  @Element() el!: HTMLElement;

  @Prop() icon!: string;
  @Prop() label!: string;
  @Prop() value?: string;
  @Prop({ reflect: true }) disabled = false;
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop() download?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event({ bubbles: true, composed: true })
  materialFabMenuItemActivate!: EventEmitter<{ value?: string }>;

  private activate = () => {
    if (this.disabled) return;
    this.materialFabMenuItemActivate.emit({ value: this.value });
  };

  private handleClick = (e: MouseEvent) => {
    if (this.disabled) {
      e.preventDefault();
      return;
    }
    this.activate();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    // For link items, let the browser handle activation natively: keyboard
    // activation of an <a> dispatches a click, which runs handleClick →
    // activate() and then follows the href. Calling preventDefault here (as
    // before) killed the navigation entirely.
    if (this.href) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.activate();
    }
  };

  render() {
    const inner = [
      <span class="state-layer" aria-hidden="true"></span>,
      <span class="icon" aria-hidden="true">{this.icon}</span>,
      <span class="label">{this.label}</span>,
    ];

    if (this.href && !this.disabled) {
      const rel =
        this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);
      return (
        <Host role="menuitem">
          <a
            href={this.href}
            target={this.target}
            rel={rel}
            download={this.download}
            aria-label={this.ariaLabel}
            part="item"
            class="item"
            onClick={this.handleClick}
            onKeyDown={this.handleKeyDown}
          >
            {inner}
          </a>
        </Host>
      );
    }

    return (
      <Host role="menuitem">
        <button
          type="button"
          disabled={this.disabled}
          aria-label={this.ariaLabel}
          part="item"
          class="item"
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
        >
          {inner}
        </button>
      </Host>
    );
  }
}
