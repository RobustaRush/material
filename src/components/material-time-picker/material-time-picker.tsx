import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import {
  defaultTimeMode,
  gettext,
} from '../../utils/i18n';
import {
  fromISOTime,
  nowISOTime,
} from '../../utils/date-utils';

export type MaterialTimePickerMode = '12' | '24';
export type MaterialTimePickerView = 'dial' | 'input';

// MD3 modal time picker — dial (default) + input variants. 12/24h selectable.
// Tap-to-select (no drag in v1). Always serialises to canonical 24h `HH:MM`.

@Component({
  tag: 'material-time-picker',
  styleUrl: 'material-time-picker.css',
  shadow: true,
})
export class MaterialTimePicker {
  @Element() el!: HTMLElement;

  /** Selected time as ISO 24h `HH:MM`. Empty string = no selection (defaults
   *  to current time on first render so the dial has a starting point). */
  @Prop({ mutable: true, reflect: true }) value = '';

  /** `'12'` (AM/PM) or `'24'`. Defaults to the locale's preference via
   *  `Intl.DateTimeFormat(...).resolvedOptions().hour12`. */
  @Prop({ mutable: true, reflect: true }) mode: MaterialTimePickerMode = '24';

  /** Active view inside the picker. Toggled by the keyboard/clock icon. */
  @Prop({ mutable: true, reflect: true }) view: MaterialTimePickerView = 'dial';

  /** Hide the footer's Cancel + OK buttons. The host (e.g. material-time-field)
   *  may render its own dialog actions instead. The view-toggle stays visible. */
  @Prop() hideActions = false;

  /** Override locale for default-mode resolution. */
  @Prop() locale = '';

  /** Override the headline in the top-left of the picker container.
   *  Defaults to a localised "Select time" / "Enter time" depending on
   *  whether the dial or input view is active. */
  @Prop() headline = '';

  /** Granularity of selectable times as `HH:MM`. Default `00:01` allows any
   *  minute. `00:15` snaps to quarters; `01:00` only allows on-the-hour. */
  @Prop() precision = '00:01';

  /** Earliest selectable time as `HH:MM`. Empty = no lower bound. */
  @Prop() minimum = '';

  /** Latest selectable time as `HH:MM`. Empty = no upper bound. */
  @Prop() maximum = '';

  @State() editing: 'hour' | 'minute' = 'hour';

  @Event() valueChange!: EventEmitter<{ value: string }>;
  @Event() viewChange!: EventEmitter<{ view: MaterialTimePickerView }>;
  @Event() pickerCancel!: EventEmitter<void>;
  @Event() pickerOk!: EventEmitter<{ value: string }>;

  componentWillLoad() {
    if (!this.mode || (this.mode !== '12' && this.mode !== '24')) {
      this.mode = defaultTimeMode(this.locale || undefined);
    }
    if (!this.value) this.value = this.normaliseToBounds(nowISOTime());
    else this.value = this.normaliseToBounds(this.value);
  }

  /** Snap an ISO time to the nearest precision step that lies within
   *  `[minimum, maximum]`. Used at load to clean up an out-of-range / off-step
   *  initial value so the dial always has a valid starting point. */
  private normaliseToBounds(iso: string): string {
    const total = this.toMinutes(iso);
    if (total == null) return iso;
    const step = this.stepMinutes();
    const lo = this.minimum ? (this.toMinutes(this.minimum) ?? 0) : 0;
    const hi = this.maximum ? (this.toMinutes(this.maximum) ?? 23 * 60 + 59) : 23 * 60 + 59;
    let snapped = Math.round(total / step) * step;
    if (snapped < lo) snapped = Math.ceil(lo / step) * step;
    if (snapped > hi) snapped = Math.floor(hi / step) * step;
    snapped = Math.max(0, Math.min(23 * 60 + 59, snapped));
    return `${pad2(Math.floor(snapped / 60))}:${pad2(snapped % 60)}`;
  }

  @Watch('view')
  onViewChange(next: MaterialTimePickerView, prev: MaterialTimePickerView) {
    if (next !== prev) this.viewChange.emit({ view: next });
  }

  // ---- value helpers ----

  private parts(): { h: number; m: number } {
    const d = fromISOTime(this.value) ?? new Date();
    return { h: d.getHours(), m: d.getMinutes() };
  }

  private setHM(h: number, m: number) {
    const next = `${pad2(h)}:${pad2(m)}`;
    if (next === this.value) return;
    this.value = next;
    this.valueChange.emit({ value: next });
  }

  /** Step in minutes parsed from the `precision` prop. Defaults to 1. */
  private stepMinutes(): number {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(this.precision || '');
    if (!m) return 1;
    const total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return total > 0 ? total : 1;
  }

  /** True iff a candidate `HH:MM` is within `[minimum, maximum]` bounds. */
  private inRange(hh: number, mm: number): boolean {
    const v = hh * 60 + mm;
    if (this.minimum) {
      const lo = this.toMinutes(this.minimum);
      if (lo != null && v < lo) return false;
    }
    if (this.maximum) {
      const hi = this.toMinutes(this.maximum);
      if (hi != null && v > hi) return false;
    }
    return true;
  }

  /** True iff a candidate (hh,mm) lies on a precision step. */
  private onStep(hh: number, mm: number): boolean {
    const step = this.stepMinutes();
    return ((hh * 60 + mm) % step) === 0;
  }

  private toMinutes(iso: string): number | null {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(iso);
    if (!m) return null;
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (hh > 23 || mm > 59) return null;
    return hh * 60 + mm;
  }

  private isPM(): boolean {
    return this.parts().h >= 12;
  }

  private hour12Display(): number {
    const { h: hr } = this.parts();
    const h12 = hr % 12;
    return h12 === 0 ? 12 : h12;
  }

  // ---- handlers ----

  private setEditing = (which: 'hour' | 'minute') => {
    this.editing = which;
    if (this.view !== 'dial') this.view = 'dial';
  };

  private togglePeriod = (target: 'AM' | 'PM') => {
    const { h: hr, m } = this.parts();
    const isPM = hr >= 12;
    if (target === 'PM' && !isPM) {
      const next = hr + 12;
      if (this.inRange(next, m)) this.setHM(next, m);
    } else if (target === 'AM' && isPM) {
      const next = hr - 12;
      if (this.inRange(next, m)) this.setHM(next, m);
    }
  };

  private periodDisabled(target: 'AM' | 'PM'): boolean {
    // Disabled if no hour in that half-day yields any in-range, on-step time.
    const lo = target === 'AM' ? 0 : 12;
    const hi = target === 'AM' ? 11 : 23;
    for (let h = lo; h <= hi; h++) {
      if (this.hourHasValidMinute(h)) return false;
    }
    return true;
  }

  private hourHasValidMinute(h: number): boolean {
    const step = this.stepMinutes();
    for (let m = 0; m < 60; m += step) {
      if (this.inRange(h, m)) return true;
    }
    return false;
  }

  private toggleView = () => {
    this.view = this.view === 'dial' ? 'input' : 'dial';
  };

  private pickDialCell = (n: number) => {
    const { h: hr, m } = this.parts();
    if (this.editing === 'hour') {
      let newH = n;
      if (this.mode === '12') {
        // n is 1..12 from the dial labels; preserve current AM/PM.
        const isPM = hr >= 12;
        if (n === 12) newH = isPM ? 12 : 0;
        else newH = isPM ? n + 12 : n;
      }
      // Snap minute into range/step for the new hour if the existing minute
      // wouldn't produce a valid time (e.g. min=08:30 with hour clicked = 8).
      let nextM = m;
      if (!this.inRange(newH, nextM) || !this.onStep(newH, nextM)) {
        nextM = this.firstValidMinute(newH);
        if (nextM < 0) return; // hour has no valid minute — shouldn't be reachable
      }
      this.setHM(newH, nextM);
      // Auto-advance to minute selection per spec — unless step is whole-hour
      // (no minute choice to make).
      if (this.stepMinutes() < 60) this.editing = 'minute';
    } else {
      if (!this.inRange(hr, n) || !this.onStep(hr, n)) return;
      this.setHM(hr, n);
    }
  };

  private firstValidMinute(h: number): number {
    const step = this.stepMinutes();
    for (let m = 0; m < 60; m += step) {
      if (this.inRange(h, m)) return m;
    }
    return -1;
  }

  private onHourInput = (e: Event) => {
    const raw = (e.target as HTMLInputElement).value.trim();
    if (raw === '') return;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    const { m, h: curH } = this.parts();
    if (this.mode === '12') {
      if (n < 1 || n > 12) return;
      const isPM = curH >= 12;
      const newH = n === 12 ? (isPM ? 12 : 0) : (isPM ? n + 12 : n);
      if (!this.inRange(newH, m)) return;
      this.setHM(newH, m);
    } else {
      if (n < 0 || n > 23) return;
      if (!this.inRange(n, m)) return;
      this.setHM(n, m);
    }
  };

  private onMinuteInput = (e: Event) => {
    const raw = (e.target as HTMLInputElement).value.trim();
    if (raw === '') return;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0 || n > 59) return;
    const { h: hr } = this.parts();
    if (!this.inRange(hr, n) || !this.onStep(hr, n)) return;
    this.setHM(hr, n);
  };

  private onCancel = () => this.pickerCancel.emit();
  private onOk = () => this.pickerOk.emit({ value: this.value });

  // ---- render ----

  render() {
    const headline = this.headline
      || (this.view === 'input' ? gettext('Enter time') : gettext('Select time'));
    const wide = this.mode === '24';
    return (
      <Host>
        <div class={`tp ${wide ? 'is-24h' : ''}`}>
          <div class="tp__headline">{headline}</div>
          {this.view === 'dial'
            ? [this.renderSelector(), this.renderDial()]
            : this.renderInputBody()}
          {this.renderFooter()}
        </div>
      </Host>
    );
  }

  private renderSelector() {
    const { h: hr, m } = this.parts();
    const hourLabel = this.mode === '12' ? this.hour12Display() : hr;
    return (
      <div class="tp__selector">
        <button
          type="button"
          class={`tp__tile ${this.editing === 'hour' ? 'is-active' : ''}`}
          aria-label={gettext('Hour')}
          aria-pressed={this.editing === 'hour' ? 'true' : 'false'}
          onClick={() => this.setEditing('hour')}
        >
          {pad2(hourLabel)}
        </button>
        <span class="tp__sep" aria-hidden="true">:</span>
        <button
          type="button"
          class={`tp__tile ${this.editing === 'minute' ? 'is-active' : ''}`}
          aria-label={gettext('Minute')}
          aria-pressed={this.editing === 'minute' ? 'true' : 'false'}
          onClick={() => this.setEditing('minute')}
        >
          {pad2(m)}
        </button>
        {this.mode === '12' && this.renderPeriod()}
      </div>
    );
  }

  private renderPeriod() {
    const isPM = this.isPM();
    return (
      <div class="tp__period" role="group" aria-label={gettext('AM or PM')}>
        <button
          type="button"
          class={`tp__period-btn ${!isPM ? 'is-selected' : ''}`}
          aria-pressed={!isPM ? 'true' : 'false'}
          disabled={this.periodDisabled('AM')}
          onClick={() => this.togglePeriod('AM')}
        >
          {gettext('AM')}
        </button>
        <button
          type="button"
          class={`tp__period-btn ${isPM ? 'is-selected' : ''}`}
          aria-pressed={isPM ? 'true' : 'false'}
          disabled={this.periodDisabled('PM')}
          onClick={() => this.togglePeriod('PM')}
        >
          {gettext('PM')}
        </button>
      </div>
    );
  }

  private renderDial() {
    const { h: hr, m } = this.parts();
    const isMinute = this.editing === 'minute';

    const step = this.stepMinutes();
    // Outer ring labels.
    // - minute: 0,5,10,…,55 by default; if precision divides 60 evenly the
    //   ring switches to that step (e.g. precision="00:15" → 0,15,30,45).
    // - 12h hour: 12,1,2,…,11 (12 at top so 1 sits at the 1 o'clock position)
    // - 24h hour: 0,1,2,…,11 on the outer ring (0 at top)
    let outerLabels: number[];
    let outerStep = 30; // angular step in degrees between cells
    if (isMinute) {
      const minuteStep = step >= 5 && 60 % step === 0 ? step : 5;
      const cells = 60 / minuteStep;
      outerLabels = Array.from({ length: cells }, (_, i) => i * minuteStep);
      outerStep = 360 / cells;
    } else if (this.mode === '12') {
      outerLabels = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
    } else {
      outerLabels = Array.from({ length: 12 }, (_, i) => i);
    }
    // Inner ring (24h hour only): 12,13,…,23 with 12 at top.
    const innerLabels: number[] | null = !isMinute && this.mode === '24'
      ? Array.from({ length: 12 }, (_, i) => 12 + i)
      : null;

    // Selector angle (deg, 0 = top, clockwise).
    let angle: number;
    let onInner = false;
    if (isMinute) {
      angle = (m % 60) * 6;
    } else if (this.mode === '12') {
      const h12 = this.hour12Display();
      angle = (h12 % 12) * 30;
    } else {
      onInner = hr >= 12;
      angle = (onInner ? (hr - 12) : hr) * 30;
    }

    // Pixel positions inside a 256dp dial. Both rings use a uniform 32dp
    // cell — between the larger outer cell and the much smaller inner cell
    // we tried earlier. Outer ring at r=110, inner 24h ring at r=70.
    // Vertical clearance between rings at angle 0 = 110-70-32 = 8dp; inner
    // chord at idx 30° = 2·70·sin(15°) ≈ 36dp — 4dp horizontal margin.
    const outerCell = 32;
    const innerCell = 32;
    const outerR = 110;
    const innerR = 70;
    const center = 128;

    const cellPos = (idx: number, r: number, size: number, deg = 30) => {
      const a = (idx * deg - 90) * Math.PI / 180; // 0 at top
      const cx = center + r * Math.cos(a);
      const cy = center + r * Math.sin(a);
      return { left: cx - size / 2, top: cy - size / 2 };
    };

    const r = onInner ? innerR : outerR;
    const handleSize = onInner ? innerCell : outerCell;
    const handleA = (angle - 90) * Math.PI / 180;
    const handleX = center + r * Math.cos(handleA);
    const handleY = center + r * Math.sin(handleA);

    const isSelected = (label: number) => {
      if (isMinute) return label === m;
      if (this.mode === '12') return label === this.hour12Display();
      return label === hr;
    };

    const cellDisabled = (label: number, ring: 'outer' | 'inner'): boolean => {
      if (isMinute) {
        if (!this.onStep(hr, label)) return true;
        return !this.inRange(hr, label);
      }
      // hour cell — pick the 24h hour for this label
      let h: number;
      if (this.mode === '12') {
        const isPM = hr >= 12;
        h = label === 12 ? (isPM ? 12 : 0) : (isPM ? label + 12 : label);
      } else {
        h = ring === 'inner' ? label : label;
      }
      return !this.hourHasValidMinute(h);
    };

    return (
      <div class="tp__dial" role="group" aria-label={
        this.editing === 'hour' ? gettext('Select hour') : gettext('Select minute')
      }>
        <span class="tp__dial-track" style={{
          left: `${center}px`, top: `${center}px`,
          width: `${r}px`,
          transform: `translate(0, -1px) rotate(${angle - 90}deg)`,
        }} aria-hidden="true"></span>
        <span class="tp__dial-handle" style={{
          left: `${handleX - handleSize / 2}px`,
          top: `${handleY - handleSize / 2}px`,
          width: `${handleSize}px`,
          height: `${handleSize}px`,
        }} aria-hidden="true"></span>
        <span class="tp__dial-center" aria-hidden="true" style={{
          left: `${center - 4}px`, top: `${center - 4}px`,
        }}></span>
        {outerLabels.map((label, i) => {
          const pos = cellPos(i, outerR, outerCell, outerStep);
          const sel = isSelected(label);
          const dis = cellDisabled(label, 'outer');
          const labelStr = isMinute ? pad2(label) : String(label);
          return (
            <button
              type="button"
              class={`tp__dial-cell ${sel ? 'is-selected' : ''}`}
              style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
              disabled={dis}
              aria-label={isMinute
                ? `${label} ${gettext('minutes')}`
                : `${gettext('Hour')} ${label}`}
              onClick={() => this.pickDialCell(label)}
            >
              {labelStr}
            </button>
          );
        })}
        {innerLabels?.map((label, i) => {
          const pos = cellPos(i, innerR, innerCell);
          const sel = isSelected(label);
          const dis = cellDisabled(label, 'inner');
          return (
            <button
              type="button"
              class={`tp__dial-cell tp__dial-cell--inner ${sel ? 'is-selected' : ''}`}
              style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
              disabled={dis}
              aria-label={`${gettext('Hour')} ${label}`}
              onClick={() => this.pickDialCell(label)}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  private renderInputBody() {
    const { h: hr, m } = this.parts();
    const hourVal = this.mode === '12' ? this.hour12Display() : hr;
    const hourMax = this.mode === '12' ? 12 : 23;
    const hourMin = this.mode === '12' ? 1 : 0;
    return (
      <div class="tp__inputs">
        <div class="tp__input-col">
          <input
            type="number"
            class="tp__input"
            min={hourMin}
            max={hourMax}
            value={pad2(hourVal)}
            aria-label={gettext('Hour')}
            onInput={this.onHourInput}
          />
          <span class="tp__input-label">{gettext('Hour')}</span>
        </div>
        <span class="tp__input-sep" aria-hidden="true">:</span>
        <div class="tp__input-col">
          <input
            type="number"
            class="tp__input"
            min={0}
            max={59}
            value={pad2(m)}
            aria-label={gettext('Minute')}
            onInput={this.onMinuteInput}
          />
          <span class="tp__input-label">{gettext('Minute')}</span>
        </div>
        {this.mode === '12' && this.renderPeriod()}
      </div>
    );
  }

  private renderFooter() {
    const toggleIcon = this.view === 'dial' ? 'keyboard' : 'schedule';
    const toggleLabel = this.view === 'dial'
      ? gettext('Toggle input picker')
      : gettext('Toggle dial picker');
    return (
      <div class="tp__footer">
        <material-icon-button
          size="s"
          variant="standard"
          icon={toggleIcon}
          aria-label={toggleLabel}
          onClick={this.toggleView}
        />
        <span class="tp__footer-spacer"></span>
        {!this.hideActions && [
          <material-button
            variant="text"
            label={gettext('Cancel')}
            onClick={this.onCancel}
          />,
          <material-button
            variant="filled"
            label={gettext('OK')}
            onClick={this.onOk}
          />,
        ]}
      </div>
    );
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
