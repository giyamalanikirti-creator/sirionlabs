/**
 * What other companies saw: anonymised, opt-in peer benchmarks ("give to get").
 *
 * Own data stays primary whenever own n ≥ MIN_OWN_N; the peer line is a
 * cross-check underneath and never enters the headline (dealAtRisk). A cell
 * is shown only with ≥ 5 companies and ≥ 20 contracts. Every cell in the
 * prototype is sample data. Peer lines are internal: never in comments,
 * inserted wording or supplier email.
 */
import type { Deal, TermValue } from '@/lib/types';
import peerJson from '@/data/peer_benchmarks.json';
import { MIN_OWN_N } from '@/lib/settings';
import { formatLakh, formatPct } from '@/lib/format';

export interface PeerCell {
  termKey: 'price' | 'renewal_notice' | 'service_credit' | 'payment';
  category: 'software';
  wording: string;
  companies: number;
  contracts: number;
  period: string;
  median: number;
  p25?: number;
  p75?: number;
  unusedShare?: number;
  landed?: { label: string; share: number }[];
  sample: true;
}

export const PEER_MIN_COMPANIES = 5;
export const PEER_MIN_CONTRACTS = 20;

export const peerCells = peerJson as PeerCell[];

export interface PeerTag {
  /** Expected ₹ lakh a year on this deal at the peer rate; null when the peer line is a position, not a price. */
  costLakhPerYr: number | null;
  /** For renewal notice: the once-per-renewal figure. */
  onceLakh?: number;
  lowLakh?: number;
  highLakh?: number;
  companies: number;
  contracts: number;
  text: string[];
  landed?: { label: string; share: number }[];
  primary: 'own' | 'peer';
  disagrees: boolean;
  sample: true;
}

/** A cell passes only above both privacy thresholds. */
export function cellShown(cell: PeerCell | undefined): cell is PeerCell {
  return Boolean(cell && cell.companies >= PEER_MIN_COMPANIES && cell.contracts >= PEER_MIN_CONTRACTS);
}

/** "₹2.7 lakh to ₹5.6 lakh" when both ends are in lakh. */
export function lakhRange(low: number, high: number): string {
  const a = formatLakh(low);
  const b = formatLakh(high);
  return a.endsWith(' lakh') && b.endsWith(' lakh') ? `${a} to ${b}` : `${a} to ${b}`;
}

const cell = (termKey: PeerCell['termKey'], wording: string) =>
  peerCells.find((c) => c.termKey === termKey && c.wording === wording);

function priceCostAtRate(feeLakh: number, termYears: number, rate: number, fromYear: number): number {
  let total = 0;
  for (let k = 1; k <= termYears; k++) if (k >= fromYear) total += feeLakh * ((1 + rate) ** (k - fromYear + 1) - 1);
  return total / termYears;
}

const noticeWording = (days: number) => (days <= 30 ? 'notice_30' : days >= 60 ? 'notice_60_90' : undefined);

/**
 * The peer view of moving a term from `from` to `to`, using the same formulas
 * as pricing.ts with peer rates. `ownN` and `ownLakh` decide which figure is primary.
 */
export function peerChange(deal: Deal, from: TermValue, to: TermValue, own?: { n?: number; costLakhPerYr: number | null }): PeerTag | null {
  const feeLakh = deal.annualFeeInr / 1e5;
  const T = deal.termYears;
  const primary: 'own' | 'peer' = own && own.costLakhPerYr !== null && (own.n ?? MIN_OWN_N) >= MIN_OWN_N ? 'own' : 'peer';

  if (from.kind === 'price' && to.kind === 'price' && from.wording === 'fixed' && to.wording === 'open_yearly') {
    const c = cell('price', 'open_yearly');
    if (!cellShown(c)) return null;
    const cost = priceCostAtRate(feeLakh, T, c.median, to.fromYear);
    const low = c.p25 !== undefined ? priceCostAtRate(feeLakh, T, c.p25, to.fromYear) : undefined;
    const high = c.p75 !== undefined ? priceCostAtRate(feeLakh, T, c.p75, to.fromYear) : undefined;
    return {
      costLakhPerYr: cost,
      lowLakh: low,
      highLakh: high,
      companies: c.companies,
      contracts: c.contracts,
      landed: c.landed,
      primary,
      disagrees: own?.costLakhPerYr ? Math.abs(cost - own.costLakhPerYr) / own.costLakhPerYr > 0.5 : false,
      sample: true,
      text: [
        `${c.contracts} software contracts at ${c.companies} companies that accepted a yearly price revision rose a median ${formatPct(c.median, 1)} a year${
          c.p25 !== undefined && c.p75 !== undefined ? ` (middle half ${formatPct(c.p25, 1)} to ${formatPct(c.p75, 1)})` : ''
        }.`,
        `On this deal: ${formatLakh(cost)} a year${low !== undefined && high !== undefined ? ` (${lakhRange(low, high)})` : ''}.`,
      ],
    };
  }

  if (from.kind === 'renewal_notice' && to.kind === 'renewal_notice') {
    const a = cell('renewal_notice', noticeWording(from.days) ?? '');
    const b = cell('renewal_notice', noticeWording(to.days) ?? '');
    if (!cellShown(a) || !cellShown(b) || a.wording === b.wording) return null;
    const unused = b.unusedShare ?? 0;
    const once = (b.median - a.median) * unused * feeLakh;
    const perYear = once / T;
    return {
      costLakhPerYr: perYear,
      onceLakh: once,
      companies: Math.min(a.companies, b.companies),
      contracts: a.contracts + b.contracts,
      landed: b.landed,
      primary,
      disagrees: own?.costLakhPerYr ? Math.abs(perYear - own.costLakhPerYr) / own.costLakhPerYr > 0.5 : false,
      sample: true,
      text: [
        `Across ${Math.min(a.companies, b.companies)} companies, ${formatPct(b.median)} of contracts with ${to.days >= 60 ? "60 to 90 days'" : `${to.days} days'`} notice renewed without a review, against ${formatPct(a.median)} with 30 days. Unreviewed renewals carried ${formatPct(unused)} unused seats.`,
        `On this deal: ${formatLakh(once)} at the next renewal (${formatLakh(perYear)} a year).`,
      ],
    };
  }

  if (from.kind === 'service_credit' && to.kind === 'service_credit') {
    const c = cell('service_credit', `credit_${from.pct}`);
    if (!cellShown(c)) return null;
    return {
      costLakhPerYr: null,
      companies: c.companies,
      contracts: c.contracts,
      landed: c.landed,
      primary: 'own',
      disagrees: false,
      sample: true,
      text: [`${formatPct(c.median)} of comparable SaaS contracts keep a ${from.pct}% service credit for a missed month.`],
    };
  }

  // Payment: the sample cell is below the privacy thresholds, so no peer line is shown.
  return null;
}
