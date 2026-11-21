/** Review fix C8: renewal dates from the clauses, the weekend rule and the send-by date. */
import { describe, expect, it } from 'vitest';
import { amendNotice, formatDay, renewalDates } from '@/lib/engines/dates';
import { termEnd } from '@/lib/engines/handover';
import { cloudDeskDeal, versionById } from '@/lib/data';

const notices = versionById('v6')!.clauses.find((c) => c.no === '16.1')!;
const end = termEnd(cloudDeskDeal);

describe('CloudDesk renewal dates', () => {
  it('contract end is Fri 30 Nov 2029', () => {
    expect(formatDay(end)).toBe('Fri 30 Nov 2029');
  });

  it('supplier draft v4, 90 days: deadline Sat 1 Sep 2029 (flagged, not moved), reminder Wed 18 Jul 2029', () => {
    const d = renewalDates({ end, noticeDays: 90 });
    expect(formatDay(d.lastNoticeDay)).toBe('Sat 1 Sep 2029');
    expect(d.deadlineFlag).toBe("Falls on a Saturday. Check the contract's business-day rule.");
    expect(formatDay(d.reminder)).toBe('Wed 18 Jul 2029');
    expect(d.reminderMovedFrom).toBeUndefined();
  });

  it('executed v7, 30 days: deadline Wed 31 Oct 2029; reminder moved from Sun 16 Sep to Fri 14 Sep 2029', () => {
    const d = renewalDates({ end, noticeDays: 30, noticesClause: notices });
    expect(formatDay(d.lastNoticeDay)).toBe('Wed 31 Oct 2029');
    expect(d.deadlineFlag).toBeUndefined();
    expect(formatDay(d.reminder)).toBe('Fri 14 Sep 2029');
    expect(d.reminderNote).toBe('(moved from Sun 16 Sep)');
  });

  it('send-by date from the notices clause: Tue 30 Oct 2029, for Legal to confirm', () => {
    const d = renewalDates({ end, noticeDays: 30, noticesClause: notices });
    expect(formatDay(d.sendBy!)).toBe('Tue 30 Oct 2029');
    expect(d.sendByNote).toBe('§16.1 says emailed notice is received the next working day. To be received by Wed 31 Oct, send by Tue 30 Oct 2029. For Legal to confirm.');
  });

  it('an amendment to the notice period moves the reminder and keeps the earlier date in history', () => {
    const before = renewalDates({ end, noticeDays: 30 });
    const after = amendNotice(before, 60);
    expect(formatDay(after.current.lastNoticeDay)).toBe('Mon 1 Oct 2029');
    expect(after.history[0].reminder).toBe(before.reminder);
    expect(after.current.reminder).not.toBe(before.reminder);
  });
});
