'use client';

import { DemoStrip } from './DemoStrip';
import { DemoGuide } from './DemoGuide';
import { Toasts } from './Toasts';

/** The honest wrapper that sits outside every mock. BUILD_SPEC §4F. */
export function DemoChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DemoStrip />
      <div className="relative min-h-0 flex-1">{children}</div>
      <DemoGuide />
      <Toasts />
    </div>
  );
}
