'use client';

/** "Negotiation so far" from the demo store, following the clock like the home page. Null until hydrated. */
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { buildNegotiationSummary, type NegotiationSummary, type SummaryMode } from '@/lib/engines/negotiationSummary';

export function useNegotiationSummary(mode: SummaryMode = 'deal'): NegotiationSummary | null {
  const hydrated = useHydrated();
  const clock = useDemo((s) => s.clock);
  const ledger = useDemo((s) => s.ledger);
  const syncedVersionIds = useDemo((s) => s.syncedVersionIds);
  const signedAt = useDemo((s) => s.signedAt);
  const sendOutcomes = useDemo((s) => s.sendOutcomes);
  const approvals = useDemo((s) => s.approvals);
  const termHolds = useDemo((s) => s.termHolds);
  const signing = useDemo((s) => s.signing);
  if (!hydrated) return null;
  return buildNegotiationSummary({ clock, ledger, syncedVersionIds, signedAt, sendOutcomes, approvals, termHolds, signing }, 'D-CLOUDDESK', clock, mode);
}
