/**
 * The renewal brief that fires with the notice-deadline reminder (Ironclad
 * Renewal Agent style): outages, service credits owed, usage, and the asks
 * that give leverage. Pure; every number comes from seed data.
 */
import type { LedgerRow } from '@/lib/types';
import type { ContractRecord } from './handover';
import { serviceEventsFor, UNUSED_SHARE } from './stats';
import { formatInr, formatPct } from '@/lib/format';
import { plainValue } from '@/lib/plain';

export interface RenewalBrief {
  firesOn: string;
  deadline: string;
  outages: { month: string; uptimePct: number }[];
  monthsTracked: number;
  creditPct: number;
  uptimeTarget: number;
  creditsOwedInr: number;
  unusedSeats: number;
  seats: number;
  asks: string[];
}

export function renewalBrief(contract: ContractRecord, rows: LedgerRow[], seats: number): RenewalBrief | null {
  const notice = contract.obligations.find((o) => o.ledgerRowId === 'R-notice');
  if (!notice?.due) return null;
  const credit = rows.find((r) => r.termKey === 'service_credit')?.position;
  const creditPct = credit?.kind === 'service_credit' ? credit.pct : 10;
  const target = credit?.kind === 'service_credit' ? credit.uptimeTarget : 99.5;
  // Example uses the latest 12 months on record; in production, the contract's own last 12 months.
  const events = serviceEventsFor('C-017').slice(-12);
  const outages = events.filter((e) => e.uptimePct < target);
  const monthlyFee = contract.annualFeeInr / 12;
  const creditsOwedInr = Math.round(outages.length * monthlyFee * (creditPct / 100));
  const unusedSeats = Math.round(seats * UNUSED_SHARE);
  const price = rows.find((r) => r.termKey === 'price')?.position;
  return {
    firesOn: notice.reminder ?? notice.due,
    deadline: notice.due,
    outages,
    monthsTracked: events.length,
    creditPct,
    uptimeTarget: target,
    creditsOwedInr,
    unusedSeats,
    seats,
    asks: [
      `Ask for the ${formatInr(creditsOwedInr)} of service credits owed to be paid before renewal, or taken off the first renewal invoice.`,
      `Renew for ${seats - unusedSeats} seats, not ${seats}: unreviewed renewals carried ${formatPct(UNUSED_SHARE)} unused seats.`,
      `Keep ${price ? plainValue(price).toLowerCase() : 'the agreed price'} into the renewal year; ${outages.length} missed month${outages.length === 1 ? '' : 's'} weaken any case for a rise.`,
    ],
  };
}
