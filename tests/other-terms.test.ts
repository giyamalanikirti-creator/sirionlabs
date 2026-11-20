/** The extra scripted deals, playbook options and recommended moves. */
import { describe, expect, it } from 'vitest';
import { fuelSurchargeGap, markupGap } from '@/lib/engines/otherTerms';
import { BRIGHTSTAFF, DIESEL_BY_MONTH, SWIFTSHIP, scriptedAtRisk } from '@/lib/demo/moreDeals';
import { playbookOptions, playbookReview, recommendedMove, rowHeadlineShare } from '@/lib/engines/playbook';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { cloudDeskDeal, dealById, versionById } from '@/lib/data';
import { ledgerAtStep, stepOne, initialLedger } from '@/lib/demo/steps';
import { formatLakhPerYear } from '@/lib/format';
import { isSupplierSafe } from '@/lib/engines/wording';

describe('BrightStaff markup', () => {
  const gap = markupGap(8_500_000, 8, 10);
  it('8% → 10% on the rate card', () => {
    expect(gap.costLakhPerYr).toBeCloseTo(1.5740741, 5);
    expect(formatLakhPerYear(gap.costLakhPerYr)).toBe('₹1.6 lakh a year');
    expect(gap.perMonthInr).toBe(13117);
  });
});

describe('SwiftShip fuel surcharge', () => {
  const gap = fuelSurchargeGap(3_600_000, 0.5, 92, 88, DIESEL_BY_MONTH);
  it('threshold ₹92 → ₹88', () => {
    expect(gap.costLakhPerYr).toBeCloseTo(0.72, 6);
    expect(formatLakhPerYear(gap.costLakhPerYr)).toBe('₹72,000 a year');
  });
});

describe('one figure per deal', () => {
  it('the Deals list figure equals the scripted deal page figure', () => {
    for (const deal of [BRIGHTSTAFF, SWIFTSHIP]) {
      const listed = dealById(deal.dealId)!.display!.atRiskLakh;
      expect(listed).toBeCloseTo(Math.round(scriptedAtRisk(deal) * 10) / 10, 6);
    }
  });

  it('row shares add up to the CloudDesk headline at every step', () => {
    for (const step of [0, 1, 2, 3, 4] as const) {
      const rows = ledgerAtStep(step);
      const sum = rows.reduce((s, r) => s + (rowHeadlineShare(r, cloudDeskDeal) ?? 0), 0);
      expect(sum).toBeCloseTo(dealAtRisk(rows, cloudDeskDeal), 6);
    }
  });
});

describe('playbook', () => {
  it('IssueDetection review of v4 flags only clause 14.2', () => {
    const out = playbookReview(versionById('v4')!).filter((l) => !l.within);
    expect(out.map((l) => l.clauseNo)).toEqual(['14.2']);
  });

  it('price options are priced from the engine', () => {
    const row = initialLedger().find((r) => r.id === 'R-price')!;
    const opts = playbookOptions(row, cloudDeskDeal);
    expect(opts.map((o) => o.kind)).toEqual(['agreed', 'fallback', 'walk_away']);
    expect(opts[1].costText).toBe('₹92,000 a year');
    expect(opts[2].costText).toBe('₹1.7 lakh a year');
  });

  it('every flagged row after round 4 has a recommended move', () => {
    const rows = stepOne(initialLedger()).rows;
    const notice = rows.find((r) => r.id === 'R-notice')!;
    const move = recommendedMove(notice, cloudDeskDeal)!;
    expect(move.ask).toContain('30 days');
    expect(move.leverage).toMatch(/October/);
    expect(recommendedMove(rows.find((r) => r.id === 'R-term')!, cloudDeskDeal)).toBeNull();
  });

  it('a supplier-facing Word comment never carries the recommended move', () => {
    const rows = ledgerAtStep(4);
    for (const row of rows) expect(isSupplierSafe(row.supplierNote)).toBe(true);
  });
});
