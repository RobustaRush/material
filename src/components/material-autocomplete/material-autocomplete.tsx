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

export type MaterialAutocompleteVariant = 'filled' | 'outlined';

// Same delimiter contract as material-select — see the comment there.
const VALUE_SEP = '\x1f';

// MD3 autocomplete — an editable combobox over the select's anatomy. Single
// mode commits one option; `multiple` renders chips and toggles options.
// Strict by default: only option values commit, free text reverts on blur
// (it is an FK picker, not a text input).
//
// Options come from any of three sources:
//   1. Slotted <material-option> elements — the same declarative markup as
//      material-select (a Django template renders them; Unpoly may swap them).
//      They are data carriers only, never displayed; filtering is client-side.
//   2. The `options` property — an array of {value, label, …} set from JS.
//      Client-side filtering too.
//   3. `src` — a URL fetched as JSON with `?q=<query>` (debounced, aborting
//      stale requests). The server filters; results replace the list. Accepts
//      `[{value,label}, …]`, `{results: […]}`, and select2-style `{id,text}`
//      items — a Django view can return any of them. Selected values whose
//      option has scrolled out of the current result page keep their label
//      via an internal value→label cache, seeded from slotted options (render
//      the current selection as <material-option selected> for initial loads).
//
// Every query change also emits `materialSearch` — an integration that wants
// full control (custom transport, GraphQL, …) can listen and update the
// slotted options or the `options` property itself, without `src`.
//
// The listbox is rendered INSIDE this component's shadow root (not a slotted
// material-menu): focus must stay in the input while ArrowDown/Up move the
// active row, which needs aria-activedescendant — an IDREF that cannot cross
// a shadow boundary. Rows therefore live in the same tree as the input.
// Light dismiss falls out of focus handling: clicking anywhere outside blurs
// the input, and focusout closes the popup (rows cancel mousedown so
// clicking them never blurs).

export interface AutocompleteOption {
  value: string;
  label: string;
  supportingText?: string;
  disabled?: boolean;
}

interface MaterialOptionLike extends HTMLElement {
  value: string;
  label?: string;
  supportingText?: string;
  disabled: boolean;
  selected: boolean;
}

@Component({
  tag: 'material-autocomplete',
  styleUrl: 'material-autocomplete.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialAutocomplete {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() variant: MaterialAutocompleteVariant = 'outlined';
  @Prop() name?: string;
  @Prop() label?: string;
  @Prop() placeholder?: string;
  @Prop({ mutable: true, reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ reflect: true }) error = false;
  @Prop() leadingIcon?: string;
  @Prop() clearable = false;

  /** Committed value (single mode) / CSV mirror (multi mode). */
  @Prop({ mutable: true, reflect: true }) value = '';

  /** Chips + toggling options; posts one form entry per value. */
  @Prop({ reflect: true }) multiple = false;

  /** Source of truth in multi mode — same contract as material-select. */
  @Prop({ mutable: true }) values: string[] = [];

  /** Options provided from JS instead of slotted material-options. */
  @Prop() options?: AutocompleteOption[];

  /** Remote JSON endpoint. When set, the server filters (`?q=` appended)
   *  and slotted/`options` lists only seed the label cache. */
  @Prop() src?: string;

  /** Query-string parameter appended to `src`. */
  @Prop({ attribute: 'query-param' }) queryParam = 'q';

  /** Debounce for remote fetches, ms. */
  @Prop() debounce = 250;

  /** Minimum typed characters before `src` is queried (0 = fetch on open). */
  @Prop({ attribute: 'min-chars' }) minChars = 0;

  @Prop() noResultsLabel = '';
  @Prop() loadingLabel = '';
  @Prop() clearLabel = '';
  @Prop() openLabel = '';

  @State() open = false;
  @State() focused = false;
  @State() inputText = '';
  @State() highlightedIndex = -1;
  @State() loading = false;
  @State() remoteOptions: AutocompleteOption[] = [];
  @State() slotRevision = 0; // bump to re-read slotted options

  @Event() valueChange!: EventEmitter<{ value: string; values: string[] }>;
  @Event() openChange!: EventEmitter<{ open: boolean }>;
  @Event() materialSearch!: EventEmitter<{ query: string }>;

  private defaultValue = '';
  private defaultValues: string[] = [];
  private labelCache = new Map<string, string>();
  private dirty = false; // input text diverged from the committed label
  private inputEl?: HTMLInputElement;
  private popupEl?: HTMLElement;
  private surfaceEl?: HTMLElement;
  private stopTracking?: () => void;
  private searchTimer = 0;
  private abortCtl?: AbortController;
  private everFetched = false;

  // --- lifecycle ----------------------------------------------------------

  componentWillLoad() {
    this.defaultValue = this.value;
    if (this.multiple) {
      if (!this.values?.length && this.value) {
        this.values = this.value.split(VALUE_SEP).filter(Boolean);
      }
      this.defaultValues = [...(this.values ?? [])];
      this.value = this.values.join(VALUE_SEP);
    }
    this.readSlottedOptions();
  }

  connectedCallback() {
    this.syncFormValue();
    this.mirrorValuesAttr();
  }

  componentDidLoad() {
    this.refreshInputFromValue();
  }

  disconnectedCallback() {
    window.clearTimeout(this.searchTimer);
    this.abortCtl?.abort();
    this.stopTracking?.();
  }

  componentDidRender() {
    this.syncPopup();
  }

  // --- value plumbing (same contract as material-select) -------------------

  @Watch('value')
  onValueChange() {
    if (this.multiple) {
      const parsed = this.value ? this.value.split(VALUE_SEP).filter(Boolean) : [];
      if (parsed.join(VALUE_SEP) !== this.values.join(VALUE_SEP)) {
        this.values = parsed;
        return;
      }
    }
    this.refreshInputFromValue();
    this.syncFormValue();
  }

  @Watch('values')
  onValuesChange() {
    if (!this.multiple) return;
    const joined = this.values.join(VALUE_SEP);
    if (this.value !== joined) this.value = joined;
    this.syncFormValue();
    this.mirrorValuesAttr();
  }

  @Watch('disabled')
  @Watch('error')
  @Watch('required')
  onAttrChange() {
    this.syncFormValue();
  }

  @Watch('src')
  onSrcChange() {
    this.remoteOptions = [];
    this.everFetched = false;
  }

  formDisabledCallback(d: boolean) {
    this.disabled = d;
  }

  formResetCallback() {
    if (this.multiple) {
      this.values = [...this.defaultValues];
    } else {
      this.value = this.defaultValue;
    }
    this.setInput(this.multiple ? '' : this.labelFor(this.value));
  }

  formStateRestoreCallback(state: string | null) {
    if (state == null) return;
    if (this.multiple) {
      this.values = state ? state.split(VALUE_SEP).filter(Boolean) : [];
    } else {
      this.value = state;
    }
  }

  private mirrorValuesAttr() {
    if (this.multiple) {
      this.el.setAttribute('data-values', JSON.stringify(this.values));
    } else if (this.el.hasAttribute('data-values')) {
      this.el.removeAttribute('data-values');
    }
  }

  private syncFormValue() {
    if (this.disabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      return;
    }
    if (this.multiple) {
      const fd = new FormData();
      if (this.name) for (const v of this.values) fd.append(this.name, v);
      this.internals.setFormValue(fd, this.values.join(VALUE_SEP));
      if (this.required && this.values.length === 0) {
        this.internals.setValidity(
          { valueMissing: true },
          gettext('Please select at least one option'),
          this.inputEl ?? this.el,
        );
      } else {
        this.internals.setValidity({});
      }
      return;
    }
    this.internals.setFormValue(this.value);
    if (this.required && !this.value) {
      this.internals.setValidity(
        { valueMissing: true },
        gettext('Please select an option'),
        this.inputEl ?? this.el,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  // --- option sources -------------------------------------------------------

  private slottedOptions: AutocompleteOption[] = [];

  private readSlottedOptions() {
    const nodes = Array.from(
      this.el.querySelectorAll<HTMLElement>('material-option'),
    ) as MaterialOptionLike[];
    this.slottedOptions = nodes.map((o) => ({
      value: o.value,
      label: (o.label ?? o.textContent ?? '').trim(),
      supportingText: o.supportingText,
      disabled: !!o.disabled,
    }));
    for (const o of this.slottedOptions) this.labelCache.set(o.value, o.label);
    // Selected markers seed value state on first read (server-rendered form).
    const marked = nodes.filter((o) => o.selected).map((o) => o.value);
    if (marked.length && !this.value && !this.values.length) {
      if (this.multiple) this.values = marked;
      else this.value = marked[0];
    }
  }

  private handleSlotChange = () => {
    this.readSlottedOptions();
    this.slotRevision++;
    this.refreshInputFromValue();
  };

  private staticOptions(): AutocompleteOption[] {
    return this.options ?? this.slottedOptions;
  }

  private query(): string {
    return this.dirty ? this.inputText.trim() : '';
  }

  /** Rows currently shown in the listbox. */
  private displayedOptions(): AutocompleteOption[] {
    if (this.src) return this.remoteOptions;
    const q = this.query().toLowerCase();
    const all = this.staticOptions();
    if (!q) return all;
    return all.filter((o) => o.label.toLowerCase().includes(q));
  }

  private labelFor(v: string): string {
    return v ? (this.labelCache.get(v) ?? v) : '';
  }

  // --- remote search --------------------------------------------------------

  private scheduleSearch() {
    window.clearTimeout(this.searchTimer);
    const q = this.query();
    this.searchTimer = window.setTimeout(() => {
      this.materialSearch.emit({ query: q });
      if (this.src && q.length >= this.minChars) this.fetchRemote(q);
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
      this.remoteOptions = items.map((raw) => this.normalizeItem(raw));
      for (const o of this.remoteOptions) this.labelCache.set(o.value, o.label);
      this.highlightedIndex = this.remoteOptions.length ? 0 : -1;
    } catch (err) {
      if (!ctl.signal.aborted) this.remoteOptions = [];
    } finally {
      if (this.abortCtl === ctl) this.loading = false;
    }
  }

  // Accepts our shape and select2's {id, text} so existing Django endpoints
  // (django-select2, admin autocomplete views) work unmodified.
  private normalizeItem(raw: any): AutocompleteOption {
    const value = String(raw?.value ?? raw?.id ?? '');
    return {
      value,
      label: String(raw?.label ?? raw?.text ?? value),
      supportingText: raw?.supportingText ?? raw?.supporting_text ?? undefined,
      disabled: !!raw?.disabled,
    };
  }

  // --- open/close -----------------------------------------------------------

  private setOpen(open: boolean) {
    if (this.open === open) return;
    if (open && (this.disabled || this.readOnly)) return;
    this.open = open;
    this.openChange.emit({ open });
    if (open) {
      const displayed = this.displayedOptions();
      const selected = this.multiple ? null : this.value;
      const selIdx = displayed.findIndex((o) => o.value === selected);
      this.highlightedIndex = selIdx >= 0 ? selIdx : (displayed.length ? 0 : -1);
      if (this.src && !this.everFetched && this.minChars === 0) this.fetchRemote('');
    }
  }

  /** Drive the manual popover + anchored tracking from the `open` state. */
  private syncPopup() {
    const popup = this.popupEl;
    const anchor = this.surfaceEl;
    if (!popup || !anchor) return;
    const isOpen = popup.matches(':popover-open');
    if (this.open && !isOpen) {
      popup.style.minWidth = `${Math.round(anchor.getBoundingClientRect().width)}px`;
      popup.showPopover();
      this.stopTracking = trackAnchored(popup, anchor, {
        placement: 'bottom-start',
        offset: 4,
        maxHeight: 320,
      });
    } else if (!this.open && isOpen) {
      popup.hidePopover();
      this.stopTracking?.();
      this.stopTracking = undefined;
    }
  }

  // --- committing -----------------------------------------------------------

  private setInput(text: string) {
    this.inputText = text;
    this.dirty = false;
    if (this.inputEl) this.inputEl.value = text;
  }

  private refreshInputFromValue() {
    if (this.multiple) return; // multi input is only ever the query
    if (this.dirty) return;
    this.setInput(this.labelFor(this.value));
  }

  private pick(o: AutocompleteOption) {
    if (o.disabled || this.disabled || this.readOnly) return;
    this.labelCache.set(o.value, o.label);
    if (this.multiple) {
      const set = new Set(this.values);
      set.has(o.value) ? set.delete(o.value) : set.add(o.value);
      this.values = [...set];
      this.setInput('');
      if (!this.src) this.highlightedIndex = this.indexOf(o);
      this.valueChange.emit({ value: this.value, values: this.values });
      this.inputEl?.focus();
      return; // stays open
    }
    this.value = o.value;
    this.setInput(o.label);
    this.setOpen(false);
    this.valueChange.emit({ value: this.value, values: this.value ? [this.value] : [] });
    this.inputEl?.focus();
  }

  private indexOf(o: AutocompleteOption): number {
    return this.displayedOptions().findIndex((x) => x.value === o.value);
  }

  private removeValue(v: string) {
    if (this.disabled || this.readOnly) return;
    if (!this.values.includes(v)) return;
    this.values = this.values.filter((x) => x !== v);
    this.valueChange.emit({ value: this.value, values: this.values });
  }

  private clear = (e?: Event) => {
    e?.stopPropagation();
    if (this.multiple) {
      if (!this.values.length) return;
      this.values = [];
    } else {
      this.value = '';
      this.setInput('');
    }
    this.valueChange.emit({ value: this.value, values: this.multiple ? this.values : [] });
    this.inputEl?.focus();
  };

  /** Discard uncommitted text (single reverts to the committed label). */
  private revertInput() {
    if (this.multiple) this.setInput('');
    else this.setInput(this.labelFor(this.value));
  }

  // --- input events -----------------------------------------------------------

  private handleInput = (e: InputEvent) => {
    const text = (e.target as HTMLInputElement).value;
    this.inputText = text;
    this.dirty = true;
    const enough = !this.src || text.trim().length >= this.minChars;
    this.setOpen(true);
    if (enough) {
      this.scheduleSearch();
      if (!this.src) {
        this.highlightedIndex = this.displayedOptions().length ? 0 : -1;
      }
    }
  };

  private handleFocus = () => {
    this.focused = true;
    // Select-all so typing replaces the committed label instead of appending.
    if (!this.multiple && this.inputEl?.value) this.inputEl.select();
  };

  private handleFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && this.el.shadowRoot?.contains(next)) return;
    if (next && this.el.contains(next)) return;
    this.focused = false;
    this.setOpen(false);
    this.revertInput();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.disabled || this.readOnly) return;
    const displayed = this.displayedOptions();

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
        if (!this.open) {
          // Native parity: Enter in a closed field submits the surrounding
          // form (implicit submission doesn't cross the shadow boundary).
          this.internals.form?.requestSubmit();
          return;
        }
        e.preventDefault();
        const o = displayed[this.highlightedIndex];
        if (o) this.pick(o);
        return;
      }
      case 'Escape': {
        if (this.open) {
          e.preventDefault();
          this.setOpen(false);
          this.revertInput();
        }
        return;
      }
      case 'Tab': {
        this.setOpen(false);
        this.revertInput();
        return;
      }
      case 'Backspace': {
        if (this.multiple && !this.inputEl?.value && this.values.length) {
          e.preventDefault();
          this.removeValue(this.values[this.values.length - 1]);
        }
        return;
      }
    }
  };

  private handleShellClick = (e: MouseEvent) => {
    if (this.disabled || this.readOnly) return;
    const path = e.composedPath();
    if (path.some((n) => n instanceof HTMLElement
        && ((n as HTMLElement).tagName === 'MATERIAL-ICON-BUTTON'
            || (n as HTMLElement).classList?.contains('chip-remove')))) {
      return;
    }
    this.inputEl?.focus();
    this.setOpen(true);
  };

  private toggleMenu = (e?: Event) => {
    e?.stopPropagation();
    if (this.open) {
      this.setOpen(false);
      this.inputEl?.focus();
    } else {
      this.inputEl?.focus();
      this.setOpen(true);
    }
  };

  private scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      this.popupEl
        ?.querySelector(`#opt-${this.highlightedIndex}`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  // --- render -----------------------------------------------------------------

  private renderMatch(label: string) {
    const q = this.query();
    if (!q) return label;
    const idx = label.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return label;
    return [
      label.slice(0, idx),
      <span class="match">{label.slice(idx, idx + q.length)}</span>,
      label.slice(idx + q.length),
    ];
  }

  private renderPopup() {
    const displayed = this.displayedOptions();
    const q = this.query();
    const needMore = !!this.src && q.length < this.minChars;
    const showLoading = this.loading && !displayed.length;
    const showEmpty = !this.loading && !displayed.length && !needMore;

    return (
      <div
        class="popup"
        popover="manual"
        role="listbox"
        id="listbox"
        aria-multiselectable={this.multiple ? 'true' : null}
        aria-label={this.label}
        ref={(el) => (this.popupEl = el)}
        onMouseDown={(e: MouseEvent) => e.preventDefault()}
      >
        {displayed.map((o, i) => {
          const selected = this.multiple ? this.values.includes(o.value) : o.value === this.value;
          return (
            <div
              class={[
                'row',
                i === this.highlightedIndex ? 'highlighted' : '',
                selected ? 'selected' : '',
                o.disabled ? 'disabled' : '',
              ].filter(Boolean).join(' ')}
              role="option"
              id={`opt-${i}`}
              aria-selected={this.multiple ? null : (selected ? 'true' : 'false')}
              aria-checked={this.multiple ? (selected ? 'true' : 'false') : null}
              aria-disabled={o.disabled ? 'true' : null}
              onClick={() => this.pick(o)}
              onMouseEnter={() => (this.highlightedIndex = i)}
            >
              {this.multiple && (
                <span class="row-check-icon" aria-hidden="true">
                  {selected ? 'check_box' : 'check_box_outline_blank'}
                </span>
              )}
              <span class="row-text">
                <span class="row-label">{this.renderMatch(o.label)}</span>
                {o.supportingText && <span class="row-supporting">{o.supportingText}</span>}
              </span>
              {!this.multiple && selected && (
                <span class="row-selected-icon" aria-hidden="true">check</span>
              )}
            </div>
          );
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
    const filled = this.variant === 'filled';
    const hasLeading = !!this.leadingIcon;
    const hasSelection = this.multiple ? this.values.length > 0 : !!this.value;
    const isFilled = hasSelection || !!this.inputText || this.focused;
    const labelTone = this.error ? 'error' : (this.focused ? 'focused' : 'idle');
    const subText = this.error ? this.errorText : this.helpText;
    const showClear = this.clearable && hasSelection && !this.disabled && !this.readOnly;
    const clearLabel = this.clearLabel || gettext('Clear selection');
    const openLabel = this.openLabel || gettext('Open list');
    const showPlaceholder = !hasSelection && !this.inputText && (this.focused || !this.label);
    const stopBlur = (e: Event) => e.preventDefault();

    const chip = (v: string) => {
      const lbl = this.labelFor(v);
      return (
        <span class="chip">
          <span class="chip-label">{lbl}</span>
          <button
            type="button"
            class="chip-remove"
            aria-label={`${gettext('Remove')} ${lbl}`}
            disabled={this.disabled || this.readOnly}
            onClick={(e: Event) => { e.stopPropagation(); this.removeValue(v); }}
            onMouseDown={stopBlur as any}
          >
            <span class="chip-remove-icon" aria-hidden="true">close</span>
          </button>
        </span>
      );
    };

    const input = (
      <input
        class="query"
        ref={(el) => (this.inputEl = el)}
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck={false}
        value={this.inputText}
        placeholder={showPlaceholder ? this.placeholder : undefined}
        disabled={this.disabled}
        readOnly={this.readOnly}
        aria-label={this.label}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={this.open ? 'true' : 'false'}
        aria-controls="listbox"
        aria-activedescendant={this.open && this.highlightedIndex >= 0 ? `opt-${this.highlightedIndex}` : undefined}
        aria-invalid={this.error ? 'true' : null}
        aria-describedby={subText ? 'description' : null}
        aria-required={this.required ? 'true' : null}
        onInput={this.handleInput}
        onFocus={this.handleFocus}
        onKeyDown={this.handleKeyDown}
      />
    );

    const trailing = (
      <span class="trailing">
        {this.loading && <span class="spinner" aria-hidden="true">progress_activity</span>}
        {showClear && (
          <material-icon-button
            size="xs"
            variant="standard"
            icon="close"
            aria-label={clearLabel}
            class="clear-btn"
            onClick={this.clear}
            onMouseDown={stopBlur as any}
          />
        )}
        <material-icon-button
          size="s"
          variant="standard"
          icon="arrow_drop_down"
          aria-label={openLabel}
          disabled={this.disabled}
          class={this.open ? 'chevron open' : 'chevron'}
          onClick={this.toggleMenu}
          onMouseDown={stopBlur as any}
        />
      </span>
    );

    const leading = hasLeading && (
      <span class={this.error ? 'leading-icon error' : 'leading-icon'} aria-hidden="true">
        {this.leadingIcon}
      </span>
    );

    const supportingRow = subText && (
      <div class="supporting-row">
        <span id="description" class={this.error ? 'error' : 'idle'} role={this.error ? 'alert' : undefined}>
          {subText}
        </span>
      </div>
    );

    const shellCls = [
      'shell',
      filled ? 'filled' : 'outlined',
      hasLeading ? 'leading' : 'no-leading',
      showClear || this.loading ? 'wide' : 'narrow',
    ].join(' ');

    const labelCls = [
      'field-label',
      filled ? 'filled' : 'outlined',
      hasLeading ? 'leading' : '',
      isFilled ? 'shrunk' : 'rest',
      labelTone,
    ].filter(Boolean).join(' ');

    const surfaceCls = [
      'surface',
      filled ? 'filled' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    return (
      <Host onFocusout={this.handleFocusOut}>
        <div class="wrapper">
          <div class={surfaceCls} ref={(el) => (this.surfaceEl = el)} onClick={this.handleShellClick}>
            {leading}
            {trailing}
            <div class={shellCls}>
              {this.multiple && this.values.map(chip)}
              {input}
            </div>
            {this.label && (
              <label class={labelCls}>
                {this.label}{this.required ? ' *' : ''}
              </label>
            )}
            {filled ? (
              <span
                class={[
                  'indicator',
                  this.error ? 'error' : (this.focused ? 'focused' : ''),
                  this.error || this.focused ? 'active' : '',
                ].filter(Boolean).join(' ')}
                aria-hidden="true"
              ></span>
            ) : (
              <fieldset
                aria-hidden="true"
                class={['fieldset', this.error ? 'error' : (this.focused ? 'focused' : '')].filter(Boolean).join(' ')}
              >
                {this.label && (
                  <legend class={this.error || this.focused ? 'legend active' : 'legend'}>
                    <span class={isFilled ? 'legend-text expanded' : 'legend-text'}>
                      {this.label}{this.required ? ' *' : ''}
                    </span>
                  </legend>
                )}
              </fieldset>
            )}
          </div>
          {supportingRow}
        </div>

        {this.renderPopup()}

        {/* Slotted material-options are data only — never displayed. */}
        <div class="option-source" hidden>
          <slot onSlotchange={this.handleSlotChange} />
        </div>
      </Host>
    );
  }
}
