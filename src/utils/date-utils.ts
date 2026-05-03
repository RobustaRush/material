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

const VALUE_SPLIT_RE = /[.\-/:\s,]+/;
const FORMAT_SPEC_RE = /%[a-zA-Z%]/g;

// Natural digit width for a numeric strftime spec — used by the compact
// "single digit block" shortcut (`15052026` → 15/05/2026).
const NATURAL_WIDTH: Record<string, number> = {
  '%d': 2, '%m': 2, '%Y': 4, '%y': 2,
  '%H': 2, '%I': 2, '%M': 2, '%S': 2,
};

function pivotTwoDigitYear(yy: number): number {
  // Python `time.strptime` / Django convention: 00–68 → 20xx, 69–99 → 19xx.
  return yy < 69 ? 2000 + yy : 1900 + yy;
}

function lookupMonthName(part: string): number {
  const target = part.toLowerCase();
  const tables = [monthNames('short'), monthNames('long')];
  for (const tbl of tables) {
    const idx = tbl.findIndex(n => n.toLowerCase() === target);
    if (idx !== -1) return idx;
  }
  return -1;
}

function assignSpec(
  spec: string,
  part: string,
  out: { day: number; month: number; year: number },
): void {
  switch (spec) {
    case '%d':
      if (!/^\d{1,2}$/.test(part)) throw new Error(`Invalid day "${part}"`);
      out.day = parseInt(part, 10);
      return;
    case '%m':
      if (!/^\d{1,2}$/.test(part)) throw new Error(`Invalid month "${part}"`);
      out.month = parseInt(part, 10) - 1;
      return;
    case '%Y':
      if (!/^\d{4}$/.test(part)) throw new Error(`Invalid year "${part}"`);
      out.year = parseInt(part, 10);
      return;
    case '%y':
      if (!/^\d{2}$/.test(part)) throw new Error(`Invalid 2-digit year "${part}"`);
      out.year = pivotTwoDigitYear(parseInt(part, 10));
      return;
    case '%b':
    case '%B': {
      // Accept either short or long; if the part is purely numeric, fall
      // back to month-number parsing so a `%b` slot still tolerates `5`.
      if (/^\d{1,2}$/.test(part)) {
        out.month = parseInt(part, 10) - 1;
        return;
      }
      const idx = lookupMonthName(part);
      if (idx === -1) throw new Error(`Invalid month name "${part}"`);
      out.month = idx;
      return;
    }
    default:
      // Unknown / unsupported spec — ignore (caller's format may include
      // time tokens we don't care about for date-only fields).
      return;
  }
}

export function parseDateTime(format: string, value: string): Date {
  const specs = (format.match(FORMAT_SPEC_RE) ?? []).filter(s => s !== '%%');
  if (specs.length === 0) {
    throw new Error(`Format "${format}" has no recognised specs`);
  }

  const trimmed = value.trim();
  if (!trimmed) throw new Error('Empty value');

  let parts = trimmed.split(VALUE_SPLIT_RE).filter(Boolean);

  // Compact-digit shortcut: one block whose width matches sum of natural
  // widths (e.g. `15052026` against `%d %m %Y` → 2+2+4 = 8).
  if (parts.length === 1 && /^\d+$/.test(parts[0])) {
    const widths = specs.map(s => NATURAL_WIDTH[s] ?? 0);
    const totalNatural = widths.reduce((a, b) => a + b, 0);
    if (totalNatural > 0 && parts[0].length === totalNatural) {
      const sliced: string[] = [];
      let cursor = 0;
      for (const w of widths) {
        sliced.push(parts[0].slice(cursor, cursor + w));
        cursor += w;
      }
      parts = sliced;
    }
  }

  // Year-omitted shortcut: missing exactly one slot and that slot is the year.
  if (parts.length === specs.length - 1) {
    const yearIdx = specs.findIndex(s => s === '%Y' || s === '%y');
    if (yearIdx !== -1) {
      const yyyy = String(new Date().getFullYear());
      const filled = [...parts];
      filled.splice(yearIdx, 0, specs[yearIdx] === '%Y' ? yyyy : yyyy.slice(-2));
      parts = filled;
    }
  }

  if (parts.length !== specs.length) {
    throw new Error(`Date "${value}" does not match format "${format}"`);
  }

  const out = { day: NaN, month: NaN, year: NaN };
  for (let i = 0; i < specs.length; i++) {
    assignSpec(specs[i], parts[i], out);
  }
  if (Number.isNaN(out.day) || Number.isNaN(out.month) || Number.isNaN(out.year)) {
    throw new Error(`Date "${value}" missing components for "${format}"`);
  }

  const d = new Date(out.year, out.month, out.day, 0, 0, 0);
  if (
    d.getFullYear() !== out.year ||
    d.getMonth() !== out.month ||
    d.getDate() !== out.day
  ) {
    throw new Error(`Date "${value}" is out of range`);
  }
  return d;
}

export function parseDateTimeAny(formats: string[], value: string): Date {
  let lastErr: unknown;
  for (const f of formats) {
    try { return parseDateTime(f, value); }
    catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`No format matched "${value}"`);
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
