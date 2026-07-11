import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';
import {
  firstDayOfWeek as i18nFirstDayOfWeek,
  monthNames,
  weekdayNames,
  gettext,
} from '../../utils/i18n';
import {
  addMonthsISO,
  daysInMonth,
  fromISO,
  inRange,
  todayISO,
  toISO,
} from '../../utils/date-utils';

type CalendarMode = 'days' | 'months' | 'years';

// MD3 standalone calendar — 360×456dp grid with month/year nav header.
// Three internal modes: days (default), months, years (12-year window).

@Component({
  tag: 'material-calendar',
  styleUrl: 'material-calendar.css',
  shadow: true,
})
export class MaterialCalendar {
  @Element() el!: HTMLElement;

  /** Selected date as ISO `YYYY-MM-DD`. Empty string = no selection. */
  @Prop({ mutable: true, reflect: true }) value = '';

  /** Min selectable date (ISO). */
  @Prop() min = '';

  /** Max selectable date (ISO). */
  @Prop() max = '';

  /** Currently displayed month as `YYYY-MM`. Defaults to month-of(value)
   *  or current month. */
  @Prop({ mutable: true, reflect: true }) displayMonth = '';

  /** First day of the week (0=Sun..6=Sat). Defaults via i18n helper. */
  @Prop() firstDayOfWeek?: number;

  /** Override locale for month/weekday names. Defaults to <html lang>
   *  or `navigator.language`. */
  @Prop() locale = '';

  /** Earliest year shown in the year picker. Falls back to year-of-`min`
   *  when `min` is set, otherwise 1900. */
  @Prop() minYear?: number;

  /** Latest year shown in the year picker. Falls back to year-of-`max`
   *  when `max` is set, otherwise 2100. */
  @Prop() maxYear?: number;

  /** Render the day grid with tight row heights instead of stretching the
   *  rows to fill the 360×456dp container. Useful when the calendar is
   *  embedded in a denser surface (e.g. inline in a form). */
  @Prop({ reflect: true }) dense = false;

  @State() mode: CalendarMode = 'days';
  @State() focusedDate = '';
  // Tracks whether the last user input was keyboard. Used to gate the
  // focus ring — Safari/Firefox don't grant :focus-visible to programmatic
  // .focus() calls fired from rAF, so we maintain this ourselves.
  @State() keyboardModality = false;

  // Set per render in componentDidUpdate; used to detect mode transitions
  // so we only auto-focus the picker once per open.
  private lastFocusedMode: CalendarMode | '' = '';

  // Auto-scroll the currently-selected item into view inside its own
  // scroll container when switching from days → months/years, and move
  // focus to it so arrow-key nav works immediately. Using scrollIntoView()
  // would walk every ancestor up to the window and yank the whole page
  // around — so adjust the container's scrollTop directly.
  componentDidUpdate() {
    if (!this.el.shadowRoot) return;
    if (this.mode === 'days') {
      // Returning to days from a picker — focus the day cell so arrow nav
      // continues to work without a fresh Tab.
      if (this.lastFocusedMode && this.lastFocusedMode !== 'days') {
        this.lastFocusedMode = 'days';
        this.focusFromState();
      }
      return;
    }
    const container = this.el.shadowRoot.querySelector<HTMLElement>(
      '.cal__list, .cal__years',
    );
    const selected = this.el.shadowRoot.querySelector<HTMLElement>(
      '.cal__list-item.is-selected, .cal__year.is-selected',
    );
    if (!container || !selected) return;
    const cr = container.getBoundingClientRect();
    const sr = selected.getBoundingClientRect();
    const offsetWithin = sr.top - cr.top + container.scrollTop;
    const target = offsetWithin - (container.clientHeight - sr.height) / 2;
    container.scrollTop = Math.max(0, target);
    // Focus the selected item once per mode change so the user can drive
    // the picker from the keyboard immediately.
    if (this.lastFocusedMode !== this.mode) {
      this.lastFocusedMode = this.mode;
      selected.focus({ preventScroll: true });
    }
  }

  @Event() dateSelect!: EventEmitter<{ value: string }>;
  @Event() displayMonthChange!: EventEmitter<{ value: string }>;

  componentWillLoad() {
    if (!this.displayMonth) {
      const seed = fromISO(this.value) ?? new Date();
      this.displayMonth = `${seed.getFullYear()}-${pad2(seed.getMonth() + 1)}`;
    }
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    // Mouse / touch interactions inside the calendar reset the modality
    // so the focus ring disappears as soon as the user picks with a pointer.
    this.el.addEventListener('pointerdown', this.handlePointerDown);
    // When focus leaves the calendar entirely, drop the in-progress
    // focusedDate so the next re-entry lands on the selected date
    // (or today) rather than the last keyboard cursor position.
    this.el.addEventListener('focusout', this.handleFocusOut);
  }

  disconnectedCallback() {
    this.el.removeEventListener('pointerdown', this.handlePointerDown);
    this.el.removeEventListener('focusout', this.handleFocusOut);
  }

  private handleFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    // Focus moved within the calendar (e.g. day → header) — keep state.
    if (next && this.el.contains(next)) return;
    if (this.focusedDate) this.focusedDate = '';
  };

  private handlePointerDown = () => {
    if (this.keyboardModality) this.keyboardModality = false;
    // Clear any keyboard-focus mark on list items so the ring drops as
    // soon as a pointer touches the picker.
    if (!this.el.shadowRoot) return;
    this.el.shadowRoot
      .querySelectorAll('.is-kb-focused')
      .forEach(n => n.classList.remove('is-kb-focused'));
  };

  @Watch('value')
  onValueChange() {
    // Snap displayMonth to the selected value when it changes externally.
    const d = fromISO(this.value);
    if (!d) return;
    const newMonth = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    if (newMonth !== this.displayMonth) this.displayMonth = newMonth;
  }

  @Watch('displayMonth')
  onDisplayMonthChange(next: string, prev: string) {
    if (next !== prev) this.displayMonthChange.emit({ value: next });
  }

  private fdow(): number {
    return typeof this.firstDayOfWeek === 'number'
      ? this.firstDayOfWeek
      : i18nFirstDayOfWeek(this.locale || undefined);
  }

  private parseDisplay(): { year: number; month: number } {
    const m = /^(\d{4})-(\d{2})$/.exec(this.displayMonth);
    if (m) return { year: +m[1], month: +m[2] - 1 };
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  private setDisplay(year: number, month: number) {
    this.displayMonth = `${year}-${pad2(month + 1)}`;
  }

  private prevMonth = () => {
    if (this.prevMonthDisabled()) return;
    this.displayMonth = addMonthsISO(`${this.displayMonth}-01`, -1).slice(0, 7);
  };

  private nextMonth = () => {
    if (this.nextMonthDisabled()) return;
    this.displayMonth = addMonthsISO(`${this.displayMonth}-01`, 1).slice(0, 7);
  };

  private prevMonthDisabled(): boolean {
    if (!this.min) return false;
    const { year, month } = this.parseDisplay();
    const target = new Date(year, month - 1, daysInMonth(year, month - 1));
    return toISO(target) < this.min;
  }

  private nextMonthDisabled(): boolean {
    if (!this.max) return false;
    const { year, month } = this.parseDisplay();
    const target = new Date(year, month + 1, 1);
    return toISO(target) > this.max;
  }

  private selectDate = (iso: string) => {
    if (!inRange(iso, this.min || undefined, this.max || undefined)) return;
    this.value = iso;
    this.focusedDate = iso;
    this.dateSelect.emit({ value: iso });
  };

  private toggleMonths = () => {
    this.mode = this.mode === 'months' ? 'days' : 'months';
  };

  private toggleYears = () => {
    this.mode = this.mode === 'years' ? 'days' : 'years';
  };

  private pickMonth = (m: number) => this.pickFromHeader(undefined, m);
  private pickYear  = (y: number) => this.pickFromHeader(y, undefined);

  private pickFromHeader(year?: number, month?: number) {
    const cur = this.parseDisplay();
    this.setDisplay(year ?? cur.year, month ?? cur.month);
    this.mode = 'days';
  }

  private moveFocus(deltaDays: number) {
    this.moveFocusTo(cur =>
      new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + deltaDays));
  }

  private moveFocusMonths(months: number) {
    this.moveFocusTo(cur => {
      const next = new Date(cur.getFullYear(), cur.getMonth() + months, 1);
      const last = daysInMonth(next.getFullYear(), next.getMonth());
      next.setDate(Math.min(cur.getDate(), last));
      return next;
    });
  }

  private moveFocusTo(advance: (cur: Date) => Date) {
    const cur = fromISO(this.focusedDate || this.value || todayISO());
    if (!cur) return;
    const target = advance(cur);
    const iso = toISO(target);
    if (!inRange(iso, this.min || undefined, this.max || undefined)) return;
    this.focusedDate = iso;
    this.setDisplay(target.getFullYear(), target.getMonth());
    requestAnimationFrame(() => this.focusFromState());
  }

  private focusFromState() {
    const sr = this.el.shadowRoot;
    if (!sr) return;
    // Prefer focusedDate, fall back to whichever day carries tabindex=0
    // (renderDays sets that on focusedDate || value || today || first-of-month).
    const btn = (this.focusedDate
      && sr.querySelector<HTMLElement>(`button[data-iso="${this.focusedDate}"]`))
      || sr.querySelector<HTMLElement>('.cal__day[tabindex="0"]');
    btn?.focus({ preventScroll: true });
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    // Stencil retargets shadow-DOM events to the host, so target is the
    // calendar element rather than the focused inner button. Use composedPath()
    // to get the real focused element.
    const path = (e as KeyboardEvent & { composedPath: () => EventTarget[] }).composedPath();
    const inner = path.find(n => n instanceof HTMLElement) as HTMLElement | undefined;
    if (!inner) return;

    if (this.mode === 'days') {
      // Keyboard nav only when focus is inside the day grid (not on header
      // buttons / nav arrows where Tab/Arrows have native meaning).
      if (!inner.dataset?.iso && !inner.classList?.contains('cal__day')) return;
      this.keyboardModality = true;
      this.handleDaysKeyDown(e, inner);
      return;
    }
    if (this.mode === 'months') {
      if (!inner.classList?.contains('cal__list-item')) return;
      this.keyboardModality = true;
      this.handleListKeyDown(e, inner, 1);
      return;
    }
    if (this.mode === 'years') {
      if (!inner.classList?.contains('cal__year')) return;
      this.keyboardModality = true;
      this.handleListKeyDown(e, inner, 3);
      return;
    }
  }

  private handleDaysKeyDown(e: KeyboardEvent, focused: HTMLElement) {
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); this.moveFocus(-1); return;
      case 'ArrowRight': e.preventDefault(); this.moveFocus(1); return;
      case 'ArrowUp':    e.preventDefault(); this.moveFocus(-7); return;
      case 'ArrowDown':  e.preventDefault(); this.moveFocus(7); return;
      case 'PageUp':
        e.preventDefault();
        this.moveFocusMonths(e.shiftKey ? -12 : -1);
        return;
      case 'PageDown':
        e.preventDefault();
        this.moveFocusMonths(e.shiftKey ? 12 : 1);
        return;
      case 'Home': {
        e.preventDefault();
        const cur = fromISO(this.focusedDate || this.value || todayISO());
        if (!cur) return;
        const offset = (cur.getDay() - this.fdow() + 7) % 7;
        this.moveFocus(-offset);
        return;
      }
      case 'End': {
        e.preventDefault();
        const cur = fromISO(this.focusedDate || this.value || todayISO());
        if (!cur) return;
        const offset = 6 - ((cur.getDay() - this.fdow() + 7) % 7);
        this.moveFocus(offset);
        return;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        // On first focus neither focusedDate nor value is set, but the
        // focused button (tabindex=0, today / first-of-month) carries the
        // real ISO — fall back to it so Enter/Space isn't dead.
        const iso = this.focusedDate || this.value || focused.dataset?.iso || '';
        if (iso) this.selectDate(iso);
        return;
      }
    }
  }

  // Generic linear / grid nav for the months and years pickers. `cols` is 1
  // for the vertical month list and 3 for the year grid.
  private handleListKeyDown(e: KeyboardEvent, current: HTMLElement, cols: number) {
    const items = this.getListItems();
    const idx = items.indexOf(current);
    if (idx < 0) return;
    let next = idx;
    switch (e.key) {
      case 'ArrowDown':  next = idx + cols; break;
      case 'ArrowUp':    next = idx - cols; break;
      case 'ArrowRight': next = idx + 1; break;
      case 'ArrowLeft':  next = idx - 1; break;
      case 'Home':       next = 0; break;
      case 'End':        next = items.length - 1; break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        current.click();
        return;
      default: return;
    }
    e.preventDefault();
    if (next < 0 || next >= items.length) return;
    // Promote the new item to tabindex=0 and demote others, then focus it.
    items.forEach((it, i) => it.tabIndex = i === next ? 0 : -1);
    items[next].focus();
    // Mirror the keyboard focus visually with an explicit class so it
    // shows in Safari/Firefox where :focus-visible doesn't cover
    // programmatic .focus() calls following keydown.
    items.forEach(it => it.classList.remove('is-kb-focused'));
    items[next].classList.add('is-kb-focused');
  }

  private getListItems(): HTMLElement[] {
    if (!this.el.shadowRoot) return [];
    const sel = this.mode === 'months'
      ? '.cal__list-item:not([disabled])'
      : '.cal__year:not([disabled])';
    return Array.from(this.el.shadowRoot.querySelectorAll<HTMLElement>(sel));
  }

  render() {
    return (
      <Host>
        <div class="cal" part="container">
          {this.renderHeader()}
          {this.mode === 'days' && this.renderDays()}
          {this.mode === 'months' && this.renderMonths()}
          {this.mode === 'years' && this.renderYears()}
        </div>
      </Host>
    );
  }

  private renderHeader() {
    const { year, month } = this.parseDisplay();
    const months = monthNames('long', this.locale || undefined);
    const monthLabel = months[month] ?? '';
    // The longest month name in the current locale sizes the month-button
    // text slot — keeps the year button from shifting when navigating from
    // a short month (May) to a long one (September) and back.
    const longestMonth = months.reduce(
      (best, n) => (n.length > best.length ? n : best),
      '',
    );
    const navInactive = this.mode !== 'days';
    // Always render both header buttons so the year button never shifts when
    // switching modes. The non-active one drops its caret and dims its label
    // (matches spec images of months / years configurations).
    const monthState = this.mode === 'months' ? 'active'
                     : this.mode === 'years' ? 'inactive' : 'idle';
    const yearState = this.mode === 'years'  ? 'active'
                    : this.mode === 'months' ? 'inactive' : 'idle';
    const caretGlyph = (state: string) =>
      state === 'active' ? 'arrow_drop_up' : 'arrow_drop_down';
    return (
      <header class="cal__header">
        <div class="cal__title">
          <button
            type="button"
            class={`cal__title-btn is-${monthState}`}
            aria-pressed={monthState === 'active' ? 'true' : 'false'}
            onClick={this.toggleMonths}
          >
            <span class="cal__title-text">
              <span class="cal__title-text-sizer" aria-hidden="true">{longestMonth}</span>
              <span class="cal__title-text-label">{monthLabel}</span>
            </span>
            <span
              class={`material-symbols cal__title-caret ${monthState === 'inactive' ? 'is-hidden' : ''}`}
              aria-hidden="true"
            >
              {caretGlyph(monthState)}
            </span>
          </button>
          <button
            type="button"
            class={`cal__title-btn is-${yearState}`}
            aria-pressed={yearState === 'active' ? 'true' : 'false'}
            onClick={this.toggleYears}
          >
            <span>{year}</span>
            <span
              class={`material-symbols cal__title-caret ${yearState === 'inactive' ? 'is-hidden' : ''}`}
              aria-hidden="true"
            >
              {caretGlyph(yearState)}
            </span>
          </button>
        </div>
        <div class="cal__nav">
          <material-icon-button
            size="s"
            variant="standard"
            icon="chevron_left"
            disabled={navInactive || this.prevMonthDisabled()}
            aria-label={gettext('Previous month')}
            onClick={this.prevMonth}
          />
          <material-icon-button
            size="s"
            variant="standard"
            icon="chevron_right"
            disabled={navInactive || this.nextMonthDisabled()}
            aria-label={gettext('Next month')}
            onClick={this.nextMonth}
          />
        </div>
      </header>
    );
  }

  private renderDays() {
    const { year, month } = this.parseDisplay();
    const fdow = this.fdow();
    const weekdays = weekdayNames('narrow', this.locale || undefined);
    const orderedWeekdays: string[] = [];
    for (let i = 0; i < 7; i++) orderedWeekdays.push(weekdays[(fdow + i) % 7]);

    const today = todayISO();
    const cells: { iso: string; day: number; outside: boolean }[] = [];
    const firstOfMonth = new Date(year, month, 1);
    const lead = (firstOfMonth.getDay() - fdow + 7) % 7;
    // Lead-in days from the previous month.
    const prevLast = daysInMonth(year, month - 1);
    for (let i = lead - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLast - i);
      cells.push({ iso: toISO(d), day: d.getDate(), outside: true });
    }
    // Days in the current month.
    const total = daysInMonth(year, month);
    for (let i = 1; i <= total; i++) {
      const d = new Date(year, month, i);
      cells.push({ iso: toISO(d), day: i, outside: false });
    }
    // Trailing days to complete the last week-row.
    while (cells.length % 7 !== 0) {
      const last = fromISO(cells[cells.length - 1].iso)!;
      const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      cells.push({ iso: toISO(next), day: next.getDate(), outside: true });
    }

    // Pick the cell that should carry tabindex=0. Whatever we pick MUST be
    // present in the rendered grid, otherwise Tab skips the day grid entirely
    // (this is what happens after clicking > to navigate past the selected
    // month — value/focusedDate point at a date outside the visible grid).
    const inMonth = (iso: string) => iso.startsWith(this.displayMonth);
    const firstInMonth = cells.find(c => !c.outside)!.iso;
    const focusISO =
        (this.focusedDate && inMonth(this.focusedDate)) ? this.focusedDate
      : (this.value       && inMonth(this.value))       ? this.value
      : inMonth(today)                                  ? today
      : firstInMonth;

    // Chunk cells into calendar weeks so the grid can expose one ARIA row per
    // week, each holding 7 gridcells (proper role="grid" structure).
    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return (
      <div class="cal__grid" role="grid">
        <div class="cal__weekdays" role="row">
          {orderedWeekdays.map((name) => (
            <span class="cal__weekday" role="columnheader">{name}</span>
          ))}
        </div>
        {weeks.map((week) => (
          <div class="cal__week" role="row">
            {week.map((c) => {
              const disabled = !inRange(c.iso, this.min || undefined, this.max || undefined);
              const selected = c.iso === this.value;
              const isToday = c.iso === today;
              const tabIndex = c.iso === focusISO ? 0 : -1;
              const showFocusRing = this.keyboardModality && c.iso === focusISO;
              const cls = [
                'cal__day',
                c.outside ? 'is-outside' : '',
                selected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
                showFocusRing ? 'is-focused' : '',
              ].filter(Boolean).join(' ');
              return (
                // aria-selected lives on the gridcell, not the button.
                <div class="cal__cell" role="gridcell" aria-selected={selected ? 'true' : 'false'}>
                  <button
                    type="button"
                    class={cls}
                    data-iso={c.iso}
                    aria-current={isToday ? 'date' : undefined}
                    disabled={disabled}
                    tabIndex={tabIndex}
                    onClick={() => this.selectDate(c.iso)}
                  >
                    {c.day}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  private renderMonths() {
    const { year, month } = this.parseDisplay();
    const months = monthNames('long', this.locale || undefined);
    return (
      <div class="cal__list" role="listbox" aria-label={gettext('Select month')}>
        {months.map((name, i) => {
          const selected = i === month;
          const monthStart = toISO(new Date(year, i, 1));
          const monthEnd = toISO(new Date(year, i, daysInMonth(year, i)));
          const disabled = (this.min && monthEnd < this.min)
            || (this.max && monthStart > this.max);
          return (
            <button
              type="button"
              role="option"
              aria-selected={selected ? 'true' : 'false'}
              class={`cal__list-item ${selected ? 'is-selected' : ''}`}
              tabIndex={selected ? 0 : -1}
              disabled={!!disabled}
              onClick={() => this.pickMonth(i)}
            >
              <span class="cal__list-check material-symbols" aria-hidden="true">
                {selected ? 'check' : ''}
              </span>
              <span class="cal__list-label">{name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  private renderYears() {
    const { year } = this.parseDisplay();
    const minYear = this.minYear ?? (this.min ? +this.min.slice(0, 4) : 1900);
    const maxYear = this.maxYear ?? (this.max ? +this.max.slice(0, 4) : 2100);
    let lo = Math.min(minYear, maxYear);
    let hi = Math.max(minYear, maxYear);
    // If the currently displayed year is outside the configured range,
    // extend the picker rounded out to the nearest century so the user
    // can still navigate around it (e.g. 1899 → list starts at 1800).
    if (year < lo) lo = Math.floor(year / 100) * 100;
    if (year > hi) hi = Math.ceil((year + 1) / 100) * 100;
    const items = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    return (
      <div class="cal__years" role="listbox" aria-label={gettext('Select year')}>
        {items.map((y) => {
          const selected = y === year;
          const yearStart = `${y}-01-01`;
          const yearEnd = `${y}-12-31`;
          const disabled = (this.min && yearEnd < this.min)
            || (this.max && yearStart > this.max);
          return (
            <button
              type="button"
              role="option"
              aria-selected={selected ? 'true' : 'false'}
              class={`cal__year ${selected ? 'is-selected' : ''}`}
              tabIndex={selected ? 0 : -1}
              disabled={!!disabled}
              onClick={() => this.pickYear(y)}
            >
              {y}
            </button>
          );
        })}
      </div>
    );
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
