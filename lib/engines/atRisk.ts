/** At-risk engine — BUILD_SPEC §8.2. */
import type { Deal, LedgerRow, PriceTag, Threat } from '@/lib/types';
import { priceChange } from './pricing';

/** The largest expected ₹/yr cost across a row's live threats, or null. */
export function rowAtRisk(row: LedgerRow, deal: Deal): number | null {
  const live = row.threats.filter((t) => t.active);
  if (!live.length) return null;
  let worst: number | null = null;
  for (const t of live) {
    const tag = priceChange(deal, row.position, t.value);
    if (tag.costLakhPerYr === null) continue;
    if (worst === null || tag.costLakhPerYr > worst) worst = tag.costLakhPerYr;
  }
  return worst;
}

/** The threat that drives a row's at-risk figure. */
export function worstThreat(row: LedgerRow, deal: Deal): Threat | null {
  const live = row.threats.filter((t) => t.active);
  if (!live.length) return null;
  let best: { t: Threat; v: number } | null = null;
  for (const t of live) {
    const tag = priceChange(deal, row.position, t.value);
    if (tag.costLakhPerYr === null) continue;
    if (!best || tag.costLakhPerYr > best.v) best = { t, v: tag.costLakhPerYr };
  }
  return best?.t ?? live[0];
}

export function rowPriceTag(row: LedgerRow, deal: Deal): PriceTag | null {
  const t = worstThreat(row, deal);
  if (!t) return null;
  return priceChange(deal, row.position, t.value);
}

/** Sum of row at-risk figures; rows with no ₹ figure count as zero. */
export function dealAtRisk(rows: LedgerRow[], deal: Deal): number {
  return rows.reduce((sum, row) => {
    const cost = rowAtRisk(row, deal) ?? 0;
    return sum + (row.termKey === 'renewal_notice' ? cost / deal.termYears : cost);
  }, 0);
}

/** Rows that should appear in "Needs your attention". */
export function needsAttention(rows: LedgerRow[]): LedgerRow[] {
  return rows.filter(
    (r) =>
      r.state === 'needs_confirmation' ||
      r.state === 'reopened' ||
      r.state === 'missing_at_signing' ||
      r.threats.some((t) => t.active && t.kind === 'new_ask'),
  );
}

export function countByState(rows: LedgerRow[]) {
  return {
    agreed: rows.filter((r) => r.state === 'agreed').length,
    open: rows.filter((r) => r.state === 'open' || r.state === 'changed').length,
    needs: rows.filter((r) => r.state === 'needs_confirmation').length,
    reopened: rows.filter((r) => r.state === 'reopened' || r.state === 'missing_at_signing').length,
  };
}
