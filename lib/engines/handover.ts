/** Handover to Sirion — BUILD_SPEC §8.8. */
import type { Deal, DocVersion, Invoice, InvoiceRule, LedgerRow, Obligation } from '@/lib/types';
import { CONTRACT_ID } from '@/lib/settings';
import { rowForTerm } from './ledger';
import { extractValue } from './diff';
import type { TermKey } from '@/lib/types';
import { formatInr } from '@/lib/format';

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const minusDays = (date: string, days: number) => iso(new Date(new Date(date).getTime() - days * DAY));

/** Last day of the term: termStart + termYears, less one day. */
export function termEnd(deal: Deal): string {
  const start = new Date(deal.termStart);
  const end = new Date(
    Date.UTC(start.getUTCFullYear() + deal.termYears, start.getUTCMonth(), start.getUTCDate()),
  );
  return iso(new Date(end.getTime() - DAY));
}

export interface ContractRecord {
  id: string;
  title: string;
  supplier: string;
  startDate: string;
  endDate: string;
  annualFeeInr: number;
  obligations: Obligation[];
  rules: InvoiceRule[];
  signedVersionId: string;
}

export function handover(
  rows: LedgerRow[],
  signedVersion: DocVersion,
  deal: Deal,
): ContractRecord {
  const end = termEnd(deal);
  const signedValue = (key: TermKey) => {
    const row = rowForTerm(rows, key);
    const clause = signedVersion.clauses.find((item) => item.termKey === key);
    return row?.signing === 'waived' && clause ? extractValue(clause) : row?.position;
  };
  const notice = signedValue('renewal_notice');
  const payment = signedValue('payment');
  const credit = signedValue('service_credit');
  const exit = signedValue('exit_support');
  const price = signedValue('price');

  const noticeDays = notice?.kind === 'renewal_notice' ? notice.days : 30;
  const paymentDays = payment?.kind === 'payment' ? payment.days : 60;
  const creditPct = credit?.kind === 'service_credit' ? credit.pct : 10;
  const uptimeTarget = credit?.kind === 'service_credit' ? credit.uptimeTarget : 99.5;
  const exitDays = exit?.kind === 'exit_support' ? exit.days : 30;

  const noticeDeadline = minusDays(end, noticeDays);
  const monthlyFee = Math.round(deal.annualFeeInr / 12);

  const obligations: Obligation[] = [
    {
      id: 'OB-1',
      contractId: CONTRACT_ID,
      title: 'Renewal notice deadline',
      detail: `Give ${noticeDays} days' written notice before the term ends if we do not want the contract to renew.`,
      due: noticeDeadline,
      reminder: minusDays(noticeDeadline, 45),
      owner: 'Ananya Rao',
      clauseNo: '14.2',
      ledgerRowId: 'R-notice',
    },
    {
      id: 'OB-2',
      contractId: CONTRACT_ID,
      title: `Pay invoices within ${paymentDays} days`,
      detail: `Each undisputed invoice is due ${paymentDays} days from receipt.`,
      recurring: 'monthly',
      owner: 'Finance (AP)',
      clauseNo: '9.3',
      ledgerRowId: 'R-payment',
    },
    {
      id: 'OB-3',
      contractId: CONTRACT_ID,
      title: 'Service credit check',
      detail: `If uptime < ${uptimeTarget}%, expect a ${creditPct}% credit on the next invoice.`,
      recurring: 'monthly',
      owner: 'Vikram Shah',
      clauseNo: '11.2',
      ledgerRowId: 'R-credit',
    },
    {
      id: 'OB-4',
      contractId: CONTRACT_ID,
      title: 'Exit support available',
      detail: `${exitDays} days of exit support at no charge at expiry, including data export.`,
      due: end,
      owner: 'Vikram Shah',
      clauseNo: '15.1',
      ledgerRowId: 'R-exit',
    },
  ];

  const rules: InvoiceRule[] = [
    {
      id: 'IR-1',
      contractId: CONTRACT_ID,
      kind: 'fixed_monthly',
      amountInr: monthlyFee,
      validTo: end,
      clauseNo: '9.1',
      ledgerRowId: 'R-price',
    },
    {
      id: 'IR-2',
      contractId: CONTRACT_ID,
      kind: 'service_credit',
      pct: creditPct,
      uptimeTarget,
      validTo: end,
      clauseNo: '11.2',
      ledgerRowId: 'R-credit',
    },
  ];

  return {
    id: CONTRACT_ID,
    title: `${deal.supplier} helpdesk subscription`,
    supplier: deal.supplier,
    startDate: deal.termStart,
    endDate: end,
    annualFeeInr: deal.annualFeeInr,
    obligations,
    rules: price?.kind === 'price' && price.wording !== 'fixed' ? rules.filter((rule) => rule.kind !== 'fixed_monthly') : rules,
    signedVersionId: signedVersion.id,
  };
}

/** Monthly invoices for the first contract year, all at the agreed price. */
export function demoInvoices(record: ContractRecord): Invoice[] {
  const fixed = record.rules.find((r) => r.kind === 'fixed_monthly');
  const amount = fixed?.amountInr ?? Math.round(record.annualFeeInr / 12);
  const out: Invoice[] = [];
  let y = 2026;
  let m = 12;
  for (let i = 0; i < 12; i++) {
    const month = `${y}-${String(m).padStart(2, '0')}`;
    out.push({
      id: `INV-CD-${String(y).slice(2)}${String(m).padStart(2, '0')}`,
      contractId: record.id,
      month,
      amountInr: amount,
      uptime: 99.9,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** The fast-forward invoice that breaks the agreed price (§8.8). */
export const FAST_FORWARD_INVOICE: Invoice = {
  id: 'INV-CD-2712',
  contractId: CONTRACT_ID,
  month: '2027-12',
  amountInr: 532000,
  uptime: 99.87,
};

export function obligationSummary(record: ContractRecord): string {
  return `${record.obligations.length} obligations and ${record.rules.length} invoice rules, each linked to a clause and a ledger row.`;
}

export { formatInr };
