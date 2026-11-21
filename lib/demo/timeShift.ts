/**
 * The story runs on today's real calendar. The case is written around
 * signing on 21 Nov 2026; every story date (emails, drafts, the demo clock,
 * contract terms, invoices, renewal deadlines) moves by the same number of
 * days so that the signing day is today, in Asia/Kolkata time. Weekends,
 * deadlines and reminders are then computed on real dates.
 *
 * Tests pin the shift to zero, so golden numbers and dates stay fixed.
 * Set NEXT_PUBLIC_STORY_SHIFT=off to show the written dates.
 */
export const STORY_ANCHOR = '2026-11-21';

const DAY = 86400000;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function todayInKolkata(now = Date.now()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

function computeShift(): number {
  if (typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test')) return 0;
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STORY_SHIFT === 'off') return 0;
  // NEXT_PUBLIC_STORY_TODAY=YYYY-MM-DD pretends today is another day (for checking the shift).
  const override = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STORY_TODAY : undefined;
  const today = Date.parse(`${override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? override : todayInKolkata()}T00:00:00Z`);
  const anchor = Date.parse(`${STORY_ANCHOR}T00:00:00Z`);
  return Math.round((today - anchor) / DAY);
}

/** Days added to every story date. 0 in tests. */
export const SHIFT_DAYS = computeShift();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^(\d{4}-\d{2}-\d{2})(T[\d:.]+)(Z|[+-]\d{2}:\d{2})?$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

const addDaysToDate = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Shift an ISO date, date-time or month string. Anything else comes back unchanged. */
export function sh<T>(value: T, n = SHIFT_DAYS): T {
  if (typeof value !== 'string' || !n) return value;
  if (ISO_DATE.test(value)) return addDaysToDate(value, n) as T;
  const m = value.match(ISO_DATETIME);
  if (m) return `${addDaysToDate(m[1], n)}${m[2]}${m[3] ?? ''}` as T;
  if (ISO_MONTH.test(value)) return addDaysToDate(`${value}-15`, n).slice(0, 7) as T;
  return value;
}

/** The year a day-and-month without a year belongs to, in the story (Oct–Dec 2026, then 2027). */
const storyYear = (month: number) => (month >= 9 ? 2026 : 2027);

const monthIndex = (name: string) => {
  const i = MONTHS_LONG.findIndex((m) => m.toLowerCase() === name.toLowerCase());
  return i >= 0 ? i : MONTHS_SHORT.findIndex((m) => m.toLowerCase() === name.slice(0, 3).toLowerCase());
};

const MONTH_RE = '(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';
// "14 Nov", "1 December 2026", "5 Dec ’27"
const DAY_MONTH = new RegExp(`\\b(\\d{1,2}) ${MONTH_RE}\\b(?:,? (\\d{4})|\\s?[’'](\\d{2}))?`, 'g');
// "December 2027", "Dec 2027" (not preceded by a day number)
const MONTH_YEAR = new RegExp(`(?<!\\d )\\b${MONTH_RE} (\\d{4})\\b`, 'g');
// "Dec ’27" (not preceded by a day number)
const MONTH_YY = new RegExp(`(?<!\\d )\\b${MONTH_RE} [’'](\\d{2})\\b`, 'g');

/** Shift dates written in prose: "14 Nov", "1 December 2026", "December 2027". Keeps each one's style. */
export function shiftText(text: string, n = SHIFT_DAYS): string {
  if (!n || !text) return text;
  const out = text.replace(DAY_MONTH, (whole, day: string, monthName: string, year4?: string, year2?: string) => {
    const mi = monthIndex(monthName);
    if (mi < 0) return whole;
    const year = year4 ? Number(year4) : year2 ? 2000 + Number(year2) : storyYear(mi);
    const iso = `${year}-${String(mi + 1).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
    const shifted = new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY);
    const long = monthName.length > 4;
    const name = (long ? MONTHS_LONG : MONTHS_SHORT)[shifted.getUTCMonth()];
    const tail = year4 ? `${whole.includes(',') ? ',' : ''} ${shifted.getUTCFullYear()}` : year2 ? ` ’${String(shifted.getUTCFullYear()).slice(2)}` : '';
    return `${shifted.getUTCDate()} ${name}${tail}`;
  });
  const withYY = out.replace(MONTH_YY, (whole, monthName: string, yy: string) => {
    const mi = monthIndex(monthName);
    if (mi < 0) return whole;
    const shifted = new Date(Date.parse(`20${yy}-${String(mi + 1).padStart(2, '0')}-15T00:00:00Z`) + n * DAY);
    return `${MONTHS_SHORT[shifted.getUTCMonth()]} ’${String(shifted.getUTCFullYear()).slice(2)}`;
  });
  return withYY.replace(MONTH_YEAR, (whole, monthName: string, year: string) => {
    const mi = monthIndex(monthName);
    if (mi < 0) return whole;
    const shifted = new Date(Date.parse(`${year}-${String(mi + 1).padStart(2, '0')}-15T00:00:00Z`) + n * DAY);
    const long = monthName.length > 4;
    return `${(long ? MONTHS_LONG : MONTHS_SHORT)[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}`;
  });
}

const TEXT_KEYS = new Set(['body', 'text', 'quote', 'note', 'subject', 'title', 'detail', 'sourceNote', 'sourceQuote', 'fileSays', 'agreed', 'reason', 'condition', 'supplierNote', 'label', 'lines', 'patternDetail', 'value', 'from', 'ask', 'fallback', 'leverage', 'time', 'instruction', 'hint', 'summary', 'preview']);

/** Shift every ISO date in a JSON-like value, and dates written in its prose fields. Returns a copy. */
export function deepShift<T>(value: T, n = SHIFT_DAYS): T {
  if (!n) return value;
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === 'string') {
      const iso = sh(v, n);
      if (iso !== v) return iso;
      return key && TEXT_KEYS.has(key) ? shiftText(v, n) : v;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value) as T;
}
