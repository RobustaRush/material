import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import { trackAnchored } from '../../utils/anchor-position';

export type MaterialFabMenuSize = 'small' | 'medium' | 'large';
export type MaterialFabMenuColorSet = 'primary' | 'secondary' | 'tertiary';

let fabMenuId = 0;

@Component({
  tag: 'material-fab-menu',
  styleUrl: 'material-fab-menu.css',
  shadow: true,
})
export class MaterialFabMenu {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) size: MaterialFabMenuSize = 'medium';
  @Prop({ reflect: true }) colorSet: MaterialFabMenuColorSet = 'primary';
  @Prop() icon = 'add';
  @Prop() closeIcon = 'close';
  @Prop({ mutable: true, reflect: true }) open = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialFabMenuOpen!: EventEmitter<void>;
  @Event() materialFabMenuClose!: EventEmitter<void>;

  @State() rendered = false;

  private panelId = `material-fab-menu-panel-${++fabMenuId}`;
  private fabEl?: HTMLButtonElement;
  private panelEl?: HTMLElement;
  private cleanupTrack?: () => void;

  connectedCallback() {
    this.rendered = true;
  }

  disconnectedCallback() {
    this.cleanupTrack?.();
  }

  @Watch('open')
  syncOpen(open: boolean) {
    const panel = this.panelEl;
    if (!panel) return;
    const isOpen = panel.matches(':popover-open');
    if (open && !isOpen) {
      (panel as HTMLElement & { showPopover: () => void }).showPopover();
    } else if (!open && isOpen) {
      (panel as HTMLElement & { hidePopover: () => void }).hidePopover();
    }
  }

  @Method()
  async show() { this.open = true; }

  @Method()
  async hide() { this.open = false; }

  @Method()
  async toggle() { this.open = !this.open; }

  private handleFabClick = () => {
    this.open = !this.open;
  };

  private handlePanelToggle = (ev: Event) => {
    const e = ev as ToggleEvent;
    const opening = e.newState === 'open';
    this.open = opening;
    if (opening) {
      if (this.panelEl && this.fabEl) {
        this.cleanupTrack = trackAnchored(this.panelEl, this.fabEl, {
          placement: 'top-end',
          offset: 4,
        });
      }
      requestAnimationFrame(() => this.focusFirstItem());
      this.materialFabMenuOpen.emit();
    } else {
      this.cleanupTrack?.();
      this.cleanupTrack = undefined;
      if (this.fabEl) this.fabEl.focus();
      this.materialFabMenuClose.emit();
    }
  };

  private getItems(): HTMLElement[] {
    return Array.from(
      this.el.querySelectorAll<HTMLElement>('material-fab-menu-item:not([disabled])'),
    );
  }

  private focusFirstItem() {
    const items = this.getItems();
    if (items.length) items[0].focus();
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (!this.panelEl?.matches(':popover-open')) return;
    const items = this.getItems();
    if (!items.length) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active.closest('material-fab-menu-item') as HTMLElement) : -1;

    const focusItem = (i: number) => {
      const n = items.length;
      const j = ((i % n) + n) % n;
      items[j].focus();
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(idx < 0 ? 0 : idx + 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(idx < 0 ? items.length - 1 : idx - 1);
        return;
      case 'Home':
        e.preventDefault();
        focusItem(0);
        return;
      case 'End':
        e.preventDefault();
        focusItem(items.length - 1);
        return;
      case 'Tab':
        this.open = false;
        return;
    }
  }

  @Listen('materialFabMenuItemActivate')
  handleActivate() {
    this.open = false;
  }

  render() {
    return (
      <Host>
        <div
          class="panel"
          part="panel"
          id={this.panelId}
          popover="auto"
          ref={(el) => (this.panelEl = el)}
          onToggle={this.handlePanelToggle}
          role="menu"
          aria-orientation="vertical"
        >
          <slot />
        </div>
        <button
          type="button"
          class="fab"
          part="fab"
          aria-haspopup="menu"
          aria-expanded={String(this.open)}
          aria-controls={this.panelId}
          aria-label={this.ariaLabel ?? 'Toggle menu'}
          ref={(el) => (this.fabEl = el)}
          onClick={this.handleFabClick}
        >
          <span class="state-layer" aria-hidden="true"></span>
          <span class="icon" aria-hidden="true">
            {this.open ? this.closeIcon : this.icon}
          </span>
        </button>
      </Host>
    );
  }
}
