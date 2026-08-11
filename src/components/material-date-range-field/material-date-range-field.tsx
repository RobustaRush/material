/*
 * advanced-material-web — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  h,
} from '@stencil/core';
import { defaultDateInputFormat, gettext } from '../../utils/i18n';
import { formatDate, fromISO } from '../../utils/date-utils';

export type MaterialDateRangeFieldVariant = 'filled' | 'outlined';

interface MaterialCalendarRangeLike extends HTMLElement {
  startValue: string;
  endValue: string;
}

interface MaterialDialogLike extends HTMLElement {
  show(): Promise<void> | void;
  close(returnValue?: string): Promise<void> | void;
}

// MD3 date range field — a read-only text field showing "start – end" that
// opens a modal material-dialog with a range-mode material-calendar.
//
// Light DOM (like material-date-field), so the two hidden ISO inputs ride
// along with the surrounding <form>: `start-name` / `end-name` map onto the
// usual Django pair (date_from / date_to). The trigger is read-only by
// design — for manual typing use two material-date-fields instead; a single
// free-text range is ambiguous to parse in every locale.

@Component({
  tag: 'material-date-range-field',
  styleUrl: 'material-date-range-field.css',
  shadow: false,
})
export class MaterialDateRangeField {
  @Element() el!: HTMLElement;

  @Prop() variant: MaterialDateRangeFieldVariant = 'outlined';
  @Prop() label?: string;
  @Prop() placeholder?: string;

  /** Range start, ISO `YYYY-MM-DD`. */
  @Prop({ mutable: true, reflect: true, attribute: 'start-value' }) startValue = '';
  /** Range end, ISO `YYYY-MM-DD`. */
  @Prop({ mutable: true, reflect: true, attribute: 'end-value' }) endValue = '';

  /** Form name for the start date's hidden input (e.g. `date_from`). */
  @Prop({ attribute: 'start-name' }) startName?: string;
  /** Form name for the end date's hidden input (e.g. `date_to`). */
  @Prop({ attribute: 'end-name' }) endName?: string;

  @Prop() min = '';
  @Prop() max = '';

  /** strftime-style display format, like material-date-field. */
  @Prop() format = '';

  @Prop({ mutable: true, reflect: true }) disabled = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ mutable: true, reflect: true }) error = false;
  @Prop() clearable = false;

  @Prop() headline = '';
  @Prop() okLabel = '';
  @Prop() cancelLabel = '';
  @Prop() openLabel = '';
  @Prop() clearLabel = '';

  /** Calendar selection while the dialog is open — committed on OK only. */
  @State() pendingStart = '';
  @State() pendingEnd = '';

  @Event() valueChange!: EventEmitter<{ start: string; end: string }>;

  private dialog?: MaterialDialogLike;
  private calendar?: MaterialCalendarRangeLike;

  private effectiveFormat(): string {
    return this.format || defaultDateInputFormat();
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

  private display(): string {
    const start = this.formatValue(this.startValue);
    const end = this.formatValue(this.endValue);
    if (!start && !end) return '';
    return `${start || '…'} – ${end || '…'}`;
  }

  private openDialog = (e?: Event) => {
    e?.stopPropagation();
    if (this.disabled || this.readOnly) return;
    this.pendingStart = this.startValue;
    this.pendingEnd = this.endValue;
    if (this.calendar) {
      this.calendar.startValue = this.pendingStart;
      this.calendar.endValue = this.pendingEnd;
    }
    this.dialog?.show();
  };

  // See material-date-field: keep the mouse press from focusing the readonly
  // textfield for a frame before the dialog steals focus.
  private suppressTriggerFocus = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleFieldClick = (e: MouseEvent) => {
    const path = e.composedPath();
    if (path.some((n) => n instanceof HTMLElement && (n as HTMLElement).tagName === 'MATERIAL-ICON-BUTTON')) {
      return;
    }
    this.openDialog(e);
  };

  private handleRangeSelect = (e: Event) => {
    e.stopPropagation();
    const detail = (e as CustomEvent<{ start: string; end: string }>).detail;
    this.pendingStart = detail?.start ?? '';
    this.pendingEnd = detail?.end ?? '';
  };

  private confirm = () => {
    if (!this.pendingStart || !this.pendingEnd) return;
    this.startValue = this.pendingStart;
    this.endValue = this.pendingEnd;
    this.error = false;
    this.valueChange.emit({ start: this.startValue, end: this.endValue });
  };

  private clear = (e?: Event) => {
    e?.stopPropagation();
    if (this.disabled || this.readOnly) return;
    if (!this.startValue && !this.endValue) return;
    this.startValue = '';
    this.endValue = '';
    this.valueChange.emit({ start: '', end: '' });
  };

  private setDialogRef = (el?: HTMLElement) => {
    this.dialog = el as MaterialDialogLike | undefined;
  };

  private setCalendarRef = (el?: HTMLElement) => {
    if (!el) return;
    this.calendar = el as MaterialCalendarRangeLike;
    this.calendar.startValue = this.pendingStart || this.startValue;
    this.calendar.endValue = this.pendingEnd || this.endValue;
  };

  render() {
    const okLabel = this.okLabel || gettext('OK');
    const cancelLabel = this.cancelLabel || gettext('Cancel');
    const headline = this.headline || gettext('Select dates');
    const openLabel = this.openLabel || gettext('Open calendar');
    const clearLabel = this.clearLabel || gettext('Clear selection');
    const showClear = this.clearable && !!(this.startValue || this.endValue)
      && !this.disabled && !this.readOnly;
    // Both dates picked → OK commits; otherwise it is a no-op close.
    const okDisabled = !this.pendingStart || !this.pendingEnd;

    return (
      <Host class="block w-full">
        <material-textfield
          variant={this.variant}
          label={this.label}
          value={this.display()}
          placeholder={this.placeholder}
          disabled={this.disabled}
          readOnly={true}
          helpText={!this.error ? this.helpText : undefined}
          errorText={this.errorText}
          error={this.error}
          wideTrailing={showClear}
          onClick={this.handleFieldClick as unknown as (e: MouseEvent) => void}
        >
          <span slot="trailing" class="range-trailing">
            {showClear && (
              <material-icon-button
                size="xs"
                variant="standard"
                icon="close"
                aria-label={clearLabel}
                onClick={this.clear}
                onMouseDown={this.suppressTriggerFocus}
              />
            )}
            <material-icon-button
              size="s"
              variant="standard"
              icon="date_range"
              disabled={this.disabled}
              aria-label={openLabel}
              onClick={this.openDialog}
              onMouseDown={this.suppressTriggerFocus}
            />
          </span>
        </material-textfield>

        {this.startName && (
          <input type="hidden" name={this.startName} value={this.startValue} />
        )}
        {this.endName && (
          <input type="hidden" name={this.endName} value={this.endValue} />
        )}

        <material-dialog
          ref={this.setDialogRef}
          variant="adaptive"
          headline={headline}
        >
          {/* displayMonth is deliberately NOT bound — the calendar seeds it
              from startValue and re-snaps via its own watcher; binding it
              here would clobber in-dialog month navigation on re-render. */}
          <material-calendar
            ref={this.setCalendarRef}
            range={true}
            min={this.min}
            max={this.max}
            onRangeSelect={this.handleRangeSelect as unknown as (e: Event) => void}
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
              disabled={okDisabled}
              data-dialog-close="ok"
              onClick={this.confirm}
            />
          </div>
        </material-dialog>
      </Host>
    );
  }
}
