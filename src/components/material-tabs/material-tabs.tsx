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

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    this.syncChildren();
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
    // Outer = role=tablist; inner = the flex/scroll container. The 1dp divider
    // sits at the bottom of the outer container so it spans the full width
    // even when scrollable content overflows.
    const inner = this.scrollable
      ? 'flex overflow-x-auto pl-[52px] no-scrollbar'
      : 'flex w-full';

    return (
      <Host class="block bg-surface text-on-surface border-b border-outline-variant">
        <div role="tablist" aria-orientation="horizontal" class={inner}>
          <slot onSlotchange={this.handleSlotChange} />
        </div>
      </Host>
    );
  }
}
