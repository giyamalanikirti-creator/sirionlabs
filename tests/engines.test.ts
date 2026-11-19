/** Engine behaviour that is not a golden number — BUILD_SPEC §8.3–§8.6, §9.2. */
import { describe, expect, it } from 'vitest';
import { diffVersions, extractValue, lastOwnVersion } from '@/lib/engines/diff';
import { versionById, versions, cloudDeskDeal, messages } from '@/lib/data';
import {
  applyReaderUpdates,
  applySentConcession,
  closeAllThreats,
  quoteFound,
  rowForTerm,
} from '@/lib/engines/ledger';
import { initialLedger, ledgerAtStep, stepOne, stepThree } from '@/lib/demo/steps';
import { checkByRules } from '@/lib/engines/sendRules';
import { rowAtRisk, countByState, needsAttention } from '@/lib/engines/atRisk';
import { OUR_PERSON_IDS, SUPPLIER_PERSON_IDS } from '@/lib/data';

const deal = cloudDeskDeal;
const opts = { supplierOrgPersonIds: SUPPLIER_PERSON_IDS, ourPersonIds: OUR_PERSON_IDS };

describe('clause parsing', () => {
  it('reads every tracked term back out of v6', () => {
    const v6 = versionById('v6')!;
    const values = Object.fromEntries(
      v6.clauses.filter((c) => c.termKey).map((c) => [c.termKey, extractValue(c)]),
    );
    expect(values.term).toEqual({ kind: 'term', years: 3 });
    expect(values.price).toEqual({ kind: 'price', wording: 'open_yearly', fromYear: 2 });
    expect(values.payment).toEqual({ kind: 'payment', days: 45 });
    expect(values.service_credit).toEqual({ kind: 'service_credit', pct: 10, uptimeTarget: 99.5 });
    expect(values.liability_cap).toEqual({ kind: 'liability_cap', months: 12 });
    expect(values.renewal_notice).toEqual({ kind: 'renewal_notice', days: 90 });
    expect(values.exit_support).toEqual({ kind: 'exit_support', days: 30, free: true });
  });

  it('reads a capped price wording', () => {
    const value = extractValue({
      no: '9.1',
      title: 'Fees',
      termKey: 'price',
      text: 'The Fees are INR 12,000 per Seat per year for 500 Seats (INR 60,00,000 per year). Supplier may revise the Fees once in each contract year from the start of contract year 3 by no more than 5 percent (5%).',
    });
    expect(value).toEqual({ kind: 'price', wording: 'capped', capPct: 5, fromYear: 3 });
  });
});

describe('version diff', () => {
  it('compares a supplier version with the last version we sent', () => {
    const v4 = versionById('v4')!;
    expect(lastOwnVersion(versions, v4.sentAt)!.id).toBe('v2');
  });

  it('finds only the hidden renewal-notice change between v2 and v4', () => {
    const changes = diffVersions(versionById('v2')!, versionById('v4')!);
    expect(changes).toHaveLength(1);
    expect(changes[0].clauseNo).toBe('14.2');
    expect(changes[0].termKey).toBe('renewal_notice');
    expect(changes[0].hidden).toBe(true);
  });

  it('marks a declared change as not hidden', () => {
    const changes = diffVersions(versionById('v2')!, versionById('v3')!);
    const price = changes.find((c) => c.clauseNo === '9.1')!;
    expect(price.hidden).toBe(false);
  });
});

describe('the state machine', () => {
  it('moves a row from open to agreed on a confident acceptance', () => {
    const rows = stepOne(initialLedger()).rows;
    const price = rowForTerm(rows, 'price')!;
    expect(price.state).toBe('agreed');
    expect(price.source.messageId).toBe('M8');
    expect(price.threats.filter((t) => t.active)).toHaveLength(0);
  });

  it('reopens an agreed row when a version changes the clause', () => {
    const rows = stepOne(initialLedger()).rows;
    const notice = rowForTerm(rows, 'renewal_notice')!;
    expect(notice.state).toBe('reopened');
    const threat = notice.threats.find((t) => t.active)!;
    expect(threat.kind).toBe('version_change');
    expect(threat.hidden).toBe(true);
    expect(rowAtRisk(notice, deal)).toBeCloseTo(3.42, 4);
  });

  it('keeps an agreed row agreed but flags a new ask', () => {
    const rows = stepThree(ledgerAtStep(2)).rows;
    const price = rowForTerm(rows, 'price')!;
    expect(price.state).toBe('agreed');
    expect(price.threats.some((t) => t.active && t.kind === 'new_ask')).toBe(true);
    expect(needsAttention(rows).map((r) => r.id)).toContain('R-price');
  });

  it('sends an ambiguous acceptance to a person instead of guessing', () => {
    const rows = ledgerAtStep(1);
    const after = applyReaderUpdates(
      rows,
      [
        {
          messageId: 'M12',
          termKey: 'service_credit',
          action: 'unclear',
          byPersonId: 'rohan',
          quote: 'On service credits, fine with that',
          confidence: 0.5,
          reason: 'two live offers',
        },
      ],
      messages,
      opts,
    );
    const credit = rowForTerm(after.rows, 'service_credit')!;
    expect(credit.state).toBe('needs_confirmation');
    expect(credit.pendingConfirmation!.quote).toBe('On service credits, fine with that');
  });

  it('records the ruled-out side offer when the lead confirms', () => {
    const rows = ledgerAtStep(2);
    const credit = rowForTerm(rows, 'service_credit')!;
    expect(credit.state).toBe('agreed');
    expect(credit.position).toEqual({ kind: 'service_credit', pct: 10, uptimeTarget: 99.5 });
    expect(credit.source.kind).toBe('call_note');
    expect(credit.history.some((h) => /side thread/i.test(h.text))).toBe(true);
    expect(credit.threats.filter((t) => t.active)).toHaveLength(0);
  });

  it('reopens an agreed row when our own side concedes by email', () => {
    const rows = applySentConcession(
      ledgerAtStep(3),
      'price',
      { kind: 'price', wording: 'open_yearly', fromYear: 2 },
      {
        kind: 'email',
        quote: 'Yearly price revision is fine with us.',
        at: '2026-11-18T11:00:00+05:30',
        byPersonId: 'vikram',
      },
    );
    const price = rowForTerm(rows, 'price')!;
    expect(price.state).toBe('reopened');
    expect(price.threats.some((t) => t.active && t.kind === 'sent_concession')).toBe(true);
  });

  it('never applies an update whose quote is not in the message', () => {
    const res = applyReaderUpdates(
      initialLedger(),
      [
        {
          messageId: 'M8',
          termKey: 'price',
          action: 'accepts',
          byPersonId: 'rohan',
          value: { kind: 'price', wording: 'fixed' },
          quote: 'we will also throw in free training',
          confidence: 0.99,
          reason: 'invented',
        },
      ],
      messages,
      opts,
    );
    expect(res.applied).toHaveLength(0);
    expect(res.dropped[0].reason).toMatch(/quote not found/);
    expect(rowForTerm(res.rows, 'price')!.state).toBe('open');
  });

  it('will not let our own side accept its own offer', () => {
    const res = applyReaderUpdates(
      initialLedger(),
      [
        {
          messageId: 'M7',
          termKey: 'service_credit',
          action: 'accepts',
          byPersonId: 'ananya',
          value: { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 },
          quote: 'we need 10% of the monthly fee',
          confidence: 0.99,
          reason: 'our own email',
        },
      ],
      messages,
      opts,
    );
    expect(res.applied).toHaveLength(0);
    expect(rowForTerm(res.rows, 'service_credit')!.state).toBe('open');
  });

  it('closes every threat at signing', () => {
    const rows = closeAllThreats(ledgerAtStep(4), '2026-11-21T12:00:00+05:30');
    expect(rows.every((r) => r.threats.every((t) => !t.active))).toBe(true);
    expect(rows.every((r) => r.state === 'agreed')).toBe(true);
  });

  it('normalises whitespace when checking a quote', () => {
    expect(quoteFound('fine  with\nthat', 'On service credits, fine with that.')).toBe(true);
    expect(quoteFound('fine with everything', 'On service credits, fine with that.')).toBe(false);
  });

  it('counts row states for the deals table', () => {
    expect(countByState(ledgerAtStep(0))).toEqual({ agreed: 5, open: 2, needs: 0, reopened: 0 });
    expect(countByState(ledgerAtStep(1))).toEqual({ agreed: 5, open: 1, needs: 0, reopened: 1 });
  });
});

describe('rules fallback for the send check', () => {
  const cases: [string, string | null, unknown][] = [
    ['Yearly price revision is fine with us.', 'price', { kind: 'price', wording: 'open_yearly', fromYear: 2 }],
    ['Sure, we can pay in 45 days.', 'payment', { kind: 'payment', days: 45 }],
    ["90 days' notice for renewal works for us.", 'renewal_notice', { kind: 'renewal_notice', days: 90 }],
    ['A 5% service credit is fine.', 'service_credit', { kind: 'service_credit', pct: 5, uptimeTarget: 99.5 }],
    ["Let's discuss pricing when Ananya is back.", null, undefined],
  ];

  for (const [sentence, termKey, value] of cases) {
    it(`${termKey ? 'warns on' : 'allows'} "${sentence}"`, () => {
      const r = checkByRules(sentence);
      if (termKey === null) {
        expect(r.concedes).toBe(false);
      } else {
        expect(r.concedes).toBe(true);
        expect(r.termKey).toBe(termKey);
        expect(r.value).toEqual(value);
      }
    });
  }

  it('reads a percentage as a cap on the price', () => {
    const r = checkByRules('We could live with a yearly increase capped at 4%.');
    expect(r.termKey).toBe('price');
    expect(r.value).toEqual({ kind: 'price', wording: 'capped', capPct: 4, fromYear: 2 });
  });

  it('treats net-45 as payment terms', () => {
    expect(checkByRules('Net 45 is fine.').value).toEqual({ kind: 'payment', days: 45 });
  });

  it('does not treat a refusal as a concession', () => {
    expect(checkByRules('We cannot accept a yearly price revision.').concedes).toBe(false);
  });
});
