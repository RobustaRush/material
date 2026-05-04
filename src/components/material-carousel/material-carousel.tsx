import { Component, Element, Host, Listen, Prop, h } from '@stencil/core';

export type MaterialCarouselLayout = 'uncontained' | 'uncontained-multi-aspect';
export type MaterialCarouselSnap = 'none' | 'proximity' | 'mandatory';

@Component({
  tag: 'material-carousel',
  styleUrl: 'material-carousel.css',
  shadow: true,
})
export class MaterialCarousel {
  @Element() host!: HTMLElement;

  @Prop({ reflect: true }) layout: MaterialCarouselLayout = 'uncontained';
  @Prop({ reflect: true }) snap: MaterialCarouselSnap = 'proximity';
  @Prop({ attribute: 'large-width' }) largeWidth = 300;
  @Prop() parallax = true;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  private scrollEl!: HTMLElement;
  private rafId?: number;
  private resizeObs?: ResizeObserver;
  private reducedMotionMq?: MediaQueryList;
  private reducedMotion = false;

  componentDidLoad() {
    this.host.style.setProperty('--carousel-large-width', `${this.largeWidth}px`);

    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.reducedMotionMq.matches;
      this.reducedMotionMq.addEventListener('change', this.onReducedMotionChange);
    }

    this.scrollEl.addEventListener('scroll', this.scheduleUpdate, { passive: true });
    this.resizeObs = new ResizeObserver(this.scheduleUpdate);
    this.resizeObs.observe(this.scrollEl);

    requestAnimationFrame(() => {
      this.assignAriaLabels();
      this.update();
    });
  }

  disconnectedCallback() {
    if (this.rafId !== undefined) cancelAnimationFrame(this.rafId);
    this.scrollEl?.removeEventListener('scroll', this.scheduleUpdate);
    this.resizeObs?.disconnect();
    this.reducedMotionMq?.removeEventListener('change', this.onReducedMotionChange);
  }

  private onReducedMotionChange = (e: MediaQueryListEvent) => {
    this.reducedMotion = e.matches;
    this.update();
  };

  private getItems(): HTMLElement[] {
    const slot = this.host.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (!slot) return [];
    return slot
      .assignedElements({ flatten: true })
      .filter((el) => el.tagName.toLowerCase() === 'material-carousel-item') as HTMLElement[];
  }

  private assignAriaLabels() {
    const items = this.getItems();
    items.forEach((item, i) => {
      if (!item.hasAttribute('aria-label')) {
        item.setAttribute('aria-label', `Item ${i + 1} of ${items.length}`);
      }
    });
  }

  private onSlotChange = () => {
    this.assignAriaLabels();
    this.scheduleUpdate();
  };

  private scheduleUpdate = () => {
    if (this.rafId !== undefined) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = undefined;
      this.update();
    });
  };

  private update() {
    if (!this.parallax || this.reducedMotion) {
      this.getItems().forEach((item) => item.style.removeProperty('--parallax'));
      return;
    }

    const viewport = this.scrollEl.clientWidth;
    const viewportCenter = this.scrollEl.scrollLeft + viewport / 2;

    this.getItems().forEach((item) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const offset = itemCenter - viewportCenter;
      const limit = item.offsetWidth * 0.075;
      const parallax = Math.max(-limit, Math.min(limit, -offset * 0.08));
      item.style.setProperty('--parallax', `${parallax}px`);
    });
  }

  @Listen('keydown')
  onKeyDown(e: KeyboardEvent) {
    const items = this.getItems();
    if (!items.length) return;

    const active = (this.host.contains(document.activeElement)
      ? document.activeElement
      : null) as HTMLElement | null;
    const idx = active ? items.indexOf(active) : -1;

    let target = -1;
    if (e.key === 'ArrowRight') target = Math.min(items.length - 1, idx + 1);
    else if (e.key === 'ArrowLeft') target = Math.max(0, idx - 1);
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = items.length - 1;

    if (target >= 0 && items[target]) {
      e.preventDefault();
      items[target].focus();
      items[target].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  render() {
    return (
      <Host role="group" aria-roledescription="carousel" aria-label={this.ariaLabel}>
        <div part="scroller" ref={(el) => (this.scrollEl = el!)}>
          <slot onSlotchange={this.onSlotChange} />
        </div>
      </Host>
    );
  }
}
