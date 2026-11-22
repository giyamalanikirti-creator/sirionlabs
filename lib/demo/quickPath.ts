/**
 * The quick path (review fix B3): three actions that open on the §9.3 hero
 * and finish on the renewal line in the handover. It reuses the walkthrough's
 * skip logic and saved results; the full five steps are unchanged.
 */
import type { ScriptAction } from './script';

/** Same shape as a walkthrough action, so the coach mark, the in-frame bar and the switcher treat both alike. */
export type QuickAction = ScriptAction;

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'q1', label: 'Check signing copy', target: 'quick-check', href: '/outlook/ananya?msg=M14', done: (s) => s.tourClicks.includes('quick-check') || s.tourClicks.includes('issue-9.3') },
  {
    id: 'q2',
    label: 'Propose 60 days',
    target: 'propose-9.3',
    via: [
      { target: 'word-tab-review', label: 'Review tab' },
      { target: 'issue-9.3', label: 'Open the payment card (§9.3)' },
    ],
    href: '/word/v6?from=sirion&clause=9.3',
    done: (s) => s.signing.inserted.includes('payment' as never),
  },
  { id: 'q3', label: 'See what it drives after signing', target: 'handover-renewal', href: '/contracts/C-2026-0417?tab=obligations&focus=renewal', done: (s) => s.tourClicks.includes('handover-renewal') },
];

export const QUICK_INTRO =
  'You are Ananya, procurement lead at Meridian Foods. CloudDesk says the final draft is ready to sign. Check whether it contains the terms you agreed.';

export const OPENING_LINE = 'Before you sign, check the supplier’s final draft against what your team actually agreed in email.';
