import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
  Host,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 Expressive search app bar.
//
// Spec: docs/wiki/specs/google-material/app-bars/specs.md (Search variant)
//
// Anatomy:
//   [leading slot] [search container: leading-icon? input  inside-trailing slot] [trailing slot]
//
// The search container changes color from `surface container` to
// `surface container highest` on scroll; the outer container changes from
// `surface` to `surface container`. The component participates in form
// submission (form-associated) so the value can be posted alongside other
// fields when used inside a <form>.

@Component({
  tag: 'material-search-app-bar',
  styleUrl: 'material-search-app-bar.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialSearchAppBar {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() name?: string;
  @Prop() placeholder = 'Search';
  @Prop({ mutable: true }) value = '';
  @Prop({ reflect: true }) disabled = false;
  /** Show a search icon at the leading edge of the search container. */
  @Prop() searchIcon = true;
  @Prop() scrollTarget?: string;
  @Prop({ mutable: true, reflect: true }) scrolled = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialSearchInput!: EventEmitter<{ value: string }>;
  @Event() materialSearchSubmit!: EventEmitter<{ value: string }>;

  @State() hasInsideTrailing = false;

  private scrollEl: Window | HTMLElement = window;
  private rafId = 0;
  private listening = false;
  private defaultValue = '';
  private inputEl?: HTMLInputElement;

  // Collapse the inside-trailing wrapper when empty — otherwise its flex `gap`
  // leaves a phantom 4px space after the input. Driven by slotchange because
  // `:has(::slotted(*))` is not valid CSS.
  private onInsideTrailingSlotChange = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    const nodes = slot.assignedNodes({ flatten: true });
    this.hasInsideTrailing = nodes.some(
      (n) => n.nodeType === Node.ELEMENT_NODE || !!n.textContent?.trim(),
    );
  };

  componentWillLoad() {
    this.defaultValue = this.value;
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    this.syncFormValue();
    this.attachScroll();
  }

  disconnectedCallback() {
    this.detachScroll();
  }

  @Watch('value')
  @Watch('disabled')
  syncFormValue() {
    this.internals.setFormValue(this.disabled ? null : (this.value ?? ''));
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.value = this.defaultValue;
    if (this.inputEl) this.inputEl.value = this.defaultValue;
  }

  formStateRestoreCallback(state: string | null) {
    this.value = state ?? '';
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

  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.value = target.value;
    this.materialSearchInput.emit({ value: this.value });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    this.materialSearchSubmit.emit({ value: this.value });
    this.internals.form?.requestSubmit();
  };

  render() {
    return (
      <Host role="banner" aria-label={this.ariaLabel}>
        <div class="bar">
          <div class="leading">
            <slot name="leading" />
          </div>
          <div class="search-container" role="search">
            {this.searchIcon && (
              <span class="material-symbols search-icon" aria-hidden="true">
                search
              </span>
            )}
            <input
              ref={(el) => (this.inputEl = el)}
              type="search"
              role="searchbox"
              class="search-input"
              name={this.name}
              value={this.value}
              placeholder={this.placeholder}
              aria-label={this.ariaLabel ?? this.placeholder}
              disabled={this.disabled}
              onInput={this.handleInput}
              onKeyDown={this.handleKeyDown}
            />
            <div class={{ 'inside-trailing': true, 'has-content': this.hasInsideTrailing }}>
              <slot name="inside-trailing" onSlotchange={this.onInsideTrailingSlotChange} />
            </div>
          </div>
          <div class="trailing">
            <slot name="trailing" />
          </div>
        </div>
      </Host>
    );
  }
}
