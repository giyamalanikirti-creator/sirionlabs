/**
 * Renewal dates (review fix C8), computed from the clauses. Pure.
 * - Last day to give notice: contract end less the notice period, in calendar days.
 * - A contractual deadline that falls on a weekend is flagged, never moved.
 * - The internal decision reminder (45 days earlier) moves to the previous
 *   working day if it falls on a weekend, and says so.
 * - If the notices clause treats emailed notice as received on the next
 *   working day, the send-by date is the working day before the deadline:
 *   shown for Legal to confirm, not as a decision.
 */
const DAY = 86400000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const REMINDER_LEAD_DAYS = 45;

const toDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => iso(new Date(toDate(d).getTime() + n * DAY));
export const weekday = (d: string) => toDate(d).getUTCDay();
export const isWeekend = (d: string) => weekday(d) === 0 || weekday(d) === 6;

/** "Fri 14 Sep 2029" */
export function formatDay(d: string): string {
  const x = toDate(d);
  return `${WEEKDAYS[x.getUTCDay()]} ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}
/** "Sun 16 Sep" */
export function formatDayShort(d: string): string {
  const x = toDate(d);
  return `${WEEKDAYS[x.getUTCDay()]} ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
}

export function previousWorkingDay(d: string): string {
  let x = addDays(d, -1);
  while (isWeekend(x)) x = addDays(x, -1);
  return x;
}
/** The day itself if it is a working day, else the working day before it. */
export function onOrBeforeWorkingDay(d: string): string {
  return isWeekend(d) ? previousWorkingDay(d) : d;
}

export interface RenewalDates {
  end: string;
  noticeDays: number;
  /** Last day to give notice (calendar days). Never moved. */
  lastNoticeDay: string;
  /** "Falls on a Saturday. Check the contract's business-day rule." */
  deadlineFlag?: string;
  reminder: string;
  /** Set when the computed reminder fell on a weekend. */
  reminderMovedFrom?: string;
  /** "(moved from Sun 16 Sep)" */
  reminderNote?: string;
  /** When the notices clause treats email as received the next working day. */
  sendBy?: string;
  sendByNote?: string;
}

export function renewalDates(opts: { end: string; noticeDays: number; noticesClause?: { no: string; text: string } }): RenewalDates {
  const lastNoticeDay = addDays(opts.end, -opts.noticeDays);
  const computed = addDays(lastNoticeDay, -REMINDER_LEAD_DAYS);
  const reminder = onOrBeforeWorkingDay(computed);
  const out: RenewalDates = { end: opts.end, noticeDays: opts.noticeDays, lastNoticeDay, reminder };
  if (isWeekend(lastNoticeDay)) out.deadlineFlag = `Falls on a ${LONG_WEEKDAYS[weekday(lastNoticeDay)]}. Check the contract's business-day rule.`;
  if (reminder !== computed) {
    out.reminderMovedFrom = computed;
    out.reminderNote = `(moved from ${formatDayShort(computed)})`;
  }
  const c = opts.noticesClause;
  if (c && /email[^.]*received on the next working day/i.test(c.text)) {
    out.sendBy = previousWorkingDay(lastNoticeDay);
    out.sendByNote = `§${c.no} says emailed notice is received the next working day. To be received by ${formatDayShort(lastNoticeDay)}, send by ${formatDay(out.sendBy)}. For Legal to confirm.`;
  }
  return out;
}

/** An amendment that changes the notice period: the reminder follows it, and the earlier date is kept in history. */
export function amendNotice(prev: RenewalDates, noticeDays: number, noticesClause?: { no: string; text: string }) {
  const next = renewalDates({ end: prev.end, noticeDays, noticesClause });
  return { current: next, history: [{ noticeDays: prev.noticeDays, lastNoticeDay: prev.lastNoticeDay, reminder: prev.reminder }] };
}
