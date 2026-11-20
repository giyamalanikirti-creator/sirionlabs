'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BookOpenText, Check, RotateCcw } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { formatDemoDate } from '@/lib/format';
import { GUIDE_STAGES } from '@/lib/demo/guide';
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
  const message = search.get('msg');
  const prequel = search.get('prequel') === '1';
  const hydrated = useHydrated();
  const clock = useDemo((s) => s.clock);
  const completed = useDemo((s) => s.completedSteps);
  const contract = useDemo((s) => s.contract);
  const invoiceReached = useDemo((s) => s.invoiceFastForward);
  const stage = prequel ? undefined : pathname.startsWith('/outlook/ananya') ? (message === 'M12' ? 2 : message === 'M8' ? 1 : clock >= STEP_CLOCK[2] ? 2 : 1)
    : pathname.startsWith('/outlook/vikram') ? 3
      : pathname === '/word/v6' ? 4
        : pathname === '/contracts/C-2026-0417' ? 5 : undefined;
  const next = GUIDE_STAGES.find((item) => stage && item.step === stage + 1);
  const current = stage ? GUIDE_STAGES[stage - 1] : undefined;
  /* The page belongs to a later day than the demo clock (e.g. Vikram's inbox opened from the strip on 14 Nov). */
  const notYet = Boolean(hydrated && current && (current.step === 2 || current.step === 3) && clock < STEP_CLOCK[current.step]);
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
    {hydrated && prequel && (
      <div className="ds-scope flex min-h-9 shrink-0 items-center gap-3 border-b border-line bg-white px-3 py-1 text-xs text-ink">
        <span className="whitespace-nowrap font-semibold">Prequel</span>
        <span className="min-w-0 flex-1 truncate text-muted">1 Nov · how CloudDesk started being tracked. Track lands on step 0 (14 Nov).</span>
      </div>
    )}
    {hydrated && current && (
      <div className="ds-scope flex min-h-9 shrink-0 items-center gap-3 border-b border-line bg-white px-3 py-1 text-xs text-ink">
        <span className="whitespace-nowrap font-semibold">Step {current.step} of 5</span>
        <span className="flex gap-1" aria-label={`${completed.filter((step) => step > 0 && step < 6).length} steps completed`}>
          {GUIDE_STAGES.map((item) => <span key={item.step} className={`grid h-4 w-4 place-items-center rounded-full ${completed.includes(item.step) ? 'bg-teal-900 text-white' : 'bg-page text-muted'}`}>
            {completed.includes(item.step) ? <Check size={10} /> : item.step}
          </span>)}
        </span>
        <span className="min-w-0 flex-1 truncate text-muted">{current.step === 5 && invoiceReached ? 'One year later · December 2027 invoice' : current.time}</span>
        {notYet && (
          <button
            className="whitespace-nowrap rounded border border-teal-900/45 bg-white px-3 py-1 font-semibold text-teal-900 hover:bg-mint/40"
            onClick={() => {
              // This inbox was opened before the step's day: replay the earlier steps and open the right email.
              useDemo.getState().startStage(current.step, true);
              router.push(current.href);
            }}
          >
            Go to {current.time.match(/\d+ Nov/)?.[0] ?? 'this step'} (step {current.step})
          </button>
        )}
        {next && !completed.includes(current.step) && !notYet && <span className="hidden whitespace-nowrap text-[11px] text-muted md:inline">To continue: {current.hint} Or skip ahead.</span>}
        {next && (
          <button
            className={`whitespace-nowrap rounded px-3 py-1 font-medium ${completed.includes(current.step) ? 'bg-teal-900 text-white hover:bg-teal-700' : 'border border-teal-900/45 bg-white text-teal-900 hover:bg-mint/40'}`}
            title={completed.includes(current.step) ? undefined : 'Skips ahead using the saved results for this step'}
            onClick={() => {
              // Never a dead end: an unfinished step is completed from saved results before moving on.
              if (!completed.includes(current.step)) useDemo.getState().advanceTo(current.step);
              useDemo.getState().startStage(next.step);
              router.push(next.href);
            }}
          >
            {completed.includes(current.step) ? `Next · ${next.title}` : `Skip to · ${next.title}`}
          </button>
        )}
        {current.step === 5 && contract && !invoiceReached && <button className="rounded bg-teal-900 px-3 py-1 text-white" onClick={() => {
          useDemo.getState().fastForwardInvoice();
          router.push('/contracts/C-2026-0417?tab=invoices');
        }}>Next · December invoice</button>}
      </div>
    )}
    </>
  );
}
