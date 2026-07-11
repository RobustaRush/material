import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  h,
} from '@stencil/core';

// Data table as progressive enhancement over a server-rendered <table>.
//
// M3 never shipped a data-table spec (it stopped at M2); the visual style
// here is the M2 anatomy re-drawn with M3 tokens — rounded surface container,
// outline-variant dividers, state-layer row tints. See the .css file.
//
// The table itself stays in the light DOM and is rendered by the server
// (Django templates, Unpoly fragment swaps) or by any client framework —
// this component adds behavior around it and never touches its structure:
//
//   <material-data-table>
//     <table>
//       <thead><tr>
//         <th class="cell-select">
//           <material-checkbox data-select-all aria-label="Select all"></material-checkbox>
//         </th>
//         <th aria-sort="ascending"><a href="?o=number">Number</a></th>
//         <th class="numeric"><a href="?o=total">Total</a></th>
//       </tr></thead>
//       <tbody>
//         <tr data-row-link>
//           <td class="cell-select"><material-checkbox name="selected" value="42"></material-checkbox></td>
//           <td><a href="/orders/42/">PO-042</a></td>
//           <td class="numeric">$12,000</td>
//         </tr>
//       </tbody>
//     </table>
//     <footer>…pagination links…</footer>
//   </material-data-table>
//
// Sorting is server-driven: the server renders plain <a href="?o=…"> links
// inside <th> and marks the active column with aria-sort — Unpoly (or a full
// page load) handles the rest, no JS involved. For client-side data a <th
// data-sort="…"> with a <button> emits `materialSort` instead and the
// consumer re-renders the rows.
//
// Selection uses real form controls (material-checkbox is form-associated),
// so bulk actions are an ordinary form POST — Django's
// `request.POST.getlist('selected')` sees one entry per checked row. The
// select-all checkbox lives in the header with `data-select-all`; a row's
// checkbox is either marked `data-row-select` or found in the row's first
// cell. A MutationObserver re-syncs header/row state after Unpoly swaps the
// tbody (or any fragment) under this element.

export interface DataTableSelectionDetail {
  /** `value` of every checked row checkbox, in DOM order. */
  values: string[];
  count: number;
  allSelected: boolean;
}

export interface DataTableSortDetail {
  column: string;
  direction: 'ascending' | 'descending';
}

interface CheckboxLike extends HTMLElement {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  value: string;
}

const CHECKBOX_SELECTOR = 'material-checkbox, input[type="checkbox"]';

@Component({
  tag: 'material-data-table',
  shadow: true,
})
export class MaterialDataTable {
  @Element() el!: HTMLElement;

  /** Keep <thead> pinned while the body scrolls — pair with a max-height
   *  (class or style) on the host, which is the scroll container. */
  @Prop({ reflect: true, attribute: 'sticky-header' }) stickyHeader = false;

  /** Dim the body and ignore pointer input while a fragment loads. */
  @Prop({ reflect: true }) loading = false;

  /** Tighter row heights (40dp rows / 44dp header) for dense listings. */
  @Prop({ reflect: true }) dense = false;

  /** Emitted whenever the set of checked rows changes — user toggles, a
   *  select-all sweep, or a fragment swap replacing the rows. */
  @Event() materialSelectionChange!: EventEmitter<DataTableSelectionDetail>;

  /** Emitted on click inside `th[data-sort]` that contains no link (links
   *  mean server-driven sorting and are left to the browser/Unpoly). The
   *  consumer reorders its data and re-renders; this component never
   *  reorders rows itself. */
  @Event() materialSort!: EventEmitter<DataTableSortDetail>;

  private observer?: MutationObserver;
  private syncQueued = false;
  private lastSelectionKey = '';

  connectedCallback() {
    this.observer = new MutationObserver(() => this.queueSync());
    this.observer.observe(this.el, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }

  componentDidLoad() {
    this.syncSelection(false);
  }

  /** `value` of every checked row checkbox. */
  @Method()
  async getSelected(): Promise<string[]> {
    return this.selectedValues(this.rowCheckboxes());
  }

  /** Uncheck every row (and the header checkbox). */
  @Method()
  async clearSelection(): Promise<void> {
    for (const box of this.rowCheckboxes()) {
      box.checked = false;
      box.indeterminate = false;
    }
    this.syncSelection(true);
  }

  // material-checkbox bubbles `checkedChange` on user interaction only —
  // the programmatic writes in the sweep below stay silent, so no storms.
  @Listen('checkedChange')
  handleCheckedChange(e: CustomEvent) {
    this.handleToggle(e.target as HTMLElement);
  }

  // Same path for plain <input type="checkbox"> rows.
  @Listen('change')
  handleNativeChange(e: globalThis.Event) {
    const target = e.target as HTMLElement;
    if (target.matches?.('input[type="checkbox"]')) this.handleToggle(target);
  }

  @Listen('click')
  handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;

    const sortHeader = target.closest?.('th[data-sort]');
    if (sortHeader && this.el.contains(sortHeader) && !sortHeader.querySelector('a[href]')) {
      const current = sortHeader.getAttribute('aria-sort');
      this.materialSort.emit({
        column: (sortHeader as HTMLElement).dataset.sort!,
        direction: current === 'ascending' ? 'descending' : 'ascending',
      });
      return;
    }

    this.handleRowLink(e, target);
  }

  // --- selection ---------------------------------------------------------

  private selectAllBox(): CheckboxLike | null {
    return this.el.querySelector<CheckboxLike>('thead [data-select-all]');
  }

  /** A row's selection checkbox: explicit `data-row-select`, else the first
   *  checkbox in the row's first cell. Checkboxes elsewhere in a row are
   *  ordinary cell content and stay out of the selection protocol. */
  private rowCheckbox(tr: HTMLTableRowElement): CheckboxLike | null {
    const explicit = tr.querySelector<CheckboxLike>('[data-row-select]');
    if (explicit) return explicit;
    return tr.cells[0]?.querySelector<CheckboxLike>(CHECKBOX_SELECTOR) ?? null;
  }

  private rowCheckboxes(): CheckboxLike[] {
    const rows = Array.from(this.el.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    return rows.map((tr) => this.rowCheckbox(tr)).filter((box): box is CheckboxLike => !!box);
  }

  private selectedValues(boxes: CheckboxLike[]): string[] {
    return boxes.filter((b) => b.checked && !b.indeterminate).map((b) => b.value ?? '');
  }

  private handleToggle(target: HTMLElement) {
    if (target.matches('[data-select-all]')) {
      const on = (target as unknown as CheckboxLike).checked;
      for (const box of this.rowCheckboxes()) {
        if (box.disabled) continue;
        box.checked = on;
        box.indeterminate = false;
      }
      this.syncSelection(true);
      return;
    }

    const tr = target.closest('tr');
    if (tr && this.rowCheckbox(tr as HTMLTableRowElement) === target) {
      this.syncSelection(true);
    }
  }

  /** Recompute row highlight classes + header checkbox state; emit when the
   *  selection actually changed. Runs after user toggles and after any DOM
   *  swap (Unpoly fragment updates) via the MutationObserver. */
  private syncSelection(emit: boolean) {
    const boxes = this.rowCheckboxes();
    for (const box of boxes) {
      box.closest('tr')?.classList.toggle('selected', box.checked && !box.indeterminate);
    }

    const values = this.selectedValues(boxes);
    const enabled = boxes.filter((b) => !b.disabled);
    const allSelected = enabled.length > 0 && enabled.every((b) => b.checked && !b.indeterminate);

    const selectAll = this.selectAllBox();
    if (selectAll) {
      selectAll.checked = allSelected;
      selectAll.indeterminate = values.length > 0 && !allSelected;
      selectAll.disabled = enabled.length === 0;
    }

    const key = values.join('\x1f');
    if (emit && key !== this.lastSelectionKey) {
      this.materialSelectionChange.emit({ values, count: values.length, allSelected });
    }
    this.lastSelectionKey = key;
  }

  // Coalesce MutationObserver bursts (a fragment swap mutates many nodes).
  // Only childList is observed, and syncSelection touches classes/props, so
  // the sweep can't re-trigger the observer.
  private queueSync() {
    if (this.syncQueued) return;
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      if (this.el.isConnected) this.syncSelection(true);
    });
  }

  // --- row link -----------------------------------------------------------

  /** On `tr[data-row-link]`, a click anywhere in the row's dead space proxies
   *  to the row's first <a href> — a real anchor click, so Unpoly attributes
   *  (up-follow, up-layer, up-target) keep working. Clicks on interactive
   *  elements (native or any custom element) are left alone. */
  private handleRowLink(e: MouseEvent, target: HTMLElement) {
    const tr = target.closest?.('tr[data-row-link]');
    if (!tr || !this.el.contains(tr)) return;

    const interactive = target.closest('a, button, input, select, textarea, label, [data-no-row-link]');
    if (interactive && tr.contains(interactive)) return;
    for (let node: HTMLElement | null = target; node && node !== tr; node = node.parentElement) {
      if (node.tagName.includes('-')) return;
    }

    const link = tr.querySelector<HTMLAnchorElement>('a[href]');
    if (link) {
      e.preventDefault();
      link.click();
    }
  }

  render() {
    return (
      <Host aria-busy={this.loading ? 'true' : undefined}>
        <slot />
      </Host>
    );
  }
}
