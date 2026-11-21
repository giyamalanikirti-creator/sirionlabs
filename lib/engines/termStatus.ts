/**
 * Two independent facts about every tracked term (review fix A5):
 *  - negotiationStatus: where the negotiation stands (agreed, proposed by one
 *    side, ambiguous, open), from the ledger;
 *  - draftMatch: whether this file says the same as our position.
 * A term counts as "matches what was agreed" only when it is agreed AND
 * matches. Every count on every surface comes from selectTermCounts, so a
 * skipped chapter and a full play-through read the same.
 */
import type { Deal, DocVersion, LedgerRow, TermKey } from '@/lib/types';
import { lensForClause } from './wordLens';
import { TERM_LABELS } from '@/lib/plain';

export type NegotiationStatus = 'agreed' | 'buyer_proposed' | 'supplier_proposed' | 'ambiguous' | 'open';
export type DraftMatch = 'matches' | 'differs' | 'missing' | 'internal_conflict';

export interface TermStatus {
  rowId: string;
  termKey: TermKey;
  label: string;
  negotiation: NegotiationStatus;
  draft: DraftMatch;
  clauseNo?: string;
  /** Agreed and matching: the only state that counts as "matches what was agreed". */
  matchesAgreed: boolean;
}

const SUPPLIER_PEOPLE = new Set(['rohan', 'priya']);

export function negotiationStatus(row: LedgerRow): NegotiationStatus {
  if (row.state === 'needs_confirmation') return 'ambiguous';
  if (row.state === 'agreed' || row.state === 'reopened' || row.state === 'missing_at_signing' || row.state === 'changed') return 'agreed';
  if (row.state === 'open') return SUPPLIER_PEOPLE.has(row.source.byPersonId) && row.source.kind === 'email' ? 'supplier_proposed' : 'buyer_proposed';
  return 'open';
}

export function draftMatch(row: LedgerRow, version: DocVersion, deal: Deal): { draft: DraftMatch; clauseNo?: string } {
  const clauses = version.clauses.filter((c) => c.termKey === row.termKey);
  if (!clauses.length) return { draft: 'missing' };
  // Compare with our position whatever the negotiation state: that is the other field's job.
  const asAgreed = { ...row, state: 'agreed' as const };
  const lenses = clauses.map((c) => lensForClause(c, [asAgreed], deal));
  const statuses = new Set(lenses.map((l) => l?.status));
  if (clauses.length > 1 && statuses.size > 1) return { draft: 'internal_conflict', clauseNo: clauses[0].no };
  const l = lenses[0];
  if (!l || l.status === 'unreadable') return { draft: 'missing', clauseNo: clauses[0].no };
  return { draft: l.status === 'matches' ? 'matches' : 'differs', clauseNo: clauses[0].no };
}

export function termStatuses(rows: LedgerRow[], version: DocVersion, deal: Deal): TermStatus[] {
  return rows.map((row) => {
    const negotiation = negotiationStatus(row);
    const { draft, clauseNo } = draftMatch(row, version, deal);
    return { rowId: row.id, termKey: row.termKey, label: row.label, negotiation, draft, clauseNo, matchesAgreed: negotiation === 'agreed' && draft === 'matches' };
  });
}

export interface TermCounts {
  total: number;
  /** Agreed AND matches. */
  matchesAgreed: number;
  differs: number;
  missing: number;
  internalConflicts: number;
  /** Not agreed yet (proposed, ambiguous or open), whatever the draft says. */
  notAgreed: number;
  /** The draft matches our position but the supplier has not confirmed it. */
  matchesUnconfirmed: number;
}

/** The one selector for every count: pane headline, publish gate, deal page, AskSirion, guide rail. */
export function selectTermCounts(rows: LedgerRow[], version: DocVersion, deal: Deal): TermCounts {
  const t = termStatuses(rows, version, deal);
  return {
    total: t.length,
    matchesAgreed: t.filter((x) => x.matchesAgreed).length,
    differs: t.filter((x) => x.draft === 'differs').length,
    missing: t.filter((x) => x.draft === 'missing').length,
    internalConflicts: t.filter((x) => x.draft === 'internal_conflict').length,
    notAgreed: t.filter((x) => x.negotiation !== 'agreed').length,
    matchesUnconfirmed: t.filter((x) => x.draft === 'matches' && x.negotiation !== 'agreed').length,
  };
}

export function negotiationLabel(n: NegotiationStatus, supplier: string): string {
  switch (n) {
    case 'agreed':
      return `Agreed with ${supplier}`;
    case 'buyer_proposed':
      return `Your proposal · not confirmed by ${supplier}`;
    case 'supplier_proposed':
      return `${supplier}'s proposal · not agreed`;
    case 'ambiguous':
      return `Not confirmed by ${supplier}`;
    default:
      return 'Open';
  }
}

export function draftLabel(d: DraftMatch): string {
  switch (d) {
    case 'matches':
      return 'Matches your position';
    case 'differs':
      return 'Differs from your position';
    case 'missing':
      return 'Not in this draft';
    case 'internal_conflict':
      return 'Clauses disagree';
  }
}

/** "Service credit · Matches your position · Not confirmed by CloudDesk" */
export function statusLine(s: TermStatus, supplier: string): string {
  return `${TERM_LABELS[s.termKey]} · ${draftLabel(s.draft)} · ${negotiationLabel(s.negotiation, supplier)}`;
}
