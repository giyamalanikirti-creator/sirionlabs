'use client';

import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { cloudDeskDeal, deals } from '@/lib/data';
import { dealAtRisk, countByState, needsAttention } from '@/lib/engines/atRisk';
import { initialLedger } from '@/lib/demo/steps';
import type { LedgerRow } from '@/lib/types';
import { asOfLine, dealReconciliation, headlineLabel, latestVersionId } from '@/lib/engines/headline';
import { STEP_CLOCK } from '@/lib/demo/steps';

/**
 * The CloudDesk ledger as it stands right now, plus the figures the pages
 * show. Before hydration this returns the starting ledger, so the server and
 * the first client render agree.
 */
export function useLedger(): {
  rows: LedgerRow[];
  atRisk: number;
  allOpenAtRisk: number;
  counts: ReturnType<typeof countByState>;
  attention: LedgerRow[];
  signed: boolean;
  hydrated: boolean;
  /** "Expected ₹1.6 lakh a year across the deal, including terms still open" */
  label: string;
  /** "₹1.6 lakh = renewal notice ₹1.1 lakh + service credit ₹50,000" */
  reconciliation: string;
  /** "As of 14 Nov, 10:05 · v4" — the home page follows the demo clock. */
  asOf: string;
} {
  const hydrated = useHydrated();
  const stored = useDemo((s) => s.ledger);
  const signedAt = useDemo((s) => s.signedAt);
  const clockStored = useDemo((s) => s.clock);
  const synced = useDemo((s) => s.syncedVersionIds);

  const rows = hydrated ? stored : initialLedger();
  const atRisk = dealAtRisk(rows, cloudDeskDeal);
  const clock = hydrated ? clockStored : STEP_CLOCK[0];
  const version = latestVersionId({ clock, syncedVersionIds: hydrated ? synced : [], signedAt: hydrated ? signedAt : undefined });
  const displayTotal = deals
    .filter((d) => !d.interactive)
    .reduce((sum, d) => sum + (d.display?.atRiskLakh ?? 0), 0);

  return {
    rows,
    atRisk,
    allOpenAtRisk: displayTotal + atRisk,
    counts: countByState(rows),
    attention: needsAttention(rows),
    signed: hydrated && Boolean(signedAt),
    hydrated,
    label: headlineLabel('deal', atRisk, version),
    reconciliation: dealReconciliation(rows, cloudDeskDeal).text,
    asOf: asOfLine(clock, version),
  };
}
