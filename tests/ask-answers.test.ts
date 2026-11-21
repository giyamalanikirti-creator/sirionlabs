/** AskSirion answers: engine figures only, the same as the Deal Ledger screens, clock-aware, permission-aware. */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
const { useDemo } = await import('@/lib/store');
const { toAskState } = await import('@/lib/ask/store');
afterAll(() => vi.unstubAllGlobals());

import { buildAnswer, portfolio, signingSummary } from '@/lib/ask/answer';
import { INTENTS } from '@/lib/ask/intents';
import { route } from '@/lib/ask/router';
import { scopeFor } from '@/lib/ask/scope';
import { cloudDeskDeal as deal, deals, versionById } from '@/lib/data';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { explainHeadline } from '@/lib/engines/explain';
import { signingCheck } from '@/lib/engines/signing';
import { listedAtRisk } from '@/lib/demo/moreDeals';
import { formatLakh } from '@/lib/format';
import type { AskScope, IntentId } from '@/lib/ask/types';

const sirionAll = scopeFor('/today', '');
const sirionDeal = scopeFor('/deals/D-CLOUDDESK', '');
const ananyaThread = scopeFor('/outlook/ananya', 'msg=M8');
const vikramThread = scopeFor('/outlook/vikram', 'msg=M13', ['T2']);
const word = scopeFor('/word/v6', '');

function ask(text: string, scope: AskScope, intent?: IntentId) {
  const r = route(text, scope);
  const id = intent ?? ('fallback' in r ? undefined : r.intent);
  if (!id) throw new Error(`no route for ${text}`);
  return buildAnswer(id, r.slots, scope, toAskState(), text);
}

function at(step: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
  useDemo.getState().reset();
  if (step === 0) return;
  if (step <= 4) {
    useDemo.getState().advanceTo(step);
    if (step === 4) useDemo.getState().runSigningCheck();
    return;
  }
  useDemo.getState().advanceTo(step);
}

describe('scopes by surface', () => {
  it('follow the brief §3.5', () => {
    expect(sirionAll).toMatchObject({ kind: 'all', persona: 'ananya', label: 'All contracts' });
    expect(sirionDeal).toMatchObject({ kind: 'deal', label: 'CloudDesk MSA' });
    expect(ananyaThread).toMatchObject({ kind: 'thread', threadId: 'T1', label: 'This email' });
    expect(vikramThread).toMatchObject({ kind: 'thread', persona: 'vikram', threadId: 'T2' });
    expect(word).toMatchObject({ kind: 'doc', versionId: 'v6', label: 'v6' });
  });
});

describe('figures match the Deal Ledger screens', () => {
  beforeEach(() => at(1));

  it('agreed_term: renewal notice shows the headline share, with the conflict between email and draft', () => {
    const a = ask('What was agreed on renewal notice?', ananyaThread);
    const line = explainHeadline(useDemo.getState().ledger, deal).lines.find((l) => l.label === 'Renewal notice')!;
    expect(a.figure?.text).toBe(`${formatLakh(line.shareLakh)} a year (expected)`);
    expect(a.figure?.text).toBe('₹1.1 lakh a year (expected)');
    expect(a.conflict?.join(' ')).toContain('the draft has not caught up');
  });

  it('agreed_term: at M8 the price is agreed and v4 says the same, so nothing is priced', () => {
    const a = ask('What did CloudDesk agree on price?', ananyaThread);
    expect(a.text[0]).toBe('CloudDesk agreed the annual price: fixed for 3 years. Rohan Iyer confirmed it on 14 Nov, 10:05.');
    expect(a.text[0]).toContain('14 Nov, 10:05');
    expect(a.text.join(' ')).toContain('The latest draft (v4) says the same.');
    expect(a.figure).toBeUndefined();
  });

  it('open_terms totals to the deal headline', () => {
    const a = ask('Which terms are still open?', sirionDeal);
    expect(a.figure?.text).toBe(`${formatLakh(dealAtRisk(useDemo.getState().ledger, deal))} a year (expected)`);
    expect(a.figure?.text).toBe('₹1.6 lakh a year (expected)');
  });

  it('same question, same figure in every scope', () => {
    const figures = [sirionDeal, ananyaThread, word].map((s) => ask('What was agreed on renewal notice?', s).figure?.text);
    expect(new Set(figures).size).toBe(1);
  });

  it('portfolio: same per-deal figures as the Deals list; CloudDesk live from the ledger', () => {
    const a = ask('Which live negotiations would cost the most if signed today?', sirionAll);
    const p = portfolio(toAskState());
    expect(a.chart!.rows.length).toBeGreaterThanOrEqual(5);
    for (const d of deals.filter((x) => !x.interactive)) {
      expect(a.chart!.rows.find((r) => r.label === d.supplier)?.valueText).toBe(formatLakh(listedAtRisk(d)));
    }
    expect(a.chart!.rows.find((r) => r.label === 'CloudDesk MSA')?.valueText).toBe('₹1.6 lakh');
    expect(a.chart!.total).toBe(`Total if every latest draft were signed today: ${formatLakh(p.totalLakh)} a year`);
  });
});

describe('clock', () => {
  it('before M8, price is still open and costs the headline share', () => {
    at(0);
    const a = ask('What did CloudDesk agree on price?', sirionDeal);
    expect(a.text[0]).toContain('not agreed yet');
    expect(a.figure?.text).toBe('₹3.9 lakh a year (expected)');
    expect(a.figure?.basis).toBe('Based on 9 of your contracts');
    expect(a.figure?.confidence).toBe('medium');
  });

  it('on 18 Nov Rohan asks again for a yearly revision: ₹3.9 lakh', () => {
    at(3);
    const a = ask('What did CloudDesk agree on price?', vikramThread);
    expect(a.text.join(' ')).toContain('asked again on 18 Nov');
    expect(a.figure?.text).toBe('₹3.9 lakh a year (expected)');
  });

  it('signing_match before 19 Nov says the copy has not arrived', () => {
    at(2);
    const a = ask('Does this copy match what we agreed?', word);
    expect(a.text[0]).toContain('hasn’t arrived yet (expected 19 Nov)');
  });

  it('signing_match on v6: ₹5.3 lakh, the same as the signing check', () => {
    at(4);
    const a = ask('Does this copy match what we agreed?', word);
    const sc = signingCheck(useDemo.getState().ledger, versionById('v6')!, deal);
    expect(a.figure?.text).toBe(`${formatLakh(sc.totalAtRiskLakh)} a year (expected)`);
    expect(a.figure?.text).toBe('₹5.3 lakh a year (expected)');
    expect(a.text[0]).toBe('3 agreed terms are not in this copy. Expected cost if signed as is: ₹5.3 lakh a year.');
    expect(a.text[1]).toBe('Price (₹3.9 lakh) · Renewal notice (₹1.1 lakh) · Payment terms (₹25,000). 4 terms match what was agreed.');
  });

  it('fixing a gap in Word takes it out of the figure', () => {
    at(4);
    useDemo.getState().insertWording('R-price');
    expect(formatLakh(signingSummary(toAskState()).totalLakh)).toBe('₹1.4 lakh');
  });

  it('after signing, CloudDesk leaves the portfolio chart for a footnote', () => {
    at(5);
    const a = ask('Which live negotiations would cost the most if signed today?', sirionAll);
    expect(a.chart!.rows.some((r) => r.label === 'CloudDesk MSA')).toBe(false);
    expect(a.chart!.footnote).toBe('CloudDesk MSA: signed · every agreed term in');
  });

  it('invoice_mismatch at step 6 traces invoice → clause → email', () => {
    at(6);
    const a = ask('Why doesn’t this invoice match?', sirionDeal);
    expect(a.text[0]).toContain('INV-CD-2712');
    expect(a.text[0]).toContain('Clause 9.1 of the signed contract fixes ₹5,00,000 a month, so it is ₹32,000 over.');
    expect(a.quotes[0].source.messageId).toBe('M8');
  });
});

describe('can I agree (Vikram)', () => {
  it('a 5% service credit: ₹50,000 a year, Ananya signs off', () => {
    at(3);
    const a = ask('Can I tell Rohan 99.5% uptime is fine?', vikramThread);
    expect(a.text[0]).toContain('Ananya’s position on service credit is 10% of the monthly fee below 99.5% uptime');
    expect(a.text[0]).toContain('CloudDesk is asking for 5%');
    expect(a.figure?.text).toBe('₹50,000 a year (expected)');
    expect(a.text.join(' ')).toContain('Ananya Rao’s sign-off');
    expect(a.actions[0]).toMatchObject({ label: 'Draft a note to Ananya' });
  });
});

describe('permissions', () => {
  it('before the side thread is linked, Vikram’s thread is metadata only', () => {
    at(1);
    const a = ask('Did anyone else talk to CloudDesk?', sirionDeal);
    expect(a.text.join(' ')).toContain('Body not read yet');
  });

  it('with Vikram’s mailbox off, it says so', () => {
    at(1);
    useDemo.setState((s) => ({ settings: { ...s.settings, mailboxes: { ...s.settings.mailboxes, vikram: false } } }));
    const a = ask('Did anyone else talk to CloudDesk?', sirionDeal);
    expect(a.text.join(' ')).toContain('Vikram’s mailbox isn’t connected');
  });

  it('Vikram sees his own thread and the deal, never Ananya’s other threads', () => {
    at(3);
    const a = ask('Did anyone else talk to CloudDesk?', vikramThread);
    const listed = a.list!.map((l) => l.label).join(' ');
    expect(listed).toContain('CloudDesk uptime in October');
    expect(listed).not.toMatch(/liability cap|3-year commitment|SwiftShip|Q3 spend/);
  });
});

describe('not found, fallback, and Deal Ledger credit', () => {
  beforeEach(() => at(1));

  it('a term that is not on the deal is not found, with suggestions', () => {
    const a = ask('What did CloudDesk agree on insurance?', sirionDeal);
    expect(a.intent).toBe('not_found');
    expect(a.text[0]).toBe('Not found in CloudDesk’s contract, emails or drafts.');
    expect(a.followUps.length).toBeGreaterThan(0);
  });

  it('every ledger-sourced answer carries the badge and an Open in Deal Ledger action', () => {
    for (const def of INTENTS.filter((i) => i.source === 'deal-ledger')) {
      const scope = def.scopes.includes('thread') ? ananyaThread : def.scopes.includes('doc') ? word : sirionAll;
      const a = buildAnswer(def.id, route(def.suggestion, scope).slots, scope, toAskState(), def.suggestion);
      expect(a.usesLedger, def.id).toBe(true);
      expect(a.actions.some((x) => x.ledger), def.id).toBe(true);
    }
  });

  it('repository answers are Sirion today and need no ledger', () => {
    for (const id of ['repo_search', 'contract_summary', 'clause_lookup'] as IntentId[]) {
      const a = ask(INTENTS.find((i) => i.id === id)!.suggestion, sirionDeal, id);
      expect(a.usesLedger, id).toBe(false);
      expect(a.source).toBe('repository');
    }
  });

  it('clause lookup finds the notice clause for termination', () => {
    const a = ask('What’s the termination notice in CloudDesk?', sirionDeal);
    expect(a.text[0]).toContain('Clause 14.2');
  });

  it('repo search finds contracts renewing this quarter from the seed', () => {
    const a = ask('Show software contracts renewing this quarter', sirionAll);
    expect(a.list!.length).toBeGreaterThan(0);
    expect(a.sources.find((c) => c.kind === 'count')?.label).toMatch(/^\d+ contracts? →$/);
  });
});
