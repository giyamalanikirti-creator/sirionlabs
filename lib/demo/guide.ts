import type { IntentId } from '@/lib/ask/types';
import { deepShift } from '@/lib/demo/timeShift';

/** A question the AskSirion panel suggests during a step. Optional: no step needs it. */
export interface GuideAsk {
  intent: IntentId;
  prompt: string;
}

export const GUIDE_STAGES = deepShift([
  { step: 1, title: 'Connect Microsoft 365', time: '30 Oct · a Sirion admin with a Microsoft 365 admin, once', href: '/setup', instruction: 'Before any email is read, the admins connect Deal Ledger. Turn it on, approve Microsoft 365 access, choose the connected mailboxes and deploy the add-ins. Each row turns green.', hint: 'Work down the checklist.' },
  { step: 2, title: 'Review round', time: '14 Nov · Rohan’s v4 arrives in Ananya’s inbox', href: '/outlook/ananya?msg=M8', instruction: 'v4 is filed in Sirion on its own. Read the round card, then press Respond to round.', hint: 'Open Rohan’s email so the round is read.', ask: [{ intent: 'round_changes', prompt: 'What changed in Rohan’s round 4?' }, { intent: 'agreed_term', prompt: 'What did CloudDesk agree on price?' }] },
  { step: 3, title: 'Resolve side thread', time: 'Two days later · 16 Nov · same inbox', href: '/outlook/ananya?msg=M12', instruction: 'The side thread links itself (with Undo). Send the clarification and Rohan answers in the supplier thread.', hint: 'Send the clarification, or confirm the credit yourself.', ask: [{ intent: 'other_threads', prompt: 'Did anyone else talk to CloudDesk?' }] },
  { step: 4, title: 'Check reply', time: 'Two days later · 18 Nov · same deal, Vikram’s inbox', href: '/outlook/vikram?msg=M13', instruction: 'Reply to Rohan. The draft is filled in: press Send. Loop in Ananya, edit the reply or send anyway; any of the three moves on. The chips above the box show the other cases.', result: '/outlook/vikram?msg=M13&result=warning', hint: 'Press Send on the reply to Rohan.', ask: [{ intent: 'can_i_agree', prompt: 'Can I tell Rohan 99.5% uptime is fine?' }] },
  { step: 5, title: 'Verify signing copy', time: 'The next day · 19 Nov · the clean copy arrives', href: '/word/v6', instruction: 'The check has already run. §9.3 passes company policy but not what Rohan agreed (60 days, if the term is 3 years). Fix all with agreed wording, then send back.', hint: 'Resolve each gap, then send the copy back.', ask: [{ intent: 'signing_match', prompt: 'Does this copy match what we agreed?' }] },
  { step: 6, title: 'See handover', time: 'Two days later · 21 Nov · e-signature complete', href: '/contracts/C-2026-0417?tab=obligations', result: '/contracts/C-2026-0417?tab=invoices', instruction: 'Review what Sirion will track on one screen and save, then follow the signed price to December’s invoice.', hint: 'Review and save the contract.', ask: [{ intent: 'portfolio_at_risk', prompt: 'Which live negotiations would cost the most if signed today?' }] },
] as const satisfies ReadonlyArray<{step: 1 | 2 | 3 | 4 | 5 | 6; title: string; time: string; href: string; result?: string; instruction: string; hint: string; ask?: ReadonlyArray<GuideAsk>}>);

/** After signing: the final, smaller row under step 6. Unlocked when step 6 is done. */
export const AFTER_SIGNING = deepShift({
  step: 7,
  title: 'An invoice that doesn’t match',
  time: 'Dec ’27 · one year later',
  href: '/contracts/C-2026-0417?tab=invoices',
  instruction: 'December’s invoice comes in above the signed price. Raise a dispute: the email quotes clause 9.1 and Rohan’s 14 Nov line.',
  hint: 'Raise and send the dispute.',
  ask: [{ intent: 'invoice_mismatch', prompt: 'Why doesn’t this invoice match?' }] as ReadonlyArray<GuideAsk>,
} as const);

export interface Stage {
  step: number;
  title: string;
  time: string;
  href: string;
  result?: string;
  instruction: string;
  hint: string;
  ask?: ReadonlyArray<GuideAsk>;
}

/** The stage for a walkthrough step: 1 to 6, then After signing (7). */
export function stageOf(step: number): Stage {
  return step === AFTER_SIGNING.step ? AFTER_SIGNING : GUIDE_STAGES[step - 1];
}
