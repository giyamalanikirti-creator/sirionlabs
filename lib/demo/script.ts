/**
 * The walkthrough as a script: for each step, the buttons to press in order.
 * Each action names the element it points at (data-tour="…") and says when it
 * counts as done, from the demo state. The rail lists them; the coach mark
 * rings the next one on the page, or the first visible step on the way to it
 * (a closed disclosure, an inactive tab: see `via`).
 */
import type { EmailMessage, LedgerRow } from '@/lib/types';
import { STEP_CLOCK } from './steps';
import { sh, shiftText } from './timeShift';
import { formatDateShort } from '@/lib/format';

export interface TourState {
  /** The Microsoft 365 connection checklist (step 1). */
  setup?: { enabled: boolean; consented: boolean; group: boolean; deployed: boolean };
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

/** A step on the way to a target that may be hidden: a tab or a card that has to be opened first. */
export interface TourVia {
  /** The data-tour value of the tab, link or disclosure trigger. */
  target: string;
  /** What the coach mark says on it: "Review tab", "Open the payment card (§9.3)". */
  label: string;
}

export interface ScriptAction {
  id: string;
  label: string;
  /** The data-tour value of the element to press. */
  target: string;
  /** Tabs or disclosures in front of the target, outermost first. Closed <details> are found on their own. */
  via?: TourVia[];
  /** Where the element lives, so a chip can take you there. */
  href: string;
  done: (s: TourState) => boolean;
  /** Only part of the step on one path (Vikram chose Edit reply); otherwise skipped and not listed. */
  when?: (s: TourState) => boolean;
}

const WORD_REVIEW: TourVia[] = [{ target: 'word-tab-review', label: 'Review tab' }];
const OBLIGATIONS: TourVia[] = [{ target: 'tab-obligations', label: 'Obligations tab' }];
const INVOICES: TourVia[] = [{ target: 'tab-invoices', label: 'Invoices tab' }];

/** Vikram chose Edit reply at the Send check: two more actions before step 3 is done. */
const choseEdit = (s: TourState) => s.sendOutcomes.some((o) => o.personId === 'vikram' && o.choice === 'edit');

const creditAgreed = (s: TourState) => s.ledger.some((r) => r.id === 'R-credit' && r.state === 'agreed');

export const SCRIPT: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, ScriptAction[]> = {
  /* Step 1: the Microsoft 365 connection, the four rows of the setup checklist. */
  1: [
    { id: '1a', label: 'Turn on Deal Ledger', target: 'setup-enable', href: '/setup', done: (s) => Boolean(s.setup?.enabled) },
    { id: '1b', label: 'Approve Microsoft 365 access', target: 'm365-accept', href: '/m365/consent', done: (s) => Boolean(s.setup?.consented) },
    { id: '1c', label: 'Choose the connected mailboxes', target: 'setup-group', href: '/setup', done: (s) => Boolean(s.setup?.group) },
    { id: '1d', label: 'Deploy the Outlook and Word add-ins', target: 'm365-deploy', href: '/m365/integrated-apps', done: (s) => Boolean(s.setup?.deployed) },
  ],
  2: [
    { id: '2a', label: shiftText('Open Rohan’s email (14 Nov)'), target: 'msg-M8', href: '/outlook/ananya?msg=M8', done: (s) => s.readMessageIds.includes('M8') },
    { id: '2b', label: 'Compare clause 14.2', target: 'compare-14.2', href: '/outlook/ananya?msg=M8', done: (s) => s.tourClicks.includes('compare-14.2') || s.respondedMessageIds.includes('M8') },
    { id: '2c', label: 'Respond to round', target: 'respond-round', href: '/outlook/ananya?msg=M8', done: (s) => s.respondedMessageIds.includes('M8') },
    { id: '2d', label: 'Send the reply with v5', target: 'compose-send', href: '/outlook/ananya?msg=M8', done: (s) => s.syncedVersionIds.includes('v5') },
  ],
  3: [
    { id: '3a', label: shiftText('Open “fine with that” (16 Nov)'), target: 'msg-M12', href: '/outlook/ananya?msg=M12', done: (s) => s.readMessageIds.includes('M12') },
    { id: '3b', label: 'Draft clarification', target: 'send-clarification', href: '/outlook/ananya?msg=M12', done: (s) => s.tourClicks.includes('send-clarification') || Boolean(s.clarifySentAt) || creditAgreed(s) },
    { id: '3c', label: 'Send it to Rohan', target: 'compose-send', href: '/outlook/ananya?msg=M12', done: (s) => Boolean(s.clarifySentAt) || creditAgreed(s) },
  ],
  4: [
    { id: '4a', label: shiftText('Open Rohan’s price ask (18 Nov)'), target: 'msg-M13', href: '/outlook/vikram?msg=M13', done: (s) => s.readMessageIds.includes('M13') },
    { id: '4b', label: 'Reply (draft is filled in)', target: 'reply', href: '/outlook/vikram?msg=M13', done: (s) => s.tourClicks.includes('reply') || s.sendOutcomes.some((o) => o.personId === 'vikram') },
    { id: '4c', label: 'Press Send', target: 'compose-send', href: '/outlook/vikram?msg=M13', done: (s) => s.sendOutcomes.some((o) => o.personId === 'vikram') },
    { id: '4d', label: 'Loop in, edit or send anyway', target: 'guard-actions', href: '/outlook/vikram?msg=M13', done: (s) => s.completedSteps.includes(3) || choseEdit(s) },
    { id: '4e', label: 'Risky reply: use the suggested wording', target: 'use-suggested-wording', href: '/outlook/vikram?msg=M13', when: choseEdit, done: (s) => s.completedSteps.includes(3) || s.tourClicks.includes('use-suggested-wording') },
    { id: '4f', label: 'Send the edited reply', target: 'compose-send', href: '/outlook/vikram?msg=M13', when: choseEdit, done: (s) => s.completedSteps.includes(3) },
  ],
  5: [
    { id: '5a', label: 'Click the §9.3 payment card in the Deal Ledger pane', target: 'issue-9.3', via: WORD_REVIEW, href: '/word/v6?from=sirion&clause=9.3', done: (s) => s.tourClicks.includes('issue-9.3') || s.tourClicks.includes('issue-9.1') || s.signing.inserted.length > 0 },
    { id: '5b', label: 'Fix all with agreed wording', target: 'insert-all', via: WORD_REVIEW, href: '/word/v6?from=sirion', done: (s) => s.signing.inserted.length >= 3 || Boolean(s.signing.sentBackAt) },
    { id: '5c', label: 'Send back to CloudDesk', target: 'send-back', via: WORD_REVIEW, href: '/word/v6?from=sirion', done: (s) => Boolean(s.signing.sentBackAt) },
  ],
  6: [
    { id: '6a', label: 'Review and save', target: 'review-save', via: OBLIGATIONS, href: '/contracts/C-2026-0417?tab=obligations', done: (s) => Boolean(s.contract) },
  ],
  7: [
    { id: '7a', label: 'Go to December’s invoice', target: 'tour-invoice', via: INVOICES, href: '/contracts/C-2026-0417?tab=invoices', done: (s) => s.invoiceFastForward },
    { id: '7b', label: 'Raise dispute', target: 'raise-dispute', via: INVOICES, href: '/contracts/C-2026-0417?tab=invoices', done: (s) => s.tourClicks.includes('raise-dispute') || Boolean(s.disputeEmail) },
    { id: '7c', label: 'Send the dispute', target: 'send-dispute', via: INVOICES, href: '/contracts/C-2026-0417?tab=invoices', done: (s) => Boolean(s.disputeEmail) },
  ],
};

/** A calendar day from the clock: "14", "Nov" (or "Dec ’27" once the year moves on). */
function calDay(iso: string, baseYear: string) {
  const [day, month] = formatDateShort(iso).split(' ');
  return { day, month: iso.slice(0, 4) === baseYear ? month : `${month} ’${iso.slice(2, 4)}` };
}

const PREQUEL = sh('2026-11-01T11:30:00+05:30');
/** The admins connect Deal Ledger before the first email is tracked. */
const SETUP_DAY = sh('2026-10-30T10:00:00+05:30');
const BASE_YEAR = STEP_CLOCK[1].slice(0, 4);

/** The walkthrough's days, for the calendar in the rail. Computed from the clock, so they follow the real date. */
export const CALENDAR = [
  { key: 'prequel', ...calDay(PREQUEL, BASE_YEAR), label: 'Tracking starts', clock: PREQUEL, href: '/outlook/ananya?msg=M1&prequel=1', step: 0 },
  { key: 'setup', ...calDay(SETUP_DAY, BASE_YEAR), label: 'Connected', clock: SETUP_DAY, href: '/setup', step: 1 },
  { key: 's1', ...calDay(STEP_CLOCK[1], BASE_YEAR), label: 'Round 4', clock: STEP_CLOCK[1], href: '/outlook/ananya?msg=M8', step: 2 },
  { key: 's2', ...calDay(STEP_CLOCK[2], BASE_YEAR), label: 'Side thread', clock: STEP_CLOCK[2], href: '/outlook/ananya?msg=M12', step: 3 },
  { key: 's3', ...calDay(STEP_CLOCK[3], BASE_YEAR), label: 'Vikram replies', clock: STEP_CLOCK[3], href: '/outlook/vikram?msg=M13', step: 4 },
  { key: 's4', ...calDay(STEP_CLOCK[4], BASE_YEAR), label: 'Signing copy', clock: STEP_CLOCK[4], href: '/word/v6?from=sirion', step: 5 },
  { key: 's5', ...calDay(STEP_CLOCK[5], BASE_YEAR), label: 'Signed', clock: STEP_CLOCK[5], href: '/contracts/C-2026-0417?tab=obligations', step: 6 },
  { key: 's6', ...calDay(STEP_CLOCK[6], BASE_YEAR), label: 'Invoice', clock: STEP_CLOCK[6], href: '/contracts/C-2026-0417?tab=invoices', step: 7 },
] as const;
