import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';

// Dual listbox — the web-component analog of Django admin's
// `filter_horizontal` for M2M fields. Two panels (available / chosen) with
// per-side search, move buttons between them, double-click to move a single
// item, keyboard support inside each panel.
//
//   <material-transfer name="members" available-label="All users"
//                      chosen-label="Members">
//     <material-option value="1">Anna Petersen</material-option>
//     <material-option value="2" selected>Robert Chen</material-option>
//     …
//   </material-transfer>
//
// Options come from slotted <material-option>s (a Django widget renders one
// per queryset row; `selected` marks the chosen side — the same markup a
// <select multiple> would get) or from the `options` property. Form-associated:
// posts one `name=<value>` entry per chosen item, so the server side is a
// plain `request.POST.getlist(name)` / ModelMultipleChoiceField.
//
// Both panels keep the original option order regardless of when items moved.

export interface TransferOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MaterialOptionLike extends HTMLElement {
  value: string;
  label?: string;
  disabled: boolean;
  selected: boolean;
}

type Side = 'available' | 'chosen';

@Component({
  tag: 'material-transfer',
  styleUrl: 'material-transfer.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialTransfer {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() name?: string;
  @Prop({ attribute: 'available-label' }) availableLabel = '';
  @Prop({ attribute: 'chosen-label' }) chosenLabel = '';
  @Prop({ mutable: true, reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;

  /** Per-side search boxes. */
  @Prop() filter = true;

  /** Visible rows per panel (sets the panel height). */
  @Prop() size = 8;

  /** Chosen values — source of truth. */
  @Prop({ mutable: true }) values: string[] = [];

  /** Options provided from JS instead of slotted material-options. */
  @Prop() options?: TransferOption[];

  @State() highlighted: Record<Side, Set<string>> = { available: new Set(), chosen: new Set() };
  @State() queries: Record<Side, string> = { available: '', chosen: '' };
  @State() active: Record<Side, number> = { available: -1, chosen: -1 };
  @State() slotRevision = 0;

  @Event() valueChange!: EventEmitter<{ values: string[] }>;

  private defaultValues: string[] = [];
  private slottedOptions: TransferOption[] = [];
  private panelEls: Partial<Record<Side, HTMLElement>> = {};

  // --- lifecycle ------------------------------------------------------------

  componentWillLoad() {
    this.readSlottedOptions(true);
    this.defaultValues = [...this.values];
  }

  connectedCallback() {
    this.syncFormValue();
  }

  @Watch('values')
  onValuesChange() {
    this.syncFormValue();
  }

  @Watch('disabled')
  @Watch('required')
  onFlagsChange() {
    this.syncFormValue();
  }

  formDisabledCallback(d: boolean) {
    this.disabled = d;
  }

  formResetCallback() {
    this.values = [...this.defaultValues];
    this.highlighted = { available: new Set(), chosen: new Set() };
  }

  formStateRestoreCallback(state: string | null) {
    if (state != null) this.values = state.split('\x1f').filter(Boolean);
  }

  private syncFormValue() {
    if (this.disabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      return;
    }
    const fd = new FormData();
    if (this.name) for (const v of this.values) fd.append(this.name, v);
    this.internals.setFormValue(fd, this.values.join('\x1f'));
    if (this.required && this.values.length === 0) {
      this.internals.setValidity(
        { valueMissing: true },
        gettext('Please choose at least one option'),
        this.panelEls.available ?? this.el,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  // --- option sources ---------------------------------------------------------

  private readSlottedOptions(seedValues = false) {
    const nodes = Array.from(
      this.el.querySelectorAll<HTMLElement>('material-option'),
    ) as MaterialOptionLike[];
    this.slottedOptions = nodes.map((o) => ({
      value: o.value,
      label: (o.label ?? o.textContent ?? '').trim(),
      disabled: !!o.disabled,
    }));
    if (seedValues && !this.values.length) {
      const marked = nodes.filter((o) => o.selected).map((o) => o.value);
      if (marked.length) this.values = marked;
    }
  }

  private handleSlotChange = () => {
    this.readSlottedOptions();
    this.slotRevision++;
  };

  private allOptions(): TransferOption[] {
    return this.options ?? this.slottedOptions;
  }

  private sideOptions(side: Side): TransferOption[] {
    const chosen = new Set(this.values);
    return this.allOptions().filter((o) =>
      side === 'chosen' ? chosen.has(o.value) : !chosen.has(o.value));
  }

  /** Options currently visible in a panel (side + search filter). */
  private visibleOptions(side: Side): TransferOption[] {
    const q = this.queries[side].trim().toLowerCase();
    const list = this.sideOptions(side);
    if (!q) return list;
    return list.filter((o) => o.label.toLowerCase().includes(q));
  }

  // --- moving -------------------------------------------------------------------

  private move(valuesToMove: string[], to: Side) {
    if (this.disabled || !valuesToMove.length) return;
    const movable = new Set(
      valuesToMove.filter((v) => !this.allOptions().find((o) => o.value === v)?.disabled),
    );
    if (!movable.size) return;
    const chosen = new Set(this.values);
    for (const v of movable) {
      if (to === 'chosen') chosen.add(v);
      else chosen.delete(v);
    }
    // Preserve original option order on both sides.
    this.values = this.allOptions().filter((o) => chosen.has(o.value)).map((o) => o.value);
    // Moved items arrive highlighted on the other side — easy to move back.
    const from: Side = to === 'chosen' ? 'available' : 'chosen';
    this.highlighted = {
      ...this.highlighted,
      [from]: new Set([...this.highlighted[from]].filter((v) => !movable.has(v))),
      [to]: new Set(movable),
    } as Record<Side, Set<string>>;
    this.valueChange.emit({ values: this.values });
  }

  private moveHighlighted(to: Side) {
    const from: Side = to === 'chosen' ? 'available' : 'chosen';
    this.move([...this.highlighted[from]], to);
  }

  private moveAll(to: Side) {
    const from: Side = to === 'chosen' ? 'available' : 'chosen';
    // "All" respects the active filter — matches Django's chooser behavior.
    this.move(this.visibleOptions(from).filter((o) => !o.disabled).map((o) => o.value), to);
  }

  // --- panel interaction -----------------------------------------------------------

  private toggleHighlight(side: Side, value: string) {
    if (this.disabled) return;
    const set = new Set(this.highlighted[side]);
    set.has(value) ? set.delete(value) : set.add(value);
    this.highlighted = { ...this.highlighted, [side]: set } as Record<Side, Set<string>>;
  }

  private handleRowDblClick(side: Side, o: TransferOption) {
    if (o.disabled) return;
    this.move([o.value], side === 'available' ? 'chosen' : 'available');
  }

  private handlePanelKeyDown(side: Side, e: KeyboardEvent) {
    if (this.disabled) return;
    const visible = this.visibleOptions(side);
    if (!visible.length) return;
    const idx = this.active[side];

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const from = idx < 0 ? (delta > 0 ? -1 : 0) : idx;
        const next = (from + delta + visible.length) % visible.length;
        this.active = { ...this.active, [side]: next } as Record<Side, number>;
        this.scrollActiveIntoView(side, next);
        return;
      }
      case ' ': {
        e.preventDefault();
        const o = visible[idx];
        if (o && !o.disabled) this.toggleHighlight(side, o.value);
        return;
      }
      case 'Enter': {
        e.preventDefault();
        const o = visible[idx];
        if (o && !o.disabled) this.move([o.value], side === 'available' ? 'chosen' : 'available');
        return;
      }
    }
  }

  private scrollActiveIntoView(side: Side, index: number) {
    requestAnimationFrame(() => {
      this.panelEls[side]
        ?.querySelector(`#${side}-opt-${index}`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  // --- public API ---------------------------------------------------------------------

  @Method()
  async getValues(): Promise<string[]> {
    return [...this.values];
  }

  // --- render -----------------------------------------------------------------------------

  private renderPanel(side: Side) {
    const title = side === 'available'
      ? (this.availableLabel || gettext('Available'))
      : (this.chosenLabel || gettext('Chosen'));
    const visible = this.visibleOptions(side);
    const total = this.sideOptions(side).length;
    const activeIdx = this.active[side];

    return (
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">{title}</span>
          <span class="panel-count">
            {this.queries[side].trim()
              ? `${visible.length} / ${total}`
              : String(total)}
          </span>
        </div>

        {this.filter && (
          <div class="search">
            <span class="search-icon" aria-hidden="true">search</span>
            <input
              type="search"
              class="search-input"
              placeholder={gettext('Filter…')}
              disabled={this.disabled}
              aria-label={`${gettext('Filter')} ${title}`}
              value={this.queries[side]}
              onInput={(e: InputEvent) => {
                this.queries = {
                  ...this.queries,
                  [side]: (e.target as HTMLInputElement).value,
                } as Record<Side, string>;
                this.active = { ...this.active, [side]: -1 } as Record<Side, number>;
              }}
            />
          </div>
        )}

        <div
          class="listbox"
          role="listbox"
          aria-multiselectable="true"
          aria-label={title}
          aria-disabled={this.disabled ? 'true' : null}
          aria-activedescendant={activeIdx >= 0 ? `${side}-opt-${activeIdx}` : undefined}
          tabIndex={this.disabled ? -1 : 0}
          style={{ '--transfer-rows': String(this.size) }}
          ref={(el) => (this.panelEls[side] = el)}
          onKeyDown={(e: KeyboardEvent) => this.handlePanelKeyDown(side, e)}
        >
          {visible.map((o, i) => (
            <div
              id={`${side}-opt-${i}`}
              class={{
                row: true,
                highlighted: this.highlighted[side].has(o.value),
                active: i === activeIdx,
                disabled: !!o.disabled,
              }}
              role="option"
              aria-selected={this.highlighted[side].has(o.value) ? 'true' : 'false'}
              aria-disabled={o.disabled ? 'true' : null}
              onClick={() => {
                if (o.disabled) return;
                this.active = { ...this.active, [side]: i } as Record<Side, number>;
                this.toggleHighlight(side, o.value);
              }}
              onDblClick={() => this.handleRowDblClick(side, o)}
            >
              <span class="row-label">{o.label}</span>
            </div>
          ))}
          {/* a listbox must own at least one option — the empty state is a
              disabled informative one, not a presentational div */}
          {!visible.length && (
            <div class="empty" role="option" aria-disabled="true" aria-selected="false">
              {this.queries[side].trim() ? gettext('No matches') : gettext('Empty')}
            </div>
          )}
        </div>
      </div>
    );
  }

  render() {
    const availHl = this.highlighted.available.size;
    const chosenHl = this.highlighted.chosen.size;
    const availVisible = this.visibleOptions('available').some((o) => !o.disabled);
    const chosenVisible = this.visibleOptions('chosen').some((o) => !o.disabled);

    const btn = (
      icon: string,
      label: string,
      onClick: () => void,
      enabled: boolean,
    ) => (
      <material-icon-button
        variant="outlined"
        size="s"
        icon={icon}
        class="move-btn"
        aria-label={label}
        disabled={this.disabled || !enabled}
        onClick={onClick}
      />
    );

    return (
      <Host>
        <div class="grid">
          {this.renderPanel('available')}

          <div class="controls" role="group" aria-label={gettext('Move items')}>
            {btn('keyboard_double_arrow_right', gettext('Choose all'), () => this.moveAll('chosen'), availVisible)}
            {btn('chevron_right', gettext('Choose selected'), () => this.moveHighlighted('chosen'), availHl > 0)}
            {btn('chevron_left', gettext('Remove selected'), () => this.moveHighlighted('available'), chosenHl > 0)}
            {btn('keyboard_double_arrow_left', gettext('Remove all'), () => this.moveAll('available'), chosenVisible)}
          </div>

          {this.renderPanel('chosen')}
        </div>

        {/* Slotted material-options are data only — never displayed. */}
        <div class="option-source" hidden>
          <slot onSlotchange={this.handleSlotChange} />
        </div>
      </Host>
    );
  }
}
