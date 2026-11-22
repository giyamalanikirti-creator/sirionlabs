/** The demo store at each walkthrough step, for the "Negotiation so far" tests and the review doc. */
import { vi } from 'vitest';
import { STEP_CLOCK, ledgerAtStep, stepTwoAfterLink, stepTwoBeforeLink } from '@/lib/demo/steps';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
const { useDemo } = await import('@/lib/store');
export { useDemo };

export type StateKey = 'step1' | 'step2' | 'step3-loop-in' | 'step3-send-anyway' | 'step4' | 'step5';

/** Put the store where the walkthrough leaves it at each step. */
export function setStep(key: StateKey) {
  const d = useDemo.getState();
  if (key === 'step1') d.advanceTo(1);
  if (key === 'step2') {
    d.advanceTo(1);
    const rows = stepTwoAfterLink(stepTwoBeforeLink(ledgerAtStep(1)).rows).rows;
    useDemo.setState({ clock: STEP_CLOCK[2], ledger: rows, linkedThreadIds: ['T2'] });
  }
  if (key === 'step3-loop-in') {
    d.advanceTo(3);
    useDemo.getState().setTermHold('price', 'waiting_lead');
    useDemo.getState().recordSend({ at: STEP_CLOCK[3], personId: 'vikram', termKey: 'price', decision: 'warn', choice: 'loop_in', guardCase: 'reopen' });
  }
  if (key === 'step3-send-anyway') {
    d.advanceTo(3);
    const row = useDemo.getState().ledger.find((r) => r.id === 'R-price')!;
    useDemo.getState().sendConcession('price', { kind: 'price', wording: 'open_yearly', fromYear: 2 }, 'Yearly price revision is fine with us.', 'vikram', 'Go-live depends on it');
    useDemo.getState().requestApproval({ kind: 'send_anyway', rowId: row.id, termKey: 'price', label: row.label, change: 'told the supplier', costLakhPerYr: 3.9, requestedById: 'vikram', reason: 'Go-live depends on it' });
    useDemo.getState().setTermHold('price', 'conceded_pending');
    useDemo.getState().recordSend({ at: STEP_CLOCK[3], personId: 'vikram', termKey: 'price', decision: 'warn', choice: 'send_anyway', guardCase: 'reopen', reason: 'Go-live depends on it' });
  }
  if (key === 'step4') {
    d.advanceTo(4);
    useDemo.getState().runSigningCheck();
  }
  if (key === 'step5') d.advanceTo(5);
  return useDemo.getState();
}
