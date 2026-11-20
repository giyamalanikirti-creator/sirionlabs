/**
 * The walkthrough as a script: for each step, the buttons to press in order.
 * Each action names the element it points at (data-tour="…") and says when it
 * counts as done, from the demo state. The script bar at the bottom of the
 * screen shows these as chips (grey when done, pulsing green for the next one)
 * and pulses the matching button on the page.
 */
import type { EmailMessage, LedgerRow } from '@/lib/types';
import { STEP_CLOCK } from './steps';

export interface TourState {
  readMessageIds: string[];
  respondedMessageIds: string[];
  syncedVersionIds: string[];
  tourClicks: string[];
  linkedThreadIds: string[];
  clarifySentAt?: string;
  ledger: LedgerRow[];
  completedSteps: number[];
  sendOutcomes: { personId: string; decision: string; choice?: string }[];
  signing: { inserted: string[]; sentBackAt?: string; checkedAt?: string };
  contract?: unknown;
  invoiceFastForward: boolean;
  disputeEmail?: EmailMessage;
}

export interface ScriptAction {
  id: string;
  label: string;
  /** The data-tour value of the element to press. */
  target: string;
  /** Where the element lives, so a chip can take you there. */
  href: string;
  done: (s: TourState) => boolean;
}

const creditAgreed = (s: TourState) => s.ledger.some((r) => r.id === 'R-credit' && r.state === 'agreed');

export const SCRIPT: Record<1 | 2 | 3 | 4 | 5, ScriptAction[]> = {
  1: [
    { id: '1a', label: 'Open Rohan’s email (14 Nov)', target: 'msg-M8', href: '/outlook/ananya?msg=M8', done: (s) => s.readMessageIds.includes('M8') },
    { id: '1b', label: 'Compare clause 14.2', target: 'compare-14.2', href: '/outlook/ananya?msg=M8', done: (s) => s.tourClicks.includes('compare-14.2') || s.respondedMessageIds.includes('M8') },
    { id: '1c', label: 'Respond to round', target: 'respond-round', href: '/outlook/ananya?msg=M8', done: (s) => s.respondedMessageIds.includes('M8') },
    { id: '1d', label: 'Send the reply with v5', target: 'compose-send', href: '/outlook/ananya?msg=M8', done: (s) => s.syncedVersionIds.includes('v5') },
  ],
  2: [
    { id: '2a', label: 'Open “fine with that” (16 Nov)', target: 'msg-M12', href: '/outlook/ananya?msg=M12', done: (s) => s.readMessageIds.includes('M12') },
    { id: '2b', label: 'Send clarification', target: 'send-clarification', href: '/outlook/ananya?msg=M12', done: (s) => s.tourClicks.includes('send-clarification') || Boolean(s.clarifySentAt) || creditAgreed(s) },
    { id: '2c', label: 'Send it to Rohan', target: 'compose-send', href: '/outlook/ananya?msg=M12', done: (s) => Boolean(s.clarifySentAt) || creditAgreed(s) },
  ],
  3: [
    { id: '3a', label: 'Open Rohan’s price ask (18 Nov)', target: 'msg-M13', href: '/outlook/vikram?msg=M13', done: (s) => s.readMessageIds.includes('M13') },
    { id: '3b', label: 'Reply (draft is filled in)', target: 'reply', href: '/outlook/vikram?msg=M13', done: (s) => s.tourClicks.includes('reply') || s.sendOutcomes.some((o) => o.personId === 'vikram') },
    { id: '3c', label: 'Press Send', target: 'compose-send', href: '/outlook/vikram?msg=M13', done: (s) => s.sendOutcomes.some((o) => o.personId === 'vikram') },
    { id: '3d', label: 'Loop in, edit or send anyway', target: 'guard-actions', href: '/outlook/vikram?msg=M13', done: (s) => s.completedSteps.includes(3) },
  ],
  4: [
    { id: '4a', label: 'Open the price gap', target: 'issue-9.1', href: '/word/v6?from=sirion', done: (s) => s.tourClicks.includes('issue-9.1') || s.signing.inserted.length > 0 },
    { id: '4b', label: 'Fix all with agreed wording', target: 'insert-all', href: '/word/v6?from=sirion', done: (s) => s.signing.inserted.length >= 3 || Boolean(s.signing.sentBackAt) },
    { id: '4c', label: 'Send back to CloudDesk', target: 'send-back', href: '/word/v6?from=sirion', done: (s) => Boolean(s.signing.sentBackAt) },
  ],
  5: [
    { id: '5a', label: 'Review and save', target: 'review-save', href: '/contracts/C-2026-0417?tab=obligations', done: (s) => Boolean(s.contract) },
    { id: '5b', label: 'Go to December’s invoice', target: 'tour-invoice', href: '/contracts/C-2026-0417?tab=invoices', done: (s) => s.invoiceFastForward },
    { id: '5c', label: 'Raise dispute', target: 'raise-dispute', href: '/contracts/C-2026-0417?tab=invoices', done: (s) => s.tourClicks.includes('raise-dispute') || Boolean(s.disputeEmail) },
    { id: '5d', label: 'Send the dispute', target: 'send-dispute', href: '/contracts/C-2026-0417?tab=invoices', done: (s) => Boolean(s.disputeEmail) },
  ],
};

/** The walkthrough's days, for the calendar in the script bar. */
export const CALENDAR = [
  { key: 'prequel', day: '1', month: 'Nov', label: 'Tracking starts', clock: '2026-11-01T11:30:00+05:30', href: '/outlook/ananya?msg=M1&prequel=1', step: 0 },
  { key: 's1', day: '14', month: 'Nov', label: 'Round 4', clock: STEP_CLOCK[1], href: '/outlook/ananya?msg=M8', step: 1 },
  { key: 's2', day: '16', month: 'Nov', label: 'Side thread', clock: STEP_CLOCK[2], href: '/outlook/ananya?msg=M12', step: 2 },
  { key: 's3', day: '18', month: 'Nov', label: 'Vikram replies', clock: STEP_CLOCK[3], href: '/outlook/vikram?msg=M13', step: 3 },
  { key: 's4', day: '19', month: 'Nov', label: 'Signing copy', clock: STEP_CLOCK[4], href: '/word/v6?from=sirion', step: 4 },
  { key: 's5', day: '21', month: 'Nov', label: 'Signed', clock: STEP_CLOCK[5], href: '/contracts/C-2026-0417?tab=obligations', step: 5 },
  { key: 's6', day: '5', month: 'Dec ’27', label: 'Invoice', clock: STEP_CLOCK[6], href: '/contracts/C-2026-0417?tab=invoices', step: 6 },
] as const;
