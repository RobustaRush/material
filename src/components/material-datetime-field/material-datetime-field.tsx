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
  datetimeInputFormats,
  defaultDatetimeFormat,
  defaultTimeMode,
  gettext,
} from '../../utils/i18n';
import {
  formatDate,
  fromISODateTime,
  nowISOTime,
  parseDateTimeAny,
  toISODateTime,
  todayISO,
} from '../../utils/date-utils';

export type MaterialDatetimeFieldVariant = 'filled' | 'outlined';
export type MaterialDatetimeFieldMode = '12' | '24';

interface MaterialCalendarLike extends HTMLElement {
  value: string;
  min: string;
  max: string;
}

interface MaterialTimePickerLike extends HTMLElement {
  value: string;
  mode: MaterialDatetimeFieldMode;
  precision: string;
  minimum: string;
  maximum: string;
}

interface MaterialDialogLike extends HTMLElement {
  show(): Promise<void> | void;
  close(returnValue?: string): Promise<void> | void;
}

interface MaterialTextfieldLike extends HTMLElement {
  shadowRoot: ShadowRoot | null;
}

// Composite datetime field: textfield + trailing event icon → adaptive
// material-dialog containing material-calendar and material-time-picker.
// A toggle in the dialog footer swaps between date and time views; the
// dialog body has a fixed min-height so the chrome doesn't jump.

@Component({
  tag: 'material-datetime-field',
  styleUrl: 'material-datetime-field.css',
  shadow: false,
})
export class MaterialDatetimeField {
  @Element() el!: HTMLElement;

  @Prop() variant: MaterialDatetimeFieldVariant = 'outlined';
  @Prop() name?: string;
  @Prop() label?: string;
  /** ISO `YYYY-MM-DDTHH:MM`. Always the canonical form for form posts. */
  @Prop({ mutable: true, reflect: true }) value = '';
  /** `'12'` or `'24'`. Defaults to the locale via Intl. */
  @Prop({ mutable: true, reflect: true }) mode?: MaterialDatetimeFieldMode;

  /** Earliest selectable date as `YYYY-MM-DD`. Empty = no lower bound. */
  @Prop() minDate = '';
  /** Latest selectable date as `YYYY-MM-DD`. Empty = no upper bound. */
  @Prop() maxDate = '';
  /** Earliest time-of-day as `HH:MM`, applied to *every* day in range
   *  (business-hours semantics). Empty = no lower bound. */
  @Prop() minTime = '';
  /** Latest time-of-day as `HH:MM`, applied to *every* day in range. */
  @Prop() maxTime = '';
  /** Time step granularity as `HH:MM`. Default `00:01` allows any minute. */
  @Prop() precision = '00:01';

  @Prop() format = '';
  @Prop() inputFormats?: string[];
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ mutable: true, reflect: true }) error = false;
  @Prop() placeholder?: string;

  @Prop() okLabel = '';
  @Prop() cancelLabel = '';
  @Prop() openLabel = '';
  @Prop() invalidLabel = '';
  @Prop() dateLabel = '';
  @Prop() timeLabel = '';

  @State() display = '';
  @State() pendingDate = '';
  @State() pendingTime = '';
  @State() liveError = '';
  @State() view: 'date' | 'time' = 'date';

  @Event() valueChange!: EventEmitter<{ value: string }>;

  private dialog?: MaterialDialogLike;
  private calendar?: MaterialCalendarLike;
  private picker?: MaterialTimePickerLike;
  private textfield?: MaterialTextfieldLike;
  private hiddenInput?: HTMLInputElement;

  private effectiveMode(): MaterialDatetimeFieldMode {
    return this.mode || defaultTimeMode();
  }

  private effectiveFormat(): string {
    return this.format || defaultDatetimeFormat(undefined, this.effectiveMode());
  }

  private effectiveInputFormats(): string[] {
    if (this.inputFormats?.length) return this.inputFormats;
    const list = datetimeInputFormats(undefined, this.effectiveMode());
    if (this.format && !list.includes(this.format)) return [this.format, ...list];
    return list;
  }

  componentWillLoad() {
    this.display = this.formatValue(this.value);
  }

  @Watch('value')
  onValueChange(next: string) {
    this.display = this.formatValue(next);
    if (this.hiddenInput) this.hiddenInput.value = next;
  }

  private formatValue(iso: string): string {
    const d = fromISODateTime(iso);
    if (!d) return '';
    try {
      return formatDate(this.effectiveFormat(), d);
    } catch {
      return '';
    }
  }

  private toMinutes(hhmm: string): number | null {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(hhmm);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  private parsedStep(): number {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(this.precision || '');
    if (!m) return 1;
    return Math.max(1, parseInt(m[1], 10) * 60 + parseInt(m[2], 10));
  }

  /** Read current cursor position from the textfield's inner input —
   *  only meaningful when the input is the active element. */
  private cursorPos(): number | null {
    const input = this.textfield?.shadowRoot?.querySelector('input');
    if (!input) return null;
    const root = (input.getRootNode() as ShadowRoot);
    if (root.activeElement !== input) return null;
    return input.selectionStart ?? null;
  }

  /** Decide which view to open in based on the cursor's position relative
   *  to where the date portion of the formatted display ends. Falls back
   *  to 'date' when the textfield isn't focused (i.e. trigger click). */
  private viewFromCursor(): 'date' | 'time' {
    const pos = this.cursorPos();
    if (pos == null || !this.value) return 'date';
    const fmt = this.effectiveFormat();
    // Find the offset where the date specs end and time specs begin —
    // strftime tokens in `%[a-zA-Z%]` form. Walk the format string,
    // tracking the rendered length of each literal/spec.
    const d = fromISODateTime(this.value);
    if (!d) return 'date';
    let dateEnd = 0;
    let i = 0;
    let cursor = 0;
    while (i < fmt.length) {
      const ch = fmt[i];
      if (ch === '%' && i + 1 < fmt.length) {
        const spec = fmt[i + 1];
        const rendered = formatDate(`%${spec}`, d);
        if (spec === 'H' || spec === 'I' || spec === 'M' || spec === 'S' || spec === 'p') {
          // First time spec marks end of date portion.
          break;
        }
        cursor += rendered.length;
        dateEnd = cursor;
        i += 2;
      } else {
        cursor += 1;
        // Don't advance dateEnd past trailing literals after last date spec —
        // they'll get pulled in below if a time spec hasn't yet appeared.
        dateEnd = cursor;
        i += 1;
      }
    }
    return pos > dateEnd ? 'time' : 'date';
  }

  private openDialog = (e?: Event) => {
    e?.stopPropagation();
    if (this.disabled || this.readOnly) return;

    const seedISO = this.value || `${todayISO()}T${this.snapTime(nowISOTime())}`;
    const seed = fromISODateTime(seedISO);
    if (seed) {
      this.pendingDate = seedISO.slice(0, 10);
      this.pendingTime = seedISO.slice(11, 16);
    }

    this.view = this.viewFromCursor();

    if (this.calendar) {
      this.calendar.min = this.minDate;
      this.calendar.max = this.maxDate;
      this.calendar.value = this.pendingDate;
    }
    if (this.picker) {
      this.picker.mode = this.effectiveMode();
      this.picker.precision = this.precision;
      this.picker.minimum = this.minTime;
      this.picker.maximum = this.maxTime;
      this.picker.value = this.pendingTime;
    }
    this.dialog?.show();
  };

  private snapTime(hhmm: string): string {
    const total = this.toMinutes(hhmm);
    if (total == null) return hhmm;
    const step = this.parsedStep();
    let snapped = step > 1 ? Math.round(total / step) * step : total;
    const lo = this.minTime ? this.toMinutes(this.minTime) : null;
    const hi = this.maxTime ? this.toMinutes(this.maxTime) : null;
    if (lo != null && snapped < lo) snapped = lo;
    if (hi != null && snapped > hi) snapped = hi;
    snapped = Math.max(0, Math.min(23 * 60 + 59, snapped));
    const h = Math.floor(snapped / 60);
    const m = snapped % 60;
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
  }

  private suppressTriggerFocus = (e: MouseEvent) => {
    e.preventDefault();
  };

  private toggleView = () => {
    this.view = this.view === 'date' ? 'time' : 'date';
  };

  private confirm = () => {
    if (!this.pendingDate || !this.pendingTime) return;
    const iso = `${this.pendingDate}T${this.pendingTime}`;
    if (!this.validateISO(iso)) return;
    this.value = iso;
    this.valueChange.emit({ value: iso });
    this.error = false;
    this.liveError = '';
  };

  private validateISO(iso: string): boolean {
    if (this.minDate && iso.slice(0, 10) < this.minDate) return false;
    if (this.maxDate && iso.slice(0, 10) > this.maxDate) return false;
    const total = this.toMinutes(iso.slice(11, 16));
    if (total == null) return false;
    const lo = this.minTime ? this.toMinutes(this.minTime) : null;
    const hi = this.maxTime ? this.toMinutes(this.maxTime) : null;
    if (lo != null && total < lo) return false;
    if (hi != null && total > hi) return false;
    const step = this.parsedStep();
    if (step > 1 && total % step !== 0) return false;
    return true;
  }

  private setDialogRef = (el?: HTMLElement) => {
    this.dialog = el as MaterialDialogLike | undefined;
  };

  private setCalendarRef = (el?: HTMLElement) => {
    if (!el) return;
    this.calendar = el as MaterialCalendarLike;
    this.calendar.min = this.minDate;
    this.calendar.max = this.maxDate;
    this.calendar.value = this.pendingDate || (this.value ? this.value.slice(0, 10) : '');
  };

  private setPickerRef = (el?: HTMLElement) => {
    if (!el) return;
    this.picker = el as MaterialTimePickerLike;
    this.picker.mode = this.effectiveMode();
    this.picker.precision = this.precision;
    this.picker.minimum = this.minTime;
    this.picker.maximum = this.maxTime;
    this.picker.value = this.pendingTime || (this.value ? this.value.slice(11, 16) : '');
  };

  private setTextfieldRef = (el?: unknown) => {
    this.textfield = el as MaterialTextfieldLike | undefined;
  };

  private setHiddenInputRef = (el?: HTMLInputElement) => {
    this.hiddenInput = el;
  };

  private handleCalendarSelect = (e: Event) => {
    // Keep the inner calendar's dateSelect from leaking to consumers.
    e.stopPropagation();
    const detail = (e as CustomEvent<{ value: string }>).detail;
    this.pendingDate = detail?.value ?? '';
  };

  private handleTimeChange = (e: Event) => {
    // Inner time-picker valueChange must not surface as this field's event.
    e.stopPropagation();
    const detail = (e as CustomEvent<{ value: string }>).detail;
    this.pendingTime = detail?.value ?? '';
  };

  private handleTextChange = (e: Event) => {
    // Inner textfield valueChange must not surface as this field's event.
    e.stopPropagation();
    const detail = (e as CustomEvent<{ value: string }>).detail;
    const raw = (detail?.value ?? '').trim();
    if (raw === '') {
      this.value = '';
      this.error = false;
      this.liveError = '';
      this.valueChange.emit({ value: '' });
      return;
    }
    try {
      const d = parseDateTimeAny(this.effectiveInputFormats(), raw);
      const iso = toISODateTime(d);
      if (!this.validateISO(iso)) {
        this.error = true;
        this.liveError = this.invalidLabel || gettext('Datetime outside allowed range');
        return;
      }
      this.value = iso;
      this.error = false;
      this.liveError = '';
      this.valueChange.emit({ value: iso });
    } catch {
      this.error = true;
      this.liveError = this.invalidLabel || gettext('Invalid datetime');
    }
  };

  render() {
    const okLabel = this.okLabel || gettext('OK');
    const cancelLabel = this.cancelLabel || gettext('Cancel');
    const openLabel = this.openLabel || gettext('Open date and time picker');
    const dateLabel = this.dateLabel || gettext('Pick date');
    const timeLabel = this.timeLabel || gettext('Pick time');
    const subText = this.error ? (this.errorText || this.liveError) : this.helpText;
    const isDate = this.view === 'date';

    return (
      <Host class="block w-full">
        <material-textfield
          ref={this.setTextfieldRef}
          variant={this.variant}
          label={this.label}
          value={this.display}
          placeholder={this.placeholder}
          disabled={this.disabled}
          required={this.required}
          readOnly={this.readOnly}
          helpText={!this.error ? this.helpText : undefined}
          errorText={subText}
          error={this.error}
          onValueChange={this.handleTextChange as unknown as (e: Event) => void}
        >
          <material-icon-button
            slot="trailing"
            size="s"
            variant="standard"
            icon="event"
            disabled={this.disabled}
            aria-label={openLabel}
            onClick={this.openDialog}
            onMouseDown={this.suppressTriggerFocus}
          />
        </material-textfield>

        <input
          ref={this.setHiddenInputRef}
          type="hidden"
          name={this.name}
          value={this.value}
        />

        <material-dialog
          ref={this.setDialogRef}
          variant="adaptive"
        >
          <div class="dtf__body">
            <material-calendar
              ref={this.setCalendarRef}
              hidden={!isDate}
              min={this.minDate}
              max={this.maxDate}
              onDateSelect={this.handleCalendarSelect as unknown as (e: Event) => void}
            />
            <material-time-picker
              ref={this.setPickerRef}
              hidden={isDate}
              mode={this.effectiveMode()}
              precision={this.precision}
              minimum={this.minTime}
              maximum={this.maxTime}
              hide-actions
              onValueChange={this.handleTimeChange as unknown as (e: Event) => void}
            />
          </div>

          <div slot="actions" class="dtf__actions">
            <material-icon-button
              size="s"
              variant="standard"
              icon={isDate ? 'schedule' : 'event'}
              aria-label={isDate ? timeLabel : dateLabel}
              onClick={this.toggleView}
            />
            <span class="dtf__actions-spacer" />
            {/* type="button": this component renders into light DOM
                (shadow: false), so when the field sits inside a consumer's
                <form> these buttons would otherwise associate with it and
                submit it (material-button now defaults to type="submit"). */}
            <material-button
              type="button"
              variant="text"
              label={cancelLabel}
              data-dialog-close
            />
            <material-button
              type="button"
              variant="filled"
              label={okLabel}
              data-dialog-close="ok"
              onClick={this.confirm}
            />
          </div>
        </material-dialog>
      </Host>
    );
  }
}
