import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// MD3 list container. Holds <material-list-item> children and coordinates
// keyboard navigation + selection. Three selection modes:
//   - none   → role="list",    items act as buttons/links
//   - single → role="listbox", one item selected at a time
//   - multi  → role="group",   any subset selected (typically with checkboxes)

export type ListSelection = 'none' | 'single' | 'multi';
export type ListVariant = 'baseline' | 'expressive';

@Component({
  tag: 'material-list',
  styleUrl: 'material-list.css',
  shadow: true,
})
export class MaterialList {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) selection: ListSelection = 'none';
  @Prop({ reflect: true }) variant: ListVariant = 'baseline';
  @Prop({ reflect: true }) dense = false;

  /** Fires when an item is activated. For multi, `checked` reflects the new state. */
  @Event({ bubbles: true, composed: true })
  materialListSelect!: EventEmitter<{ value?: string; checked?: boolean }>;

  componentWillLoad() {
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  private getItems(): HTMLElement[] {
    return Array.from(
      this.el.querySelectorAll<HTMLElement>('material-list-item:not([disabled])'),
    );
  }

  private focusItem(items: HTMLElement[], idx: number) {
    if (!items.length) return;
    const i = (idx + items.length) % items.length;
    items[i].focus();
    items[i].scrollIntoView({ block: 'nearest' });
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    const items = this.getItems();
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active.closest('material-list-item') as HTMLElement) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusItem(items, idx + 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        this.focusItem(items, idx - 1);
        return;
      case 'Home':
        e.preventDefault();
        this.focusItem(items, 0);
        return;
      case 'End':
        e.preventDefault();
        this.focusItem(items, items.length - 1);
        return;
    }
  }

  @Listen('materialListItemActivate')
  handleActivate(e: CustomEvent<{ value?: string; checked?: boolean }>) {
    const target = e.target as HTMLElement & { selected?: boolean; value?: string };
    const value = e.detail.value;
    let checked = e.detail.checked;

    if (this.selection === 'single') {
      for (const it of Array.from(
        this.el.querySelectorAll<HTMLElement & { selected?: boolean }>('material-list-item'),
      )) {
        it.selected = it === target;
      }
      checked = true;
    } else if (this.selection === 'multi') {
      // If the item already reports a checked state (leading checkbox toggled
      // it), respect that; otherwise flip `selected`.
      if (typeof checked !== 'boolean') {
        target.selected = !target.selected;
        checked = target.selected;
      } else {
        target.selected = checked;
      }
    }

    this.materialListSelect.emit({ value, checked });
  }

  render() {
    const role =
      this.selection === 'single' ? 'listbox' : this.selection === 'multi' ? 'group' : 'list';
    return (
      <Host role={role} aria-multiselectable={this.selection === 'multi' ? 'true' : null}>
        <slot />
      </Host>
    );
  }
}
