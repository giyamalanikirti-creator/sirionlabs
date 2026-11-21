import { describe, expect, it } from 'vitest';
import { trackChangesOffConsequences, untrackedWarning } from '@/lib/engines/trackChanges';

describe('track changes off', () => {
  it('leads with the open gaps and their cost on the signing copy', () => {
    const c = trackChangesOffConsequences({
      openGaps: [
        { label: 'Annual price', costLakhPerYr: 3.9 },
        { label: 'Renewal notice', costLakhPerYr: 1.1 },
        { label: 'Payment terms', costLakhPerYr: 0.25 },
      ],
      trackedCount: 0,
      untrackedCount: 0,
      isSigningCopy: true,
      supplier: 'CloudDesk',
    });
    expect(c[0].tone).toBe('risk');
    expect(c[0].text).toContain('3 agreed terms still to fix here (₹5.3 lakh a year if signed as is)');
    expect(c[0].text).toContain('may sign without reviewing them');
    expect(c.at(-1)!.text).toContain('signing check is not affected');
  });

  it('with nothing open, only warns about markup and keeps marked changes', () => {
    const c = trackChangesOffConsequences({ openGaps: [], trackedCount: 2, untrackedCount: 0, isSigningCopy: true, supplier: 'CloudDesk' });
    expect(c.map((x) => x.tone)).toEqual(['warn', 'info', 'info']);
    expect(c[1].text).toBe('2 changes already marked stay marked.');
  });

  it('warns while edits are untracked', () => {
    expect(untrackedWarning(0, 'CloudDesk')).toBeNull();
    expect(untrackedWarning(1, 'CloudDesk')).toMatch(/^1 edit is not tracked/);
    expect(untrackedWarning(3, 'CloudDesk')).toMatch(/^3 edits are not tracked/);
  });
});
