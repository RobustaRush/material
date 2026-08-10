/*
 * @viewflow/material — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

/**
 * i18n shim with three-tier resolution:
 *
 *   1. Django  — if `window.django.jsi18n_initialized` is true, defer to the
 *      page-loaded `gettext` / `pgettext` / `get_format` / `interpolate` so
 *      existing Django translation catalogs Just Work.
 *   2. Intl    — locale data derived from `Intl.DateTimeFormat` /
 *      `Intl.Locale` for month names, weekday names, first day of week.
 *   3. Hard    — English defaults for free-form labels (e.g. "OK", "Cancel").
 *
 * Future Laravel/Rails support: add a sibling check in step 1 (e.g.
 * `window.Laravel?.locale`, `window.I18n` for rails-i18n-js) — component
 * code never has to change.
 */

type DjangoFormat =
  | 'DATE_FORMAT'
  | 'DATE_INPUT_FORMATS'
  | 'DATETIME_FORMAT'
  | 'DATETIME_INPUT_FORMATS'
  | 'FIRST_DAY_OF_WEEK'
  | 'MONTH_DAY_FORMAT'
  | 'SHORT_DATE_FORMAT'
  | 'SHORT_DATETIME_FORMAT'
  | 'TIME_FORMAT'
  | 'TIME_INPUT_FORMATS'
  | 'YEAR_MONTH_FORMAT'
  | 'NUMBER_GROUPING'
  | 'DECIMAL_SEPARATOR'
  | 'THOUSAND_SEPARATOR';

interface DjangoGlobals {
  jsi18n_initialized?: boolean;
}
type GettextFn = (msg: string) => string;
type PgettextFn = (ctx: string, msg: string) => string;
type GetFormatFn = (name: string) => string | number | string[];

interface I18nWindow extends Window {
  django?: DjangoGlobals;
  gettext?: GettextFn;
  pgettext?: PgettextFn;
  get_format?: GetFormatFn;
}

function djangoReady(): boolean {
  return typeof window !== 'undefined'
    && !!(window as I18nWindow).django?.jsi18n_initialized;
}

export function gettext(msg: string): string {
  if (djangoReady()) {
    const fn = (window as I18nWindow).gettext;
    if (fn) return fn(msg);
  }
  return msg;
}

export function pgettext(ctx: string, msg: string): string {
  if (djangoReady()) {
    const fn = (window as I18nWindow).pgettext;
    if (fn) return fn(ctx, msg);
  }
  return msg;
}

export function getFormat(name: DjangoFormat): string | number | string[] | undefined {
  if (djangoReady()) {
    const fn = (window as I18nWindow).get_format;
    if (fn) return fn(name);
  }
  return undefined;
}

function pageLocale(override?: string): string {
  if (override) return override;
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang;
    if (lang) return lang;
  }
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en';
}

// Locales like ru-RU return standalone month/weekday names in lowercase
// (correct grammar — but in calendar headers they're conventionally capitalised).
// Uppercase the first display character without disturbing later letters.
function capitalize(s: string): string {
  if (!s) return s;
  // Use Array.from to handle surrogate pairs / combining marks safely.
  const chars = Array.from(s);
  chars[0] = chars[0].toLocaleUpperCase();
  return chars.join('');
}

export function monthNames(
  style: 'long' | 'short' | 'narrow' = 'long',
  locale?: string,
): string[] {
  // Django path keeps its own catalogs — only used when caller passes
  // 'long' or 'short' since those map cleanly to the upstream gettext keys.
  if (djangoReady() && style !== 'narrow') {
    if (style === 'long') {
      return [
        gettext('January'), gettext('February'), gettext('March'),
        gettext('April'), gettext('May'), gettext('June'),
        gettext('July'), gettext('August'), gettext('September'),
        gettext('October'), gettext('November'), gettext('December'),
      ];
    }
    return [
      pgettext('three letter January', 'Jan'),
      pgettext('three letter February', 'Feb'),
      pgettext('three letter March', 'Mar'),
      pgettext('three letter April', 'Apr'),
      pgettext('three letter May', 'May'),
      pgettext('three letter June', 'Jun'),
      pgettext('three letter July', 'Jul'),
      pgettext('three letter August', 'Aug'),
      pgettext('three letter September', 'Sep'),
      pgettext('three letter October', 'Oct'),
      pgettext('three letter November', 'Nov'),
      pgettext('three letter December', 'Dec'),
    ];
  }
  const fmt = new Intl.DateTimeFormat(pageLocale(locale), { month: style });
  return Array.from({ length: 12 }, (_, i) => capitalize(fmt.format(new Date(2000, i, 15))));
}

export function weekdayNames(
  style: 'long' | 'short' | 'narrow' = 'narrow',
  locale?: string,
): string[] {
  // Indexed 0..6 = Sun..Sat, matching Django's FIRST_DAY_OF_WEEK convention
  // and JS Date.getDay().
  if (djangoReady() && style === 'narrow') {
    return [
      pgettext('one letter Sunday', 'S'),
      pgettext('one letter Monday', 'M'),
      pgettext('one letter Tuesday', 'T'),
      pgettext('one letter Wednesday', 'W'),
      pgettext('one letter Thursday', 'T'),
      pgettext('one letter Friday', 'F'),
      pgettext('one letter Saturday', 'S'),
    ];
  }
  if (djangoReady() && style === 'short') {
    return [
      pgettext('three letter Sunday', 'Sun'),
      pgettext('three letter Monday', 'Mon'),
      pgettext('three letter Tuesday', 'Tue'),
      pgettext('three letter Wednesday', 'Wed'),
      pgettext('three letter Thursday', 'Thu'),
      pgettext('three letter Friday', 'Fri'),
      pgettext('three letter Saturday', 'Sat'),
    ];
  }
  const fmt = new Intl.DateTimeFormat(pageLocale(locale), { weekday: style });
  // 2000-01-02 was a Sunday → walk 7 days starting there.
  return Array.from({ length: 7 }, (_, i) => capitalize(fmt.format(new Date(2000, 0, 2 + i))));
}

export function firstDayOfWeek(locale?: string): number {
  const v = getFormat('FIRST_DAY_OF_WEEK');
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v !== '') {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  try {
    // Intl.Locale is widely available (Chrome/Edge/Safari/Firefox) but not in
    // the project's `lib: ["es2018"]` typings. Pull it from the global Intl
    // object dynamically — falls back to `0` (Sunday) on older runtimes.
    const IntlAny = Intl as unknown as { Locale?: new (tag: string) => unknown };
    if (typeof IntlAny.Locale === 'function') {
      const loc = new IntlAny.Locale(pageLocale(locale)) as
        { getWeekInfo?: () => { firstDay: number } };
      const info = loc.getWeekInfo?.();
      if (info && typeof info.firstDay === 'number') {
        // Intl.Locale uses 1=Mon..7=Sun; Django/JS uses 0=Sun..6=Sat.
        return info.firstDay % 7;
      }
    }
  } catch { /* unsupported */ }
  return 0;
}

/**
 * Full list of `%`-style date formats accepted on manual entry. Django
 * supplies a list (`DATE_INPUT_FORMATS`); without it we synthesise a
 * permissive set built around the locale's display format — adding ISO,
 * a 2-digit-year sibling, the opposite D/M ordering, and month-name
 * variants — so the lenient parser has options regardless of how the
 * user types the date.
 */
export function dateInputFormats(locale?: string): string[] {
  const v = getFormat('DATE_INPUT_FORMATS');
  if (Array.isArray(v) && v.length > 0) {
    const list = v.filter((f): f is string => typeof f === 'string');
    if (list.length > 0) return list;
  }
  const display = defaultDateInputFormat(locale);
  const specs = display.match(/%[YymdbB]/g) ?? [];
  const list = new Set<string>(['%Y-%m-%d', display]);
  if (display.includes('%Y')) list.add(display.replace('%Y', '%y'));
  const first = specs[0];
  if (first === '%m' || first === '%b' || first === '%B') {
    list.add('%d.%m.%Y');
    list.add('%d.%m.%y');
  } else if (first === '%d') {
    list.add('%m/%d/%Y');
    list.add('%m/%d/%y');
  }
  list.add('%d %b %Y');
  list.add('%b %d, %Y');
  return [...list];
}

/**
 * Try to get a default `%`-style date input format. Django supplies a list;
 * we take the first entry. Otherwise derive from `Intl.DateTimeFormat` parts.
 */
export function defaultDateInputFormat(locale?: string): string {
  const v = getFormat('DATE_INPUT_FORMATS');
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0];

  const parts = new Intl.DateTimeFormat(pageLocale(locale), {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(2000, 0, 2));
  let fmt = '';
  for (const p of parts) {
    switch (p.type) {
      case 'year':    fmt += '%Y'; break;
      case 'month':   fmt += '%m'; break;
      case 'day':     fmt += '%d'; break;
      case 'literal': fmt += p.value; break;
    }
  }
  return fmt || '%Y-%m-%d';
}

/**
 * `'12'` (AM/PM) or `'24'` for the locale. Django `TIME_INPUT_FORMATS` wins
 * (any entry containing `%p` → 12). Otherwise asks `Intl.DateTimeFormat`.
 */
export function defaultTimeMode(locale?: string): '12' | '24' {
  const v = getFormat('TIME_INPUT_FORMATS');
  if (Array.isArray(v) && v.length > 0) {
    return v.some(f => typeof f === 'string' && f.includes('%p')) ? '12' : '24';
  }
  try {
    const opts = new Intl.DateTimeFormat(pageLocale(locale), { hour: 'numeric' })
      .resolvedOptions();
    return opts.hour12 ? '12' : '24';
  } catch {
    return '24';
  }
}

/** Display strftime for the given mode — `%H:%M` (24h) or `%I:%M %p` (12h). */
export function defaultTimeFormat(locale?: string, mode?: '12' | '24'): string {
  const m = mode ?? defaultTimeMode(locale);
  return m === '12' ? '%I:%M %p' : '%H:%M';
}

/**
 * `%`-style time formats accepted on manual entry. Django `TIME_INPUT_FORMATS`
 * is preferred; fallback synthesises a permissive set covering both 12h and
 * 24h shapes plus optional seconds.
 */
export function timeInputFormats(locale?: string, mode?: '12' | '24'): string[] {
  const v = getFormat('TIME_INPUT_FORMATS');
  if (Array.isArray(v) && v.length > 0) {
    const list = v.filter((f): f is string => typeof f === 'string');
    if (list.length > 0) return list;
  }
  const m = mode ?? defaultTimeMode(locale);
  if (m === '12') {
    return ['%I:%M %p', '%I:%M:%S %p', '%H:%M', '%H:%M:%S'];
  }
  return ['%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M:%S %p'];
}

/** Display strftime for a datetime value — date-format + time-format joined
 *  by a space. Django `DATETIME_FORMAT` wins when present. */
export function defaultDatetimeFormat(locale?: string, mode?: '12' | '24'): string {
  const v = getFormat('DATETIME_INPUT_FORMATS');
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0];
  return `${defaultDateInputFormat(locale)} ${defaultTimeFormat(locale, mode)}`;
}

/** `%`-style datetime formats accepted on manual entry. Django
 *  `DATETIME_INPUT_FORMATS` wins; otherwise we cross the date and time
 *  format lists so a wide range of `<date><sep><time>` combinations parse. */
export function datetimeInputFormats(locale?: string, mode?: '12' | '24'): string[] {
  const v = getFormat('DATETIME_INPUT_FORMATS');
  if (Array.isArray(v) && v.length > 0) {
    const list = v.filter((f): f is string => typeof f === 'string');
    if (list.length > 0) return list;
  }
  const dates = dateInputFormats(locale);
  const times = timeInputFormats(locale, mode);
  const out = new Set<string>();
  // ISO-with-T first so `2026-05-03T14:30` parses cleanly.
  out.add(`${dates[0]}T${times[0]}`);
  for (const d of dates) {
    for (const t of times) {
      out.add(`${d} ${t}`);
    }
  }
  return [...out];
}
