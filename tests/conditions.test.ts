/** Review fix B2: a conditional agreement is checked against the same file's other clause. */
import { describe, expect, it } from 'vitest';
import { conditionState, conditionalComment } from '@/lib/engines/conditions';
import { cloudDeskDeal as deal, versionById } from '@/lib/data';
import { ledgerAtStep } from '@/lib/demo/steps';
import { supplierSafetyReason } from '@/lib/engines/wording';
import type { DocVersion } from '@/lib/types';

const payment = () => ledgerAtStep(4).find((r) => r.termKey === 'payment')!;
const v6 = versionById('v6')!;
const withTerm = (text: string | null): DocVersion => ({
  ...v6,
  clauses: text === null ? v6.clauses.filter((c) => c.termKey !== 'term') : v6.clauses.map((c) => (c.termKey === 'term' ? { ...c, text } : c)),
});

describe('conditional agreements', () => {
  it('60 days was agreed on condition of a three-year term, from Rohan’s 10 Nov email', () => {
    const row = payment();
    expect(row.condition).toMatchObject({ text: 'if Meridian signs for 3 years', dependsOn: { termKey: 'term', required: '3 years' } });
    expect(row.condition!.source.quote).toBe('OK on 60 days if you sign for 3 years');
  });

  it('met on v6: §3.1 gives three years', () => {
    expect(conditionState(payment(), v6, deal)).toMatchObject({ state: 'met', clauseNo: '3.1', sentence: 'Condition met: §3.1 gives a three-year term.' });
  });

  it('not met when §3.1 says 2 years', () => {
    const c = conditionState(payment(), withTerm('The Initial Term is 2 (two) year(s) from 1 December 2026.'), deal)!;
    expect(c.state).toBe('not_met');
    expect(c.sentence).toBe('60 days was conditional on a three-year term. This copy has 2 years, so the condition is not met.');
  });

  it('unknown when the copy has no term clause', () => {
    expect(conditionState(payment(), withTerm(null), deal)!.state).toBe('unknown');
  });

  it('the restore comment is supplier-safe', () => {
    const text = conditionalComment(payment(), deal)!;
    expect(text).toBe('Restored to the 60 days confirmed by email on 10 Nov for a three-year term.');
    expect(supplierSafetyReason(text)).toBeNull();
  });
});
