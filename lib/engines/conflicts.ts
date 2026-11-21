/**
 * Internal conflicts (review fix A2): two clauses in the same document state
 * different values for one term, e.g. clause 6 says an 8% markup and the
 * Schedule 2 rate card says 10%. Pure: clause values in, findings out.
 */
export interface ClauseValue {
  /** "Clause 6", "Schedule 2, rate card" */
  ref: string;
  termKey: string;
  value: number;
  /** "%", "days" */
  unit: string;
  text: string;
}

export interface InternalConflict {
  kind: 'internal_conflict';
  termKey: string;
  /** Every clause stating this term, in document order. */
  clauses: ClauseValue[];
}

export function internalConflicts(clauses: ClauseValue[]): InternalConflict[] {
  const byTerm = new Map<string, ClauseValue[]>();
  for (const c of clauses) byTerm.set(c.termKey, [...(byTerm.get(c.termKey) ?? []), c]);
  return [...byTerm.entries()]
    .filter(([, cs]) => new Set(cs.map((c) => `${c.value}${c.unit}`)).size > 1)
    .map(([termKey, cs]) => ({ kind: 'internal_conflict' as const, termKey, clauses: cs }));
}

/** The order-of-precedence clause, if the document has one. */
export function precedenceClause(doc: { precedence?: { ref: string; text: string } }): string {
  return doc.precedence ? `${doc.precedence.ref}: “${doc.precedence.text}”` : 'No order-of-precedence clause found';
}
