import { Component, Host, Prop, State, h } from '@stencil/core';

export type MaterialCarouselItemAspect = '16:9' | '9:16' | '1:1' | '3:4';

@Component({
  tag: 'material-carousel-item',
  styleUrl: 'material-carousel-item.css',
  // delegatesFocus so the carousel's roving arrow-key `item.focus()` lands on
  // the inner <a>/<button> (link/clickable variants) rather than being a
  // no-op on the non-focusable host. The plain variant keeps its host
  // tabindex and is focused directly.
  shadow: { delegatesFocus: true },
})
export class MaterialCarouselItem {
  @Prop({ reflect: true }) aspect?: MaterialCarouselItemAspect;
  @Prop() href?: string;
  @Prop() target?: '_self' | '_blank' | '_parent' | '_top';
  @Prop() rel?: string;
  @Prop({ reflect: true }) clickable = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() private hasText = false;

  private onTextSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    this.hasText = slot.assignedNodes({ flatten: true }).some(
      (n) =>
        n.nodeType === Node.ELEMENT_NODE ||
        (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''),
    );
  };

  private onBlockedClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  render() {
    const isLink = !!this.href;
    const isButton = !isLink && this.clickable;
    const rel = this.rel ?? (this.target === '_blank' ? 'noopener noreferrer' : undefined);

    const inner = [
      <slot name="media" />,
      <slot />,
      <div part="text" hidden={!this.hasText}>
        <slot name="headline" onSlotchange={this.onTextSlotChange} />
        <slot name="supporting" onSlotchange={this.onTextSlotChange} />
      </div>,
      <span part="state-layer" aria-hidden="true" />,
    ];

    if (isLink) {
      return (
        <Host>
          <a
            part="surface"
            href={this.disabled ? undefined : this.href}
            target={this.target}
            rel={rel}
            aria-label={this.ariaLabel}
            aria-disabled={this.disabled ? 'true' : undefined}
            tabindex={this.disabled ? -1 : 0}
            onClick={this.disabled ? this.onBlockedClick : undefined}
          >
            {inner}
          </a>
        </Host>
      );
    }

    if (isButton) {
      return (
        <Host>
          <button
            part="surface"
            type="button"
            disabled={this.disabled}
            aria-label={this.ariaLabel}
          >
            {inner}
          </button>
        </Host>
      );
    }

    return (
      <Host tabindex={this.disabled ? -1 : 0}>
        <div part="surface" aria-label={this.ariaLabel}>
          {inner}
        </div>
      </Host>
    );
  }
}
