/** Walkthrough brief, Part B: "Negotiation so far", built by code from the store at each step (B5, B6). */
import { beforeEach, describe, expect, it } from 'vitest';
import { setStep, useDemo, type StateKey } from './helpers/summaryStates';
import { buildNegotiationSummary, summaryText, type NegotiationSummary } from '@/lib/engines/negotiationSummary';
import { selectTermCounts } from '@/lib/engines/termStatus';
import { latestVersionId } from '@/lib/engines/headline';
import { cloudDeskDeal, versionById } from '@/lib/data';
import { FIXTURES, STEP_CLOCK } from '@/lib/demo/steps';

const build = (key: StateKey): NegotiationSummary => {
  const s = setStep(key);
  return buildNegotiationSummary(s, 'D-CLOUDDESK', s.clock, key === 'step5' ? 'handover' : 'deal');
};
const group = (x: NegotiationSummary, key: string) => x.groups.find((g) => g.key === key);
const terms = (x: NegotiationSummary, key: string) => group(x, key)?.terms.map((t) => t.text + (t.draftText ? ` · ${t.draftText}` : '')) ?? [];

/** The golden output at each step (B5). Generated from the fixtures; docs/negotiation-summary-states.md shows the same. */
const GOLDEN: Record<StateKey, { headline: string; counts: string; groups: Record<string, string[]>; notes?: Record<string, string[]> }> = {
  step1: {
    headline: 'Round 4 · last move: Rohan (CloudDesk), 14 Nov · latest version v4',
    counts: '7 tracked terms · 5 agreed and in v4 · 1 agreed, changed in v4 · 1 open',
    groups: {
      agreed_in: ['Term: 3 years', 'Annual price: fixed for 3 years', 'Payment terms: 60 days', "Liability cap: 12 months' fees", 'Exit support: 30 days, free'],
      agreed_differs: ['Renewal notice: 30 days · v4: 90 days'],
      open: ['Service credit: 10% below 99.5%'],
    },
  },
  step2: {
    headline: 'Round 5 · last move: Rohan (CloudDesk), 16 Nov · latest version v4',
    counts: '7 tracked terms · 5 agreed and in v4 · 1 agreed, changed in v4 · 1 open',
    groups: {
      agreed_in: ['Term: 3 years', 'Annual price: fixed for 3 years', 'Payment terms: 60 days', "Liability cap: 12 months' fees", 'Exit support: 30 days, free'],
      agreed_differs: ['Renewal notice: 30 days · v4: 90 days'],
      open: ['Service credit: 10% below 99.5%'],
    },
  },
  'step3-loop-in': {
    headline: 'Round 5 · last move: Rohan (CloudDesk), 16 Nov · latest version v4',
    counts: '7 tracked terms · 6 agreed and in v4 · 1 agreed, changed in v4',
    groups: {
      agreed_in: ['Term: 3 years', 'Annual price: fixed for 3 years', 'Payment terms: 60 days', 'Service credit: 10% below 99.5%', "Liability cap: 12 months' fees", 'Exit support: 30 days, free'],
      agreed_differs: ['Renewal notice: 30 days · v4: 90 days'],
    },
    notes: { waiting: ['Ananya: decision on annual price. Vikram looped Ananya in; the reply to Rohan is held until then.'] },
  },
  'step3-send-anyway': {
    headline: 'Round 5 · last move: Rohan (CloudDesk), 16 Nov · latest version v4',
    counts: '7 tracked terms · 6 agreed and in v4 · 1 agreed, changed in v4',
    groups: {
      agreed_in: ['Term: 3 years', 'Annual price: fixed for 3 years', 'Payment terms: 60 days', 'Service credit: 10% below 99.5%', "Liability cap: 12 months' fees", 'Exit support: 30 days, free'],
      agreed_differs: ['Renewal notice: 30 days · v4: 90 days'],
    },
    notes: {
      waiting: ['Neha: approval for annual price, requested by Vikram.'],
      exceptions: ['Vikram sent a reply that reopens annual price without sign-off. Reason: “Go-live depends on it”.'],
    },
  },
  step4: {
    headline: 'Round 6 · last move: Priya (CloudDesk), 19 Nov · latest version v6',
    counts: '7 tracked terms · 4 agreed and in v6 · 3 agreed, changed in v6',
    groups: {
      agreed_in: ['Term: 3 years', 'Service credit: 10% below 99.5%', "Liability cap: 12 months' fees", 'Exit support: 30 days, free'],
      agreed_differs: ['Annual price: fixed for 3 years · v6: yearly revision', 'Payment terms: 60 days · v6: 45 days', 'Renewal notice: 30 days · v6: 90 days'],
    },
  },
  step5: {
    headline: 'Round 6 · last move: Priya (CloudDesk), 19 Nov · latest version v7',
    counts: '7 tracked terms · 7 agreed and in v7',
    groups: {
      agreed_in: ['Term: 3 years', 'Annual price: fixed for 3 years', 'Payment terms: 60 days', 'Service credit: 10% below 99.5%', "Liability cap: 12 months' fees", 'Renewal notice: 30 days', 'Exit support: 30 days, free'],
    },
  },
};

const KEYS = Object.keys(GOLDEN) as StateKey[];

describe('negotiation so far: golden output at each step', () => {
  for (const key of KEYS) {
    it(key, () => {
      const x = build(key);
      const g = GOLDEN[key];
      expect(x.headline).toBe(g.headline);
      expect(x.countsLine).toBe(g.counts);
      expect(x.groups.filter((gr) => gr.terms.length).map((gr) => gr.key)).toEqual(Object.keys(g.groups));
      for (const [k, v] of Object.entries(g.groups)) expect(terms(x, k)).toEqual(v);
      expect(group(x, 'waiting')?.notes.map((n) => n.text) ?? []).toEqual(g.notes?.waiting ?? []);
      expect(group(x, 'exceptions')?.notes.map((n) => n.text) ?? []).toEqual(g.notes?.exceptions ?? []);
    });
  }

  it('step 2: service credit is open with both offers and an ambiguous supplier reply', () => {
    const credit = group(build('step2'), 'open')!.terms[0];
    expect(credit.sides?.map((s) => s.text)).toEqual(['Ananya asked 10% below 99.5% (13 Nov)', 'Vikram offered 5% below 99.5% (15 Nov)']);
    expect(credit.status).toBe('Supplier reply ambiguous');
    expect(credit.action).toMatchObject({ label: 'Draft clarification', kind: 'draft_clarification' });
  });

  it('step 4: the payment line shows its condition, met, and opens Word at §9.3', () => {
    const pay = group(build('step4'), 'agreed_differs')!.terms.find((t) => t.termKey === 'payment')!;
    expect(pay.condition).toEqual({ text: 'If Meridian signs for 3 years', state: 'met' });
    expect(pay.wordHref).toBe('/word/v6?from=sirion&clause=9.3');
  });

  it('handover mode: anything still open is listed as "Unresolved at signature"', () => {
    expect(build('step5').groups.map((g) => g.title)).toEqual(['Agreed and in v7']);
    const s = setStep('step2');
    const x = buildNegotiationSummary(s, 'D-CLOUDDESK', s.clock, 'handover');
    expect(x.groups.find((g) => g.key === 'open')?.title).toBe('Unresolved at signature');
    expect(x.countsLine).toBe('7 tracked terms · 5 agreed and in v4 · 1 agreed, changed in v4 · 1 unresolved');
  });

  it('round lines come from the same generator as the Outlook pane', () => {
    const r4 = build('step1').rounds.find((r) => r.no === 4)!;
    expect(r4.summary).toBe('Rohan confirmed fixed pricing. The attachment also changed renewal notice from 30 to 90 days.');
    expect(r4.href).toBe('/outlook/ananya?msg=M8');
  });
});

describe('negotiation so far: invariants', () => {
  beforeEach(() => useDemo.getState().advanceTo(0));

  for (const key of KEYS) {
    it(`${key}: counts equal selectTermCounts, each term sits in exactly one group, every line has a source`, () => {
      const s = setStep(key);
      const x = buildNegotiationSummary(s, 'D-CLOUDDESK', s.clock);
      const vid = latestVersionId(s);
      const version = vid === 'v7' ? s.signing.returnedCopy ?? s.signing.submittedCopy! : versionById(vid)!;
      expect(x.counts).toEqual(selectTermCounts(s.ledger, version, cloudDeskDeal));
      const ids = x.groups.flatMap((g) => g.terms.map((t) => t.rowId));
      expect(ids.sort()).toEqual(s.ledger.map((r) => r.id).sort());
      for (const t of x.groups.flatMap((g) => g.terms)) {
        expect(t.source.at).toBeTruthy();
        expect(t.source.byPersonId).toBeTruthy();
      }
    });

    it(`${key}: nothing after the demo clock, no ₹, no ambiguous term in an agreed group`, () => {
      const s = setStep(key);
      const x = buildNegotiationSummary(s, 'D-CLOUDDESK', s.clock);
      for (const r of x.rounds) expect(r.at <= s.clock).toBe(true);
      for (const g of x.groups) for (const n of g.notes) expect(n.at <= s.clock).toBe(true);
      for (const t of x.groups.flatMap((g) => g.terms)) expect(t.source.at <= s.clock).toBe(true);
      for (const line of summaryText(x)) expect(line).not.toMatch(/₹|lakh|crore/i);
      const ambiguous = s.ledger.filter((r) => r.state === 'needs_confirmation').map((r) => r.id);
      for (const g of x.groups.filter((gr) => gr.key.startsWith('agreed'))) for (const t of g.terms) expect(ambiguous).not.toContain(t.rowId);
    });
  }

  it('played through and skipped to a step give the same counts', () => {
    // Skipped: jump straight to step 2's end state.
    const skipped = setStep('step3-loop-in');
    const skippedCounts = buildNegotiationSummary(skipped, 'D-CLOUDDESK', skipped.clock).counts;
    // Played: step 1, read the side thread, link it, then Rohan's clarification, then round 3's email.
    const d = useDemo.getState();
    d.advanceTo(1);
    useDemo.getState().applyReader({ ...FIXTURES.M12, source: 'cached' }, { messageId: 'M12' });
    useDemo.getState().linkThread('T2');
    useDemo.getState().applyReader({ ...FIXTURES.T2, source: 'cached' }, {});
    useDemo.getState().setClock(STEP_CLOCK[2]);
    useDemo.getState().clarifyCredit();
    useDemo.getState().setClock(STEP_CLOCK[3]);
    useDemo.getState().applyReader({ ...FIXTURES.M13, source: 'cached' }, { messageId: 'M13' });
    const played = useDemo.getState();
    const x = buildNegotiationSummary(played, 'D-CLOUDDESK', played.clock);
    expect(x.counts).toEqual(skippedCounts);
    for (const t of x.groups.flatMap((g) => g.terms)) expect(t.source.at <= played.clock).toBe(true);
  });
});
