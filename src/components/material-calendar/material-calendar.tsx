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

  @State() mode: CalendarMode = 'days';
  @State() focusedDate = '';

  @Event() dateSelect!: EventEmitter<{ value: string }>;
  @Event() displayMonthChange!: EventEmitter<{ value: string }>;

  componentWillLoad() {
    if (!this.displayMonth) {
      const seed = fromISO(this.value) ?? new Date();
      this.displayMonth = `${seed.getFullYear()}-${pad2(seed.getMonth() + 1)}`;
    }
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

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
    if (!m) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1 };
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

  private pickMonth = (m: number) => {
    const { year } = this.parseDisplay();
    this.setDisplay(year, m);
    this.mode = 'days';
  };

  private pickYear = (y: number) => {
    const { month } = this.parseDisplay();
    this.setDisplay(y, month);
    this.mode = 'days';
  };

  private moveFocus(deltaDays: number) {
    const cur = fromISO(this.focusedDate || this.value || todayISO());
    if (!cur) return;
    const target = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + deltaDays);
    const iso = toISO(target);
    if (!inRange(iso, this.min || undefined, this.max || undefined)) return;
    this.focusedDate = iso;
    this.setDisplay(target.getFullYear(), target.getMonth());
    requestAnimationFrame(() => this.focusFromState());
  }

  private moveFocusMonths(months: number) {
    const cur = fromISO(this.focusedDate || this.value || todayISO());
    if (!cur) return;
    const next = new Date(cur.getFullYear(), cur.getMonth() + months, 1);
    const last = daysInMonth(next.getFullYear(), next.getMonth());
    next.setDate(Math.min(cur.getDate(), last));
    const iso = toISO(next);
    if (!inRange(iso, this.min || undefined, this.max || undefined)) return;
    this.focusedDate = iso;
    this.setDisplay(next.getFullYear(), next.getMonth());
    requestAnimationFrame(() => this.focusFromState());
  }

  private focusFromState() {
    if (!this.el.shadowRoot) return;
    const btn = this.el.shadowRoot.querySelector<HTMLElement>(
      `button[data-iso="${this.focusedDate}"]`,
    );
    btn?.focus();
  }

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (this.mode !== 'days') return;
    const target = e.target as HTMLElement;
    if (!target?.dataset?.iso) return;
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
        const cur = fromISO(this.focusedDate || todayISO());
        if (!cur) return;
        const offset = (cur.getDay() - this.fdow() + 7) % 7;
        this.moveFocus(-offset);
        return;
      }
      case 'End': {
        e.preventDefault();
        const cur = fromISO(this.focusedDate || todayISO());
        if (!cur) return;
        const offset = 6 - ((cur.getDay() - this.fdow() + 7) % 7);
        this.moveFocus(offset);
        return;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this.focusedDate) this.selectDate(this.focusedDate);
        return;
    }
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
    const showMonthBtn = this.mode === 'days' || this.mode === 'months';
    const showYearBtn = this.mode === 'days' || this.mode === 'years';
    const navHidden = this.mode !== 'days';
    return (
      <header class="cal__header">
        <div class="cal__title">
          <button
            type="button"
            class={`cal__title-btn ${this.mode === 'months' ? 'is-active' : ''}`}
            aria-pressed={this.mode === 'months' ? 'true' : 'false'}
            onClick={this.toggleMonths}
            hidden={!showMonthBtn}
          >
            <span>{monthLabel}</span>
            <span class="material-symbols cal__title-caret" aria-hidden="true">
              {this.mode === 'months' ? 'arrow_drop_up' : 'arrow_drop_down'}
            </span>
          </button>
          <button
            type="button"
            class={`cal__title-btn ${this.mode === 'years' ? 'is-active' : ''}`}
            aria-pressed={this.mode === 'years' ? 'true' : 'false'}
            onClick={this.toggleYears}
            hidden={!showYearBtn}
          >
            <span>{year}</span>
            <span class="material-symbols cal__title-caret" aria-hidden="true">
              {this.mode === 'years' ? 'arrow_drop_up' : 'arrow_drop_down'}
            </span>
          </button>
        </div>
        <div class="cal__nav" hidden={navHidden}>
          <material-icon-button
            size="s"
            variant="standard"
            icon="chevron_left"
            disabled={this.prevMonthDisabled()}
            aria-label={gettext('Previous month')}
            onClick={this.prevMonth}
          />
          <material-icon-button
            size="s"
            variant="standard"
            icon="chevron_right"
            disabled={this.nextMonthDisabled()}
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

    const focusISO = this.focusedDate
      || this.value
      || (today.startsWith(this.displayMonth) ? today : '')
      || cells.find((c) => !c.outside)!.iso;

    return [
      <div class="cal__weekdays" role="row">
        {orderedWeekdays.map((name) => (
          <span class="cal__weekday" role="columnheader">{name}</span>
        ))}
      </div>,
      <div class="cal__grid" role="grid">
        {cells.map((c) => {
          const disabled = !inRange(c.iso, this.min || undefined, this.max || undefined);
          const selected = c.iso === this.value;
          const isToday = c.iso === today;
          const tabIndex = c.iso === focusISO ? 0 : -1;
          const cls = [
            'cal__day',
            c.outside ? 'is-outside' : '',
            selected ? 'is-selected' : '',
            isToday ? 'is-today' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              type="button"
              class={cls}
              data-iso={c.iso}
              aria-selected={selected ? 'true' : 'false'}
              aria-current={isToday ? 'date' : undefined}
              disabled={disabled}
              tabIndex={tabIndex}
              onClick={() => this.selectDate(c.iso)}
            >
              {c.day}
            </button>
          );
        })}
      </div>,
    ];
  }

  private renderMonths() {
    const { year, month } = this.parseDisplay();
    const months = monthNames('long', this.locale || undefined);
    return (
      <div class="cal__months" role="grid">
        {months.map((name, i) => {
          const cls = [
            'cal__month',
            i === month ? 'is-selected' : '',
          ].filter(Boolean).join(' ');
          // Disable months entirely outside [min, max].
          const monthStart = toISO(new Date(year, i, 1));
          const monthEnd = toISO(new Date(year, i, daysInMonth(year, i)));
          const disabled = (this.min && monthEnd < this.min)
            || (this.max && monthStart > this.max);
          return (
            <button
              type="button"
              class={cls}
              disabled={!!disabled}
              onClick={() => this.pickMonth(i)}
            >
              {name}
            </button>
          );
        })}
      </div>
    );
  }

  private renderYears() {
    const { year } = this.parseDisplay();
    const start = year - (year % 12);
    const items = Array.from({ length: 12 }, (_, i) => start + i);
    return (
      <div class="cal__years" role="grid">
        {items.map((y) => {
          const cls = [
            'cal__year',
            y === year ? 'is-selected' : '',
          ].filter(Boolean).join(' ');
          const yearStart = `${y}-01-01`;
          const yearEnd = `${y}-12-31`;
          const disabled = (this.min && yearEnd < this.min)
            || (this.max && yearStart > this.max);
          return (
            <button
              type="button"
              class={cls}
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
