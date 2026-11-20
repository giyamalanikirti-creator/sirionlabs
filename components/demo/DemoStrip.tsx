'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpenText, RotateCcw } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { formatDemoDate } from '@/lib/format';
import { STEP_CLOCK } from '@/lib/demo/steps';

const SURFACES = [
  { label: 'Sirion app', href: '/' },
  { label: "Ananya’s inbox · Procurement", href: '/outlook/ananya' },
  { label: "Vikram’s inbox · IT head", href: '/outlook/vikram' },
  { label: 'Word', href: '/word', word: true },
];

export function DemoStrip() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const prequel = search.get('prequel') === '1';
  const hydrated = useHydrated();
  const clock = useDemo((s) => s.clock);
  const setGuideOpen = useDemo((s) => s.setGuideOpen);
  const reset = useDemo((s) => s.reset);
  const toast = useDemo((s) => s.toast);

  const v6Arrived = hydrated && clock >= STEP_CLOCK[4];
  const shownClock = prequel ? '2026-11-01T11:30:00+05:30' : hydrated ? clock : STEP_CLOCK[0];

  const isActive = (href: string) =>
    href === '/' ? !pathname.startsWith('/outlook') && !pathname.startsWith('/word') : pathname.startsWith(href);

  return (
    <>
    <div className="ds-scope flex h-8 shrink-0 items-center justify-between gap-4 bg-ink px-3 text-[12px] text-white/90">
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <span className="font-semibold tracking-tight text-white">Deal Ledger</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <div className="flex items-center rounded-md bg-white/10 p-[2px]">
          {SURFACES.map((s) => {
            // Word always opens: the latest draft (v4) before the signing copy arrives, the signing copy (v6) after.
            const href = s.word ? (v6Arrived ? '/word/v6?from=sirion' : '/word/v4?from=sirion') : s.href;
            const label = s.word ? (v6Arrived ? 'Word (signing copy)' : 'Word (latest draft)') : s.label;
            const active = isActive(s.href);
            return (
              <button
                key={s.href}
                onClick={() => router.push(href)}
                className={[
                  'whitespace-nowrap rounded px-2.5 py-[3px] text-[11.5px] transition-colors',
                  active ? 'bg-white text-ink font-medium' : 'text-white/75 hover:text-white',
                ].join(' ')}
              >
                {label}
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
            useDemo.getState().resetSetup();
            router.push('/setup');
            toast('Setup reset. Replay the Microsoft 365 connection.');
          }}
          className="flex items-center gap-1.5 rounded px-2 py-[3px] text-[11.5px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          title="Replay how Deal Ledger was connected"
        >
          Reset setup
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
    </>
  );
}
