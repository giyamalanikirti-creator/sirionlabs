'use client';

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { DemoStrip } from './DemoStrip';
import { GuideRail } from './GuideRail';
import { CoachMark } from './CoachMark';
import { Toasts } from './Toasts';
import { AskLauncher } from '@/components/ask/AskLauncher';
import { SourceDrawer } from '@/components/sirion/SourceDrawer';

/**
 * The honest wrapper outside every mock (BUILD_SPEC §4F):
 *   demo bar (52 px)
 *   [ guide rail | app frame ]
 * The rail lives here, in the root layout, so it never remounts on navigation.
 */
/** After moving to another screen, drop focus from the button that took you there, so its focus ring doesn't read as a "next" marker. */
function BlurOnNavigate() {
  const path = usePathname();
  useEffect(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el && el !== document.body && el.closest('[data-demo-chrome]')) el.blur();
  }, [path]);
  return null;
}

export function DemoChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BlurOnNavigate />
      <div data-demo-chrome>
        <Suspense>
          <DemoStrip />
        </Suspense>
      </div>
      <div className="flex min-h-0 flex-1">
        <div data-demo-chrome className="flex min-h-0">
          <Suspense>
            <GuideRail />
          </Suspense>
        </div>
        <main id="app-frame" className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {children}
          <Suspense>
            <AskLauncher />
          </Suspense>
        </main>
      </div>
      <SourceDrawer />
      <CoachMark />
      <Toasts />
    </div>
  );
}
