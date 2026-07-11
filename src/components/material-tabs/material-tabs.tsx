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
import { adoptMaterialStyles } from '../../utils/adopted-styles';

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

  @Event({ bubbles: true, composed: true })
  materialTabSelect!: EventEmitter<{ value?: string }>;

  private indicatorEl?: HTMLElement;
  private innerEl?: HTMLElement;
  private ro?: ResizeObserver;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

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
    for (const t of tabs) {
      t.selected = t === target;
      t.tabbable = t === target;
    }

    this.positionIndicator();
    this.materialTabSelect.emit({ value: e.detail.value });
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

    let next = idx;
    if (e.key === 'ArrowLeft') next = idx <= 0 ? tabs.length - 1 : idx - 1;
    else if (e.key === 'ArrowRight') next = idx === tabs.length - 1 ? 0 : idx + 1;
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
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    const scroller = this.scrollable
      ? 'overflow-x-auto no-scrollbar'
      : '';
    const content = this.scrollable
      ? 'relative flex w-max pl-[52px]'
      : 'relative flex w-full';

    return (
      <Host class="block bg-surface text-on-surface border-b border-outline-variant">
        <div role="tablist" aria-orientation="horizontal" class={scroller}>
          <div class={content} ref={(el) => (this.innerEl = el)}>
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
