/** BUILD_SPEC §8.7 — the signing check on the v6 copy. */
import { describe, expect, it } from 'vitest';
import { signingCheck, supplierReturn } from '@/lib/engines/signing';
import { cloudDeskDeal, versionById } from '@/lib/data';
import { ledgerAtStep } from '@/lib/demo/steps';
import { insertWordingForRow, markSigningGaps, waiveGapForRow } from '@/lib/engines/ledger';
import { agreedWording } from '@/lib/engines/wording';
import { extractValue } from '@/lib/engines/diff';
import { formatLakhPerYear } from '@/lib/format';

const deal = cloudDeskDeal;
const v6 = versionById('v6')!;
const rows = ledgerAtStep(4);
const result = signingCheck(rows, v6, deal);

describe('what the signing copy is missing', () => {
  it('finds three gaps and four matches', () => {
    expect(result.gaps.map((g) => g.termKey)).toEqual(['price', 'renewal_notice', 'payment']);
    expect(result.matches.map((m) => m.termKey).sort()).toEqual([
      'exit_support',
      'liability_cap',
      'service_credit',
      'term',
    ]);
  });

  it('prices each gap from the agreed position', () => {
    const [price, notice, payment] = result.gaps;
    expect(formatLakhPerYear(price.costLakhPerYr)).toBe('₹3.9 lakh a year');
    expect(notice.priceTag.proof.join(' ')).toContain('₹3.4 lakh expected at the next renewal');
    expect(formatLakhPerYear(payment.costLakhPerYr)).toBe('₹25,000 a year');
  });

  it('shows what each clause says against what we agreed', () => {
    const price = result.gaps[0];
    expect(price.agreedPlain).toBe('Fixed for 3 years');
    expect(price.docPlain).toBe('Yearly revision');
    expect(price.clauseNo).toBe('9.1');
    expect(price.clauseText).toContain('may revise the Fees once in each contract year');
  });

  it('carries the history note for each gap', () => {
    expect(result.gaps[1].note).toBe(
      'CloudDesk now requires us to give notice 60 days earlier than agreed.',
    );
    expect(result.gaps[2].note).toBe('Traded for the 3-year term (10 Nov)');
  });

  it('nothing is waiting on a person when the credit was confirmed', () => {
    expect(result.needsConfirmation).toHaveLength(0);
  });

  it('reports a row still waiting on a person when it was skipped', () => {
    const skipped = ledgerAtStep(1).map((r) =>
      r.id === 'R-credit' ? { ...r, state: 'needs_confirmation' as const } : r,
    );
    const r = signingCheck(skipped, v6, deal);
    expect(r.needsConfirmation).toEqual([{ rowId: 'R-credit', label: 'Service credit' }]);
  });
});

describe('fixing the gaps', () => {
  const marked = markSigningGaps(
    rows,
    result.gaps.map((g) => ({
      rowId: g.rowId,
      value: extractValue(v6.clauses.find((c) => c.no === g.clauseNo)!)!,
      clauseNo: g.clauseNo,
      versionId: v6.id,
    })),
    result.matches.map((m) => m.rowId),
  );

  it('marks the three rows as missing at signing', () => {
    const missing = marked.filter((r) => r.state === 'missing_at_signing');
    expect(missing.map((r) => r.id).sort()).toEqual(['R-notice', 'R-payment', 'R-price']);
  });

  it('counts proposed edits only after verifying the returned file', () => {
    let next = marked;
    for (const gap of result.gaps) {
      next = insertWordingForRow(next, gap.rowId, '2026-11-19T10:00:00+05:30');
    }
    expect(next.filter((r) => r.signing === 'inserted')).toHaveLength(3);
    expect(signingCheck(next, v6, deal).matches).toHaveLength(4);
    const returned = supplierReturn(v6, next, '2026-11-21T12:00:00+05:30');
    expect(signingCheck(next, returned, deal).matches).toHaveLength(7);
  });

  it('waiving a gap needs a reason and records it', () => {
    const next = waiveGapForRow(marked, 'R-payment', 'Finance is fine with 45 days this year', '2026-11-19T10:00:00+05:30');
    const row = next.find((r) => r.id === 'R-payment')!;
    expect(row.signing).toBe('waived');
    expect(row.waiveReason).toBe('Finance is fine with 45 days this year');
  });

  it('the wording we insert is exactly the agreed position', () => {
    const price = rows.find((r) => r.id === 'R-price')!;
    const text = agreedWording('price', price.position);
    expect(text).toContain('are fixed for the Initial Term');
    const parsed = extractValue({ no: '9.1', title: 'Fees', text, termKey: 'price' });
    expect(parsed).toEqual(price.position);
  });
});
