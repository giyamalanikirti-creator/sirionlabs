/** Deal Ledger in Word: the ledger lens, the edit guard and round compare with email context. */
import { describe, expect, it } from 'vitest';
import { compareWithEmail, guardClauseEdit, lensForVersion } from '@/lib/engines/wordLens';
import { cloudDeskDeal as deal, versionById } from '@/lib/data';
import { ledgerAtStep } from '@/lib/demo/steps';
import { agreedWording, isSupplierSafe } from '@/lib/engines/wording';
import { formatLakh } from '@/lib/format';

describe('ledger lens', () => {
  it('v4: only clause 14.2 differs, at the pane figure', () => {
    const lens = lensForVersion(versionById('v4')!, ledgerAtStep(1), deal);
    const differs = lens.filter((l) => l.status === 'differs');
    expect(differs.map((l) => l.clauseNo)).toEqual(['14.2']);
    expect(formatLakh(differs[0].costLakhPerYr)).toBe('₹1.1 lakh');
  });

  it('v6: the three signing gaps, adding up to the signing check figure', () => {
    const differs = lensForVersion(versionById('v6')!, ledgerAtStep(3), deal).filter((l) => l.status === 'differs');
    expect(differs.map((l) => l.clauseNo).sort()).toEqual(['14.2', '9.1', '9.3']);
    expect(differs.reduce((s, l) => s + (l.costLakhPerYr ?? 0), 0)).toBeCloseTo(5.3084953, 4);
  });
});

describe('edit guard', () => {
  const clause = versionById('v5')!.clauses.find((c) => c.no === '14.2')!;
  const rows = ledgerAtStep(3);

  it('catches an edit typed in plain words', () => {
    const g = guardClauseEdit(clause, 'Either party may end renewal with 90 days notice.', rows, deal)!;
    expect(g.status).toBe('differs');
    expect(g.docPlain).toBe('90 days');
    expect(g.source).toContain('v3, clause 14.2');
  });

  it('accepts the agreed wording', () => {
    const g = guardClauseEdit(clause, agreedWording('renewal_notice', { kind: 'renewal_notice', days: 30 }), rows, deal)!;
    expect(g.status).toBe('matches');
  });

  it('an edit better for us than agreed is not flagged', () => {
    const pay = versionById('v5')!.clauses.find((c) => c.termKey === 'payment')!;
    expect(guardClauseEdit(pay, agreedWording('payment', { kind: 'payment', days: 75 }), rows, deal)!.status).toBe('matches');
  });

  it('the comment inserted with the agreed wording is supplier-safe', () => {
    for (const row of rows) expect(isSupplierSafe(row.supplierNote)).toBe(true);
  });
});

describe('compare with email context', () => {
  it('v2 → v4: 14.2 changed, not mentioned in Rohan’s email, not a tracked change', () => {
    const changes = compareWithEmail(versionById('v2')!, versionById('v4')!, ledgerAtStep(1), deal);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ clauseNo: '14.2', tag: 'not mentioned in email', hidden: true, vsLedger: 'differs' });
  });

  it('v3 → v4: the price change is tagged as discussed in the email that carried v4', () => {
    const price = compareWithEmail(versionById('v3')!, versionById('v4')!, ledgerAtStep(1), deal).find((c) => c.termKey === 'price')!;
    expect(price.tag).toBe('discussed in email');
    expect(price.email?.quote).toContain('hold the price');
  });
});
