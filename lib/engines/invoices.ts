/** Invoice check — BUILD_SPEC §8.8. */
import type { Invoice, InvoiceRule } from '@/lib/types';

export interface InvoiceFlag {
  invoiceId: string;
  kind: 'over_agreed_price' | 'missing_credit';
  overInr?: number;
  expectedInr?: number;
  creditDueInr?: number;
  clauseNo: string;
  ledgerRowId: string;
  message: string;
}

/** Flags an invoice that charges more than the agreed price. */
export function checkInvoice(invoice: Invoice, rules: InvoiceRule[]): InvoiceFlag[] {
  const flags: InvoiceFlag[] = [];

  const fixed = rules.find((r) => r.kind === 'fixed_monthly');
  if (fixed?.amountInr !== undefined && invoice.month <= fixed.validTo.slice(0, 7)) {
    if (invoice.amountInr > fixed.amountInr) {
      flags.push({
        invoiceId: invoice.id,
        kind: 'over_agreed_price',
        overInr: invoice.amountInr - fixed.amountInr,
        expectedInr: fixed.amountInr,
        clauseNo: fixed.clauseNo,
        ledgerRowId: fixed.ledgerRowId,
        message: 'above the agreed price',
      });
    }
  }

  const credit = rules.find((r) => r.kind === 'service_credit');
  if (
    credit?.pct !== undefined &&
    credit.uptimeTarget !== undefined &&
    invoice.uptime !== undefined &&
    invoice.uptime < credit.uptimeTarget
  ) {
    const expected = fixed?.amountInr ?? invoice.amountInr;
    flags.push({
      invoiceId: invoice.id,
      kind: 'missing_credit',
      creditDueInr: Math.round((expected * credit.pct) / 100),
      clauseNo: credit.clauseNo,
      ledgerRowId: credit.ledgerRowId,
      message: `uptime was below ${credit.uptimeTarget}%, so a ${credit.pct}% credit is due`,
    });
  }

  return flags;
}

export function checkAll(invoices: Invoice[], rules: InvoiceRule[]): Record<string, InvoiceFlag[]> {
  const out: Record<string, InvoiceFlag[]> = {};
  for (const inv of invoices) {
    const flags = checkInvoice(inv, rules);
    if (flags.length) out[inv.id] = flags;
  }
  return out;
}
