/**
 * Approval routing for concessions, by value — as Sirion's own approval
 * workflows route by thresholds. "Accept theirs", "Send anyway", a playbook
 * walk-away and a waived signing gap all raise a request instead of just
 * logging the change.
 */
import type { LedgerRow, TermKey } from '@/lib/types';
import { formatLakh } from '@/lib/format';

/** ₹ lakh a year at or above which the CFO approves. Below it, the procurement lead. */
export const CFO_THRESHOLD_LAKH = 1;

export interface ApprovalRoute {
  approverId: string;
  rule: string;
}

export function approvalRoute(row: Pick<LedgerRow, 'owner' | 'termKey'>, costLakhPerYr: number | null): ApprovalRoute {
  if (row.owner === 'legal') return { approverId: 'arjun', rule: 'Legal-owned term: Legal approves any change' };
  if (costLakhPerYr !== null && costLakhPerYr >= CFO_THRESHOLD_LAKH) {
    return { approverId: 'neha', rule: `${formatLakh(costLakhPerYr)} a year is at or above ${formatLakh(CFO_THRESHOLD_LAKH)}: CFO approves` };
  }
  return {
    approverId: 'ananya',
    rule:
      costLakhPerYr === null
        ? 'No ₹ figure: the procurement lead approves'
        : `${formatLakh(costLakhPerYr)} a year is below ${formatLakh(CFO_THRESHOLD_LAKH)}: the procurement lead approves`,
  };
}

export interface ApprovalRequest {
  id: string;
  kind: 'accept_theirs' | 'send_anyway' | 'walk_away' | 'waive' | 'publish_anyway';
  rowId: string;
  termKey: TermKey;
  label: string;
  /** What would change, in plain words. */
  change: string;
  costLakhPerYr: number | null;
  approverId: string;
  rule: string;
  requestedById: string;
  reason?: string;
  at: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: string;
  /** For accept_theirs: the value that becomes agreed on approval. */
  value?: unknown;
}

export const APPROVAL_KIND_LABEL: Record<ApprovalRequest['kind'], string> = {
  accept_theirs: 'Accept the supplier’s value',
  send_anyway: 'Sent anyway after a warning',
  walk_away: 'Walk-away position offered',
  waive: 'Signing gap waived',
  publish_anyway: 'Published with agreed terms missing',
};
