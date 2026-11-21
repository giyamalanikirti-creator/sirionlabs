/** Review fix A2: a document that disagrees with itself is a finding, and after signing it is routed, not disputed. */
import { describe, expect, it } from 'vitest';
import { internalConflicts, precedenceClause } from '@/lib/engines/conflicts';
import { BRIGHTSTAFF_SIGNING_COPY } from '@/lib/demo/moreDeals';
import { versions, cloudDeskDeal } from '@/lib/data';
import { extractValue } from '@/lib/engines/diff';
import { checkInvoice } from '@/lib/engines/invoices';
import { FAST_FORWARD_INVOICE, handover } from '@/lib/engines/handover';
import { ledgerAtStep } from '@/lib/demo/steps';
import { readFileSync } from 'node:fs';

describe('internal conflicts', () => {
  it('BrightStaff v3 has exactly one: clause 6 (8%) against the Schedule 2 rate card (10%)', () => {
    const found = internalConflicts(BRIGHTSTAFF_SIGNING_COPY.clauses);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'internal_conflict', termKey: 'markup' });
    expect(found[0].clauses.map((c) => `${c.ref}: ${c.value}${c.unit}`)).toEqual(['Clause 6: 8%', 'Schedule 2, rate card: 10%']);
  });

  it('shows the order-of-precedence clause as text, for the contract owner to apply', () => {
    expect(precedenceClause(BRIGHTSTAFF_SIGNING_COPY)).toBe('Clause 1.4: “If the body of this Agreement conflicts with a Schedule, the body prevails.”');
    expect(precedenceClause({})).toBe('No order-of-precedence clause found');
  });

  it('no CloudDesk version disagrees with itself', () => {
    for (const v of versions) {
      const values = v.clauses.filter((c) => c.termKey).map((c) => {
        const x = extractValue(c);
        return { ref: c.no, termKey: c.termKey!, value: x ? Number(JSON.stringify(x).match(/\d+/)?.[0] ?? 0) : 0, unit: '', text: c.text };
      });
      expect(internalConflicts(values), v.id).toHaveLength(0);
    }
  });

  it('the BrightStaff invoice card routes to the contract owner, with no dispute', () => {
    const page = readFileSync('components/deal/OtherDealPage.tsx', 'utf8');
    const card = page.slice(page.indexOf('function BrightStaffConflict'));
    expect(card).toContain('Route to contract owner');
    expect(card).not.toMatch(/Raise a dispute|Dispute sent/);
  });

  it('CloudDesk keeps its billing discrepancy: ₹32,000 over the signed price in December', () => {
    const record = handover(ledgerAtStep(4).map((r) => ({ ...r, threats: r.threats.map((t) => ({ ...t, active: false })) })), versions.find((v) => v.id === 'v6')!, cloudDeskDeal);
    const flags = checkInvoice(FAST_FORWARD_INVOICE, record.rules);
    expect(flags.some((f) => f.kind === 'over_agreed_price')).toBe(true);
  });
});
