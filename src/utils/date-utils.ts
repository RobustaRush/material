/**
 * Tiny date helpers — strftime-style format/parse plus ISO conversion.
 * Ported from viewflow/components/vf-field-datetime/date-utils.js with the
 * month-name table sourced from our `i18n.ts` shim.
 *
 * Intentionally browser-baseline — no Temporal, no date-fns.
 */

import { monthNames } from './i18n';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

export function formatDate(format: string, value: Date): string {
  const monthsAbbr = monthNames('short');
  let out = '';
  for (let i = 0; i < format.length; i++) {
    const ch = format[i];
    if (ch !== '%') { out += ch; continue; }
    const spec = format[i + 1];
    switch (spec) {
      case 'd': out += pad2(value.getDate()); break;
      case 'm': out += pad2(value.getMonth() + 1); break;
      case 'b': out += monthsAbbr[value.getMonth()]; break;
      case 'Y': out += String(value.getFullYear()); break;
      case 'I': out += pad2(value.getHours() % 12 || 12); break;
      case 'H': out += pad2(value.getHours()); break;
      case 'M': out += pad2(value.getMinutes()); break;
      case 'S': out += pad2(value.getSeconds()); break;
      case 'p': out += value.getHours() >= 12 ? 'pm' : 'am'; break;
      case '%': out += '%'; break;
      default:
        if (spec) out += `%${spec}`;
    }
    i++;
  }
  return out;
}

const DATE_SPLIT_RE = /[.\-/:\s]/;

export function parseDateTime(format: string, value: string): Date {
  const monthsAbbr = monthNames('short');
  const fmtParts = format.split(DATE_SPLIT_RE).filter(Boolean);
  const valParts = value.split(DATE_SPLIT_RE).filter(Boolean);
  if (fmtParts.length !== valParts.length) {
    throw new Error(`Date "${value}" does not match format "${format}"`);
  }
  let day = NaN, month = NaN, year = NaN;
  for (let i = 0; i < fmtParts.length; i++) {
    const f = fmtParts[i];
    const v = valParts[i];
    switch (f) {
      case '%d':
        day = parseInt(v, 10);
        break;
      case '%m':
        month = parseInt(v, 10) - 1;
        break;
      case '%Y':
        year = parseInt(v, 10);
        break;
      case '%b': {
        const idx = monthsAbbr.findIndex(
          (n) => n.toLowerCase() === v.toLowerCase(),
        );
        if (idx === -1) throw new Error(`Invalid month abbreviation: ${v}`);
        month = idx;
        break;
      }
    }
  }
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    throw new Error(`Date "${value}" missing components for "${format}"`);
  }
  const d = new Date(year, month, day, 0, 0, 0);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) {
    throw new Error(`Date "${value}" is out of range`);
  }
  return d;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromISO(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo, d, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function todayISO(): string {
  return toISO(new Date());
}

/** Add `n` months to an ISO date (clamping day to the new month's length). */
export function addMonthsISO(iso: string, n: number): string {
  const d = fromISO(iso);
  if (!d) return iso;
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = daysInMonth(target.getFullYear(), target.getMonth());
  target.setDate(Math.min(d.getDate(), last));
  return toISO(target);
}

/** True iff `iso` falls within [min, max]; unset bounds are treated as open. */
export function inRange(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}
