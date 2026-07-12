import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';
import { trackAnchored } from '../../utils/anchor-position';

// MD3 Search (contained style) — the standalone search bar + search view
// pair from m3.material.io/components/search. The bar is a 56dp pill on
// `surface container high`; focusing it opens the search view with
// suggestions/results:
//
//   - docked (medium/expanded windows): a rounded results container tracks
//     2dp below the bar, capped at 2/3 of the viewport height;
//   - full-screen (compact windows): the whole component expands into a
//     fixed overlay on `surface container low` — back arrow, input, clear,
//     results below. `layout="auto"` (default) switches on viewport width.
//
// Spec: docs/wiki/specs/google-material/search/ (bar + view token sets).
//
// Suggestions come from the same three sources as material-autocomplete:
//   1. Slotted <material-option> — server-rendered (Django/Unpoly swappable).
//      `leading-icon`, `supporting-text`, `data-section` ("Recent", …) and
//      `data-href` are honored. With `src` set they still show for the empty
//      query — the natural place for recent searches.
//   2. The `items` property — [{label, value?, icon?, avatar?, avatarName?,
//      supportingText?, section?, href?}, …] set from JS.
//   3. `src` — a JSON endpoint queried with `?q=` (debounced, aborted).
//
// Unlike autocomplete this is not an FK picker: free text IS the value.
// The component is form-associated and posts `name=<query>`; Enter (with no
// active suggestion) submits the surrounding form, so a plain Django search
// view works with zero JS. Items with `href` navigate through a temporary
// light-DOM anchor so Unpoly's document-level click delegation sees it
// (same pattern as material-command-palette).
//
// The listbox lives in this shadow root (combobox pattern — focus stays in
// the input, aria-activedescendant cannot cross shadow boundaries).

export type MaterialSearchLayout = 'auto' | 'docked' | 'fullscreen';

export interface SearchItem {
  /** Committed into the input when picked; defaults to `label`. */
  value?: string;
  label: string;
  /** Material Symbols ligature shown before the label. */
  icon?: string;
  /** Avatar image URL (wins over `avatarName`). */
  avatar?: string;
  /** Name rendered as an auto-colored initials avatar. */
  avatarName?: string;
  supportingText?: string;
  /** Group label — consecutive items with the same section share a header. */
  section?: string;
  /** Navigate on pick instead of committing text. */
  href?: string;
  disabled?: boolean;
}

interface MaterialOptionLike extends HTMLElement {
  value: string;
  label?: string;
  leadingIcon?: string;
  supportingText?: string;
  disabled: boolean;
}

const COMPACT_MQ = '(max-width: 599px)';

@Component({
  tag: 'material-search',
  styleUrl: 'material-search.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialSearch {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() name?: string;
  @Prop() placeholder = 'Search';
  @Prop({ mutable: true, reflect: true }) value = '';
  @Prop({ mutable: true, reflect: true }) disabled = false;

  /** Show the × button while there is text (spec: optional clear icon). */
  @Prop() clearable = true;

  /** Suggestions provided from JS instead of slotted material-options. */
  @Prop() items?: SearchItem[];

  /** Remote JSON endpoint; the server filters (`?q=` appended). */
  @Prop() src?: string;
  @Prop({ attribute: 'query-param' }) queryParam = 'q';
  @Prop() debounce = 250;
  @Prop({ attribute: 'min-chars' }) minChars = 0;

  /** View layout: auto = full-screen on compact viewports, docked otherwise. */
  @Prop({ reflect: true }) layout: MaterialSearchLayout = 'auto';

  /** `up-target` copied to the navigation anchor for href suggestions. */
  @Prop({ attribute: 'up-target' }) upTarget?: string;

  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;
  @Prop() noResultsLabel = '';
  @Prop() loadingLabel = '';
  @Prop() clearLabel = '';
  @Prop() backLabel = '';

  @State() open = false;
  @State() compact = false;
  @State() highlightedIndex = -1;
  @State() loading = false;
  @State() remoteItems: SearchItem[] = [];
  @State() slotRevision = 0;

  @Event() materialSearchInput!: EventEmitter<{ query: string }>;
  @Event() materialSearchSubmit!: EventEmitter<{ query: string }>;
  @Event({ cancelable: true }) materialSelect!: EventEmitter<{ item: SearchItem }>;
  @Event() openChange!: EventEmitter<{ open: boolean }>;

  private defaultValue = '';
  private inputEl?: HTMLInputElement;
  private popupEl?: HTMLElement;
  private barEl?: HTMLElement;
  private listEl?: HTMLElement;
  private stopTracking?: () => void;
  private searchTimer = 0;
  private abortCtl?: AbortController;
  private everFetched = false;
  private compactMq?: MediaQueryList;

  // --- lifecycle ----------------------------------------------------------

  componentWillLoad() {
    this.defaultValue = this.value;
    this.readSlottedItems();
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.compactMq = window.matchMedia(COMPACT_MQ);
      this.compact = this.compactMq.matches;
    }
  }

  connectedCallback() {
    this.syncFormValue();
    this.compactMq?.addEventListener('change', this.onCompactChange);
  }

  disconnectedCallback() {
    window.clearTimeout(this.searchTimer);
    this.abortCtl?.abort();
    this.stopTracking?.();
    this.compactMq?.removeEventListener('change', this.onCompactChange);
  }

  componentDidRender() {
    this.syncPopup();
  }

  private onCompactChange = (e: MediaQueryListEvent) => {
    this.compact = e.matches;
  };

  private isFullscreen(): boolean {
    return this.layout === 'fullscreen' || (this.layout === 'auto' && this.compact);
  }

  // --- form plumbing --------------------------------------------------------

  @Watch('value')
  @Watch('disabled')
  syncFormValue() {
    this.internals.setFormValue(this.disabled ? null : (this.value ?? ''));
  }

  formDisabledCallback(d: boolean) {
    this.disabled = d;
  }

  formResetCallback() {
    this.value = this.defaultValue;
    if (this.inputEl) this.inputEl.value = this.defaultValue;
  }

  formStateRestoreCallback(state: string | null) {
    this.value = state ?? '';
  }

  // --- suggestion sources ----------------------------------------------------

  private slottedItems: SearchItem[] = [];

  private readSlottedItems() {
    const nodes = Array.from(
      this.el.querySelectorAll<HTMLElement>('material-option'),
    ) as MaterialOptionLike[];
    this.slottedItems = nodes.map((o) => ({
      value: o.value || undefined,
      label: (o.label ?? o.textContent ?? '').trim(),
      icon: o.leadingIcon,
      supportingText: o.supportingText,
      section: o.dataset.section,
      href: o.dataset.href,
      avatar: o.dataset.avatar,
      avatarName: o.dataset.avatarName,
      disabled: !!o.disabled,
    }));
  }

  private handleSlotChange = () => {
    this.readSlottedItems();
    this.slotRevision++;
  };

  private staticItems(): SearchItem[] {
    return this.items ?? this.slottedItems;
  }

  /** Rows currently shown. Empty query always shows the static list (recent
   *  searches / entry points); with `src`, typing switches to remote results. */
  private displayedItems(): SearchItem[] {
    const q = this.value.trim().toLowerCase();
    if (!q) return this.staticItems();
    if (this.src) return this.remoteItems;
    return this.staticItems().filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.supportingText ?? '').toLowerCase().includes(q),
    );
  }

  // --- remote search ----------------------------------------------------------

  private scheduleSearch() {
    window.clearTimeout(this.searchTimer);
    const q = this.value.trim();
    this.searchTimer = window.setTimeout(() => {
      if (this.src && q && q.length >= this.minChars) this.fetchRemote(q);
    }, this.src ? this.debounce : 0);
  }

  private async fetchRemote(q: string) {
    this.abortCtl?.abort();
    const ctl = (this.abortCtl = new AbortController());
    this.loading = true;
    this.everFetched = true;
    try {
      const url = new URL(this.src!, document.baseURI);
      url.searchParams.set(this.queryParam, q);
      const res = await fetch(url.toString(), {
        signal: ctl.signal,
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      const items: unknown[] = Array.isArray(data) ? data : (data?.results ?? []);
      this.remoteItems = items.map((raw) => this.normalizeItem(raw));
      this.highlightedIndex = this.remoteItems.length ? 0 : -1;
    } catch (err) {
      if (!ctl.signal.aborted) this.remoteItems = [];
    } finally {
      if (this.abortCtl === ctl) this.loading = false;
    }
  }

  // Accepts our shape and select2's {id, text} like material-autocomplete.
  private normalizeItem(raw: any): SearchItem {
    return {
      value: raw?.value ?? raw?.id ?? undefined,
      label: String(raw?.label ?? raw?.text ?? raw?.value ?? raw?.id ?? ''),
      icon: raw?.icon ?? undefined,
      avatar: raw?.avatar ?? undefined,
      avatarName: raw?.avatarName ?? raw?.avatar_name ?? undefined,
      supportingText: raw?.supportingText ?? raw?.supporting_text ?? undefined,
      section: raw?.section ?? undefined,
      href: raw?.href ?? raw?.url ?? undefined,
      disabled: !!raw?.disabled,
    };
  }

  // --- open/close --------------------------------------------------------------

  private setOpen(open: boolean) {
    if (this.open === open) return;
    if (open && this.disabled) return;
    this.open = open;
    this.openChange.emit({ open });
    if (open) {
      this.highlightedIndex = -1;
      const q = this.value.trim();
      if (this.src && q.length >= Math.max(this.minChars, 1) && !this.everFetched) {
        this.fetchRemote(q);
      }
    }
  }

  /** Drive the docked popover from `open`; the fullscreen view is pure CSS. */
  private syncPopup() {
    const popup = this.popupEl;
    const anchor = this.barEl;
    if (!popup || !anchor) return;
    const shouldShow = this.open && !this.isFullscreen();
    const isOpen = popup.matches(':popover-open');
    if (shouldShow && !isOpen) {
      popup.style.minWidth = `${Math.round(anchor.getBoundingClientRect().width)}px`;
      popup.showPopover();
      this.stopTracking = trackAnchored(popup, anchor, {
        placement: 'bottom-start',
        offset: 2, // spec: 2dp bar-to-results gap
        maxHeight: Math.round((window.innerHeight * 2) / 3), // spec: 2/3 screen max
      });
    } else if (!shouldShow && isOpen) {
      popup.hidePopover();
      this.stopTracking?.();
      this.stopTracking = undefined;
    }
  }

  private close(refocus: boolean) {
    this.setOpen(false);
    if (refocus) this.inputEl?.focus();
    else this.inputEl?.blur();
  }

  // --- actions --------------------------------------------------------------------

  private submit() {
    this.materialSearchSubmit.emit({ query: this.value });
    this.setOpen(false);
    this.internals.form?.requestSubmit();
  }

  private pick(item: SearchItem) {
    if (item.disabled || this.disabled) return;
    const ev = this.materialSelect.emit({ item });
    if (ev.defaultPrevented) return;
    if (item.href) {
      this.setOpen(false);
      // Real light-DOM anchor so Unpoly's document-level delegation sees it.
      const a = document.createElement('a');
      a.href = item.href;
      if (this.upTarget) a.setAttribute('up-target', this.upTarget);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    this.value = item.value ?? item.label;
    if (this.inputEl) this.inputEl.value = this.value;
    this.submit();
  }

  private clear = (e?: Event) => {
    e?.stopPropagation();
    if (!this.value) return;
    this.value = '';
    if (this.inputEl) this.inputEl.value = '';
    this.highlightedIndex = -1;
    this.materialSearchInput.emit({ query: '' });
    this.inputEl?.focus();
  };

  // --- input events -----------------------------------------------------------------

  private handleInput = (e: InputEvent) => {
    this.value = (e.target as HTMLInputElement).value;
    this.setOpen(true);
    this.highlightedIndex = -1;
    this.materialSearchInput.emit({ query: this.value });
    this.scheduleSearch();
    if (!this.src) {
      this.highlightedIndex = -1;
    }
  };

  private handleFocus = () => {
    this.setOpen(true);
  };

  private handleFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && this.el.shadowRoot?.contains(next)) return;
    if (next && this.el.contains(next)) return;
    this.setOpen(false);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    const displayed = this.displayedItems();

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!this.open) {
          this.setOpen(true);
          return;
        }
        if (!displayed.length) return;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const from = this.highlightedIndex < 0 ? (delta > 0 ? -1 : 0) : this.highlightedIndex;
        this.highlightedIndex = (from + delta + displayed.length) % displayed.length;
        this.scrollHighlightedIntoView();
        return;
      }
      case 'Enter': {
        e.preventDefault();
        const item = this.open ? displayed[this.highlightedIndex] : undefined;
        if (item) this.pick(item);
        else this.submit();
        return;
      }
      case 'Escape': {
        if (this.open) {
          e.preventDefault();
          this.close(true);
        }
        return;
      }
      case 'Tab': {
        this.setOpen(false);
        return;
      }
    }
  };

  private handleBarClick = () => {
    if (this.disabled) return;
    this.inputEl?.focus();
    this.setOpen(true);
  };

  private scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      this.listEl
        ?.querySelector(`#opt-${this.highlightedIndex}`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  // --- render ---------------------------------------------------------------------------

  private renderMatch(label: string) {
    const q = this.value.trim();
    if (!q) return label;
    const idx = label.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return label;
    return [
      label.slice(0, idx),
      <span class="match">{label.slice(idx, idx + q.length)}</span>,
      label.slice(idx + q.length),
    ];
  }

  private renderList() {
    const displayed = this.displayedItems();
    const q = this.value.trim();
    const needMore = !!this.src && q.length > 0 && q.length < this.minChars;
    const showLoading = this.loading && !displayed.length;
    const showEmpty = !this.loading && !displayed.length && !needMore && !!q;

    let lastSection: string | undefined;

    return (
      <div
        class="list"
        role="listbox"
        id="listbox"
        aria-label={this.ariaLabel ?? this.placeholder}
        ref={(el) => (this.listEl = el)}
      >
        {displayed.map((item, i) => {
          const header =
            item.section && item.section !== lastSection ? (
              <div class={'section' + (lastSection !== undefined ? ' gap' : '')} role="presentation">
                {item.section}
              </div>
            ) : null;
          lastSection = item.section ?? lastSection;
          return [
            header,
            <div
              class={[
                'row',
                i === this.highlightedIndex ? 'highlighted' : '',
                item.disabled ? 'disabled' : '',
              ].filter(Boolean).join(' ')}
              role="option"
              id={`opt-${i}`}
              aria-selected={i === this.highlightedIndex ? 'true' : 'false'}
              aria-disabled={item.disabled ? 'true' : null}
              onClick={() => this.pick(item)}
              onMouseEnter={() => (this.highlightedIndex = i)}
            >
              {item.avatar || item.avatarName ? (
                <material-avatar
                  class="row-avatar"
                  size="s"
                  src={item.avatar}
                  name={item.avatarName ?? item.label}
                  aria-hidden="true"
                />
              ) : (
                <span class="row-icon" aria-hidden="true">
                  {item.icon ?? 'search'}
                </span>
              )}
              <span class="row-text">
                <span class="row-label">{this.renderMatch(item.label)}</span>
                {item.supportingText && <span class="row-supporting">{item.supportingText}</span>}
              </span>
              {item.href && <span class="row-go" aria-hidden="true">north_west</span>}
            </div>,
          ];
        })}
        {this.loading && displayed.length > 0 && (
          <div class="status loading-more" role="presentation">{this.loadingLabel || gettext('Loading…')}</div>
        )}
        {showLoading && <div class="status" role="presentation">{this.loadingLabel || gettext('Loading…')}</div>}
        {needMore && !showLoading && (
          <div class="status" role="presentation">
            {gettext('Type at least %s characters').replace('%s', String(this.minChars))}
          </div>
        )}
        {showEmpty && (
          <div class="status" role="presentation">{this.noResultsLabel || gettext('No results')}</div>
        )}
      </div>
    );
  }

  render() {
    const fullscreen = this.isFullscreen();
    const viewOpen = this.open;
    const showClear = this.clearable && !!this.value && !this.disabled;
    const backLabel = this.backLabel || gettext('Close search');
    const clearLabel = this.clearLabel || gettext('Clear search');
    const stopBlur = (e: Event) => e.preventDefault();

    const bar = (
      <div class="bar" part="bar" ref={(el) => (this.barEl = el)} onClick={this.handleBarClick}>
        {viewOpen ? (
          <material-icon-button
            key="back"
            class="back"
            size="s"
            variant="standard"
            icon="arrow_back"
            aria-label={backLabel}
            onMouseDown={stopBlur as any}
            onClick={(e: Event) => { e.stopPropagation(); this.close(false); }}
          />
        ) : (
          <span key="lead" class="lead-icon" aria-hidden="true">search</span>
        )}
        <input
          ref={(el) => (this.inputEl = el)}
          class="input"
          type="search"
          role="combobox"
          autocomplete="off"
          spellcheck={false}
          value={this.value}
          placeholder={this.placeholder}
          disabled={this.disabled}
          aria-label={this.ariaLabel ?? this.placeholder}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={this.open ? 'true' : 'false'}
          aria-controls="listbox"
          aria-activedescendant={this.open && this.highlightedIndex >= 0 ? `opt-${this.highlightedIndex}` : undefined}
          onInput={this.handleInput}
          onFocus={this.handleFocus}
          onKeyDown={this.handleKeyDown}
        />
        {showClear && (
          <material-icon-button
            class="clear"
            size="s"
            variant="standard"
            icon="close"
            aria-label={clearLabel}
            onMouseDown={stopBlur as any}
            onClick={this.clear}
          />
        )}
        <span class={'trailing' + (viewOpen ? ' view-open' : '')} onMouseDown={stopBlur as any}>
          <slot name="trailing" />
        </span>
      </div>
    );

    return (
      <Host
        class={{
          'view-open': viewOpen,
          'fullscreen': fullscreen && viewOpen,
          'disabled': this.disabled,
        }}
        onFocusout={this.handleFocusOut}
      >
        <div class="frame" role="search">
          {bar}
          {/* Fullscreen results render inline below the bar inside the fixed
              overlay; docked results live in the top-layer popover instead. */}
          {fullscreen && viewOpen && <div class="sheet" key="sheet">{this.renderList()}</div>}
        </div>

        <div
          class="popup"
          popover="manual"
          ref={(el) => (this.popupEl = el)}
          onMouseDown={(e: MouseEvent) => e.preventDefault()}
        >
          {!fullscreen && viewOpen && this.renderList()}
        </div>

        {/* Slotted material-options are data only — never displayed. */}
        <div class="option-source" hidden>
          <slot onSlotchange={this.handleSlotChange} />
        </div>
      </Host>
    );
  }
}
