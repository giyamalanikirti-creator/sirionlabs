'use client';

/**
 * Keep the next step, or an action outside the visible pane, at the top of
 * the app frame.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { useGuideUi } from '@/lib/guideUi';
import { appOf, stepMeta, type GuideStep } from '@/lib/demo/guideState';
import { APPS } from './apps';
import { useGuide, visibleTarget } from './useGuide';

const barClass = 'ds-scope flex min-h-10 shrink-0 items-center gap-3 border-b border-guide-200 bg-guide-50 px-4 py-1 text-[13px] text-ink';
const actionClass = 'guide-solid inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-left text-[12.5px] font-semibold text-white hover:brightness-95';

export function NextBar() {
  const g = useGuide();
  const pathname = usePathname();
  const hidden = useGuideUi((s) => s.hintsHidden);
  const offscreen = useGuideUi((s) => s.offscreenAction);
  const stayed = useGuideUi((s) => s.stayed);
  const stay = useGuideUi((s) => s.stay);
  const action = g.target?.action;
  const want = Boolean(g.hydrated && !hidden && action && offscreen === action.id);
  /* Wait a moment before showing: a page that is still rendering would flash the bar. */
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!want) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hide at once
      setShown(false);
      return;
    }
    const id = window.setTimeout(() => setShown(true), 450);
    return () => window.clearTimeout(id);
  }, [want, pathname]);

  if (g.complete && !hidden) {
    const step = g.complete.kind === 'step' ? g.complete.step : undefined;
    const key = step ? `step-${step}` : 'quick';
    if (stayed.includes(key)) return null;
    const nextTitle = step && step < 6 ? stepMeta((step + 1) as GuideStep).title : undefined;
    const advance = () => {
      if (step === undefined) {
        useDemo.getState().setQuickPath(false);
        g.jumpTo(1);
      } else if (step < 6) {
        g.goNext(step);
      } else {
        stay(key);
        g.goTo('/');
      }
    };
    return (
      <div data-next-bar data-guide-done-card className={barClass}>
        <span role="status" className="flex min-w-0 flex-1 items-center gap-1.5 font-semibold text-guide-700">
          <Check size={16} className="shrink-0" aria-hidden />
          <span className="truncate">{step === undefined ? 'Quick look done' : step === 6 ? 'After signing done' : `Step ${step} done`}</span>
        </span>
        <button data-guide-advance className={actionClass} onClick={advance}>
          {step === undefined ? 'Start the full walkthrough' : nextTitle ? `Next · ${nextTitle}` : 'Back to Home'} <ArrowRight size={14} className="shrink-0" aria-hidden />
        </button>
        <button className="shrink-0 rounded-md px-2 py-1 font-semibold text-muted hover:text-ink" onClick={() => stay(key)}>
          Stay here
        </button>
      </div>
    );
  }

  if (!want || !shown || !action || !g.target) return null;
  const app = APPS[appOf(action.href)];
  const otherApp = appOf(action.href) !== appOf(pathname);
  const where = g.target.kind === 'quick' ? 'Quick look' : `Step ${g.target.step === 6 ? 'after signing' : g.target.step} · ${stepMeta(g.target.step).title}`;

  return (
    <div data-next-bar className={barClass}>
      <span className="hidden shrink-0 text-[12px] font-semibold text-guide-700 lg:inline">{where}</span>
      <span className="min-w-0 flex-1 truncate">
        Next: <strong className="font-semibold">{action.label}</strong>
        {otherApp && <> in {app.label}</>}
      </span>
      <button
        onClick={() => {
          if (!otherApp && visibleTarget(action.target)) g.doAction(action);
          else g.openAction(action);
        }}
        className={actionClass}
      >
        {otherApp ? `Open ${app.label}` : 'Go there'} <ArrowRight size={14} />
      </button>
    </div>
  );
}
