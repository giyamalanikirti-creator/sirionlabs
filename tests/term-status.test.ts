/** Review fix A5: negotiation status and draft match are separate, and every count comes from one selector. */
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
const { useDemo } = await import('@/lib/store');
afterAll(() => vi.unstubAllGlobals());

import { selectTermCounts, statusLine, termStatuses } from '@/lib/engines/termStatus';
import { reviewIssues } from '@/lib/engines/wordLens';
import { cloudDeskDeal as deal, versionById } from '@/lib/data';
import { ledgerAtStep } from '@/lib/demo/steps';

const v6 = versionById('v6')!;

describe('term status', () => {
  it('service credit at round 4: matches our position in v4, but is not agreed', () => {
    const t = termStatuses(ledgerAtStep(1), versionById('v4')!, deal).find((x) => x.termKey === 'service_credit')!;
    expect(t.draft).toBe('matches');
    expect(t.negotiation).not.toBe('agreed');
    expect(t.matchesAgreed).toBe(false);
  });

  it('an ambiguous reply reads “Matches your position · Not confirmed by CloudDesk”', () => {
    const rows = ledgerAtStep(1).map((r) => (r.termKey === 'service_credit' ? { ...r, state: 'needs_confirmation' as const } : r));
    const t = termStatuses(rows, v6, deal).find((x) => x.termKey === 'service_credit')!;
    expect(statusLine(t, deal.supplier)).toBe('Service credit · Matches your position · Not confirmed by CloudDesk');
  });

  it('v6 at step 4: 3 differ, 4 agreed and matching', () => {
    const c = selectTermCounts(ledgerAtStep(4), v6, deal);
    expect(c).toMatchObject({ total: 7, differs: 3, matchesAgreed: 4, notAgreed: 0 });
  });

  it('the Word review list uses the same count', () => {
    const rows = ledgerAtStep(4);
    expect(reviewIssues(v6, rows, deal).matches).toBe(selectTermCounts(rows, v6, deal).matchesAgreed);
  });

  it('skipping straight to step 4 gives the same counts as going step by step', () => {
    const s = useDemo.getState;
    s().reset();
    s().advanceTo(4);
    s().runSigningCheck();
    const jumped = selectTermCounts(s().ledger, v6, deal);
    s().reset();
    for (const step of [1, 2, 3, 4] as const) s().advanceTo(step);
    s().runSigningCheck();
    const played = selectTermCounts(s().ledger, v6, deal);
    s().reset();
    s().advanceTo(3);
    s().previewStage(4);
    const previewed = selectTermCounts(s().ledger, v6, deal);
    expect(played).toEqual(jumped);
    expect(previewed).toEqual(jumped);
  });
});
