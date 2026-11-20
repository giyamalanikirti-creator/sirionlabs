'use client';

import { usePathname, useRouter } from 'next/navigation';
import { BookOpenText, RotateCcw } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { formatDemoDate } from '@/lib/format';
import { STEP_CLOCK } from '@/lib/demo/steps';

const SURFACES = [
  { label: 'Sirion app', href: '/' },
  { label: "Ananya's Outlook", href: '/outlook/ananya' },
  { label: "Vikram's Outlook", href: '/outlook/vikram' },
  { label: 'Word (signing copy)', href: '/word/v6', needsV6: true },
];

export function DemoStrip() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const clock = useDemo((s) => s.clock);
  const setGuideOpen = useDemo((s) => s.setGuideOpen);
  const reset = useDemo((s) => s.reset);
  const toast = useDemo((s) => s.toast);

  const v6Arrived = hydrated && clock >= STEP_CLOCK[4];
  const shownClock = hydrated ? clock : STEP_CLOCK[0];

  const isActive = (href: string) =>
    href === '/' ? !pathname.startsWith('/outlook') && !pathname.startsWith('/word') : pathname.startsWith(href);

  return (
    <div className="ds-scope flex h-8 shrink-0 items-center justify-between gap-4 bg-ink px-3 text-[12px] text-white/90">
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <span className="font-semibold tracking-tight text-white">Deal Ledger</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <div className="flex items-center rounded-md bg-white/10 p-[2px]">
          {SURFACES.map((s) => {
            const active = isActive(s.href);
            // Never grey out the surface we are already on.
            const disabled = Boolean(s.needsV6) && !v6Arrived && !active;
            return (
              <button
                key={s.href}
                disabled={disabled}
                onClick={() => {
                  if (disabled) {
                    toast('The signing copy arrives at step 4 (19 Nov).');
                    return;
                  }
                  router.push(s.href);
                }}
                title={disabled ? 'Available once the signing copy arrives (step 4)' : undefined}
                className={[
                  'whitespace-nowrap rounded px-2.5 py-[3px] text-[11.5px] transition-colors',
                  active ? 'bg-white text-ink font-medium' : 'text-white/75 hover:text-white',
                  disabled ? 'cursor-not-allowed text-white/30 hover:text-white/30' : '',
                ].join(' ')}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <span
          suppressHydrationWarning
          className="hidden whitespace-nowrap rounded-full border border-white/20 px-2.5 py-[2px] text-[11px] text-white/70 xl:inline-block"
        >
          {formatDemoDate(shownClock)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => setGuideOpen(true)}
          className="flex items-center gap-1.5 rounded px-2 py-[3px] text-[11.5px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <BookOpenText size={13} strokeWidth={1.8} />
          Walkthrough
        </button>
        <button
          onClick={() => {
            reset();
            router.push('/');
            toast('Walkthrough reset.');
          }}
          className="flex items-center gap-1.5 rounded px-2 py-[3px] text-[11.5px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <RotateCcw size={13} strokeWidth={1.8} />
          Reset
        </button>
      </div>
    </div>
  );
}
