/**
 * Everything the pricing engine needs, derived from our own seed data.
 * Nothing here is a constant a model could have invented — each number is
 * read out of data/*.json. BUILD_SPEC §8.1, rule 1.
 */
import contractsJson from '@/data/contracts.json';
import invoicesJson from '@/data/invoices.json';
import renewalsJson from '@/data/renewals.json';
import serviceEventsJson from '@/data/service_events.json';
import type { PastContract, PastInvoice, PastRenewal, ServiceEvent } from '@/lib/types';

export const contracts = contractsJson as PastContract[];
export const invoices = invoicesJson as PastInvoice[];
export const renewals = renewalsJson as PastRenewal[];
export const serviceEvents = serviceEventsJson as ServiceEvent[];

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Year-2 unit price ÷ year-1 unit price − 1, per software contract. */
function observedRises(wording: PastContract['priceWording']): number[] {
  return contracts
    .filter((c) => c.type === 'software' && c.priceWording === wording)
    .map((c) => {
      const rows = invoices
        .filter((i) => i.contractId === c.id)
        .sort((a, b) => a.month.localeCompare(b.month));
      if (rows.length < 24) return 0;
      return rows[12].unitPriceInr / rows[0].unitPriceInr - 1;
    });
}

export const openYearlyRises = observedRises('open_yearly');
export const cappedRises = observedRises('capped_5');

/** Mean yearly rise across our own contracts with an open yearly revision. */
export const R_OPEN = mean(openYearlyRises);
export const R_OPEN_N = openYearlyRises.length;

/**
 * Not a setting: how much of a stated cap our suppliers actually took.
 * mean(cap-5% rises) ÷ 0.05 ≈ 0.92.
 */
export const CAP_RATIO = mean(cappedRises) / 0.05;

/* ---- Renewals: how often one slips through unreviewed ---- */

export type NoticeGroup = 'short' | 'mid' | 'long';

export function noticeGroup(days: number): NoticeGroup {
  if (days <= 30) return 'short';
  if (days >= 60) return 'long';
  return 'mid'; // 31–59: we have no history
}

function groupStats(group: NoticeGroup) {
  const rows = renewals.filter((r) => noticeGroup(r.noticeDays) === group);
  const unreviewed = rows.filter((r) => !r.reviewed);
  return { total: rows.length, unreviewed: unreviewed.length };
}

export const RENEWAL_GROUPS: Record<NoticeGroup, { total: number; unreviewed: number }> = {
  short: groupStats('short'),
  mid: groupStats('mid'),
  long: groupStats('long'),
};

export const RENEWALS_N = renewals.length;

/** Probability a renewal in this notice group goes through unreviewed. */
export function pSlip(days: number): number | null {
  const g = RENEWAL_GROUPS[noticeGroup(days)];
  if (!g.total) return null;
  return g.unreviewed / g.total;
}

/** Average unused share on renewals that went through without a review. */
export const UNUSED_SHARE = mean(
  renewals.filter((r) => !r.reviewed && r.unusedShare !== undefined).map((r) => r.unusedShare!),
);

/* ---- Service levels ---- */

/** Months in the last 12 where CloudDesk fell below the target. */
export function missedMonths(contractId: string, target: number): number {
  return serviceEvents.filter((e) => e.contractId === contractId && e.uptimePct < target).length;
}

export const SERVICE_MONTHS_N = serviceEvents.filter((e) => e.contractId === 'C-017').length;

/** Label for a notice group, used in proof sentences. */
export function groupLabel(days: number): string {
  const g = noticeGroup(days);
  if (g === 'short') return '30 days';
  if (g === 'long') return "60–90 days'";
  return `${days} days`;
}
