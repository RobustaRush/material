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
  defaultTimeFormat,
  defaultTimeMode,
  gettext,
  timeInputFormats,
} from '../../utils/i18n';
import {
  formatDate,
  fromISOTime,
  parseDateTimeAny,
  toISOTime,
} from '../../utils/date-utils';

export type MaterialTimeFieldVariant = 'filled' | 'outlined';
export type MaterialTimeFieldMode = '12' | '24';

interface MaterialTimePickerLike extends HTMLElement {
  value: string;
  mode: MaterialTimeFieldMode;
  precision: string;
  minimum: string;
  maximum: string;
}

interface MaterialDialogLike extends HTMLElement {
  show(): Promise<void> | void;
  close(returnValue?: string): Promise<void> | void;
}

// MD3 modal time field — text-field with a trailing schedule icon-button that
// opens an adaptive material-dialog containing a material-time-picker.
//
// Light DOM, so a hidden `<input name="…" type="hidden" value="HH:MM">` can
// ride along with a surrounding `<form>` the same way material-date-field does.

@Component({
  tag: 'material-time-field',
  styleUrl: 'material-time-field.css',
  shadow: false,
})
export class MaterialTimeField {
  @Element() el!: HTMLElement;

  @Prop() variant: MaterialTimeFieldVariant = 'outlined';
  @Prop() name?: string;
  @Prop() label?: string;
  /** ISO 24h `HH:MM`. Always the canonical form for form posts. */
  @Prop({ mutable: true, reflect: true }) value = '';
  /** `'12'` (AM/PM) or `'24'`. Defaults to the locale via Intl. */
  @Prop({ mutable: true, reflect: true }) mode?: MaterialTimeFieldMode;
  /** Step granularity as `HH:MM`. `00:15` = quarter-hour steps. Default
   *  `00:01` allows any minute. */
  @Prop() precision = '00:01';
  /** Earliest selectable time as `HH:MM`. Empty = no lower bound. */
  @Prop() minimum = '';
  /** Latest selectable time as `HH:MM`. Empty = no upper bound. */
  @Prop() maximum = '';
  /** strftime-style display format used when rendering `value` back into
   *  the textfield. Defaults to `%H:%M` (24h) or `%I:%M %p` (12h). Manual
   *  entry is more permissive — see `inputFormats`. */
  @Prop() format = '';
  /** Override the list of formats accepted on manual entry. Defaults to
   *  Django's `TIME_INPUT_FORMATS` list (or a synthesised set covering both
   *  12h and 24h shapes when Django's jsi18n catalog is not loaded). The
   *  lenient parser accepts mixed separators, 1- or 2-digit hours/minutes,
   *  compact `HHMM`, and case-insensitive AM/PM regardless. */
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
  /** Optional headline override for the picker. Defaults to localised
   *  "Select time" / "Enter time" depending on the picker's current view. */
  @Prop() headline = '';
  @Prop() openLabel = '';
  @Prop() invalidLabel = '';

  @State() display = '';
  @State() pending = '';
  @State() liveError = '';

  @Event() valueChange!: EventEmitter<{ value: string }>;

  private dialog?: MaterialDialogLike;
  private picker?: MaterialTimePickerLike;
  private hiddenInput?: HTMLInputElement;

  private effectiveMode(): MaterialTimeFieldMode {
    return this.mode || defaultTimeMode();
  }

  private effectiveFormat(): string {
    return this.format || defaultTimeFormat(undefined, this.effectiveMode());
  }

  private effectiveInputFormats(): string[] {
    if (this.inputFormats?.length) return this.inputFormats;
    const list = timeInputFormats(undefined, this.effectiveMode());
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
    const d = fromISOTime(iso);
    if (!d) return '';
    try {
      return formatDate(this.effectiveFormat(), d);
    } catch {
      return '';
    }
  }

  private openDialog = (e?: Event) => {
    e?.stopPropagation();
    if (this.disabled || this.readOnly) return;
    this.pending = this.value || '';
    if (this.picker) {
      if (this.pending) this.picker.value = this.pending;
      this.picker.mode = this.effectiveMode();
      this.picker.precision = this.precision;
      this.picker.minimum = this.minimum;
      this.picker.maximum = this.maximum;
    }
    this.dialog?.show();
  };

  private suppressTriggerFocus = (e: MouseEvent) => {
    e.preventDefault();
  };

  private confirm = () => {
    if (this.pending) {
      this.value = this.pending;
      this.valueChange.emit({ value: this.pending });
      this.error = false;
      this.liveError = '';
    }
  };

  private setDialogRef = (el?: HTMLElement) => {
    this.dialog = el as MaterialDialogLike | undefined;
  };

  private setPickerRef = (el?: HTMLElement) => {
    if (!el) return;
    this.picker = el as MaterialTimePickerLike;
    this.picker.value = this.pending || this.value || '';
    this.picker.mode = this.effectiveMode();
    this.picker.precision = this.precision;
    this.picker.minimum = this.minimum;
    this.picker.maximum = this.maximum;
  };

  private setHiddenInputRef = (el?: HTMLInputElement) => {
    this.hiddenInput = el;
  };

  private handlePickerChange = (e: Event) => {
    // Inner time-picker valueChange must not surface as this field's event.
    e.stopPropagation();
    const detail = (e as CustomEvent<{ value: string }>).detail;
    this.pending = detail?.value ?? '';
  };

  private handlePickerOk = () => {
    this.confirm();
    this.dialog?.close('ok');
  };

  private handlePickerCancel = () => {
    this.dialog?.close();
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
      const iso = toISOTime(d);
      const total = d.getHours() * 60 + d.getMinutes();
      const lo = this.minimum ? this.toMinutes(this.minimum) : null;
      const hi = this.maximum ? this.toMinutes(this.maximum) : null;
      if ((lo != null && total < lo) || (hi != null && total > hi)) {
        this.error = true;
        this.liveError = this.invalidLabel || gettext('Time outside allowed range');
        return;
      }
      const step = this.parsedStep();
      if (step > 1 && (total % step) !== 0) {
        this.error = true;
        this.liveError = this.invalidLabel || gettext('Time not on allowed step');
        return;
      }
      this.value = iso;
      this.error = false;
      this.liveError = '';
      this.valueChange.emit({ value: iso });
    } catch {
      this.error = true;
      this.liveError = this.invalidLabel || gettext('Invalid time');
    }
  };

  private toMinutes(iso: string): number | null {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(iso);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  private parsedStep(): number {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(this.precision || '');
    if (!m) return 1;
    return Math.max(1, parseInt(m[1], 10) * 60 + parseInt(m[2], 10));
  }

  render() {
    const okLabel = this.okLabel || gettext('OK');
    const cancelLabel = this.cancelLabel || gettext('Cancel');
    const openLabel = this.openLabel || gettext('Open time picker');
    const subText = this.error ? (this.errorText || this.liveError) : this.helpText;

    return (
      <Host class="block w-full">
        <material-textfield
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
            icon="schedule"
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
          <material-time-picker
            ref={this.setPickerRef}
            mode={this.effectiveMode()}
            precision={this.precision}
            minimum={this.minimum}
            maximum={this.maximum}
            headline={this.headline}
            hide-actions
            onValueChange={this.handlePickerChange as unknown as (e: Event) => void}
            onPickerOk={this.handlePickerOk as unknown as (e: Event) => void}
            onPickerCancel={this.handlePickerCancel as unknown as (e: Event) => void}
          />
          <div slot="actions">
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
