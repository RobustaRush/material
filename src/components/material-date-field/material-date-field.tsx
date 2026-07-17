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
  dateInputFormats,
  defaultDateInputFormat,
  gettext,
} from '../../utils/i18n';
import { trackAnchored } from '../../utils/anchor-position';
import {
  formatDate,
  fromISO,
  parseDateTimeAny,
  toISO,
  todayISO,
} from '../../utils/date-utils';

export type MaterialDateFieldVariant = 'filled' | 'outlined';

interface MaterialCalendarLike extends HTMLElement {
  value: string;
}

interface MaterialDialogLike extends HTMLElement {
  show(): Promise<void> | void;
  close(returnValue?: string): Promise<void> | void;
}

// MD3 date field — text-field with a trailing calendar trigger.
//
// Two picker surfaces (spec: date picker variants):
//   - docked — dropdown calendar anchored just below the field; clicking a
//     date commits and closes (spec recommends it for medium/expanded
//     windows, near AND distant dates, since typing stays available);
//   - modal  — adaptive material-dialog with OK/Cancel.
// `picker="auto"` (default) docks on ≥600px viewports and goes modal on
// compact ones.
//
// Light DOM, so a hidden <input name="…" type="hidden" value="ISO"> can ride
// along with a surrounding <form> the same way material-file-field does.

@Component({
  tag: 'material-date-field',
  styleUrl: 'material-date-field.css',
  shadow: false,
})
export class MaterialDateField {
  @Element() el!: HTMLElement;

  @Prop() variant: MaterialDateFieldVariant = 'outlined';
  @Prop() name?: string;
  @Prop() label?: string;
  /** ISO `YYYY-MM-DD`. Always the canonical form for form posts. */
  @Prop({ mutable: true, reflect: true }) value = '';
  @Prop() min = '';
  @Prop() max = '';
  /** strftime-style display format used when rendering `value` back into
   *  the textfield. Defaults to Django's `DATE_INPUT_FORMATS[0]` or a
   *  locale-derived one. Manual entry is more permissive — see
   *  `inputFormats`. */
  @Prop() format = '';
  /** Override the list of formats accepted on manual entry. Defaults to
   *  Django's full `DATE_INPUT_FORMATS` list (or `[format]` when Django's
   *  jsi18n catalog is not loaded). The lenient parser accepts mixed
   *  separators, 1- or 2-digit day/month, 2-digit years (00–68 → 20xx,
   *  69–99 → 19xx), and month names regardless. */
  @Prop() inputFormats?: string[];
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;

  /** Picker surface: docked dropdown, modal dialog, or auto by viewport. */
  @Prop() picker: 'auto' | 'docked' | 'modal' = 'auto';
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ mutable: true, reflect: true }) error = false;
  @Prop() placeholder?: string;

  /** Override label for OK action. Defaults to `gettext('OK')`. */
  @Prop() okLabel = '';
  /** Override label for Cancel action. Defaults to `gettext('Cancel')`. */
  @Prop() cancelLabel = '';
  /** Override dialog headline. Defaults to `gettext('Select date')`. */
  @Prop() headline = '';
  /** Override aria-label of the trailing trigger. Defaults to
   *  `gettext('Open calendar')`. */
  @Prop() openLabel = '';
  /** Override the error message shown when manual entry fails to parse.
   *  Defaults to `gettext('Invalid date')`. */
  @Prop() invalidLabel = '';

  /** Local copy of the visible (formatted) text shown in the textfield. */
  @State() display = '';
  /** Whatever the calendar currently has selected while the dialog is open. */
  @State() pending = '';
  /** Last error message, if any (used for textfield supportingText). */
  @State() liveError = '';

  @Event() valueChange!: EventEmitter<{ value: string }>;

  private dialog?: MaterialDialogLike;
  private calendar?: MaterialCalendarLike;
  private hiddenInput?: HTMLInputElement;
  private popupEl?: HTMLElement;
  private dockedCalendar?: MaterialCalendarLike;
  private textfieldEl?: HTMLElement;
  private stopTracking?: () => void;
  private effectiveFormat(): string {
    return this.format || defaultDateInputFormat();
  }

  private effectiveInputFormats(): string[] {
    if (this.inputFormats?.length) return this.inputFormats;
    const list = dateInputFormats();
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
    const d = fromISO(iso);
    if (!d) return '';
    try {
      return formatDate(this.effectiveFormat(), d);
    } catch {
      return '';
    }
  }

  private isDocked(): boolean {
    if (this.picker === 'docked') return true;
    if (this.picker === 'modal') return false;
    return typeof window !== 'undefined'
      && window.matchMedia('(min-width: 600px)').matches;
  }

  private openDialog = (e?: Event) => {
    e?.stopPropagation();
    if (this.disabled || this.readOnly) return;
    this.pending = this.value || todayISO();
    if (this.isDocked()) {
      this.openDocked();
      return;
    }
    if (this.calendar) this.calendar.value = this.pending;
    this.dialog?.show();
  };

  // --- docked dropdown -------------------------------------------------------

  private openDocked() {
    const popup = this.popupEl;
    const anchor = this.textfieldEl;
    if (!popup || !anchor || popup.matches(':popover-open')) return;
    if (this.dockedCalendar) this.dockedCalendar.value = this.value || '';
    popup.showPopover();
    this.stopTracking = trackAnchored(popup, anchor, {
      placement: 'bottom-start',
      offset: 4,
    });
    document.addEventListener('pointerdown', this.onDocPointerDown, true);
    document.addEventListener('keydown', this.onDocKeyDown, true);
  }

  private closeDocked = () => {
    const popup = this.popupEl;
    if (!popup || !popup.matches(':popover-open')) return;
    popup.hidePopover();
    this.stopTracking?.();
    this.stopTracking = undefined;
    document.removeEventListener('pointerdown', this.onDocPointerDown, true);
    document.removeEventListener('keydown', this.onDocKeyDown, true);
  };

  private onDocPointerDown = (e: PointerEvent) => {
    if (!this.el.contains(e.target as Node)) this.closeDocked();
  };

  private onDocKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.closeDocked();
    }
  };

  disconnectedCallback() {
    this.closeDocked();
  }

  private handleDockedSelect = (e: Event) => {
    e.stopPropagation();
    const detail = (e as CustomEvent<{ value: string }>).detail;
    const iso = detail?.value ?? '';
    if (!iso) return;
    // Docked pattern: picking a date commits and closes — no OK/Cancel.
    this.value = iso;
    this.error = false;
    this.liveError = '';
    this.valueChange.emit({ value: iso });
    this.closeDocked();
  };

  // Prevent the trigger from taking focus on mouse press. Without this the
  // textfield's :focus-within fires for a few ms before showModal() pulls
  // focus into the dialog, which makes the label float up then snap back.
  // Keyboard users (Tab + Enter) are unaffected — they still focus the button.
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

  private setCalendarRef = (el?: HTMLElement) => {
    if (!el) return;
    this.calendar = el as MaterialCalendarLike;
    this.calendar.value = this.pending || this.value || '';
  };

  private setHiddenInputRef = (el?: HTMLInputElement) => {
    this.hiddenInput = el;
  };

  private handleCalendarSelect = (e: Event) => {
    // Keep the inner calendar's dateSelect from leaking to consumers.
    e.stopPropagation();
    const detail = (e as CustomEvent<{ value: string }>).detail;
    this.pending = detail?.value ?? '';
  };

  private handleTextChange = (e: Event) => {
    // The inner textfield's own valueChange bubbles through this light-DOM
    // host; stop it so consumers only see this field's canonical event.
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
      const iso = toISO(d);
      // Typed entry must respect min/max the same way the calendar does —
      // ISO YYYY-MM-DD compares lexicographically.
      if ((this.min && iso < this.min) || (this.max && iso > this.max)) {
        this.error = true;
        this.liveError = this.invalidLabel || gettext('Date outside allowed range');
        return;
      }
      this.value = iso;
      this.error = false;
      this.liveError = '';
      this.valueChange.emit({ value: iso });
    } catch {
      this.error = true;
      this.liveError = this.invalidLabel || gettext('Invalid date');
    }
  };

  render() {
    const okLabel = this.okLabel || gettext('OK');
    const cancelLabel = this.cancelLabel || gettext('Cancel');
    const headline = this.headline || gettext('Select date');
    const openLabel = this.openLabel || gettext('Open calendar');
    const subText = this.error ? (this.errorText || this.liveError) : this.helpText;

    return (
      <Host class="block w-full">
        <material-textfield
          ref={(el) => (this.textfieldEl = el as HTMLElement)}
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
            icon="calendar_month"
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

        {/* Docked dropdown (spec: calendar appears just below the field). */}
        <div
          class="date-popup"
          popover="manual"
          ref={(el) => (this.popupEl = el)}
        >
          <material-calendar
            ref={(el) => {
              this.dockedCalendar = el as MaterialCalendarLike;
            }}
            min={this.min}
            max={this.max}
            onDateSelect={this.handleDockedSelect as unknown as (e: Event) => void}
          />
        </div>

        <material-dialog
          ref={this.setDialogRef}
          variant="adaptive"
          headline={headline}
        >
          <material-calendar
            ref={this.setCalendarRef}
            min={this.min}
            max={this.max}
            onDateSelect={this.handleCalendarSelect as unknown as (e: Event) => void}
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
