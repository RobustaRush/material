/*
 * @viewflow/material — Material 3 web components
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
  Method,
  Prop,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';

// General-purpose tree view — categories, org structures, BOMs. Distinct
// from material-navigation-group (navigation-only accordion): this is a data
// tree with expand/collapse, tri-state checkbox selection and lazy children.
//
// Two markup shapes, mixable:
//
//   1. Nested — items contain their children:
//        <material-tree>
//          <material-tree-item label="Electronics">
//            <material-tree-item label="Phones"></material-tree-item>
//          </material-tree-item>
//        </material-tree>
//
//   2. Flat with explicit levels — the native shape of django-mptt, where a
//      tree is an ordered table of rows (pre-order traversal + level):
//        <material-tree selectable name="categories">
//          {% for node in nodes %}
//            <material-tree-item level="{{ node.level }}" value="{{ node.pk }}"
//                                label="{{ node.name }}"
//                                {% if not node.is_leaf_node %}has-children expanded{% endif %}
//                                {% if node.pk in selected %}checked{% endif %}>
//            </material-tree-item>
//          {% endfor %}
//        </material-tree>
//
// Internally everything is normalized to the flat model: items in document
// order (= pre-order) with a resolved depth (explicit `level` wins, else DOM
// nesting). Collapse hides the item's depth range; tri-state rolls up over
// direct children in the range. Unpoly can swap any part of the light DOM —
// a MutationObserver re-syncs.
//
// Lazy children: an item marked `has-children` with no loaded children
// fetches `src?parent=<value>` on first expand (select2-style JSON accepted)
// or, without `src`, emits `materialTreeLoad` so the consumer can insert
// items itself (appendChild into the item, or flat rows after it).
//
// Form-associated: posts one `name=<value>` entry per checked item —
// Django reads request.POST.getlist(name). Parents of fully-checked
// subtrees are checked and post too.
//
// ARIA: the full tree/treeitem pattern works here (unlike the navigation
// group) because item hosts live in one light-DOM tree — roles compose
// without crossing shadow boundaries.

export interface TreeItemData {
  value: string;
  label: string;
  icon?: string;
  hasChildren?: boolean;
  checked?: boolean;
  disabled?: boolean;
  supportingText?: string;
}

interface TreeItemLike extends HTMLElement {
  value: string;
  label?: string;
  level?: number;
  hasChildren: boolean;
  expanded: boolean;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  loading: boolean;
  selectable: boolean;
  depth: number;
}

@Component({
  tag: 'material-tree',
  styleUrl: 'material-tree.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialTree {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  /** Show tri-state checkboxes; row click toggles selection. */
  @Prop({ reflect: true }) selectable = false;

  /** Form field name — posts one entry per checked item. */
  @Prop() name?: string;

  /** Parent checkbox drives descendants and reflects their state.
   *  Set cascade="false" for independent checkboxes. */
  @Prop() cascade = true;

  /** Lazy-children JSON endpoint; `?parent=<value>` appended. */
  @Prop() src?: string;
  @Prop({ attribute: 'query-param' }) queryParam = 'parent';

  @Prop({ reflect: true }) dense = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialSelectionChange!: EventEmitter<{ values: string[]; count: number }>;
  @Event() materialTreeLoad!: EventEmitter<{ value: string; item: HTMLElement }>;

  private observer?: MutationObserver;
  private syncQueued = false;
  private defaultChecked?: Set<string>;
  private fetching = new Set<string>();

  // --- lifecycle -------------------------------------------------------------

  connectedCallback() {
    this.observer = new MutationObserver(() => this.queueSync());
    this.observer.observe(this.el, { childList: true, subtree: true });
  }

  componentDidLoad() {
    this.sync();
    this.defaultChecked = new Set(this.checkedValues());
    this.syncFormValue();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }

  @Watch('selectable')
  @Watch('cascade')
  @Watch('dense')
  onConfigChange() {
    this.queueSync();
  }

  formResetCallback() {
    const initial = this.defaultChecked ?? new Set<string>();
    for (const it of this.items()) {
      it.checked = initial.has(it.value);
      it.indeterminate = false;
    }
    this.sync();
  }

  // --- public API -------------------------------------------------------------

  /** Values of all checked items (disabled items excluded). */
  @Method()
  async getSelected(): Promise<string[]> {
    return this.checkedValues();
  }

  @Method()
  async clearSelection(): Promise<void> {
    for (const it of this.items()) {
      it.checked = false;
      it.indeterminate = false;
    }
    this.sync();
    this.emitSelection();
  }

  @Method()
  async expandAll(): Promise<void> {
    for (const it of this.items()) if (this.itemHasChildren(it)) it.expanded = true;
    this.sync();
  }

  @Method()
  async collapseAll(): Promise<void> {
    for (const it of this.items()) it.expanded = false;
    this.sync();
  }

  // --- item coordination --------------------------------------------------------

  @Listen('materialTreeToggle')
  onToggle(e: CustomEvent<{ value: string; expanded: boolean }>) {
    const item = e.target as TreeItemLike;
    if (e.detail.expanded) this.maybeLoadChildren(item);
    this.sync();
  }

  @Listen('materialTreeChecked')
  onChecked(e: CustomEvent<{ value: string; checked: boolean }>) {
    const item = e.target as TreeItemLike;
    if (this.cascade) {
      // Drive the whole subtree, then let rollup recompute the ancestors.
      for (const d of this.descendantsOf(item)) {
        if (!d.disabled) {
          d.checked = e.detail.checked;
          d.indeterminate = false;
        }
      }
    }
    this.sync();
    this.emitSelection();
  }

  @Listen('keydown')
  onKeyDown(e: KeyboardEvent) {
    const item = e.target as TreeItemLike;
    if (!item?.matches?.('material-tree-item')) return;

    const visible = this.items().filter((i) => !i.hidden);
    const idx = visible.indexOf(item);
    if (idx < 0) return;

    const rtl = getComputedStyle(this.el).direction === 'rtl';
    const expandKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    const collapseKey = rtl ? 'ArrowRight' : 'ArrowLeft';

    let target: TreeItemLike | undefined;
    switch (e.key) {
      case 'ArrowDown':
        target = visible[idx + 1];
        break;
      case 'ArrowUp':
        target = visible[idx - 1];
        break;
      case 'Home':
        target = visible[0];
        break;
      case 'End':
        target = visible[visible.length - 1];
        break;
      case expandKey:
        if (this.itemHasChildren(item) && !item.expanded) {
          item.expanded = true;
          this.maybeLoadChildren(item);
          this.sync();
        } else {
          const next = visible[idx + 1];
          if (next && next.depth > item.depth) target = next;
        }
        e.preventDefault();
        break;
      case collapseKey:
        if (this.itemHasChildren(item) && item.expanded) {
          item.expanded = false;
          this.sync();
        } else {
          // Nearest preceding item one level up.
          for (let i = idx - 1; i >= 0; i--) {
            if (visible[i].depth < item.depth) {
              target = visible[i];
              break;
            }
          }
        }
        e.preventDefault();
        break;
      default:
        return;
    }

    if (target) {
      e.preventDefault();
      this.setTabbable(target);
      target.focus();
    }
  }

  // --- flat model --------------------------------------------------------------

  private items(): TreeItemLike[] {
    return Array.from(this.el.querySelectorAll<HTMLElement>('material-tree-item')) as TreeItemLike[];
  }

  private resolveDepth(item: TreeItemLike): number {
    if (item.level != null && !Number.isNaN(Number(item.level))) return Number(item.level);
    let depth = 0;
    let node: HTMLElement | null = item.parentElement;
    while (node && node !== this.el) {
      if (node.tagName === 'MATERIAL-TREE-ITEM') depth++;
      node = node.parentElement;
    }
    return depth;
  }

  /** All items in the depth range under `item` (its subtree in pre-order). */
  private descendantsOf(item: TreeItemLike): TreeItemLike[] {
    const all = this.items();
    const start = all.indexOf(item);
    if (start < 0) return [];
    const out: TreeItemLike[] = [];
    for (let i = start + 1; i < all.length; i++) {
      if (all[i].depth <= item.depth) break;
      out.push(all[i]);
    }
    return out;
  }

  private itemHasChildren(item: TreeItemLike): boolean {
    return item.hasChildren || this.directChildrenOf(item).length > 0;
  }

  private directChildrenOf(item: TreeItemLike): TreeItemLike[] {
    return this.descendantsOf(item).filter((d) => d.depth === item.depth + 1);
  }

  private checkedValues(): string[] {
    return this.items()
      .filter((i) => i.checked && !i.disabled && i.value)
      .map((i) => i.value);
  }

  // --- sync ---------------------------------------------------------------------

  private queueSync() {
    if (this.syncQueued) return;
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      this.sync();
    });
  }

  private sync() {
    const all = this.items();
    if (!all.length) return;

    // Pass 1: depth + config push.
    for (const it of all) {
      it.depth = this.resolveDepth(it);
      it.selectable = this.selectable;
      (it as any).dense = this.dense;
    }

    // Pass 2: chevron affordance + visibility (stack of collapsed ancestors).
    const stack: { depth: number; open: boolean }[] = [];
    let anyLoaded = false;
    for (let i = 0; i < all.length; i++) {
      const it = all[i];
      while (stack.length && stack[stack.length - 1].depth >= it.depth) stack.pop();
      const visible = stack.every((s) => s.open);
      it.hidden = !visible;
      const next = all[i + 1];
      const hasLoaded = !!next && next.depth > it.depth;
      // Flat rows carry no nested children — resolve the chevron from the
      // model so plain mptt output needs no has-children attribute.
      if (hasLoaded && !it.hasChildren) it.hasChildren = true;
      if (hasLoaded && it.loading) {
        it.loading = false; // lazy children arrived
        anyLoaded = true;
      }
      it.setAttribute('aria-level', String(it.depth + 1));
      stack.push({ depth: it.depth, open: it.expanded });
    }
    void anyLoaded;

    // Pass 3: tri-state rollup, children first (reverse pre-order).
    if (this.selectable && this.cascade) {
      for (let i = all.length - 1; i >= 0; i--) {
        const kids = this.directChildrenOf(all[i]).filter((k) => !k.disabled);
        if (!kids.length) continue;
        const checked = kids.filter((k) => k.checked).length;
        const partial = kids.some((k) => k.indeterminate);
        all[i].checked = checked === kids.length;
        all[i].indeterminate = !all[i].checked && (checked > 0 || partial);
      }
    }

    // Pass 4: roving tabindex — exactly one visible item is tabbable.
    const visibleItems = all.filter((i) => !i.hidden);
    if (visibleItems.length && !visibleItems.some((i) => i.getAttribute('tabindex') === '0')) {
      this.setTabbable(visibleItems[0]);
    }

    this.syncFormValue();
  }

  private setTabbable(target: TreeItemLike) {
    for (const it of this.items()) {
      it.setAttribute('tabindex', it === target ? '0' : '-1');
    }
  }

  private emitSelection() {
    const values = this.checkedValues();
    this.materialSelectionChange.emit({ values, count: values.length });
  }

  private syncFormValue() {
    if (!this.name) return;
    const fd = new FormData();
    for (const v of this.checkedValues()) fd.append(this.name, v);
    this.internals.setFormValue(fd);
  }

  // --- lazy children ---------------------------------------------------------------

  private maybeLoadChildren(item: TreeItemLike) {
    if (!item.hasChildren) return;
    if (this.descendantsOf(item).length > 0) return;
    if (this.fetching.has(item.value)) return;
    item.loading = true;
    if (this.src) {
      this.fetchChildren(item);
    } else {
      this.materialTreeLoad.emit({ value: item.value, item });
    }
  }

  private async fetchChildren(item: TreeItemLike) {
    this.fetching.add(item.value);
    try {
      const url = new URL(this.src!, document.baseURI);
      url.searchParams.set(this.queryParam, item.value);
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      const data = await res.json();
      const rows: any[] = Array.isArray(data) ? data : (data?.results ?? []);
      if (!rows.length) {
        item.hasChildren = false;
        item.loading = false;
        return;
      }
      for (const raw of rows) {
        const child = document.createElement('material-tree-item') as TreeItemLike;
        child.value = String(raw?.value ?? raw?.id ?? '');
        child.label = String(raw?.label ?? raw?.text ?? child.value);
        child.level = item.depth + 1; // explicit — keeps flat parents consistent
        child.hasChildren = !!(raw?.hasChildren ?? raw?.has_children);
        child.checked = !!raw?.checked || (this.cascade && item.checked);
        child.disabled = !!raw?.disabled;
        if (raw?.icon) (child as any).icon = raw.icon;
        if (raw?.supportingText ?? raw?.supporting_text) {
          (child as any).supportingText = raw.supportingText ?? raw.supporting_text;
        }
        item.appendChild(child);
      }
      // MutationObserver queues the sync; loading clears when children land.
    } catch (err) {
      item.loading = false;
      item.expanded = false;
    } finally {
      this.fetching.delete(item.value);
    }
  }

  render() {
    return (
      <Host
        role="tree"
        aria-label={this.ariaLabel}
        aria-multiselectable={this.selectable ? 'true' : null}
      >
        <slot />
      </Host>
    );
  }
}
