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
