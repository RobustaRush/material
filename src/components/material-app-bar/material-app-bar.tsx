import { Component, Element, Prop, State, Watch, h, Host } from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 Expressive top app bar — small / medium-flexible / large-flexible.
// Search variant lives in <material-search-app-bar>.
//
// Spec: docs/wiki/specs/google-material/app-bars/specs.md
//
// Heights (dp = px):
//   small  64
//   medium 112 expanded → 64 collapsed (Headline Medium → Title Large)
//   large  120 expanded → 64 collapsed (Display Small  → Title Large)
//
// On scroll the container fills with `surface container` instead of `surface`.
// Medium/large additionally shrink to the small layout. Both transitions are
// driven by the [scrolled] reflected attribute and a [data-collapsed] flag,
// so all animation lives in CSS.

export type MaterialAppBarVariant = 'small' | 'medium' | 'large';
export type MaterialAppBarAlign = 'leading' | 'centered';

@Component({
  tag: 'material-app-bar',
  styleUrl: 'material-app-bar.css',
  shadow: true,
})
export class MaterialAppBar {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) variant: MaterialAppBarVariant = 'small';
  @Prop({ reflect: true }) align: MaterialAppBarAlign = 'leading';
  @Prop() collapseOnScroll = true;
  /** CSS selector for the scrolling element. Empty string → window. */
  @Prop() scrollTarget?: string;
  @Prop({ mutable: true, reflect: true }) scrolled = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() hasSubtitle = false;

  private scrollEl: Window | HTMLElement = window;
  private rafId = 0;
  private listening = false;

  // Track whether the subtitle slot has content so the wrapper can collapse
  // without an invalid `:has(::slotted(*))` CSS selector.
  private onSubtitleSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    const nodes = slot.assignedNodes({ flatten: true });
    this.hasSubtitle = nodes.some(
      (n) => n.nodeType === Node.ELEMENT_NODE || !!n.textContent?.trim(),
    );
  };

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    this.attachScroll();
  }

  disconnectedCallback() {
    this.detachScroll();
  }

  @Watch('scrollTarget')
  reattachScroll() {
    this.detachScroll();
    this.attachScroll();
  }

  private attachScroll() {
    const target = this.resolveScrollTarget();
    if (!target) return;
    this.scrollEl = target;
    target.addEventListener('scroll', this.onScroll, { passive: true });
    this.listening = true;
    this.updateScrolled();
  }

  private detachScroll() {
    if (!this.listening) return;
    this.scrollEl.removeEventListener('scroll', this.onScroll);
    this.listening = false;
    cancelAnimationFrame(this.rafId);
  }

  private resolveScrollTarget(): Window | HTMLElement | null {
    if (!this.scrollTarget) return window;
    return document.querySelector<HTMLElement>(this.scrollTarget) ?? window;
  }

  private onScroll = () => {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.updateScrolled();
    });
  };

  private updateScrolled() {
    const top =
      this.scrollEl === window
        ? window.scrollY
        : (this.scrollEl as HTMLElement).scrollTop;
    this.scrolled = top > 0;
  }

  render() {
    const collapsed = this.scrolled && this.collapseOnScroll && this.variant !== 'small';
    return (
      <Host role="banner" aria-label={this.ariaLabel}>
        <div
          class="bar"
          data-variant={this.variant}
          data-align={this.align}
          data-collapsed={collapsed ? '' : null}
        >
          <div class="leading">
            <slot name="leading" />
          </div>
          <div class="headline-block">
            <span class="headline">
              <slot name="headline" />
            </span>
            <span class={{ subtitle: true, 'has-content': this.hasSubtitle }}>
              <slot name="subtitle" onSlotchange={this.onSubtitleSlotChange} />
            </span>
          </div>
          <div class="trailing">
            <slot name="trailing" />
          </div>
        </div>
      </Host>
    );
  }
}
