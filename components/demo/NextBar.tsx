'use client';

/**
 * The in-frame bar (walkthrough brief A3): a slim bar at the top of the app
 * frame that pushes the app down rather than covering it. It shows when
 *  - the next action is in another app, or on a page this screen can't reach;
 *  - a step is done and the viewer chose "Stay here" on its card: the next
 *    step stays one click away, so guidance never stops.
 * Copy comes from SCRIPT, the quick path and GUIDE_STAGES.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { useGuideUi } from '@/lib/guideUi';
import { appOf, stepMeta, type GuideStep } from '@/lib/demo/guideState';
import { APPS } from './apps';
import { useGuide } from './useGuide';

export function NextBar() {
  const g = useGuide();
  const router = useRouter();
  const pathname = usePathname();
  const hidden = useGuideUi((s) => s.hintsHidden);
  const offscreen = useGuideUi((s) => s.offscreenAction);
  const stayed = useGuideUi((s) => s.stayed);
  const action = g.target?.action;
  const c = g.complete;
  const doneKey = c ? (c.kind === 'quick' ? 'quick' : `step-${c.step}`) : undefined;
  const mode: 'action' | 'done' | null = !g.hydrated || hidden
    ? null
    : action && offscreen === action.id
      ? 'action'
      : c && doneKey && stayed.includes(doneKey) && !(c.kind === 'step' && c.step === 6 && pathname === '/')
        ? 'done'
        : null;
  /* Wait a moment before showing: a page that is still rendering would flash the bar. */
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!mode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hide at once
      setShown(false);
      return;
    }
    const id = window.setTimeout(() => setShown(true), 450);
    return () => window.clearTimeout(id);
  }, [mode, pathname]);

  if (!mode || !shown) return null;

  const bar = 'ds-scope flex h-10 shrink-0 items-center gap-3 border-b border-guide-200 bg-guide-50 px-4 text-[13px] text-ink';
  const cta = 'guide-solid guide-bob inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-[12.5px] font-semibold text-white';

  if (mode === 'done' && c) {
    const quick = c.kind === 'quick';
    const step = quick ? undefined : (c.step as GuideStep);
    const next = step && step < 6 ? stepMeta((step + 1) as GuideStep) : undefined;
    const label = quick ? 'Quick look done' : step === 6 ? 'Walkthrough done' : `Step ${step} done · ${stepMeta(step!).title}`;
    const go = () => {
      if (quick) {
        useDemo.getState().setQuickPath(false);
        g.jumpTo(1);
      } else if (step && step < 6) g.goNext(step);
      else router.push('/');
    };
    return (
      <div data-next-bar className={bar}>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-guide-700">
          <Check size={14} strokeWidth={3} /> {label}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {quick ? <>Next: <strong className="font-semibold">the full walkthrough</strong>, five steps</> : next ? <>Next: <strong className="font-semibold">{next.title}</strong> · {next.date}</> : 'You have seen every step.'}
        </span>
        <button onClick={go} className={cta}>
          {quick ? 'Start the full walkthrough' : next ? `Next: ${next.title}` : 'Back to Home'} <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  if (!action || !g.target) return null;
  const app = APPS[appOf(action.href)];
  const otherApp = appOf(action.href) !== appOf(pathname);
  const where = g.target.kind === 'quick' ? 'Quick look' : `Step ${g.target.step === 6 ? 'after signing' : g.target.step} · ${stepMeta(g.target.step).title}`;

  return (
    <div data-next-bar className={bar}>
      <span className="hidden shrink-0 text-[12px] font-semibold text-guide-700 lg:inline">{where}</span>
      <span className="min-w-0 flex-1 truncate">
        Next: <strong className="font-semibold">{action.label}</strong>
        {otherApp && <> in {app.label}</>}
      </span>
      <button onClick={() => g.openAction(action)} className={cta}>
        {otherApp ? `Open ${app.label}` : 'Go there'} <ArrowRight size={14} />
      </button>
    </div>
  );
}
