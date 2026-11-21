/** The story runs on today's calendar: every date moves by the same number of days. Tests run with no shift. */
import { describe, expect, it } from 'vitest';
import { deepShift, sh, SHIFT_DAYS, shiftText } from '@/lib/demo/timeShift';

describe('time shift', () => {
  it('is off in tests', () => {
    expect(SHIFT_DAYS).toBe(0);
  });
  it('shifts ISO dates, date-times and months', () => {
    expect(sh('2026-11-21', 10)).toBe('2026-12-01');
    expect(sh('2026-11-14T10:05:00+05:30', 30)).toBe('2026-12-14T10:05:00+05:30');
    expect(sh('2027-12', 40)).toBe('2028-01');
    expect(sh('not a date', 10)).toBe('not a date');
  });
  it('shifts dates written in prose, keeping their style', () => {
    expect(shiftText('as proposed on 13 Nov', 30)).toBe('as proposed on 13 Dec');
    expect(shiftText('renewal term from 1 December 2026', 31)).toBe('renewal term from 1 January 2027');
    expect(shiftText('Kindly sign by 25 Nov. Priya', 7)).toBe('Kindly sign by 2 Dec. Priya');
    expect(shiftText('Dec ’27 · one year later', 0)).toBe('Dec ’27 · one year later');
    expect(shiftText('5 Dec ’27', 30)).toBe('4 Jan ’28');
    expect(shiftText('December 2027', 31)).toBe('January 2028');
    expect(shiftText('Fixed for 3 years, 60 days', 30)).toBe('Fixed for 3 years, 60 days');
  });
  it('deep-shifts records', () => {
    const r = deepShift({ sentAt: '2026-11-14T10:05:00+05:30', body: 'sign by 25 Nov', id: 'M8' }, 7);
    expect(r).toEqual({ sentAt: '2026-11-21T10:05:00+05:30', body: 'sign by 2 Dec', id: 'M8' });
  });
});

describe('time shift, short years', () => {
  it('shifts “Dec ’27” on its own', () => {
    expect(shiftText('Dec ’27 · one year later', 40)).toBe('Jan ’28 · one year later');
  });
});
