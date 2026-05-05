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
//
// `selection-trigger` controls how an item's selected state changes:
//   - "row"     (default) — clicking anywhere on the row toggles selection;
//                if a leading checkbox is present it auto-syncs. Right for
//                filter pickers, settings, single-action lists.
//   - "control" — row click only emits an activate signal (e.g. "open"); the
//                leading control (checkbox) manages its own state via its
//                native change event. Right for multi-action lists like
//                email inboxes where the row opens the item and the checkbox
//                is an independent select.

export type ListSelection = 'none' | 'single' | 'multi';
export type ListVariant = 'baseline' | 'expressive';
export type ListSelectionTrigger = 'row' | 'control';

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
  @Prop({ reflect: true, attribute: 'selection-trigger' }) selectionTrigger: ListSelectionTrigger = 'row';

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

    // In control mode arrow keys also activate the focused row, so master-detail
    // browsing with the keyboard "opens" each row as you move (Gmail style).
    const arrowActivates = this.selectionTrigger === 'control';
    const move = (next: number) => {
      const i = (next + items.length) % items.length;
      this.focusItem(items, i);
      if (arrowActivates) items[i].click();
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(idx + 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(idx - 1);
        return;
      case 'Home':
        e.preventDefault();
        move(0);
        return;
      case 'End':
        e.preventDefault();
        move(items.length - 1);
        return;
    }
  }

  @Listen('materialListItemActivate')
  handleActivate(e: CustomEvent<{ value?: string; checked?: boolean }>) {
    const target = e.target as HTMLElement & { selected?: boolean; value?: string };
    const value = e.detail.value;
    let checked = e.detail.checked;

    // selection-trigger="control" — the row click is just an activate signal
    // (e.g. "open"). Selection is owned by the consumer via the leading
    // control's own change event; the list does not flip `selected` here.
    // The list does, however, maintain a single `active` row (master-detail
    // pattern) so the consumer gets a free open/focused highlight.
    if (this.selectionTrigger === 'control') {
      for (const it of Array.from(
        this.el.querySelectorAll<HTMLElement & { active?: boolean }>('material-list-item'),
      )) {
        it.active = it === target;
      }
      this.materialListSelect.emit({ value, checked });
      return;
    }

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
