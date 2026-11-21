/**
 * Conditional agreements (review fix B2). Rohan accepted 60-day payment "if
 * you sign for 3 years": the 60 days hold only while the term clause in the
 * same file gives three years. Pure: evaluated per version.
 */
import type { ConditionState, Deal, DocVersion, LedgerRow } from '@/lib/types';
import { extractValue } from './diff';
import { formatDateShort, numberToWords } from '@/lib/format';
import { plainValue, TERM_LABELS } from '@/lib/plain';

export interface ConditionCheck {
  state: ConditionState;
  /** The clause the condition depends on, e.g. "3.1". */
  clauseNo?: string;
  /** What that clause gives in this version, e.g. "3 years". */
  actual?: string;
  /** "Condition met: §3.1 gives a three-year term." */
  sentence: string;
}

const yearsWord = (s: string) => {
  const m = s.match(/^(\d+) years?$/);
  return m ? `a ${numberToWords(Number(m[1])).toLowerCase()}-year term` : s;
};

export function conditionState(row: LedgerRow, version: DocVersion, deal: Deal): ConditionCheck | null {
  const c = row.condition;
  if (!c) return null;
  const clause = version.clauses.find((x) => x.termKey === c.dependsOn.termKey);
  const value = clause ? extractValue(clause) : null;
  if (!clause || !value) {
    return { state: 'unknown', sentence: `${plainValue(row.position, deal.termYears)} was conditional ${c.text.replace(/^if /, 'on ')}. This copy has no ${TERM_LABELS[c.dependsOn.termKey].toLowerCase()} clause to check it against.` };
  }
  const actual = plainValue(value, deal.termYears);
  if (actual === c.dependsOn.required) {
    return { state: 'met', clauseNo: clause.no, actual, sentence: `Condition met: §${clause.no} gives ${yearsWord(actual)}.` };
  }
  return {
    state: 'not_met',
    clauseNo: clause.no,
    actual,
    sentence: `${plainValue(row.position, deal.termYears)} was conditional on ${yearsWord(c.dependsOn.required)}. This copy has ${actual}, so the condition is not met.`,
  };
}

/** The supplier-safe comment for restoring a conditional term: no ₹, no names, no limits. */
export function conditionalComment(row: LedgerRow, deal: Deal): string | null {
  if (!row.condition) return null;
  return `Restored to the ${plainValue(row.position, deal.termYears).toLowerCase()} confirmed by email on ${formatDateShort(row.condition.source.at)} for ${yearsWord(row.condition.dependsOn.required)}.`;
}
