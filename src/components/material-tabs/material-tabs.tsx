import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  Watch,
  h,
} from '@stencil/core';

// MD3 tabs container — holds <material-tab> children, drives selection,
// keyboard navigation, and roving tabindex. Two variants share anatomy and
// differ only in active-indicator dimensions and active color tokens.
//
// Spec: docs/wiki/specs/google-material/tabs/{overview,specs,guidelines,accessibility}.md
//
// Per ARIA tabs (manual activation, matches MD3 § Initial focus): Arrow keys
// move focus only; Space/Enter activate the focused tab.

export type MaterialTabsVariant = 'primary' | 'secondary';

interface TabEl extends HTMLElement {
  variant: MaterialTabsVariant;
  selected: boolean;
  disabled: boolean;
  tabbable: boolean;
  value?: string;
}

@Component({
  tag: 'material-tabs',
  styleUrl: 'material-tabs.css',
  shadow: true,
})
export class MaterialTabs {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) variant: MaterialTabsVariant = 'primary';
  @Prop({ reflect: true }) scrollable = false;

  // Cancelable: a listener can call preventDefault() to veto the selection
  // (e.g. unsaved-changes guard); the previous selection is then restored.
  @Event({ bubbles: true, composed: true, cancelable: true })
  materialTabSelect!: EventEmitter<{ value?: string }>;

  private indicatorEl?: HTMLElement;
  private innerEl?: HTMLElement;
  private tablistEl?: HTMLElement;
  private ro?: ResizeObserver;

  connectedCallback() {
    this.syncChildren();
    // Reposition when tab widths change (font load, container resize, etc.).
    this.ro = new ResizeObserver(() => this.positionIndicator());
    this.ro.observe(this.el);
  }

  disconnectedCallback() {
    this.ro?.disconnect();
    this.ro = undefined;
  }

  componentDidLoad() {
    // Place the indicator without animating on first paint.
    this.positionIndicator(true);
  }

  @Watch('variant')
  @Watch('scrollable')
  syncChildren() {
    const tabs = this.tabs();
    if (!tabs.length) return;

    // Variant: propagate down so each tab knows how to render its indicator.
    for (const t of tabs) t.variant = this.variant;

    // Scrollable host marker — flips :host flex behavior in material-tab.css
    // from `flex: 1` to `flex: 0 0 auto` so tabs use intrinsic widths.
    for (const t of tabs) {
      if (this.scrollable) t.setAttribute('scrollable-host', '');
      else t.removeAttribute('scrollable-host');
    }

    // Auto-select the first enabled tab when none is active, so the
    // indicator isn't hidden (e.g. no `selected` attribute set declaratively,
    // or the previously-selected tab was removed).
    if (!tabs.some((t) => t.selected && !t.disabled)) {
      const first = tabs.find((t) => !t.disabled);
      if (first) first.selected = true;
    }

    // Roving tabindex: exactly one tabbable element. Prefer selected; else
    // first enabled.
    const selected = tabs.find((t) => t.selected && !t.disabled);
    const focusable = selected ?? tabs.find((t) => !t.disabled);
    for (const t of tabs) t.tabbable = t === focusable;

    this.positionIndicator();
  }

  // Slide the single hoisted indicator to the selected tab. `instant` skips the
  // transition (initial paint / reduced motion falls out via CSS).
  private positionIndicator(instant = false) {
    const bar = this.indicatorEl;
    const inner = this.innerEl;
    if (!bar || !inner) return;
    const tabs = this.tabs();
    const selected = tabs.find((t) => t.selected && !t.disabled);
    if (!selected) {
      bar.style.opacity = '0';
      return;
    }
    const innerRect = inner.getBoundingClientRect();
    const isPrimary = this.variant === 'primary';
    // Primary indicator hugs the tab's content column; secondary spans the
    // whole cell. Measure whichever applies, relative to the (scrolling) inner
    // container so it stays aligned when the tab strip is scrolled.
    const measured = isPrimary
      ? selected.shadowRoot?.querySelector<HTMLElement>('[part="content"]')
      : null;
    const rect = (measured ?? selected).getBoundingClientRect();
    let left = rect.left - innerRect.left;
    let width = rect.width;
    if (isPrimary && width < 24) {
      left -= (24 - width) / 2;
      width = 24;
    }
    const apply = () => {
      bar.style.opacity = '1';
      bar.style.width = `${width}px`;
      bar.style.transform = `translateX(${left}px)`;
    };
    if (instant) {
      const prev = bar.style.transition;
      bar.style.transition = 'none';
      apply();
      // Force reflow so the next change animates from here.
      void bar.offsetWidth;
      bar.style.transition = prev;
    } else {
      apply();
    }
  }

  @Listen('materialTabActivate')
  handleActivate(e: CustomEvent<{ value?: string }>) {
    const target = e.target as TabEl | null;
    if (!target || target.disabled) return;

    const tabs = this.tabs();
    const previous = tabs.find((t) => t.selected) ?? null;

    for (const t of tabs) {
      t.selected = t === target;
      t.tabbable = t === target;
    }
    this.positionIndicator();

    const evt = this.materialTabSelect.emit({ value: e.detail.value });
    if (evt.defaultPrevented) {
      // Listener vetoed the selection — restore the previous selected tab.
      for (const t of tabs) t.selected = t === previous;
      this.positionIndicator();
      return;
    }

    // Scroll a clipped tab into view (with margin) now the selection stuck.
    this.scrollToTab(target);
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (
      e.key !== 'ArrowLeft' &&
      e.key !== 'ArrowRight' &&
      e.key !== 'Home' &&
      e.key !== 'End'
    ) {
      return;
    }
    const tabs = this.tabs().filter((t) => !t.disabled);
    if (!tabs.length) return;
    const active = (e.target as Element | null)?.closest('material-tab') as TabEl | null;
    const idx = active ? tabs.indexOf(active) : -1;

    // Flip the horizontal arrows in RTL so Arrow keys track visual direction.
    const rtl = getComputedStyle(this.el).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';

    let next = idx;
    if (e.key === backward) next = idx <= 0 ? tabs.length - 1 : idx - 1;
    else if (e.key === forward) next = idx === tabs.length - 1 ? 0 : idx + 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;

    e.preventDefault();
    this.focusTab(tabs, next);
  }

  private focusTab(tabs: TabEl[], idx: number) {
    for (const t of tabs) t.tabbable = false;
    const target = tabs[idx];
    if (!target) return;
    target.tabbable = true;
    // Focus the inner button/anchor inside the tab's shadow root.
    const inner = target.shadowRoot?.querySelector<HTMLElement>('button, a');
    inner?.focus();
    this.scrollToTab(target);
  }

  @Listen('focusout')
  handleFocusOut() {
    // Once focus leaves the tablist entirely, snap the roving tab stop back
    // to the selected tab — so Tab-out then Tab-in re-enters on the active
    // tab rather than wherever Arrow keys last parked it.
    if (this.el.matches(':focus-within')) return;
    const tabs = this.tabs();
    const selected = tabs.find((t) => t.selected && !t.disabled);
    if (!selected) return;
    for (const t of tabs) t.tabbable = t === selected;
  }

  // Scroll a tab into view within the (scrollable) tablist, leaving a margin
  // of context at the scroll edge instead of ending flush against it.
  private scrollToTab(target: HTMLElement) {
    const scroller = this.tablistEl;
    if (!scroller) return;
    const margin = 48;
    const targetRect = target.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const scroll = scroller.scrollLeft;
    const offset = targetRect.left - scrollerRect.left + scroll;
    const extent = targetRect.width;
    const hostExtent = scroller.clientWidth;
    const min = offset - margin;
    const max = offset + extent - hostExtent + margin;
    const to = Math.min(min, Math.max(max, scroll));
    if (to !== scroll) {
      // Honor reduced-motion: fall back to an instant jump (matches the prior
      // scrollIntoView behavior and the indicator's own reduced-motion guard).
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      scroller.scrollTo({ left: to, top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  private tabs(): TabEl[] {
    return Array.from(this.el.querySelectorAll<TabEl>('material-tab'));
  }

  private handleSlotChange = () => this.syncChildren();

  render() {
    // Outer = role=tablist and (when scrollable) the horizontal scroller.
    // Inner = the flex content wrapper that grows with the tabs; the single
    // sliding indicator is absolutely positioned within it so it scrolls in
    // lockstep with the tab strip. The 1dp divider sits on the Host bottom
    // border so it always spans the full width.
    return (
      <Host>
        <div
          role="tablist"
          aria-orientation="horizontal"
          class="tablist"
          ref={(el) => (this.tablistEl = el)}
        >
          <div class="inner" ref={(el) => (this.innerEl = el)}>
            <slot onSlotchange={this.handleSlotChange} />
            <span
              class="tab-indicator"
              part="indicator"
              aria-hidden="true"
              ref={(el) => (this.indicatorEl = el)}
            ></span>
          </div>
        </div>
      </Host>
    );
  }
}
