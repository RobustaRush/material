import { Component, Element, Event, EventEmitter, Host, Prop, h } from '@stencil/core';
import { gettext } from '../../utils/i18n';

// Pagination — 40dp round page targets with ellipsis windowing, prev/next
// chevrons. Light DOM (like material-date-field) so that in server-driven
// mode the page links are REAL anchors in the document: Unpoly's
// document-level click delegation never sees anchors inside a shadow root.
//
// Two modes, mirroring material-data-table's sorting contract:
//   server-driven:  href-template="?page={page}"  → plain <a> links, the
//                   server re-renders the fragment (add `up-target` for
//                   Unpoly to swap in place);
//   client-driven:  no href-template → <button>s emit
//                   `materialPageChange {page}` and update `page`.
//
//   <material-pagination page="3" pages="14"
//                        href-template="?page={page}" up-target="table">
//   </material-pagination>

@Component({
  tag: 'material-pagination',
  styleUrl: 'material-pagination.css',
  shadow: false,
})
export class MaterialPagination {
  @Element() el!: HTMLElement;

  /** Current page, 1-based. */
  @Prop({ mutable: true, reflect: true }) page = 1;

  /** Total number of pages. */
  @Prop() pages = 1;

  /** URL pattern with `{page}` placeholder → renders links instead of
   *  buttons; sorting/paging then belongs to the server. */
  @Prop({ attribute: 'href-template' }) hrefTemplate?: string;

  /** Copied onto every link as Unpoly's `up-target` (which implies
   *  following the link via fragment swap). */
  @Prop({ attribute: 'up-target' }) upTarget?: string;

  /** Page numbers kept visible on each side of the current page. */
  @Prop() siblings = 1;

  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialPageChange!: EventEmitter<{ page: number }>;

  /** Window of page numbers with `0` marking an ellipsis gap. */
  private items(): number[] {
    const total = Math.max(1, this.pages);
    const current = Math.min(Math.max(1, this.page), total);
    const wanted = new Set<number>([1, total]);
    for (let p = current - this.siblings; p <= current + this.siblings; p++) {
      if (p >= 1 && p <= total) wanted.add(p);
    }
    const sorted = [...wanted].sort((a, b) => a - b);
    const out: number[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev === 2) out.push(prev + 1); // gap of one — just show it
      else if (prev && p - prev > 2) out.push(0);
      out.push(p);
      prev = p;
    }
    return out;
  }

  private go(p: number) {
    const total = Math.max(1, this.pages);
    if (p < 1 || p > total || p === this.page) return;
    this.page = p;
    this.materialPageChange.emit({ page: p });
  }

  private href(p: number): string {
    return this.hrefTemplate!.replace('{page}', String(p));
  }

  private pageTarget(p: number, current: boolean) {
    const label = `${gettext('Page')} ${p}`;
    if (this.hrefTemplate) {
      return (
        <a
          class={current ? 'item current' : 'item'}
          href={this.href(p)}
          up-target={this.upTarget}
          aria-label={label}
          aria-current={current ? 'page' : undefined}
        >
          {p}
        </a>
      );
    }
    return (
      <button
        type="button"
        class={current ? 'item current' : 'item'}
        aria-label={label}
        aria-current={current ? 'page' : undefined}
        onClick={() => this.go(p)}
      >
        {p}
      </button>
    );
  }

  private navTarget(delta: -1 | 1) {
    const p = this.page + delta;
    const disabled = delta < 0 ? this.page <= 1 : this.page >= this.pages;
    const label = delta < 0 ? gettext('Previous page') : gettext('Next page');
    const glyph = delta < 0 ? 'chevron_left' : 'chevron_right';
    const inner = <span class="chevron" aria-hidden="true">{glyph}</span>;
    if (this.hrefTemplate && !disabled) {
      return (
        <a class="item nav" href={this.href(p)} up-target={this.upTarget} aria-label={label}>
          {inner}
        </a>
      );
    }
    return (
      <button
        type="button"
        class="item nav"
        aria-label={label}
        disabled={disabled}
        onClick={() => this.go(p)}
      >
        {inner}
      </button>
    );
  }

  render() {
    return (
      <Host role="navigation" aria-label={this.ariaLabel ?? gettext('Pagination')}>
        {this.navTarget(-1)}
        {this.items().map((p) =>
          p === 0
            ? <span class="gap" aria-hidden="true">…</span>
            : this.pageTarget(p, p === Math.min(Math.max(1, this.page), Math.max(1, this.pages))),
        )}
        {this.navTarget(1)}
      </Host>
    );
  }
}
