/**
 * How the full ledger page describes each row: status, source line, who
 * agreed it, what approval depends on it, how sure the reader was, and the
 * change history across the whole deal. Pure.
 */
import type { Deal, HistoryEntry, LedgerRow, SourceRef } from '@/lib/types';
import { personById, personName, versionById } from '@/lib/data';
import { formatDateShort } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import { READER_CONFIDENCE_MIN } from '@/lib/settings';
import { worstThreat } from './atRisk';
import { sh } from '@/lib/demo/timeShift';

export type LedgerStatus = 'Agreed' | 'Open' | 'Reopened' | 'Conceded' | 'Needs confirming' | 'Missing at signing';

export function statusOf(row: LedgerRow): LedgerStatus {
  if (row.threats.some((t) => t.active && t.kind === 'sent_concession')) return 'Conceded';
  switch (row.state) {
    case 'agreed':
      return row.threats.some((t) => t.active && t.kind === 'new_ask') ? 'Reopened' : 'Agreed';
    case 'needs_confirmation':
      return 'Needs confirming';
    case 'reopened':
      return 'Reopened';
    case 'missing_at_signing':
      return 'Missing at signing';
    default:
      return 'Open';
  }
}

export function sourceKindLabel(src: SourceRef): 'Email' | 'Version' | 'Call' | 'Entered' {
  if (src.kind === 'email') return 'Email';
  if (src.kind === 'version') return 'Version';
  if (src.kind === 'call_note') return 'Call';
  return 'Entered';
}

/** The source line, e.g. "Rohan Iyer, 14 Nov: “we can hold the price…”" or "v3, clause 14.2". */
export function sourceLine(src: SourceRef): string {
  if (src.kind === 'version') {
    const v = src.versionId ? versionById(src.versionId) : undefined;
    const clause = v?.clauses.find((c) => c.no === src.clauseNo);
    return `${src.versionId}, clause ${src.clauseNo}${clause ? `: “${clause.text.split('. ')[0]}.”` : ''}`;
  }
  const who = personName(src.byPersonId);
  return `${who}, ${formatDateShort(src.at)}${src.quote ? `: “${src.quote}”` : ''}`;
}

/** Who agreed it: the supplier person who accepted, or who on our side logged it. */
export function agreedBy(row: LedgerRow): string {
  if (row.state !== 'agreed' && row.state !== 'reopened' && row.state !== 'missing_at_signing') return 'Not agreed yet';
  const p = personById(row.source.byPersonId);
  if (row.source.kind === 'version') {
    const v = row.source.versionId ? versionById(row.source.versionId) : undefined;
    return v?.author === 'supplier' ? `CloudDesk in ${row.source.versionId}` : `Both sides, ${row.source.versionId}`;
  }
  if (row.source.kind === 'call_note') return `On a call · logged by ${p?.name ?? row.source.byPersonId}`;
  return p ? `${p.name}${p.org === 'clouddesk' ? ' (CloudDesk)' : ''}` : row.source.byPersonId;
}

/** Which approval depends on this row: its own, or a condition on another row's approval. */
export function approvalDependsOn(row: LedgerRow, rows: LedgerRow[]): string | undefined {
  if (row.approvedBy) {
    return `${personName(row.approvedBy.personId)}${row.approvedBy.condition ? ` · ${row.approvedBy.condition}` : ''}`;
  }
  const words: Partial<Record<LedgerRow['termKey'], RegExp>> = {
    price: /\bprice|fees?\b/i,
    payment: /\bpayment|invoice\b/i,
    renewal_notice: /\bnotice|renew/i,
    service_credit: /\bcredit\b/i,
  };
  const re = words[row.termKey];
  if (!re) return undefined;
  const other = rows.find((r) => r.approvedBy?.condition && re.test(r.approvedBy.condition));
  return other ? `${personName(other.approvedBy!.personId)}'s approval of ${other.label.toLowerCase()} · ${other.approvedBy!.condition}` : undefined;
}

export interface ConfidenceView {
  pct?: number;
  label: string;
  low: boolean;
}

export function confidenceOf(row: LedgerRow): ConfidenceView {
  if (row.confidence !== undefined) {
    const low = row.confidence < READER_CONFIDENCE_MIN;
    return { pct: Math.round(row.confidence * 100), label: low ? 'Low: sent to a person' : 'Read from email', low };
  }
  if (row.source.kind === 'version') return { label: 'Exact clause text', low: false };
  if (row.source.kind === 'call_note' || row.source.kind === 'manual') return { label: 'Entered by a person', low: false };
  return { label: 'Confirmed in earlier rounds', low: false };
}

export interface DealHistoryEntry extends HistoryEntry {
  rowId: string;
  label: string;
  actor: string;
}

/** Every row's history, newest first, with who did it. */
export function dealHistory(rows: LedgerRow[]): DealHistoryEntry[] {
  return rows
    .flatMap((row) =>
      row.history.map((h) => ({
        ...h,
        rowId: row.id,
        label: row.label,
        actor: personName(h.source?.byPersonId ?? ''),
      })),
    )
    .filter((h) => h.at)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/* ------------------------------------------------------------------ */
/* Negotiation memory                                                  */
/* ------------------------------------------------------------------ */

export interface MemoryEntry {
  at: string;
  round: number;
  label: string;
  asked: string;
  askedBy: string;
  outcome: string;
}

const ROUND_OF = (at: string) => {
  // Round n is the period after version n was sent (v1 = 1 Nov, v4 = 14 Nov…).
  const dates = ['2026-11-01', '2026-11-03', '2026-11-06', '2026-11-14', '2026-11-15', '2026-11-19', '2026-11-21'].map((d) => sh(d));
  let round = 1;
  dates.forEach((d, i) => {
    if (at.slice(0, 10) >= d) round = i + 1;
  });
  return round;
};

/** Every ask on the deal: who asked, in which round, and who gave in (or not). */
export function negotiationMemory(rows: LedgerRow[], deal: Deal): MemoryEntry[] {
  const out: MemoryEntry[] = [];
  for (const row of rows) {
    for (const t of row.threats) {
      if (t.kind === 'signing_copy') continue;
      const asker = personById(t.source.byPersonId);
      const conceded = t.kind === 'sent_concession';
      const stillLive = t.active;
      out.push({
        at: t.source.at,
        round: ROUND_OF(t.source.at),
        label: row.label,
        asked: plainValue(t.value, deal.termYears),
        askedBy: conceded ? `${asker?.name ?? 'Our side'} (conceded by email)` : asker?.org === 'meridian' ? `${asker.name} (our side, side thread)` : asker?.name ?? (t.source.versionId ? `${deal.supplier} in ${t.source.versionId}` : deal.supplier),
        outcome: conceded
          ? 'We gave in'
          : stillLive
            ? 'Still open'
            : plainValue(row.position) === plainValue(t.value)
              ? 'They got it'
              : `Held at ${plainValue(row.position, deal.termYears).toLowerCase()}`,
      });
    }
  }
  return out.filter((e) => e.at).sort((a, b) => a.at.localeCompare(b.at));
}

/** One-line patterns from the memory, e.g. "CloudDesk asked to reopen price 3 times; we held each time." */
export function memoryPatterns(memory: MemoryEntry[], deal: Deal): string[] {
  const byLabel = new Map<string, MemoryEntry[]>();
  for (const m of memory) byLabel.set(m.label, [...(byLabel.get(m.label) ?? []), m]);
  const out: string[] = [];
  for (const [label, list] of byLabel) {
    const theirs = list.filter((m) => !m.askedBy.includes('our side') && !m.outcome.startsWith('We gave'));
    const held = theirs.filter((m) => m.outcome.startsWith('Held')).length;
    if (theirs.length >= 2) {
      out.push(`${deal.supplier} raised ${label.toLowerCase()} ${theirs.length} times across rounds ${Math.min(...theirs.map((m) => m.round))}–${Math.max(...theirs.map((m) => m.round))}; we held ${held} of ${theirs.length}.`);
    }
    if (list.some((m) => m.askedBy.includes('our side'))) {
      out.push(`${label}: our own side offered a different value in a side thread, the riskiest pattern on this deal.`);
    }
  }
  return out;
}

export function headlineThreat(row: LedgerRow, deal: Deal) {
  return worstThreat(row, deal);
}
