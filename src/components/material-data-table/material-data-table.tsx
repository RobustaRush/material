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
//
// v2 additions, same server-first contract:
//   virtual          — windowed display of a large server-rendered tbody:
//                      off-screen rows go display:none, two spacer rows keep
//                      the scrollbar honest. Rows never leave the DOM, so
//                      selection/form state and fragment swaps keep working.
//                      Needs uniform row heights + a max-height on the host.
//   resizable        — drag a header cell's edge; widths freeze into
//                      table-layout:fixed, `materialColumnResize` lets the
//                      server persist them (re-render as inline styles).
//   reorderable      — drag a header cell sideways; every row's cells move,
//                      `materialColumnReorder` reports {column, from, to}.
//                      Colspan rows (group headers, empty state) are skipped.
//   sticky-start="N" — pin the first N columns during horizontal scroll.
//   tr.row-group     — server-rendered group header row (aggregates included);
//                      click/Enter folds its member rows (until the next
//                      group row). No client-side grouping math.
//   .cell-edit       — an ordinary <input>/<select> in a cell, styled to read
//                      as text until focused; posts with the page form
//                      (Django formsets). Changes are relayed as
//                      `materialCellEdit`.

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

export interface DataTableColumnResizeDetail {
  /** th's data-column / data-sort, else its index as a string. */
  column: string;
  width: number;
}

export interface DataTableColumnReorderDetail {
  column: string;
  from: number;
  to: number;
}

export interface DataTableGroupToggleDetail {
  /** tr.row-group's data-group value. */
  group: string;
  collapsed: boolean;
}

export interface DataTableCellEditDetail {
  name: string;
  value: string;
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

  /** Windowed display for large tbodies (thousands of rows): rows outside the
   *  viewport are display:none behind two spacer rows. Pair with a max-height
   *  on the host and uniform row heights. */
  @Prop({ reflect: true }) virtual = false;

  /** Drag a header cell's edge to resize its column. */
  @Prop({ reflect: true }) resizable = false;

  /** Drag a header cell sideways to reorder columns. */
  @Prop({ reflect: true }) reorderable = false;

  /** Pin the first N columns while the table scrolls horizontally. */
  @Prop({ attribute: 'sticky-start' }) stickyStart = 0;

  /** Emitted whenever the set of checked rows changes — user toggles, a
   *  select-all sweep, or a fragment swap replacing the rows. */
  @Event() materialSelectionChange!: EventEmitter<DataTableSelectionDetail>;

  /** Emitted on click inside `th[data-sort]` that contains no link (links
   *  mean server-driven sorting and are left to the browser/Unpoly). The
   *  consumer reorders its data and re-renders; this component never
   *  reorders rows itself. */
  @Event() materialSort!: EventEmitter<DataTableSortDetail>;

  /** Emitted on pointerup after a column-resize drag. */
  @Event() materialColumnResize!: EventEmitter<DataTableColumnResizeDetail>;

  /** Emitted after a column-reorder drop actually moved a column. */
  @Event() materialColumnReorder!: EventEmitter<DataTableColumnReorderDetail>;

  /** Emitted when a `tr.row-group` is folded/unfolded. */
  @Event() materialGroupToggle!: EventEmitter<DataTableGroupToggleDetail>;

  /** Relays `change` from a `.cell-edit` control. */
  @Event() materialCellEdit!: EventEmitter<DataTableCellEditDetail>;

  private observer?: MutationObserver;
  private resizeObs?: ResizeObserver;
  private syncQueued = false;
  private lastSelectionKey = '';
  private spacerTop?: HTMLTableRowElement;
  private spacerBottom?: HTMLTableRowElement;
  private scrollRaf = 0;

  connectedCallback() {
    this.observer = new MutationObserver(() => this.queueSync());
    this.observer.observe(this.el, { childList: true, subtree: true });
    this.el.addEventListener('scroll', this.onScroll, { passive: true });
    this.resizeObs = new ResizeObserver(() => this.queueSync());
    this.resizeObs.observe(this.el);
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.resizeObs?.disconnect();
    this.el.removeEventListener('scroll', this.onScroll);
    cancelAnimationFrame(this.scrollRaf);
    this.scrollRaf = 0;
  }

  componentDidLoad() {
    this.sync(false);
  }

  @Watch('virtual')
  @Watch('resizable')
  @Watch('stickyStart')
  optionsChanged() {
    this.queueSync();
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

  // Same path for plain <input type="checkbox"> rows; `.cell-edit` controls
  // are relayed as cell edits instead of entering the selection protocol.
  @Listen('change')
  handleNativeChange(e: globalThis.Event) {
    const target = e.target as HTMLElement;
    const edit = target.closest?.('.cell-edit') as (HTMLInputElement | null);
    if (edit && this.el.contains(edit)) {
      this.materialCellEdit.emit({ name: edit.name ?? '', value: edit.value ?? '' });
      return;
    }
    if (target.matches?.('input[type="checkbox"]')) this.handleToggle(target);
  }

  @Listen('click')
  handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;

    const group = target.closest?.('tr.row-group');
    if (group && this.el.contains(group)) {
      this.toggleGroup(group as HTMLTableRowElement);
      return;
    }

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

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const group = (e.target as HTMLElement).closest?.('tr.row-group');
    if (group && this.el.contains(group)) {
      e.preventDefault();
      this.toggleGroup(group as HTMLTableRowElement);
    }
  }

  @Listen('pointerdown')
  handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const grip = target.closest?.('.col-resize') as HTMLElement | null;
    if (grip && this.resizable && this.el.contains(grip)) {
      this.startResize(e, grip);
      return;
    }
    if (this.reorderable) {
      const th = target.closest?.('thead th') as HTMLTableCellElement | null;
      if (th && this.el.contains(th) && !th.classList.contains('cell-select')) {
        this.startReorder(e, th);
      }
    }
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
  // Only childList is observed; the sweep's own childList mutations (grip /
  // spacer injection) are idempotent, so the observer settles after one
  // extra pass instead of looping.
  private queueSync() {
    if (this.syncQueued) return;
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      if (this.el.isConnected) this.sync(true);
    });
  }

  /** Full enhancement sweep — after load, any DOM swap, size or option change. */
  private sync(emit: boolean) {
    this.syncSelection(emit);
    this.updateGroups();
    this.injectResizeHandles();
    this.applySticky();
    this.virtualize();
  }

  private headerCells(): HTMLTableCellElement[] {
    return Array.from(this.el.querySelectorAll<HTMLTableCellElement>('thead tr:first-child > th'));
  }

  private colName(th: HTMLTableCellElement): string {
    return th.dataset.column || th.dataset.sort || String(th.cellIndex);
  }

  // --- column widths (shared by resize + virtual) --------------------------

  /** Pin the current auto-layout widths as explicit ones, so row changes
   *  (virtual window) or a drag can't reflow the other columns. min-width:100%
   *  in the CSS keeps a narrow frozen table filling its container. */
  private freezeColumns() {
    const table = this.el.querySelector('table');
    if (!table || table.style.tableLayout === 'fixed') return;
    const ths = this.headerCells();
    if (!ths.length) return;
    const widths = ths.map((th) => th.offsetWidth);
    ths.forEach((th, i) => (th.style.width = `${widths[i]}px`));
    table.style.tableLayout = 'fixed';
    table.style.width = `${widths.reduce((a, b) => a + b, 0)}px`;
  }

  // --- column resize --------------------------------------------------------

  private injectResizeHandles() {
    if (!this.resizable) {
      this.el.querySelectorAll(':scope .col-resize').forEach((g) => g.remove());
      return;
    }
    for (const th of this.headerCells()) {
      if (th.classList.contains('cell-select') || th.querySelector(':scope > .col-resize')) continue;
      const grip = document.createElement('span');
      grip.className = 'col-resize';
      grip.setAttribute('aria-hidden', 'true');
      th.appendChild(grip);
    }
  }

  private startResize(e: PointerEvent, grip: HTMLElement) {
    e.preventDefault();
    const th = grip.closest('th') as HTMLTableCellElement;
    const table = this.el.querySelector('table');
    if (!th || !table) return;
    this.freezeColumns();
    const dir = getComputedStyle(this.el).direction === 'rtl' ? -1 : 1;
    const x0 = e.clientX;
    const w0 = th.offsetWidth;
    const tw0 = table.offsetWidth;
    grip.classList.add('active');
    // Capture keeps the drag alive outside the host; the listeners live on
    // window, so the drag still works when capture is unavailable (synthetic
    // pointers throw here).
    try { grip.setPointerCapture(e.pointerId); } catch { /* noop */ }
    const move = (ev: PointerEvent) => {
      const w = Math.max(48, w0 + (ev.clientX - x0) * dir);
      th.style.width = `${w}px`;
      table.style.width = `${tw0 + (w - w0)}px`;
    };
    const up = () => {
      grip.classList.remove('active');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      this.applySticky();
      this.materialColumnResize.emit({ column: this.colName(th), width: th.offsetWidth });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  // --- column reorder -------------------------------------------------------

  /** A plain click must stay a click (sort links live in the header), so the
   *  drag only engages after a deliberate mostly-horizontal 6px move. */
  private startReorder(e: PointerEvent, th: HTMLTableCellElement) {
    const x0 = e.clientX;
    const y0 = e.clientY;
    const from = th.cellIndex;
    const rtl = getComputedStyle(this.el).direction === 'rtl';
    let engaged = false;
    let target: HTMLTableCellElement | null = null;
    let before = false; // insert at the target's reading-start side

    const move = (ev: PointerEvent) => {
      if (!engaged) {
        const dx = Math.abs(ev.clientX - x0);
        if (dx < 6 || dx < Math.abs(ev.clientY - y0)) return;
        engaged = true;
        try { th.setPointerCapture(e.pointerId); } catch { /* noop */ }
        th.classList.add('drag-col');
        this.el.setAttribute('data-reordering', '');
      }
      target = null;
      for (const cell of this.headerCells()) {
        if (cell === th || cell.classList.contains('cell-select')) continue;
        const r = cell.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX < r.right) {
          target = cell;
          const startHalf = ev.clientX < r.left + r.width / 2;
          before = rtl ? !startHalf : startHalf;
          break;
        }
      }
      for (const cell of this.headerCells()) {
        cell.classList.toggle('drop-before', cell === target && before);
        cell.classList.toggle('drop-after', cell === target && !before);
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!engaged) return;
      th.classList.remove('drag-col');
      this.el.removeAttribute('data-reordering');
      this.headerCells().forEach((c) => c.classList.remove('drop-before', 'drop-after'));
      // The compatibility click that follows the drop would hit a sort control.
      th.addEventListener('click', (ce) => { ce.preventDefault(); ce.stopPropagation(); },
        { capture: true, once: true });
      if (!target) return;
      let to = target.cellIndex + (before ? 0 : 1);
      if (from < to) to -= 1;
      if (to === from) return;
      this.moveColumn(from, to);
      this.applySticky();
      this.materialColumnReorder.emit({ column: this.colName(this.headerCells()[to]), from, to });
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  private moveColumn(from: number, to: number) {
    const table = this.el.querySelector('table');
    if (!table) return;
    const cols = this.headerCells().length;
    for (const row of Array.from(table.rows)) {
      if (row.cells.length !== cols) continue; // colspan rows: groups, empty, spacers
      row.insertBefore(row.cells[from], row.cells[from < to ? to + 1 : to] ?? null);
    }
  }

  // --- sticky columns -------------------------------------------------------

  /** Pin the first `sticky-start` cells of every full-width row: sticky
   *  position via CSS, cumulative inline offsets measured off the header. */
  private applySticky() {
    const table = this.el.querySelector('table');
    if (!table) return;
    table.querySelectorAll('.pinned').forEach((c) => {
      c.classList.remove('pinned', 'pinned-last');
      (c as HTMLElement).style.insetInlineStart = '';
    });
    const n = this.stickyStart;
    if (!n) return;
    const ths = this.headerCells();
    const offsets: number[] = [];
    for (let i = 0, acc = 0; i < n; i++) {
      offsets[i] = acc;
      acc += ths[i]?.offsetWidth ?? 0;
    }
    for (const row of Array.from(table.rows)) {
      if (row.cells.length !== ths.length) continue;
      for (let i = 0; i < n; i++) {
        const cell = row.cells[i];
        cell.classList.add('pinned');
        cell.classList.toggle('pinned-last', i === n - 1);
        cell.style.insetInlineStart = `${offsets[i]}px`;
      }
    }
  }

  // --- row grouping ---------------------------------------------------------

  private toggleGroup(tr: HTMLTableRowElement) {
    const collapsed = tr.classList.toggle('collapsed');
    this.updateGroups();
    this.virtualize();
    this.materialGroupToggle.emit({ group: tr.dataset.group ?? '', collapsed });
  }

  /** Fold the member rows of every collapsed `tr.row-group` — the rows that
   *  follow it up to the next group row. Groups and their aggregate cells are
   *  server-rendered; this only shows/hides. */
  private updateGroups() {
    let anyGroup = false;
    let collapsed = false;
    for (const row of Array.from(this.el.querySelectorAll<HTMLTableRowElement>('tbody tr'))) {
      if (row.classList.contains('v-spacer')) continue;
      if (row.classList.contains('row-group')) {
        anyGroup = true;
        collapsed = row.classList.contains('collapsed');
        row.tabIndex = 0;
        row.setAttribute('aria-expanded', String(!collapsed));
      } else if (anyGroup) {
        row.hidden = collapsed;
      }
    }
  }

  // --- virtual rows ---------------------------------------------------------

  private onScroll = () => {
    if (this.scrollRaf) return;
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0;
      this.el.toggleAttribute('data-inline-scrolled', Math.abs(this.el.scrollLeft) > 1);
      if (this.virtual) this.virtualize();
    });
  };

  private makeSpacer(): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = 'v-spacer';
    tr.setAttribute('aria-hidden', 'true');
    const td = document.createElement('td');
    td.colSpan = 999;
    tr.appendChild(td);
    return tr;
  }

  /** Windowed display: rows outside the viewport (± overscan) go
   *  display:none while two spacer rows preserve the scroll height. Rows stay
   *  in the DOM, so form/selection state and fragment swaps are untouched.
   *  Assumes uniform row height (measured from the first visible row). */
  private virtualize() {
    const tbody = this.el.querySelector('tbody');
    if (!tbody) return;

    if (!this.virtual) {
      if (this.spacerTop?.isConnected) {
        this.spacerTop.remove();
        this.spacerBottom?.remove();
        for (const row of Array.from(tbody.rows)) row.style.display = '';
      }
      return;
    }

    this.freezeColumns();
    if (!this.spacerTop || !this.spacerBottom) {
      this.spacerTop = this.makeSpacer();
      this.spacerBottom = this.makeSpacer();
    }
    if (tbody.firstElementChild !== this.spacerTop) tbody.prepend(this.spacerTop);
    if (tbody.lastElementChild !== this.spacerBottom) tbody.append(this.spacerBottom);

    // group-folded rows (hidden attr) are out of the geometry entirely
    const rows = Array.from(tbody.rows).filter(
      (r) => r !== this.spacerTop && r !== this.spacerBottom && !r.hidden,
    );
    const probe = rows.find((r) => r.style.display !== 'none');
    const rowH = probe?.offsetHeight || (this.dense ? 40 : 52);

    // tbody's start inside the scroll content. The top spacer replaces the
    // folded-away rows 1:1, so row i always occupies contentTop + i*rowH.
    const contentTop =
      tbody.getBoundingClientRect().top - this.el.getBoundingClientRect().top + this.el.scrollTop;

    const overscan = 10;
    const start = Math.max(0, Math.floor((this.el.scrollTop - contentTop) / rowH) - overscan);
    const end = Math.min(
      rows.length,
      Math.ceil((this.el.scrollTop + this.el.clientHeight - contentTop) / rowH) + overscan,
    );

    rows.forEach((row, i) => {
      const show = i >= start && i < end;
      if ((row.style.display === 'none') === show) row.style.display = show ? '' : 'none';
    });
    this.spacerTop.cells[0].style.height = `${start * rowH}px`;
    this.spacerBottom.cells[0].style.height = `${(rows.length - end) * rowH}px`;
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
