/**
 * Which email to open for a CloudDesk ledger row. The email behind the risk,
 * not the thread in general: the ambiguous reply for a row that needs
 * confirming, the email carrying the file that changed it, the side-thread
 * ask, or the signing copy.
 */
import type { Deal, LedgerRow } from '@/lib/types';
import { messageById, messages, versions } from '@/lib/data';
import { worstThreat } from '@/lib/engines/atRisk';
import { rowHeadlineShare } from '@/lib/engines/playbook';

function messageForVersion(versionId: string) {
  return messages.find((m) => m.attachments.some((a) => a.versionId === versionId));
}

export function emailForRow(row: LedgerRow, deal: Deal): { messageId: string; mailbox: string } | null {
  let id: string | undefined;
  if (row.pendingConfirmation?.messageId) id = row.pendingConfirmation.messageId;
  if (!id) {
    const threat = worstThreat(row, deal);
    const src = threat?.source ?? row.source;
    id = src.messageId ?? (src.versionId ? messageForVersion(src.versionId)?.id : undefined);
  }
  const message = id ? messageById(id) : undefined;
  if (!message) return null;
  return { messageId: message.id, mailbox: message.mailboxes.includes('ananya') ? 'ananya' : message.mailboxes[0] };
}

export function outlookHrefForRow(row: LedgerRow, deal: Deal): string {
  const e = emailForRow(row, deal);
  return e ? `/outlook/${e.mailbox}?msg=${e.messageId}` : '/outlook/ananya';
}

/** The deal-level "Open in Outlook": the email behind the row costing the most. */
export function outlookHrefForDeal(rows: LedgerRow[], deal: Deal): string {
  const ranked = rows
    .filter((r) => r.threats.some((t) => t.active) || r.pendingConfirmation)
    .sort((a, b) => (rowHeadlineShare(b, deal) ?? 0) - (rowHeadlineShare(a, deal) ?? 0));
  return ranked.length ? outlookHrefForRow(ranked[0], deal) : '/outlook/ananya';
}

/** The contract version Sirion holds as current at a point on the demo clock. */
export function currentVersionId(clock: string, sentBackAt?: string): string {
  if (sentBackAt) return 'v7';
  const latest = [...versions].filter((v) => v.sentAt <= clock).sort((a, b) => a.sentAt.localeCompare(b.sentAt)).pop();
  return latest?.id ?? 'v1';
}
