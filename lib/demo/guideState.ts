/**
 * Where the walkthrough is, derived from the demo store and SCRIPT only: no
 * parallel state. A step is done when its script actions are done, or when
 * the demo clock has moved on to the next step's day (Next, Skip and jumps all
 * move the clock, so a skipped step reads as done).
 */
import { stageOf } from './guide';
import { QUICK_ACTIONS } from './quickPath';
import { CALENDAR, SCRIPT, type ScriptAction, type TourState } from './script';
import { STEP_CLOCK } from './steps';

/**
 * Walkthrough steps: 1 Connect Microsoft 365 (the setup checklist), 2 to 6 the
 * negotiation's five moments, 7 After signing. The store's moments (Step 0 to
 * 6 in steps.ts) are unchanged: guide step n ≥ 2 is moment n − 1.
 */
export type GuideStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const GUIDE_STEPS: GuideStep[] = [1, 2, 3, 4, 5, 6, 7];
export const SETUP_STEP = 1 as const;
/** The last main step (handover); After signing comes after it. */
export const MAIN_STEPS = 6;
export const AFTER_STEP = 7 as const;
/** currentStep() once everything is done. */
export const ALL_DONE = 8 as const;
/** The store moment a guide step replays (steps.ts STEP_CLOCK keys). */
export const momentOf = (step: GuideStep) => (step - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AppKey = 'sirion' | 'ananya' | 'vikram' | 'word';

export interface GuideStateInput extends TourState {
  clock: string;
}

export function stepMeta(step: GuideStep) {
  const stage = stageOf(step);
  const day = CALENDAR.find((d) => d.step === step)!;
  return {
    step,
    title: stage.title,
    instruction: stage.instruction,
    href: stage.href,
    date: `${day.day} ${day.month}`,
    app: appOf(SCRIPT[step][0].href),
  };
}

/** Which app a URL belongs to, for the switcher and the app chips. */
export function appOf(href: string): AppKey {
  if (href.startsWith('/outlook/ananya')) return 'ananya';
  if (href.startsWith('/outlook/vikram')) return 'vikram';
  if (href.startsWith('/word')) return 'word';
  return 'sirion';
}

/** An action that doesn't apply on this path (its `when` is false) counts as done and isn't listed. */
export function actionsDone(step: GuideStep, s: GuideStateInput): boolean[] {
  return SCRIPT[step].map((a) => (a.when && !a.when(s) ? true : a.done(s)));
}

/** The actions to list for a step on the path the viewer took. */
export function actionsShown(step: GuideStep, s: GuideStateInput): boolean[] {
  return SCRIPT[step].map((a) => !a.when || a.when(s));
}

/** The setup checklist is complete: all four rows green. */
export function setupComplete(s: GuideStateInput): boolean {
  return Boolean(s.setup?.enabled && s.setup.consented && s.setup.group && s.setup.deployed);
}

/**
 * The walkthrough has moved past this step.
 *  - Step 1 (setup): the checklist is complete and the viewer moved on (Next, or the round has begun).
 *  - Steps 2 to 6: the clock reached the next step's day.
 *  - After signing: its actions are done.
 */
export function stepPassed(step: GuideStep, s: GuideStateInput): boolean {
  if (step === SETUP_STEP) {
    return setupComplete(s) && (s.tourClicks.includes(SETUP_MOVED_ON) || s.clock > STEP_CLOCK[0] || actionsDone(2, s).some(Boolean));
  }
  if (step === AFTER_STEP) return actionsDone(AFTER_STEP, s).every(Boolean);
  return s.clock >= STEP_CLOCK[(momentOf(step) + 1) as 2 | 3 | 4 | 5 | 6];
}

/** Recorded (as a tour click) when the viewer moves on from step 1. */
export const SETUP_MOVED_ON = 'guide:setup-next';

/** Done: every action ticked, or moved past. A done step stays current until Next is pressed. */
export function stepDone(step: GuideStep, s: GuideStateInput): boolean {
  return stepPassed(step, s) || actionsDone(step, s).every(Boolean);
}

/** The first step not yet moved past; ALL_DONE once everything is. */
export function currentStep(s: GuideStateInput): GuideStep | typeof ALL_DONE {
  return GUIDE_STEPS.find((n) => !stepPassed(n, s)) ?? ALL_DONE;
}

/** Main steps done, out of MAIN_STEPS (After signing is extra). */
export function doneCount(s: GuideStateInput): number {
  return GUIDE_STEPS.filter((n) => n <= MAIN_STEPS && stepDone(n, s)).length;
}

/** The one action to do now, if any. */
export function nextAction(s: GuideStateInput): { step: GuideStep; action: ScriptAction; index: number } | null {
  const step = currentStep(s);
  if (step === ALL_DONE) return null;
  const done = actionsDone(step, s);
  const index = done.findIndex((d) => !d);
  return index < 0 ? null : { step, action: SCRIPT[step][index], index };
}

/** Has the walkthrough started (anything beyond the opening state)? */
export function started(s: GuideStateInput): boolean {
  return s.clock > STEP_CLOCK[0] || actionsDone(1, s).some(Boolean) || actionsDone(2, s).some(Boolean);
}

/** What the in-app guidance points at now: the quick path's next action while it runs, otherwise the walkthrough's. */
export type GuideTarget =
  | { kind: 'step'; step: GuideStep; action: ScriptAction; index: number }
  | { kind: 'quick'; action: ScriptAction; index: number };

export function quickDone(s: GuideStateInput): boolean[] {
  return QUICK_ACTIONS.map((a) => a.done(s));
}

export function guideTarget(s: GuideStateInput, quickPath: boolean): GuideTarget | null {
  if (quickPath) {
    const index = quickDone(s).findIndex((d) => !d);
    return index < 0 ? null : { kind: 'quick', action: QUICK_ACTIONS[index], index };
  }
  const n = nextAction(s);
  return n ? { kind: 'step', ...n } : null;
}

/** The current step has every action ticked but the walkthrough hasn't moved on yet: time for "step complete". */
export function stepComplete(s: GuideStateInput): GuideStep | null {
  const step = currentStep(s);
  if (step === ALL_DONE) return null;
  return actionsDone(step, s).every(Boolean) ? step : null;
}
