'use client';

import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { cloudDeskDeal, deals } from '@/lib/data';
import { dealAtRisk, countByState, needsAttention } from '@/lib/engines/atRisk';
import { initialLedger } from '@/lib/demo/steps';
import type { LedgerRow } from '@/lib/types';

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
} {
  const hydrated = useHydrated();
  const stored = useDemo((s) => s.ledger);
  const signedAt = useDemo((s) => s.signedAt);

  const rows = hydrated ? stored : initialLedger();
  const atRisk = dealAtRisk(rows, cloudDeskDeal);
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
  };
}
