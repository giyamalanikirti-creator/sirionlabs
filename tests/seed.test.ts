/** BUILD_SPEC §7.1 — exact seed targets. */
import { describe, expect, it } from 'vitest';
import { contracts, invoices, renewals, serviceEvents } from '@/lib/engines/stats';
import { R_OPEN, CAP_RATIO, UNUSED_SHARE, RENEWAL_GROUPS } from '@/lib/engines/stats';
import { deals, messages, people, versions, ledgerInitial } from '@/lib/data';

const software = contracts.filter((c) => c.type === 'software');

function year2Rise(contractId: string): number {
  const rows = invoices
    .filter((i) => i.contractId === contractId)
    .sort((a, b) => a.month.localeCompare(b.month));
  return rows[12].unitPriceInr / rows[0].unitPriceInr - 1;
}

describe('contracts', () => {
  it('has 40 past contracts in the right mix', () => {
    expect(contracts).toHaveLength(40);
    const byType = (t: string) => contracts.filter((c) => c.type === t).length;
    expect(byType('software')).toBe(25);
    expect(byType('staffing')).toBe(5);
    expect(byType('logistics')).toBe(4);
    expect(byType('facilities')).toBe(3);
    expect(byType('consultants')).toBe(2);
    expect(byType('marketing')).toBe(1);
  });

  it('includes the named suppliers and CloudDesk as C-017', () => {
    const names = contracts.map((c) => c.supplier);
    for (const n of [
      'CloudDesk', 'Nimbus HR Cloud', 'SwiftShip Logistics', 'BrightStaff Services',
      'CleanCo Facilities', 'DataVault', 'CloudOps Suite', 'HelpHub',
    ]) {
      expect(names).toContain(n);
    }
    const cd = contracts.find((c) => c.id === 'C-017')!;
    expect(cd.supplier).toBe('CloudDesk');
    expect(cd.endDate).toBe('2026-11-30');
    expect(cd.annualFeeInr).toBe(6000000);
  });

  it('splits software price wordings 9 / 10 / 6', () => {
    const by = (w: string) => software.filter((c) => c.priceWording === w).length;
    expect(by('open_yearly')).toBe(9);
    expect(by('capped_5')).toBe(10);
    expect(by('fixed')).toBe(6);
  });
});

describe('observed price rises', () => {
  it('open yearly: the nine expected rises, mean 6.4%', () => {
    const rises = software
      .filter((c) => c.priceWording === 'open_yearly')
      .map((c) => Math.round(year2Rise(c.id) * 1000) / 1000)
      .sort((a, b) => a - b);
    expect(rises).toEqual([0.05, 0.055, 0.06, 0.06, 0.065, 0.065, 0.07, 0.07, 0.081]);
    expect(R_OPEN).toBeCloseTo(0.064, 5);
  });

  it('capped at 5%: six at 5% and four at 4%, mean 4.6%', () => {
    const rises = software
      .filter((c) => c.priceWording === 'capped_5')
      .map((c) => Math.round(year2Rise(c.id) * 1000) / 1000);
    expect(rises.filter((r) => r === 0.05)).toHaveLength(6);
    expect(rises.filter((r) => r === 0.04)).toHaveLength(4);
    expect(CAP_RATIO).toBeCloseTo(0.92, 5);
  });

  it('fixed: no rises at all', () => {
    const rises = software.filter((c) => c.priceWording === 'fixed').map((c) => year2Rise(c.id));
    expect(rises.every((r) => Math.abs(r) < 1e-9)).toBe(true);
  });

  it('has 24 monthly invoices for each of the 25 software contracts', () => {
    expect(invoices).toHaveLength(600);
    for (const c of software) {
      expect(invoices.filter((i) => i.contractId === c.id)).toHaveLength(24);
    }
  });
});

describe('renewals', () => {
  it('splits 12 long-notice and 10 short-notice renewals', () => {
    expect(renewals).toHaveLength(22);
    expect(RENEWAL_GROUPS.long).toEqual({ total: 12, unreviewed: 5 });
    expect(RENEWAL_GROUPS.short).toEqual({ total: 10, unreviewed: 1 });
    expect(RENEWAL_GROUPS.mid.total).toBe(0);
  });

  it('carries the six unused shares, mean 18%', () => {
    const shares = renewals
      .filter((r) => !r.reviewed)
      .map((r) => r.unusedShare!)
      .sort((a, b) => a - b);
    expect(shares).toEqual([0.12, 0.15, 0.18, 0.18, 0.21, 0.24]);
    expect(UNUSED_SHARE).toBeCloseTo(0.18, 6);
  });
});

describe('service events', () => {
  it('has 12 months with exactly two below 99.5%', () => {
    const cd = serviceEvents.filter((e) => e.contractId === 'C-017');
    expect(cd).toHaveLength(12);
    const below = cd.filter((e) => e.uptimePct < 99.5);
    expect(below).toHaveLength(2);
    expect(below.map((e) => e.month).sort()).toEqual(['2026-03', '2026-10']);
    expect(below.find((e) => e.month === '2026-03')!.uptimePct).toBe(99.31);
    expect(below.find((e) => e.month === '2026-10')!.uptimePct).toBe(99.12);
  });
});

describe('hand-written seed', () => {
  it('has the nine people and twelve deals', () => {
    expect(people).toHaveLength(9);
    expect(deals).toHaveLength(12);
    expect(deals.filter((d) => d.interactive)).toHaveLength(1);
  });

  it('display-only deals add up to ₹15.9 lakh a year at risk', () => {
    const total = deals
      .filter((d) => !d.interactive)
      .reduce((s, d) => s + (d.display?.atRiskLakh ?? 0), 0);
    expect(Math.round(total * 10) / 10).toBe(15.9);
  });

  it('has six versions, each a full agreement covering all seven tracked terms', () => {
    expect(versions).toHaveLength(6);
    for (const v of versions) {
      expect(v.clauses.length).toBeGreaterThanOrEqual(14);
      const keys = v.clauses.map((c) => c.termKey).filter(Boolean).sort();
      expect(keys).toEqual([
        'exit_support',
        'liability_cap',
        'payment',
        'price',
        'renewal_notice',
        'service_credit',
        'term',
      ]);
      // Clause numbers run in document order.
      const nums = v.clauses.map((c) => c.no.split('.').map(Number));
      for (let i = 1; i < nums.length; i++) {
        const [am, an] = nums[i - 1];
        const [bm, bn] = nums[i];
        expect(bm * 100 + bn).toBeGreaterThan(am * 100 + an);
      }
    }
  });

  it("does not declare v4's renewal-notice change as a tracked change", () => {
    const v4 = versions.find((v) => v.id === 'v4')!;
    expect(v4.declaredTrackedChanges).toEqual(['9.1']);
    expect(v4.declaredTrackedChanges).not.toContain('14.2');
    const clause = v4.clauses.find((c) => c.no === '14.2')!;
    expect(clause.text).toContain('90 (ninety)');
  });

  it('starts the ledger with seven rows, two of them open', () => {
    expect(ledgerInitial).toHaveLength(7);
    expect(ledgerInitial.filter((r) => r.state === 'open').map((r) => r.id).sort()).toEqual([
      'R-credit',
      'R-price',
    ]);
    expect(ledgerInitial.filter((r) => r.threats.some((t) => t.active))).toHaveLength(2);
  });

  it('quotes every source exactly from the message it names', () => {
    const byId = new Map(messages.map((m) => [m.id, m]));
    const check = (q: string, id?: string) => {
      if (!id) return;
      const m = byId.get(id);
      expect(m, `message ${id}`).toBeTruthy();
      expect(m!.body, `quote in ${id}`).toContain(q);
    };
    for (const row of ledgerInitial) {
      if (row.source.kind === 'email') check(row.source.quote, row.source.messageId);
      if (row.approvedBy?.source.kind === 'email') {
        check(row.approvedBy.source.quote, row.approvedBy.source.messageId);
      }
      for (const h of row.history) {
        if (h.source.kind === 'email') check(h.source.quote, h.source.messageId);
      }
    }
  });

  it('uses .example domains everywhere', () => {
    for (const p of people) expect(p.email).toMatch(/\.example$/);
    for (const m of messages) expect(m.from).toMatch(/\.example$/);
  });
});
