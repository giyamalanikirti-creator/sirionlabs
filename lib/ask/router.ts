/**
 * The cached router: no model, no key. Lowercase the question, score each
 * question type by its weighted patterns, pull out the slots, and fall back
 * below a threshold. A suggestion chip skips this (its intent is known).
 */
import { deals } from '@/lib/data';
import { CLAUSE_TOPICS, INTENTS, INTENT_BY_ID, TERM_SYNONYMS } from './intents';
import type { AskScope, IntentId, Routed, Slots } from './types';
import type { TermKey } from '@/lib/types';

export const ROUTE_THRESHOLD = 2;

/** Words that show the question is about contracts or deals at all. */
const DOMAIN = /\b(contracts?|deals?|clauses?|terms?|suppliers?|clouddesk|rohan|priya|ananya|vikram|price|pricing|renewal|notice|payment|credits?|uptime|sla|liability|invoices?|draft|copy|round|signing|sign|agreed?|negotiations?|portfolio|lakh|₹|msa|v\d|threads?|emails?)\b/;

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”"?!,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectTerm(text: string): TermKey | undefined {
  const q = normalise(text);
  // "notice to terminate" is a clause topic, not the renewal notice.
  if (/\bterminat/.test(q) && !/\brenew/.test(q)) return undefined;
  return TERM_SYNONYMS.find(([, re]) => re.test(q))?.[0];
}

export function extractSlots(text: string): Slots {
  const q = normalise(text);
  const slots: Slots = {};
  const term = detectTerm(text);
  if (term) slots.term = term;
  const value = q.match(/₹\s?[\d,.]+(?:\s?(?:lakh|crore))?|\b\d+(?:\.\d+)?\s?(?:%|percent|days?|months?|years?)|\b\d+\.\d+\b/);
  if (value) slots.value = value[0].trim();
  const round = q.match(/\bround (\d)\b/);
  if (round) slots.round = Number(round[1]);
  const topic = CLAUSE_TOPICS.find(([, re]) => re.test(q));
  if (topic) slots.topic = topic[0];
  const named = deals.find((d) => q.includes(d.supplier.toLowerCase().split(' ')[0]));
  if (named) slots.dealId = named.id;
  return slots;
}

export function scoreIntents(text: string): { id: IntentId; score: number }[] {
  const q = normalise(text);
  return INTENTS.map((def) => ({
    id: def.id,
    score: def.patterns.reduce((sum, [re, w]) => sum + (re.test(q) ? w : 0), 0),
  })).sort((a, b) => b.score - a.score);
}

/**
 * Route a typed question. `prev` is the last answer's intent and term, so a
 * short follow-up ("and renewal?") keeps the question type and swaps the term.
 */
export function route(text: string, scope: AskScope, prev?: { intent?: IntentId; term?: TermKey }): Routed {
  const q = normalise(text);
  const slots = extractSlots(text);
  if (!q) return { fallback: true, slots };

  // An exact suggestion skips scoring.
  const exact = INTENTS.find((i) => normalise(i.suggestion) === q);
  if (exact) return { intent: exact.id, slots, confidence: 1 };

  const [best, second] = scoreIntents(text);
  const followUp = prev?.intent && /^(and|what about|how about|same for|also)\b/.test(q);

  if (followUp && slots.term && best.score < ROUTE_THRESHOLD + 1) {
    return { intent: prev!.intent!, slots, confidence: 0.8 };
  }
  if (best.score < ROUTE_THRESHOLD || !DOMAIN.test(q)) {
    if (followUp && prev?.intent) return { intent: prev.intent, slots: { ...slots, term: slots.term ?? prev.term }, confidence: 0.6 };
    return { fallback: true, slots };
  }
  // Inherit the term for a follow-up that needs one.
  if (!slots.term && prev?.term && (INTENT_BY_ID[best.id].needsTerm || followUp)) slots.term = prev.term;
  const confidence = Math.min(1, best.score / 5) - (second && second.score === best.score ? 0.1 : 0);
  void scope;
  return { intent: best.id, slots, confidence };
}
