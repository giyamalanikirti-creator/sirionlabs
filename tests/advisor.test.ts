/** "Ask Deal Ledger": answers come from the engines; the model may only reword them. */
import { describe, expect, it } from 'vitest';
import { answer, detectIntent, detectTerm, numbersIn } from '@/lib/engines/advisor';
import { cloudDeskDeal as deal } from '@/lib/data';
import { ledgerAtStep } from '@/lib/demo/steps';
import { isSupplierSafe } from '@/lib/engines/wording';

const rows = ledgerAtStep(1);

describe('Ask Deal Ledger', () => {
  it('reads the term and intent from a plain question', () => {
    expect(detectTerm('What should I put for renewal notice instead?')).toBe('renewal_notice');
    expect(detectIntent('What should I put for renewal notice instead?')).toBe('suggest');
    expect(detectIntent('Why is price worth so much?')).toBe('explain');
    expect(detectIntent('Draft wording I can send for payment terms')).toBe('wording');
    expect(detectIntent('What is agreed with CloudDesk?')).toBe('agreed');
  });

  it('suggests what to put instead, priced by the engine, with supplier-safe wording', () => {
    const a = answer('What should I put for renewal notice instead?', { rows, deal });
    expect(a.lines[0]).toContain('₹1.1 lakh a year (₹3.4 lakh at the next renewal)');
    expect(a.lines.join(' ')).toContain('Ask to restore 30 days');
    expect(a.options?.map((o) => o.label)).toEqual(['Agreed wording', 'Fallback', 'Walk-away']);
    expect(isSupplierSafe(a.wording!)).toBe(true);
  });

  it('hides fallbacks from business owners when the setting says so', () => {
    const a = answer('What should I put for renewal notice instead?', { rows, deal, viewer: 'owner', showFallbacks: false });
    expect(a.options?.map((o) => o.label)).toEqual(['Agreed wording']);
    expect(a.lines.join(' ')).not.toMatch(/has to give/);
  });

  it('the risk summary matches the headline everywhere else', () => {
    expect(answer('What’s at risk?', { rows, deal }).lines[0]).toBe('CloudDesk: ₹1.6 lakh a year if signed as is.');
  });

  it('a model reply is only allowed figures that are in the facts', () => {
    const a = answer('What should I put for renewal notice instead?', { rows, deal });
    const allowed = numbersIn(a.facts.join(' '));
    expect(numbersIn('It would cost ₹1.1 lakh a year.').every((n) => allowed.includes(n))).toBe(true);
    expect(numbersIn('It would cost ₹9.9 lakh a year.').every((n) => allowed.includes(n))).toBe(false);
  });
});
