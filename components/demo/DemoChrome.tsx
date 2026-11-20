'use client';

import { Suspense } from 'react';
import { DemoStrip } from './DemoStrip';
import { ScriptBar } from './ScriptBar';
import { DemoGuide } from './DemoGuide';
import { Toasts } from './Toasts';

/** The honest wrapper that sits outside every mock. BUILD_SPEC §4F. */
export function DemoChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Suspense><DemoStrip /></Suspense>
      <div className="relative min-h-0 flex-1">{children}</div>
      <Suspense><ScriptBar /></Suspense>
      <DemoGuide />
      <Toasts />
    </div>
  );
}
