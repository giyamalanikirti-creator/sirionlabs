/**
 * Labels for every headline ₹ figure (review fix A3): which version, which
 * scope, as of when, and a one-line reconciliation from the same engine call,
 * so ₹4.4 lakh, ₹1.6 lakh, ₹5.3 lakh and ₹5.8 lakh read as one story.
 * Pure: state in, strings out.
 */
import type { Deal, LedgerRow, SigningGap, TermKey } from '@/lib/types';
import { versions } from '@/lib/data';
import { explainHeadline } from './explain';
import { formatDateTime, formatLakh } from '@/lib/format';

/** What kind of money a figure is. Never show an expected figure beside an invoice variance without these labels. */
export type MoneyType = 'expected' | 'history' | 'invoice_variance' | 'recovered';
export const MONEY_LABEL: Record<MoneyType, string> = {
  expected: 'expected',
  history: 'history',
  invoice_variance: 'invoice variance',
  recovered: 'recovered',
};

export interface Part {
  label: string;
  lakh: number;
  termKey?: TermKey;
}

export interface Reconciled {
  totalLakh: number;
  parts: Part[];
  /** "₹1.6 lakh = renewal notice ₹1.1 lakh + service credit ₹50,000" */
  text: string;
}

export const short = (label: string) => (label === 'Annual price' ? 'price' : label.toLowerCase());

/** The latest copy of the CloudDesk contract at a point on the clock. */
export function latestVersionId(s: { clock: string; syncedVersionIds: string[]; signedAt?: string }): string {
  if (s.signedAt) return 'v7';
  const ids = versions
    .filter((v) => v.sentAt <= s.clock)
    .filter((v) => v.id !== 'v5' || s.syncedVersionIds.includes('v5'))
    .map((v) => v.id);
  return ids.at(-1) ?? 'v1';
}

export function asOfLine(clock: string, versionId: string): string {
  return `As of ${formatDateTime(clock)} · ${versionId}`;
}

/** The standard label for a headline figure. */
export function headlineLabel(scope: 'draft' | 'deal', lakh: number, versionId: string): string {
  return scope === 'draft'
    ? `Expected ${formatLakh(lakh)} a year if ${versionId} is signed as is`
    : `Expected ${formatLakh(lakh)} a year across the deal, including terms still open`;
}

export function reconcile(unsorted: Part[]): Reconciled {
  const parts = [...unsorted].sort((a, b) => b.lakh - a.lakh);
  const totalLakh = parts.reduce((s, p) => s + p.lakh, 0);
  const text = parts.length
    ? `${formatLakh(totalLakh)} = ${parts.map((p) => `${p.label} ${formatLakh(p.lakh)}`).join(' + ')}`
    : 'Nothing at risk: every term matches what was agreed.';
  return { totalLakh, parts, text };
}

/** The deal headline (Outlook, deal page): one part per priced line of explainHeadline. */
export function dealReconciliation(rows: LedgerRow[], deal: Deal): Reconciled {
  const x = explainHeadline(rows, deal);
  return reconcile(x.lines.map((l) => ({ label: short(l.label), lakh: l.shareLakh, termKey: rows.find((r) => r.id === l.rowId)?.termKey })));
}

/** This copy: one part per open gap of the signing check, a year. */
export function copyReconciliation(gaps: Pick<SigningGap, 'label' | 'termKey' | 'costLakhPerYr'>[], deal: Deal): Reconciled {
  return reconcile(
    gaps
      .filter((g) => g.costLakhPerYr !== null)
      .map((g) => ({ label: short(g.label), termKey: g.termKey, lakh: (g.costLakhPerYr ?? 0) / (g.termKey === 'renewal_notice' ? deal.termYears : 1) })),
  );
}

/** Across the deal: this copy, plus terms still open that the copy does not cover. */
export function dealWideReconciliation(copy: Reconciled, rows: LedgerRow[], deal: Deal): Reconciled {
  const inCopy = new Set(copy.parts.map((p) => p.termKey));
  const open = dealReconciliation(rows, deal).parts.filter((p) => {
    const row = rows.find((r) => r.termKey === p.termKey);
    return !inCopy.has(p.termKey) && row && row.state !== 'agreed';
  });
  const totalLakh = copy.totalLakh + open.reduce((s, p) => s + p.lakh, 0);
  const text = open.length
    ? `${formatLakh(totalLakh)} = this copy ${formatLakh(copy.totalLakh)} + ${open.map((p) => `${rows.find((r) => r.termKey === p.termKey)?.state === 'reopened' ? 'reopened' : 'open'} ${p.label} ${formatLakh(p.lakh)}`).join(' + ')}`
    : `${formatLakh(totalLakh)} = this copy; no other term is open`;
  return { totalLakh, parts: [...copy.parts, ...open], text };
}
