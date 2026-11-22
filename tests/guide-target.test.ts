/** Walkthrough brief A2: one next action at a time, from SCRIPT and the quick path, with routes through tabs. */
import { describe, expect, it } from 'vitest';
import { currentStep, guideTarget, stepComplete, type GuideStateInput } from '@/lib/demo/guideState';
import { SCRIPT } from '@/lib/demo/script';
import { QUICK_ACTIONS } from '@/lib/demo/quickPath';
import { STEP_CLOCK } from '@/lib/demo/steps';
import { ledgerAtStep } from '@/lib/demo/steps';

const CONNECTED = { enabled: true, consented: true, group: true, deployed: true };

const base = (over: Partial<GuideStateInput> = {}): GuideStateInput => ({
  clock: STEP_CLOCK[1],
  readMessageIds: [],
  respondedMessageIds: [],
  syncedVersionIds: [],
  tourClicks: [],
  linkedThreadIds: [],
  ledger: ledgerAtStep(1),
  completedSteps: [],
  sendOutcomes: [],
  signing: { inserted: [] },
  invoiceFastForward: false,
  ...over,
});

describe('guide target', () => {
  it('starts with the Microsoft 365 connection (step 1), then the round (step 2)', () => {
    const fresh = base({ clock: STEP_CLOCK[0] });
    expect(currentStep(fresh)).toBe(1);
    expect(guideTarget(fresh, false)?.action.target).toBe('setup-enable');
    const connected = base({ clock: STEP_CLOCK[0], setup: CONNECTED });
    expect(guideTarget(connected, false)?.action.id).toBe(undefined);
    expect(stepComplete(connected)).toBe(1);
    const movedOn = base({ clock: STEP_CLOCK[0], setup: CONNECTED, tourClicks: ['guide:setup-next'] });
    expect(currentStep(movedOn)).toBe(2);
    expect(guideTarget(movedOn, false)?.action.id).toBe('2a');
  });

  it('serves the walkthrough action, then the quick path action while it runs', () => {
    const q = guideTarget(base(), true);
    expect(q?.kind).toBe('quick');
    expect(q?.action.target).toBe('quick-check');
    const q2 = guideTarget(base({ tourClicks: ['quick-check'] }), true);
    expect(q2?.action.target).toBe('propose-9.3');
  });

  it('every action names a target and a page; Word and contract actions declare the tab in front', () => {
    for (const a of [...Object.values(SCRIPT).flat(), ...QUICK_ACTIONS]) {
      expect(a.target).toBeTruthy();
      expect(a.href.startsWith('/')).toBe(true);
      if (a.href.startsWith('/word')) expect(a.via?.[0]?.target).toBe('word-tab-review');
      if (a.href.startsWith('/contracts') && a.id !== 'q3') expect(a.via?.[0]?.target).toMatch(/^tab-/);
    }
  });

  it('reports a step complete once its actions are done, before the clock moves on', () => {
    expect(stepComplete(base())).toBeNull();
    const done = base({ setup: CONNECTED, readMessageIds: ['M8'], tourClicks: ['compare-14.2'], respondedMessageIds: ['M8'], syncedVersionIds: ['v4', 'v5'] });
    expect(stepComplete(done)).toBe(2);
    expect(guideTarget(done, false)).toBeNull();
  });
});
