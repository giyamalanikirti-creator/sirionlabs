/** AskSirion's cached router: every suggestion and paraphrase routes to its question type. */
import { describe, expect, it } from 'vitest';
import { INTENTS } from '@/lib/ask/intents';
import { extractSlots, route } from '@/lib/ask/router';
import type { AskScope } from '@/lib/ask/types';

const scope: AskScope = { kind: 'deal', surface: 'sirion', persona: 'ananya', dealId: 'D-CLOUDDESK', label: 'CloudDesk MSA' };
const intentOf = (text: string) => {
  const r = route(text, scope);
  return 'fallback' in r ? 'fallback' : r.intent;
};

describe('AskSirion router', () => {
  it.each(INTENTS.map((i) => [i.id, i.suggestion]))('%s: its suggestion routes to it', (id, text) => {
    expect(intentOf(text)).toBe(id);
  });

  it.each(INTENTS.flatMap((i) => i.phrasings.map((p) => [i.id, p])))('%s: “%s”', (id, text) => {
    expect(intentOf(text)).toBe(id);
  });

  it('every type has at least three paraphrases', () => {
    for (const i of INTENTS) expect(i.phrasings.length).toBeGreaterThanOrEqual(3);
  });

  it('pulls out the term, the value and the round', () => {
    expect(extractSlots('Can I tell Rohan 99.5% uptime is fine?')).toMatchObject({ term: 'service_credit', value: '99.5%' });
    expect(extractSlots('What changed in Rohan’s round 4?').round).toBe(4);
    expect(extractSlots('Is 90 days notice ok?')).toMatchObject({ term: 'renewal_notice', value: '90 days' });
    expect(extractSlots('How is ₹3.9 lakh worked out?').value).toBe('₹3.9 lakh');
    expect(extractSlots('What’s the termination notice in CloudDesk?')).toMatchObject({ topic: 'termination', dealId: 'D-CLOUDDESK' });
    expect(extractSlots('What’s the termination notice in CloudDesk?').term).toBeUndefined();
  });

  it('negotiation summary questions route to negotiation_summary (walkthrough brief B6)', () => {
    for (const q of ['summarise the negotiation', 'where are we with CloudDesk', 'negotiation so far', 'Summarise the CloudDesk negotiation so far']) {
      expect(intentOf(q)).toBe('negotiation_summary');
    }
    expect(intentOf('Summarise the CloudDesk MSA')).toBe('contract_summary');
  });

  it('off-topic questions get the fallback', () => {
    expect(intentOf('What is the weather in Pune?')).toBe('fallback');
    expect(intentOf('Tell me a joke')).toBe('fallback');
    expect(intentOf('')).toBe('fallback');
  });

  it('a follow-up keeps the question type and swaps the term', () => {
    const r = route('and renewal?', scope, { intent: 'agreed_term', term: 'price' });
    expect(r).toMatchObject({ intent: 'agreed_term', slots: { term: 'renewal_notice' } });
  });
});
