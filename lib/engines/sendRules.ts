/**
 * Rules fallback for the send check — BUILD_SPEC §9.2.
 * Used when DEMO_MODE=cached, when there is no API key, and on any error or
 * timeout. The pane then reads "Checked by rules (AI off)".
 */
import type { TermKey, TermValue } from '@/lib/types';

export interface RulesMatch {
  concedes: boolean;
  termKey?: TermKey;
  value?: TermValue;
  quote?: string;
  confidence: number;
}

const DEFERRAL =
  /\b(not|can't|cannot|won't|won t|do not|doesn't|discuss|check|loop|revert|get back|later|revisit|hold off|come back to)\b/i;

/** Is a keyword within `window` characters of this position? */
function near(text: string, at: number, keywords: RegExp, window = 40): boolean {
  const slice = text.slice(Math.max(0, at - window), Math.min(text.length, at + window));
  return keywords.test(slice);
}

function sentenceAround(text: string, at: number): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  let cursor = 0;
  for (const p of parts) {
    const end = cursor + p.length;
    if (at >= cursor && at <= end + 1) return p.trim();
    cursor = end + 1;
  }
  return text.trim();
}

export function checkByRules(body: string): RulesMatch {
  const text = body.trim();
  if (!text) return { concedes: false, confidence: 0 };
  if (DEFERRAL.test(text)) return { concedes: false, confidence: 0.9 };

  /* ---- Price ---- */
  const priceHit =
    text.match(/\b(price|pricing|fee|fees|rate|rates)\b[^.!?]{0,60}\b(revis|increase|review|hike|escalat)/i) ??
    text.match(/\b(revis|increase|review|hike|escalat)[^.!?]{0,60}\b(price|pricing|fee|fees|rate|rates)\b/i) ??
    text.match(/\b(yearly|annual|annually|each year|every year)\b[^.!?]{0,60}\b(increase|revision|review|revis)/i) ??
    text.match(/\b(increase|revision|review)\b[^.!?]{0,60}\b(yearly|annual|annually|each year|every year)\b/i);

  if (priceHit) {
    const at = priceHit.index ?? 0;
    const pct = text.match(/(\d+(?:\.\d+)?)\s*(?:%|per ?cent)/i);
    const value: TermValue = pct
      ? { kind: 'price', wording: 'capped', capPct: Number(pct[1]), fromYear: 2 }
      : { kind: 'price', wording: 'open_yearly', fromYear: 2 };
    return {
      concedes: true,
      termKey: 'price',
      value,
      quote: sentenceAround(text, at),
      confidence: 0.8,
    };
  }

  /* ---- Payment ---- */
  const netMatch = text.match(/\bnet[ -]?(\d+)\b/i);
  if (netMatch) {
    return {
      concedes: true,
      termKey: 'payment',
      value: { kind: 'payment', days: Number(netMatch[1]) },
      quote: sentenceAround(text, netMatch.index ?? 0),
      confidence: 0.8,
    };
  }
  for (const m of text.matchAll(/(\d+)\s*(?:\(\w+\)\s*)?days?/gi)) {
    const at = m.index ?? 0;
    if (near(text, at, /\b(pay|payment|invoice|terms)\b/i)) {
      return {
        concedes: true,
        termKey: 'payment',
        value: { kind: 'payment', days: Number(m[1]) },
        quote: sentenceAround(text, at),
        confidence: 0.8,
      };
    }
  }

  /* ---- Renewal notice ---- */
  for (const m of text.matchAll(/(\d+)\s*(?:\(\w+\)\s*)?days?/gi)) {
    const at = m.index ?? 0;
    if (near(text, at, /\b(notice|renew|renewal|terminate|termination)\b/i)) {
      return {
        concedes: true,
        termKey: 'renewal_notice',
        value: { kind: 'renewal_notice', days: Number(m[1]) },
        quote: sentenceAround(text, at),
        confidence: 0.8,
      };
    }
  }

  /* ---- Service credit ---- */
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|per ?cent)/gi)) {
    const at = m.index ?? 0;
    if (near(text, at, /\b(credit|credits|sla|service level|uptime|availability)\b/i)) {
      return {
        concedes: true,
        termKey: 'service_credit',
        value: { kind: 'service_credit', pct: Number(m[1]), uptimeTarget: 99.5 },
        quote: sentenceAround(text, at),
        confidence: 0.8,
      };
    }
  }

  return { concedes: false, confidence: 0.6 };
}
