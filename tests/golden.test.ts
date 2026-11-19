/** BUILD_SPEC §8.10 — every golden number, to ±0.0005 lakh. */
import { describe, expect, it } from 'vitest';
import { priceChange, termCommitmentLakh } from '@/lib/engines/pricing';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { signingCheck } from '@/lib/engines/signing';
import { checkInvoice } from '@/lib/engines/invoices';
import { handover, FAST_FORWARD_INVOICE, termEnd } from '@/lib/engines/handover';
import { closeAllThreats } from '@/lib/engines/ledger';
import { cloudDeskDeal, deals, versionById } from '@/lib/data';
import {
  initialLedger,
  ledgerAtStep,
  stepOne,
  stepThree,
  stepTwoAfterLink,
  stepTwoBeforeLink,
  stepTwoConfirm,
} from '@/lib/demo/steps';
import { formatDateLong, formatInr, formatLakh, formatLakhPerYear } from '@/lib/format';
import { SMART_ALERT_MAX_CHARS, TAKE_ACTION_MAX_CHARS } from '@/lib/settings';
import { buildDialog, TAKE_ACTION_LABEL } from '@/lib/engines/sendDialog';

const deal = cloudDeskDeal;

const FIXED = { kind: 'price', wording: 'fixed' } as const;
const OPEN_YEARLY = { kind: 'price', wording: 'open_yearly', fromYear: 2 } as const;

describe('price', () => {
  const tag = priceChange(deal, FIXED, OPEN_YEARLY);

  it('fixed → yearly revision, average a year', () => {
    expect(tag.costLakhPerYr).toBeCloseTo(3.92192, 4);
    expect(formatLakhPerYear(tag.costLakhPerYr)).toBe('₹3.9 lakh a year');
  });

  it('fixed → yearly revision, over the term', () => {
    expect(tag.overTermLakh!).toBeCloseTo(11.76576, 4);
    expect(formatLakh(tag.overTermLakh!)).toBe('₹11.8 lakh');
  });

  it('year 2 and year 3 cost', () => {
    expect(tag.byYear![1]).toBeCloseTo(3.84, 4);
    expect(tag.byYear![2]).toBeCloseTo(7.92576, 4);
    expect(formatLakh(tag.byYear![1])).toBe('₹3.8 lakh');
    expect(formatLakh(tag.byYear![2])).toBe('₹7.9 lakh');
  });

  it('fixed → 5% cap from year 3 (the approved fallback)', () => {
    const t = priceChange(deal, FIXED, {
      kind: 'price',
      wording: 'capped',
      capPct: 5,
      fromYear: 3,
    });
    expect(t.costLakhPerYr!).toBeCloseTo(0.92, 4);
    expect(formatLakhPerYear(t.costLakhPerYr)).toBe('₹92,000 a year');
  });

  it('fixed → 3% cap from year 2', () => {
    const t = priceChange(deal, FIXED, {
      kind: 'price',
      wording: 'capped',
      capPct: 3,
      fromYear: 2,
    });
    expect(t.costLakhPerYr!).toBeCloseTo(1.6712352, 4);
    expect(formatLakhPerYear(t.costLakhPerYr)).toBe('₹1.7 lakh a year');
  });
});

describe('other terms', () => {
  it('payment 60 → 45 days', () => {
    const t = priceChange(deal, { kind: 'payment', days: 60 }, { kind: 'payment', days: 45 });
    expect(t.costLakhPerYr!).toBeCloseTo(0.2465753, 4);
    expect(formatLakhPerYear(t.costLakhPerYr)).toBe('₹25,000 a year');
  });

  it('renewal notice 30 → 90 days, and the exposure behind it', () => {
    const t = priceChange(
      deal,
      { kind: 'renewal_notice', days: 30 },
      { kind: 'renewal_notice', days: 90 },
    );
    expect(t.costLakhPerYr!).toBeCloseTo(3.42, 4);
    expect(t.exposureLakh!).toBeCloseTo(60, 4);
    expect(formatLakhPerYear(t.costLakhPerYr)).toBe('₹3.4 lakh a year');
    expect(formatLakh(t.exposureLakh!)).toBe('₹60 lakh');
  });

  it('service credit 10% → 5%', () => {
    const t = priceChange(
      deal,
      { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 },
      { kind: 'service_credit', pct: 5, uptimeTarget: 99.5 },
    );
    expect(t.costLakhPerYr!).toBeCloseTo(0.5, 4);
    expect(formatLakhPerYear(t.costLakhPerYr)).toBe('₹50,000 a year');
  });

  it('a 31–59 day notice window has no history, so no ₹ figure', () => {
    const t = priceChange(
      deal,
      { kind: 'renewal_notice', days: 30 },
      { kind: 'renewal_notice', days: 45 },
    );
    expect(t.costLakhPerYr).toBeNull();
    expect(t.proof[0]).toMatch(/Not enough history/);
  });

  it('term commitment', () => {
    expect(termCommitmentLakh(deal)).toBeCloseTo(180, 4);
    expect(formatLakh(termCommitmentLakh(deal))).toBe('₹1.8 crore');
  });
});

describe('at risk through the demo', () => {
  it('CloudDesk at the start (14 Nov 10:00)', () => {
    expect(dealAtRisk(initialLedger(), deal)).toBeCloseTo(4.42192, 4);
  });

  it('after moment 1 (round 4 read)', () => {
    const rows = stepOne(initialLedger()).rows;
    expect(dealAtRisk(rows, deal)).toBeCloseTo(3.92, 4);
  });

  it('after moment 2 (service credit confirmed at 10%)', () => {
    let rows = stepOne(initialLedger()).rows;
    rows = stepTwoBeforeLink(rows).rows;
    rows = stepTwoAfterLink(rows).rows;
    rows = stepTwoConfirm(rows);
    expect(dealAtRisk(rows, deal)).toBeCloseTo(3.42, 4);
  });

  it('after M13 arrives (new ask on price)', () => {
    const rows = stepThree(ledgerAtStep(2));
    expect(dealAtRisk(rows.rows, deal)).toBeCloseTo(7.34192, 4);
  });

  it('after signing, nothing is at risk', () => {
    const rows = closeAllThreats(ledgerAtStep(4), '2026-11-21T12:00:00+05:30');
    expect(dealAtRisk(rows, deal)).toBeCloseTo(0, 6);
  });

  it('all open deals at the start, and after CloudDesk signs', () => {
    const displayTotal = deals
      .filter((d) => !d.interactive)
      .reduce((s, d) => s + (d.display?.atRiskLakh ?? 0), 0);
    expect(displayTotal + dealAtRisk(initialLedger(), deal)).toBeCloseTo(25.82192, 4);
    expect(displayTotal).toBeCloseTo(21.4, 4);
  });
});

describe('signing check on v6', () => {
  const rows = ledgerAtStep(4);
  const v6 = versionById('v6')!;
  const result = signingCheck(rows, v6, deal);

  it('finds 3 gaps worth ₹7.6 lakh a year and 4 matches', () => {
    expect(result.gaps).toHaveLength(3);
    expect(result.matches).toHaveLength(4);
    expect(result.totalAtRiskLakh).toBeCloseTo(7.5884953, 4);
    expect(formatLakhPerYear(result.totalAtRiskLakh)).toBe('₹7.6 lakh a year');
  });

  it('sorts the gaps by rupees: price, renewal notice, payment', () => {
    expect(result.gaps.map((g) => g.termKey)).toEqual(['price', 'renewal_notice', 'payment']);
  });

  it('reads the deal ID out of the file', () => {
    expect(result.dealIdTag).toBe('DL-CLOUDDESK-2026');
  });

  it('carries the note that the CFO approval depends on the price', () => {
    expect(result.gaps[0].note).toMatch(/Neha Kapoor's approval \(12 Nov\)/);
  });
});

describe('handover and invoices', () => {
  const rows = ledgerAtStep(4);
  const record = handover(rows, versionById('v6')!, deal);

  it('ends the term on 30 Nov 2029', () => {
    expect(termEnd(deal)).toBe('2029-11-30');
  });

  it('sets the renewal deadline and reminder', () => {
    const ob = record.obligations.find((o) => o.clauseNo === '14.2')!;
    expect(ob.due).toBe('2029-10-31');
    expect(ob.reminder).toBe('2029-09-16');
    expect(formatDateLong(ob.due!)).toBe('31 Oct 2029');
    expect(formatDateLong(ob.reminder!)).toBe('16 Sep 2029');
  });

  it('fixes the monthly invoice at ₹5,00,000', () => {
    const rule = record.rules.find((r) => r.kind === 'fixed_monthly')!;
    expect(rule.amountInr).toBe(500000);
    expect(formatInr(rule.amountInr!)).toBe('₹5,00,000');
  });

  it('flags the Dec 2027 invoice as ₹32,000 over', () => {
    const flags = checkInvoice(FAST_FORWARD_INVOICE, record.rules);
    const over = flags.find((f) => f.kind === 'over_agreed_price')!;
    expect(over.overInr).toBe(32000);
    expect(formatInr(over.overInr!)).toBe('₹32,000');
    expect(over.clauseNo).toBe('9.1');
    expect(over.ledgerRowId).toBe('R-price');
  });
});

describe('Smart Alert limits', () => {
  const rows = ledgerAtStep(2);
  const dialog = buildDialog(rows, deal, 'price', {
    kind: 'price',
    wording: 'open_yearly',
    fromYear: 2,
  })!;

  it('the price message is within Microsoft\'s 500-character limit', () => {
    expect(dialog.plain.length).toBeLessThanOrEqual(SMART_ALERT_MAX_CHARS);
    expect(dialog.markdown.length).toBeLessThanOrEqual(SMART_ALERT_MAX_CHARS);
  });

  it('the Take Action label is 19 characters', () => {
    expect(TAKE_ACTION_LABEL).toBe('Loop in procurement');
    expect(TAKE_ACTION_LABEL.length).toBe(19);
    expect(TAKE_ACTION_LABEL.length).toBeLessThanOrEqual(TAKE_ACTION_MAX_CHARS);
  });

  it('names the figure, the source and the approver', () => {
    expect(dialog.plain).toContain('₹3.9 lakh a year');
    expect(dialog.plain).toContain('14 Nov');
    expect(dialog.plain).toContain('Neha Kapoor');
  });
});

describe('formatting', () => {
  it('shows Indian units', () => {
    expect(formatLakh(3.92192)).toBe('₹3.9 lakh');
    expect(formatLakh(0.2465753)).toBe('₹25,000');
    expect(formatLakh(180)).toBe('₹1.8 crore');
    expect(formatInr(532000)).toBe('₹5,32,000');
    expect(formatInr(500000)).toBe('₹5,00,000');
  });
});
