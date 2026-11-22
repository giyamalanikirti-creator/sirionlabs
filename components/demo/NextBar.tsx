'use client';

/**
 * The in-frame bar (walkthrough brief A3): when the next action is in another
 * app, or on a page this screen has no way to reach, a slim bar at the top of
 * the app frame says where to go. It pushes the app down rather than covering
 * it, and goes away when the viewer arrives. Copy comes from SCRIPT / quick path.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useGuideUi } from '@/lib/guideUi';
import { appOf, stepMeta } from '@/lib/demo/guideState';
import { APPS } from './apps';
import { useGuide } from './useGuide';

export function NextBar() {
  const g = useGuide();
  const pathname = usePathname();
  const hidden = useGuideUi((s) => s.hintsHidden);
  const offscreen = useGuideUi((s) => s.offscreenAction);
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

  if (!want || !shown || !action || !g.target) return null;
  const app = APPS[appOf(action.href)];
  const otherApp = appOf(action.href) !== appOf(pathname);
  const where = g.target.kind === 'quick' ? 'Quick look' : `Step ${g.target.step === 6 ? 'after signing' : g.target.step} · ${stepMeta(g.target.step).title}`;

  return (
    <div data-next-bar className="ds-scope flex h-10 shrink-0 items-center gap-3 border-b border-guide-200 bg-guide-50 px-4 text-[13px] text-ink">
      <span className="hidden shrink-0 text-[12px] font-semibold text-guide-700 lg:inline">{where}</span>
      <span className="min-w-0 flex-1 truncate">
        Next: <strong className="font-semibold">{action.label}</strong>
        {otherApp && <> in {app.label}</>}
      </span>
      <button
        onClick={() => g.openAction(action)}
        className="guide-solid inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-[12.5px] font-semibold text-white hover:brightness-95"
      >
        {otherApp ? `Open ${app.label}` : 'Go there'} <ArrowRight size={14} />
      </button>
    </div>
  );
}
