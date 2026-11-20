/**
 * The rules reader behind "Try your own email": works on any pasted email,
 * with no model and no key. Every term carries a confidence; anything below
 * the reader threshold goes to "Needs confirming" instead of the ledger.
 * Email text is data: nothing in it is followed as an instruction.
 */
import type { TermKey } from '@/lib/types';
import { readSentences } from './sendGuard';
import { plainValue, TERM_LABELS } from '@/lib/plain';
import { READER_CONFIDENCE_MIN } from '@/lib/settings';

export type PreviewKind = 'agreement' | 'conditional offer' | 'ask' | 'refusal' | 'unclear';

export interface PreviewTerm {
  termKey: TermKey;
  term: string;
  value: string;
  quote: string;
  kind: PreviewKind;
  condition?: string;
  confidence: number;
  needsConfirming: boolean;
  why: string;
}

const ACCEPT = /\b(agree|agreed|accept|accepted|fine|ok|okay|works|confirm|confirmed|happy with|can hold|we can|sounds good|go with)\b/i;
const ASK = /\?|\b(could we|can you|would you|we need|we would like|we'd like|please|request)\b/i;
const CONDITION = /\b(if|provided|subject to|as long as|on condition)\b(.*)$/i;

const KEYWORDS: [TermKey, RegExp][] = [
  ['service_credit', /\b(service credits?|credits?|sla|uptime)\b/i],
  ['price', /\b(price|pricing|fees?)\b/i],
  ['payment', /\b(payment|pay|invoice)\b/i],
  ['renewal_notice', /\b(notice|renewal)\b/i],
  ['liability_cap', /\bliabilit/i],
  ['exit_support', /\bexit\b/i],
  ['term', /\b(term|years?)\b/i],
];

export function readByRules(email: string): PreviewTerm[] {
  const out: PreviewTerm[] = [];
  for (const { sentence, claims, deferral, negation } of readSentences(email.slice(0, 2500))) {
    if (deferral) continue;
    const cond = sentence.match(CONDITION);
    if (claims.length) {
      for (const c of claims) {
        let kind: PreviewKind;
        let confidence: number;
        let why: string;
        if (negation) {
          kind = 'refusal';
          confidence = 0.8;
          why = 'The sentence says no, so nothing is agreed.';
        } else if (cond) {
          kind = 'conditional offer';
          confidence = 0.7;
          why = 'An offer with a condition: agreed only once the condition is met.';
        } else if (ASK.test(sentence)) {
          kind = 'ask';
          confidence = 0.85;
          why = 'A request, not an agreement. It becomes an open ask on the row.';
        } else if (ACCEPT.test(sentence)) {
          kind = 'agreement';
          confidence = 0.88;
          why = 'A clear yes with a value.';
        } else {
          kind = 'unclear';
          confidence = 0.55;
          why = 'A value is stated, but not whether it is agreed.';
        }
        out.push({
          termKey: c.termKey,
          term: TERM_LABELS[c.termKey],
          value: plainValue(c.value),
          quote: sentence,
          kind,
          condition: cond ? cond[0].trim() : undefined,
          confidence,
          needsConfirming: kind === 'agreement' || kind === 'conditional offer' || kind === 'unclear' ? confidence < READER_CONFIDENCE_MIN : false,
          why,
        });
      }
      continue;
    }
    // A yes with no value ("On service credits, fine with that"): which offer does it accept?
    if (ACCEPT.test(sentence) && !negation) {
      const hit = KEYWORDS.find(([, re]) => re.test(sentence));
      if (hit) {
        out.push({
          termKey: hit[0],
          term: TERM_LABELS[hit[0]],
          value: 'Not stated',
          quote: sentence,
          kind: 'unclear',
          confidence: 0.4,
          needsConfirming: true,
          why: 'A yes with no value. If more than one offer is open, it could mean either.',
        });
      }
    }
  }
  return out;
}
