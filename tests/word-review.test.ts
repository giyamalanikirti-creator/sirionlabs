/** Deal Ledger for Word: the Review list, peer thresholds, the explainer copy and supplier safety. */
import { describe, expect, it } from 'vitest';
import { reviewIssues } from '@/lib/engines/wordLens';
import { cellShown, peerCells, peerChange, PEER_MIN_COMPANIES, PEER_MIN_CONTRACTS, type PeerCell } from '@/lib/engines/peers';
import { explainHeadline, COST_RULE } from '@/lib/engines/explain';
import { askSupplierDraft, isSupplierSafe } from '@/lib/engines/wording';
import { cloudDeskDeal as deal, versionById } from '@/lib/data';
import { initialLedger, ledgerAtStep } from '@/lib/demo/steps';
import { plainValue } from '@/lib/plain';

describe('Review list', () => {
  it('v6: three priced gaps, largest first, then the playbook-only items', () => {
    const { issues } = reviewIssues(versionById('v6')!, ledgerAtStep(3), deal);
    const priced = issues.filter((i) => i.costLakhPerYr !== null);
    expect(priced.map((i) => i.label)).toEqual(['Annual price', 'Renewal notice', 'Payment terms']);
    expect(priced.reduce((s, i) => s + i.costLakhPerYr!, 0)).toBeCloseTo(5.3084953, 4);
    for (let i = 1; i < issues.length; i++) {
      expect((issues[i - 1].costLakhPerYr ?? -1) >= (issues[i].costLakhPerYr ?? -1)).toBe(true);
    }
  });

  it('a clause flagged by both the playbook and the ledger is one card with both badges', () => {
    const { issues } = reviewIssues(versionById('v4')!, ledgerAtStep(1), deal);
    const notice = issues.find((i) => i.clauseNo === '14.2')!;
    expect(notice.sources).toEqual(['playbook', 'email']);
  });

  it('peer lines sit on the card but never change the card figure', () => {
    const { issues } = reviewIssues(versionById('v6')!, ledgerAtStep(3), deal);
    const price = issues.find((i) => i.label === 'Annual price')!;
    expect(price.peer?.sample).toBe(true);
    expect(price.peer?.primary).toBe('own');
    expect(price.costLakhPerYr!).toBeCloseTo(3.92192, 4);
  });
});

describe('peer privacy thresholds', () => {
  const base: PeerCell = { termKey: 'price', category: 'software', wording: 'x', companies: 5, contracts: 20, period: '2024 to 2026', median: 0.05, sample: true };
  it(`shows a cell only with ≥ ${PEER_MIN_COMPANIES} companies and ≥ ${PEER_MIN_CONTRACTS} contracts`, () => {
    expect(cellShown(base)).toBe(true);
    expect(cellShown({ ...base, companies: 4 })).toBe(false);
    expect(cellShown({ ...base, contracts: 19 })).toBe(false);
  });
  it('the sample payment cell is below the thresholds, so payment has no peer line', () => {
    expect(cellShown(peerCells.find((c) => c.termKey === 'payment'))).toBe(false);
    expect(peerChange(deal, { kind: 'payment', days: 60 }, { kind: 'payment', days: 45 })).toBeNull();
  });
  it('every cell is marked sample data', () => {
    for (const c of peerCells) expect(c.sample).toBe(true);
  });
  it('peer becomes primary only when own data is thin', () => {
    const open = { kind: 'price', wording: 'open_yearly', fromYear: 2 } as const;
    expect(peerChange(deal, { kind: 'price', wording: 'fixed' }, open, { n: 3, costLakhPerYr: 3.9 })!.primary).toBe('peer');
    expect(peerChange(deal, { kind: 'price', wording: 'fixed' }, open, { n: 9, costLakhPerYr: 3.9 })!.primary).toBe('own');
  });
});

describe('headline explainer copy (14 Nov, 10:00)', () => {
  const x = explainHeadline(initialLedger(), deal);
  it('says who wants what, then the total and what is not priced', () => {
    expect(x.lines[0].summary).toBe('CloudDesk is still asking for yearly revision; you want fixed for 3 years.');
    expect(x.lines[1].summary).toBe('CloudDesk is still asking for 5% below 99.5%; you want 10% below 99.5%.');
    expect(x.totalText).toBe('Total ₹4.4 lakh a year, averaged over the 3-year term.');
    expect(x.notPriced).toEqual(['liability cap (Legal-owned)']);
    expect(COST_RULE[0]).toMatch(/^Expected cost = /);
  });
});

describe('supplier-facing text from Word', () => {
  it('"Ask the supplier" drafts are supplier-safe and carry no peer data', () => {
    for (const row of ledgerAtStep(4)) {
      const draft = askSupplierDraft({
        greetingName: 'Priya',
        clauseNo: '9.1',
        fileName: 'CloudDesk_MSA_v6.docx',
        docPlain: 'Yearly revision',
        agreedPlain: plainValue(row.position),
        agreedWhen: 'by email on 14 Nov',
      });
      expect(isSupplierSafe(draft), draft).toBe(true);
      expect(draft).not.toMatch(/other companies|median|benchmark|sample data/i);
    }
  });
  it('supplier notes never carry peer text', () => {
    for (const row of ledgerAtStep(4)) expect(row.supplierNote).not.toMatch(/other companies|median|benchmark/i);
  });
});
