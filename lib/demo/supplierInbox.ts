/**
 * Every non-CloudDesk supplier email that appears in Ananya's Outlook, and
 * the link from a deal or ledger row to the exact email behind it.
 */
import type { EmailMessage } from '@/lib/types';
import { BRIGHTSTAFF_MESSAGES, SCRIPTED_DEALS, SWIFTSHIP_MESSAGES } from './moreDeals';
import { SUPPLIER_MAIL } from './supplierMail';

const DEAL_OF: Record<string, string> = {};
for (const m of SWIFTSHIP_MESSAGES) DEAL_OF[m.id] = 'D-SWIFTSHIP';
for (const m of BRIGHTSTAFF_MESSAGES) DEAL_OF[m.id] = 'D-BRIGHTSTAFF';
for (const d of SUPPLIER_MAIL) for (const m of d.emails) DEAL_OF[m.id] = d.dealId;

export const SUPPLIER_INBOX: EmailMessage[] = [
  ...SWIFTSHIP_MESSAGES,
  ...BRIGHTSTAFF_MESSAGES,
  ...SUPPLIER_MAIL.flatMap((d) => d.emails),
];

/** The deal a supplier email belongs to, if it is one of ours. */
export const dealIdForMessage = (messageId: string): string | undefined => DEAL_OF[messageId];

/** Outlook deep link for a message in Ananya's mailbox. */
export const outlookHref = (messageId: string, mailbox = 'ananya') => `/outlook/${mailbox}?msg=${messageId}`;

export interface SupplierRowView {
  id: string;
  label: string;
  agreed: string;
  state: 'agreed' | 'open' | 'needs_confirmation' | 'reopened' | 'missing_at_signing';
  emailId?: string;
  /** The email to open in Ananya's Outlook for this row. */
  outlookId?: string;
  quote?: string;
  note?: string;
  costLakhPerYr?: number;
}

/** One shape for the ledger rows of every non-CloudDesk deal. */
export function rowsForDeal(dealId: string): SupplierRowView[] {
  const scripted = SCRIPTED_DEALS[dealId];
  if (scripted) {
    return scripted.rows.map((r) => ({
      id: r.id,
      label: r.label,
      agreed: r.agreed,
      state: r.state,
      emailId: r.sourceEmailId,
      outlookId: r.outlookEmailId ?? (SUPPLIER_INBOX.some((m) => m.id === r.sourceEmailId) ? r.sourceEmailId : undefined),
      quote: r.sourceQuote,
      note: r.fileSays,
      costLakhPerYr: r.state !== 'agreed' ? r.costLakhPerYr : undefined,
    }));
  }
  const mail = SUPPLIER_MAIL.find((d) => d.dealId === dealId);
  return (mail?.rows ?? []).map((r) => ({ ...r, outlookId: r.emailId }));
}

/** The email behind a deal's most pressing row: what "Open in Outlook" should open. */
export function riskEmailForDeal(dealId: string): string | undefined {
  const rows = rowsForDeal(dealId);
  const order: SupplierRowView['state'][] = ['missing_at_signing', 'reopened', 'needs_confirmation', 'open', 'agreed'];
  for (const state of order) {
    const row = rows.find((r) => r.state === state && r.outlookId);
    if (row) return row.outlookId;
  }
  return SUPPLIER_INBOX.find((m) => DEAL_OF[m.id] === dealId)?.id;
}
