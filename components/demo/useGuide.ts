'use client';

/** One hook for the rail, the app switcher and the coach mark. Reads the store; no state of its own. */
import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { useGuideUi } from '@/lib/guideUi';
import {
  actionsDone,
  actionsShown,
  currentStep,
  doneCount,
  guideTarget,
  nextAction,
  quickDone,
  stepComplete,
  started,
  stepDone,
  stepMeta,
  setupComplete,
  momentOf,
  SETUP_STEP,
  SETUP_MOVED_ON,
  WALKTHROUGH_STARTED,
  AFTER_STEP,
  ALL_DONE,
  type GuideStateInput,
  type GuideStep,
} from '@/lib/demo/guideState';
import { SCRIPT as SCRIPT_ALL, type ScriptAction } from '@/lib/demo/script';
import { STEP_CLOCK } from '@/lib/demo/steps';

export function visibleTarget(target: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].find((el) => el.offsetParent !== null);
}

export function useGuide() {
  const router = useRouter();
  const hydrated = useHydrated();
  const state = useDemo() as unknown as GuideStateInput;
  const s = state;

  const quickPath = useDemo((st) => st.quickPath);
  const current = hydrated ? currentStep(s) : 1;
  const next = hydrated ? nextAction(s) : null;
  /** What the in-app guidance points at: the quick path's action while it runs, else the walkthrough's. */
  const target = hydrated ? guideTarget(s, quickPath) : null;
  /** A step (or the quick path) whose actions are all done, waiting for the viewer to move on. */
  const complete: { kind: 'step'; step: GuideStep } | { kind: 'quick' } | null = !hydrated
    ? null
    : quickPath
      ? quickDone(s).every(Boolean) ? { kind: 'quick' } : null
      : (() => {
          const st = stepComplete(s) ?? (currentStep(s) === ALL_DONE ? AFTER_STEP : null);
          return st ? { kind: 'step' as const, step: st } : null;
        })();

  const goTo = (href: string) => router.push(href);

  /** Step 1: the Microsoft 365 connection. Anything later needs it done (from saved results if skipped). */
  const ensureSetup = () => {
    const demo = useDemo.getState();
    if (!setupComplete(demo as unknown as GuideStateInput)) demo.updateSetup({ enabled: true, consented: true, group: true, deployed: true });
  };

  /** The handover (step 6) needs the corrected copy sent back: complete the signing step from saved results if it isn't. */
  const prepareHandover = () => {
    const demo = useDemo.getState();
    if (demo.signing.sentBackAt) return;
    demo.advanceTo(4);
    demo.runSigningCheck();
    demo.insertAll();
    demo.sendBack();
  };
  /** The handover happens on 21 Nov: moving to step 6 moves the clock there. */
  const toHandoverDay = () => {
    const demo = useDemo.getState();
    if (demo.clock < STEP_CLOCK[5]) demo.setClock(STEP_CLOCK[5]);
  };

  /** Quick path (review fix B3): the step 4 state on 19 Nov, opened on CloudDesk's "ready to sign" email. */
  const startQuickPath = () => {
    const demo = useDemo.getState();
    ensureSetup();
    demo.setQuickPath(true);
    demo.previewStage(4);
    demo.setQuickPath(true);
    goTo('/outlook/ananya?msg=M14');
  };
  const quickAction = (index: number) => {
    const demo = useDemo.getState();
    if (index === 0) goTo('/word/v6?from=sirion&clause=9.3');
    else if (index === 1) goTo('/word/v6?from=sirion&clause=9.3');
    else {
      // What the clause drives after signing: the renewal line in the handover.
      if (!demo.contract) {
        /* advanceTo replays from saved results and clears tour clicks: keep the quick path's own ticks. */
        const clicks = demo.tourClicks;
        demo.advanceTo(5);
        demo.saveToSirion();
        demo.setQuickPath(true);
        clicks.forEach((id) => useDemo.getState().markTour(id));
      }
      goTo('/contracts/C-2026-0417?tab=obligations&focus=renewal');
    }
  };

  /**
   * Move on from a step: finish it from saved results if needed, then open the next step.
   * Guide step n ≥ 2 replays store moment n − 1 (see guideState).
   */
  const goNext = (from: GuideStep) => {
    const demo = useDemo.getState();
    ensureSetup();
    if (from === SETUP_STEP) {
      demo.markTour(SETUP_MOVED_ON);
      goTo(stepMeta(2).href);
    } else if (from === 5) {
      prepareHandover();
      toHandoverDay();
      goTo(stepMeta(6).href);
    } else if (from <= 4) {
      const m = momentOf(from) as 1 | 2 | 3;
      if (!stepDone(from, s)) demo.advanceTo(m);
      demo.startStage((m + 1) as 2 | 3 | 4);
      goTo(stepMeta((from + 1) as GuideStep).href);
    } else if (from === 6) {
      if (!demo.contract) demo.previewStage(5);
      else demo.fastForwardInvoice();
      goTo(stepMeta(AFTER_STEP).href);
    }
  };

  /** Jump to any step; earlier steps are completed from saved results. Step 1 starts the walkthrough over. */
  const jumpTo = (step: GuideStep) => {
    const demo = useDemo.getState();
    if (step === SETUP_STEP) {
      demo.advanceTo(0);
      demo.resetSetup();
      useDemo.getState().markTour(WALKTHROUGH_STARTED);
    } else {
      ensureSetup();
      if (step === AFTER_STEP) {
        if (!demo.contract) demo.previewStage(5);
        else demo.fastForwardInvoice();
      } else if (step === 6) {
        prepareHandover();
        toHandoverDay();
      } else {
        demo.startStage(momentOf(step) as 1 | 2 | 3 | 4, true);
        /* Step 2 starts on the setup's far side: record that step 1 was left behind. */
        useDemo.getState().markTour(SETUP_MOVED_ON);
      }
    }
    goTo(stepMeta(step).href);
  };

  /** Take the viewer to where an action happens: the quick path's own moves, or the action's page. */
  const openAction = (a: ScriptAction) => {
    const qi = target?.kind === 'quick' && target.action.id === a.id ? target.index : -1;
    if (qi >= 0) quickAction(qi);
    else goTo(a.href);
  };

  /** Revisit a done step without changing anything. */
  const revisit = (step: GuideStep) => goTo(stepMeta(step).href);

  /** Go to an action: scroll to its element if it is on screen, otherwise open its page. */
  const doAction = (a: ScriptAction) => {
    useGuideUi.getState().dismissAction(undefined);
    const el = visibleTarget(a.target);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else goTo(a.href);
  };

  return {
    hydrated,
    state: s,
    current,
    next,
    target,
    complete,
    quickPath: hydrated && quickPath,
    openAction,
    doneCount: hydrated ? doneCount(s) : 0,
    started: hydrated ? started(s) : false,
    stepDone: (n: GuideStep) => (hydrated ? stepDone(n, s) : false),
    actionsDone: (n: GuideStep) => (hydrated ? actionsDone(n, s) : []),
    actionsShown: (n: GuideStep) => (hydrated ? actionsShown(n, s) : SCRIPT_ALL[n].map((a) => !a.when)),
    goNext,
    startQuickPath,
    jumpTo,
    revisit,
    doAction,
    goTo,
  };
}
