/*
 * advanced-material-web — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

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

// MD3 list container. Holds <material-list-item> children and coordinates
// keyboard navigation + selection. Three selection modes:
//   - none   → role="list",    items act as buttons/links
//   - single → role="listbox", one item selected at a time
//   - multi  → role="listbox" + aria-multiselectable, any subset selected
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
//
// `activation` controls whether the list also keeps one row `active` (the
// master-detail highlight) in that mode: "manual" (default) leaves the prop to
// the consumer and only emits, "auto" restores the list writing it.

export type ListSelection = 'none' | 'single' | 'multi';
export type ListVariant = 'baseline' | 'expressive';
export type ListSelectionTrigger = 'row' | 'control';
export type ListActivation = 'manual' | 'auto';

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
  /**
   * Who owns `active` — the master-detail highlight on the last-activated row.
   *
   * `manual` (default): nobody but you. The list emits `materialListSelect` and
   * leaves the prop alone, which is the only thing a declarative framework can
   * work with: React writes a DOM property when the *rendered* value changes,
   * so a row the component marked active can never be cleared from JSX again.
   *
   * `auto`: the list keeps one row active for you, as it always did — the
   * shorter path for plain HTML and for master-detail layouts that have no
   * other state to drive it from.
   */
  @Prop({ reflect: true }) activation: ListActivation = 'manual';

  /** Fires when an item is activated. For multi, `checked` reflects the new state. */
  @Event({ bubbles: true, composed: true })
  materialListSelect!: EventEmitter<{ value?: string; checked?: boolean }>;

  connectedCallback() {
    this.syncRoving();
  }

  private handleSlotChange = () => this.syncRoving();

  private allItems(): (HTMLElement & { tabbable?: boolean; selected?: boolean; active?: boolean })[] {
    return Array.from(this.el.querySelectorAll('material-list-item'));
  }

  private getItems(): HTMLElement[] {
    return Array.from(
      this.el.querySelectorAll<HTMLElement>('material-list-item:not([disabled])'),
    );
  }

  // Roving tabindex: exactly one item is a Tab stop. Prefer the selected item,
  // else the active (master-detail) one, else the first enabled item.
  private syncRoving() {
    const all = this.allItems();
    const enabled = all.filter((i) => !i.hasAttribute('disabled'));
    if (!enabled.length) return;
    // Read reflected attributes so this works even before children upgrade.
    const target =
      enabled.find((i) => i.hasAttribute('selected')) ??
      enabled.find((i) => i.hasAttribute('active')) ??
      enabled[0];
    for (const it of all) it.tabbable = it === target;
  }

  private focusItem(items: HTMLElement[], idx: number) {
    if (!items.length) return;
    const i = (idx + items.length) % items.length;
    const target = items[i] as HTMLElement & { tabbable?: boolean };
    for (const it of this.allItems()) it.tabbable = it === target;
    target.focus();
    target.scrollIntoView({ block: 'nearest' });
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
    const target = e.target as HTMLElement & { selected?: boolean; value?: string; tabbable?: boolean };
    const value = e.detail.value;
    let checked = e.detail.checked;

    // Keep the roving Tab stop on the item the user just interacted with.
    for (const it of this.allItems()) it.tabbable = it === target;

    // selection-trigger="control" — the row click is just an activate signal
    // (e.g. "open"). Selection is owned by the consumer via the leading
    // control's own change event; the list does not flip `selected` here.
    // With activation="auto" it also keeps one row `active` (master-detail
    // pattern), which is a free highlight for markup that has nothing else to
    // drive it — and a prop the consumer can no longer own, which is why it is
    // opt-in. See the `activation` doc comment.
    if (this.selectionTrigger === 'control') {
      if (this.activation === 'auto') {
        for (const it of Array.from(
          this.el.querySelectorAll<HTMLElement & { active?: boolean }>('material-list-item'),
        )) {
          it.active = it === target;
        }
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
    // Both single- and multi-select present as a listbox; multi adds
    // aria-multiselectable and its items expose aria-selected (see list-item).
    const role =
      this.selection === 'single' || this.selection === 'multi' ? 'listbox' : 'list';
    return (
      <Host role={role} aria-multiselectable={this.selection === 'multi' ? 'true' : null}>
        <slot onSlotchange={this.handleSlotChange} />
      </Host>
    );
  }
}
