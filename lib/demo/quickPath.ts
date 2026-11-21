/**
 * The quick path (review fix B3): three actions that open on the §9.3 hero
 * and finish on the renewal line in the handover. It reuses the walkthrough's
 * skip logic and saved results; the full five steps are unchanged.
 */
import type { TourState } from './script';

export interface QuickAction {
  id: string;
  label: string;
  done: (s: TourState & { contract?: unknown }) => boolean;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'q1', label: 'Check signing copy', done: (s) => s.tourClicks.includes('quick-check') || s.tourClicks.includes('issue-9.3') },
  { id: 'q2', label: 'Propose 60 days', done: (s) => s.signing.inserted.includes('payment' as never) },
  { id: 'q3', label: 'See what it drives after signing', done: (s) => s.tourClicks.includes('handover-renewal') },
];

export const QUICK_INTRO =
  'You are Ananya, procurement lead at Meridian Foods. CloudDesk says the final draft is ready to sign. Check whether it contains the terms you agreed.';

export const OPENING_LINE = 'Before you sign, check the supplier’s final draft against what your team actually agreed in email.';
