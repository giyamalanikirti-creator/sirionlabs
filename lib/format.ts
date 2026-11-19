// BUILD_SPEC §8.9. Engines work in lakh; formatting happens only at the UI edge.

const IST = 'Asia/Kolkata';

/**
 * en-IN renders September as "Sept". Every other month is three letters, so
 * this keeps dates an even width: 14 Nov, 16 Sep, 31 Oct.
 */
function shortMonths(s: string): string {
  return s.replace(/\bSept\b/g, 'Sep');
}

/** Indian grouping for a full rupee amount: ₹5,32,000. */
export function formatInr(amount: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
    Math.round(amount),
  )}`;
}

/**
 * A lakh figure, shown the way people say it:
 *  - ≥ 100 lakh  → crore to 1 dp (₹1.8 crore)
 *  - ≥ 1 lakh    → lakh to 1 dp  (₹3.9 lakh)
 *  - < 1 lakh    → rupees to the nearest thousand (₹25,000)
 */
export function formatLakh(valueLakh: number | null | undefined): string {
  if (valueLakh === null || valueLakh === undefined) return 'No ₹ figure';
  const v = Math.abs(valueLakh);
  const sign = valueLakh < 0 ? '−' : '';
  if (v >= 100) {
    return `${sign}₹${round1(v / 100)} crore`;
  }
  if (v >= 1) {
    return `${sign}₹${round1(v)} lakh`;
  }
  const rupees = Math.round((v * 100000) / 1000) * 1000;
  if (rupees === 0) return '₹0';
  return `${sign}${formatInr(rupees)}`;
}

/** The same figure with the "a year" suffix the UI uses on at-risk numbers. */
export function formatLakhPerYear(valueLakh: number | null | undefined): string {
  if (valueLakh === null || valueLakh === undefined) return 'No ₹ figure';
  return `${formatLakh(valueLakh)} a year`;
}

/** One decimal place, but a whole number stays whole: 3.9, 60, 1.8. */
function round1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function formatPct(fraction: number, dp = 0): string {
  return `${(fraction * 100).toFixed(dp)}%`;
}

/** "14 Nov, 10:05" in Asia/Kolkata. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = shortMonths(
    new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: IST,
    }).format(d),
  );
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: IST,
  }).format(d);
  return `${date}, ${time}`;
}

/** "14 Nov" */
export function formatDateShort(iso: string): string {
  return shortMonths(
    new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: IST,
    }).format(new Date(iso)),
  );
}

/** "14 Nov 2026" */
export function formatDateLong(iso: string): string {
  return shortMonths(
    new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: IST,
    }).format(new Date(iso)),
  );
}

/** "10:05" */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: IST,
  }).format(new Date(iso));
}

/** "Fri 14 Nov, 10:05" for the demo-date chip. */
export function formatDemoDate(iso: string): string {
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    timeZone: IST,
  }).format(d);
  return `${weekday} ${formatDateTime(iso)}`;
}

/** Outlook-style relative time in the message list. */
export function formatListTime(iso: string, nowIso: string): string {
  const d = new Date(iso);
  const now = new Date(nowIso);
  const sameDay =
    new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeZone: IST }).format(d) ===
    new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeZone: IST }).format(now);
  if (sameDay) return formatTime(iso);
  return formatDateShort(iso);
}

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

/** Numbers in words for clause text: "sixty (60)". */
export function numberToWords(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (!Number.isInteger(n)) {
    const [whole, frac] = String(n).split('.');
    return `${numberToWords(Number(whole))} point ${frac
      .split('')
      .map((d) => ONES[Number(d)])
      .join(' ')}`;
  }
  if (n < 0) return `minus ${numberToWords(-n)}`;
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r === 0 ? TENS[t] : `${TENS[t]}-${ONES[r]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r === 0 ? `${ONES[h]} hundred` : `${ONES[h]} hundred and ${numberToWords(r)}`;
  }
  return String(n);
}

/** Indian grouping without the ₹ sign, for clause text: "60,00,000". */
export function indianGroup(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}
