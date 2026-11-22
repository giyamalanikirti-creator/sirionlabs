/**
 * Where the walkthrough is, derived from the demo store and SCRIPT only: no
 * parallel state. A step is done when its script actions are done, or when
 * the demo clock has moved on to the next step's day (Next, Skip and jumps all
 * move the clock, so a skipped step reads as done).
 */
import { AFTER_SIGNING, GUIDE_STAGES } from './guide';
import { QUICK_ACTIONS } from './quickPath';
import { CALENDAR, SCRIPT, type ScriptAction, type TourState } from './script';
import { STEP_CLOCK } from './steps';

export type GuideStep = 1 | 2 | 3 | 4 | 5 | 6;
export const GUIDE_STEPS: GuideStep[] = [1, 2, 3, 4, 5, 6];

export type AppKey = 'sirion' | 'ananya' | 'vikram' | 'word';

export interface GuideStateInput extends TourState {
  clock: string;
}

export function stepMeta(step: GuideStep) {
  const stage = step === 6 ? AFTER_SIGNING : GUIDE_STAGES[step - 1];
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

export function actionsDone(step: GuideStep, s: GuideStateInput): boolean[] {
  return SCRIPT[step].map((a) => a.done(s));
}

/** The walkthrough has moved past this step: the clock reached the next step's day (or, for the last row, it is finished). */
export function stepPassed(step: GuideStep, s: GuideStateInput): boolean {
  if (step === 6) return actionsDone(6, s).every(Boolean);
  return s.clock >= STEP_CLOCK[(step + 1) as 2 | 3 | 4 | 5 | 6];
}

/** Done: every action ticked, or moved past. A done step stays current until Next is pressed. */
export function stepDone(step: GuideStep, s: GuideStateInput): boolean {
  return stepPassed(step, s) || actionsDone(step, s).every(Boolean);
}

/** The first step not yet moved past; 7 once everything is. */
export function currentStep(s: GuideStateInput): GuideStep | 7 {
  return GUIDE_STEPS.find((n) => !stepPassed(n, s)) ?? 7;
}

export function doneCount(s: GuideStateInput): number {
  return ([1, 2, 3, 4, 5] as GuideStep[]).filter((n) => stepDone(n, s)).length;
}

/** The one action to do now, if any. */
export function nextAction(s: GuideStateInput): { step: GuideStep; action: ScriptAction; index: number } | null {
  const step = currentStep(s);
  if (step === 7) return null;
  const done = actionsDone(step, s);
  const index = done.findIndex((d) => !d);
  return index < 0 ? null : { step, action: SCRIPT[step][index], index };
}

/** Has the walkthrough started (anything beyond the opening state)? */
export function started(s: GuideStateInput): boolean {
  return s.clock > STEP_CLOCK[0] || actionsDone(1, s).some(Boolean);
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
  if (step === 7) return null;
  return actionsDone(step, s).every(Boolean) ? step : null;
}
