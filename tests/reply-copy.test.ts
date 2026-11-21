/** Review fix A1: the reply with v5 is built from the ledger and never overclaims. */
import { describe, expect, it } from 'vitest';
import { roundReply } from '@/lib/engines/replyCopy';
import { cloudDeskDeal as deal, versionById } from '@/lib/data';
import { ledgerAtStep } from '@/lib/demo/steps';
import { supplierSafetyReason } from '@/lib/engines/wording';

const reply = (rows = ledgerAtStep(1)) =>
  roundReply({ rows, prev: versionById('v4')!, attached: versionById('v5')!, roundMessageId: 'M8', deal, greeting: 'Rohan', signOff: 'Ananya' });

describe('Respond to round reply', () => {
  it('confirms, restores and says what is still open', () => {
    const r = reply();
    expect(r.body).toContain('Thanks for confirming fixed pricing for the three years.');
    expect(r.body).toContain("I've restored 30 days' renewal notice in §14.2 in the attached v5");
    expect(r.body).toContain('Service credits are still open. We need a 10% service credit for any month below 99.5% uptime.');
    expect(r.changes).toEqual([expect.objectContaining({ clauseNo: '14.2', from: '90 days', to: '30 days', restored: true })]);
    expect(r.stillOpen.map((o) => o.termKey)).toEqual(['service_credit']);
  });

  it('never says everything else matches while a term is open', () => {
    const r = reply();
    expect(r.body).toMatch(/still open/);
    expect(r.body).not.toMatch(/everything else/i);
  });

  it('says everything else matches only when the engine shows it', () => {
    const rows = ledgerAtStep(1).map((row) => (row.termKey === 'service_credit' ? { ...row, state: 'agreed' as const } : row));
    const r = reply(rows);
    expect(r.allElseMatches).toBe(true);
    expect(r.body).toContain('Everything else in v4 matches what we agreed.');
  });

  it('is supplier-safe', () => {
    expect(supplierSafetyReason(reply().body)).toBeNull();
  });
});

describe('round summary (review fix C2)', async () => {
  const { roundSummary } = await import('@/lib/engines/replyCopy');
  it('one sentence for round 4', () => {
    const r = roundSummary({ rows: ledgerAtStep(1), prev: versionById('v3')!, next: versionById('v4')!, roundMessageId: 'M8', from: 'Rohan', deal });
    expect(r.text).toBe('Rohan confirmed fixed pricing. The attachment also changed renewal notice from 30 to 90 days.');
    expect(r.changedClauses).toEqual(['14.2']);
  });
});
