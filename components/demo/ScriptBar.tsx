'use client';

/**
 * The walkthrough script, docked at the bottom of every screen: a calendar of
 * the walkthrough's days, then the buttons to press for this step as chips.
 * Done chips are grey, the next one is green and pulses, and the matching
 * button on the page pulses green too, so nobody misses a step.
 */
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, ChevronUp, MousePointerClick } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { GUIDE_STAGES } from '@/lib/demo/guide';
import { STEP_CLOCK } from '@/lib/demo/steps';
import { CALENDAR, SCRIPT, type ScriptAction } from '@/lib/demo/script';

function stageFor(pathname: string, msg: string | null, prequel: boolean, clock: string): 1 | 2 | 3 | 4 | 5 | undefined {
  if (prequel) return undefined;
  if (pathname.startsWith('/outlook/ananya')) return msg === 'M12' || msg === 'M12R' ? 2 : msg === 'M8' ? 1 : clock >= STEP_CLOCK[2] ? 2 : 1;
  if (pathname.startsWith('/outlook/vikram')) return 3;
  if (pathname === '/word/v6') return 4;
  if (pathname === '/contracts/C-2026-0417') return 5;
  return undefined;
}

export function ScriptBar() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const hydrated = useHydrated();
  const state = useDemo();
  const [open, setOpen] = useState(true);
  const prequel = search.get('prequel') === '1';
  const stage = stageFor(pathname, search.get('msg'), prequel, state.clock);
  const current = stage ? GUIDE_STAGES[stage - 1] : undefined;
  const next = GUIDE_STAGES.find((g) => stage && g.step === stage + 1);
  const notYet = Boolean(hydrated && stage && (stage === 2 || stage === 3) && state.clock < STEP_CLOCK[stage]);

  const actions: ScriptAction[] = useMemo(() => (stage ? SCRIPT[stage] : []), [stage]);
  const doneFlags = actions.map((a) => hydrated && a.done(state));
  const firstOpen = doneFlags.findIndex((d) => !d);
  const stepDone = hydrated && stage !== undefined && (state.completedSteps.includes(stage) || firstOpen === -1);
  const invoiceNext = stage === 5 && Boolean(state.contract) && !state.invoiceFastForward;
  const target = notYet ? 'tour-goto' : firstOpen >= 0 ? actions[firstOpen].target : stage === 5 && invoiceNext ? 'tour-invoice' : 'tour-next';

  /* Count a press on any walkthrough element, so actions with no state of their own still tick. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-tour]');
      const id = el?.getAttribute('data-tour');
      if (id) useDemo.getState().markTour(id);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  /* Pulse the button to press on the page. The DOM changes as panes open, so keep re-applying. */
  useEffect(() => {
    if (!hydrated) return;
    const apply = () => {
      document.querySelectorAll('.tour-target').forEach((el) => {
        if (el.getAttribute('data-tour') !== target) el.classList.remove('tour-target');
      });
      const el = [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].find((x) => x.offsetParent !== null);
      el?.classList.add('tour-target');
    };
    apply();
    const id = window.setInterval(apply, 500);
    return () => {
      window.clearInterval(id);
      document.querySelectorAll('.tour-target').forEach((el) => el.classList.remove('tour-target'));
    };
  }, [target, hydrated]);

  if (!hydrated) return null;

  const focus = (a: ScriptAction) => {
    const el = [...document.querySelectorAll<HTMLElement>(`[data-tour="${a.target}"]`)].find((x) => x.offsetParent !== null);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else router.push(a.href);
  };

  const goNext = () => {
    if (!next || stage === undefined) return;
    if (!state.completedSteps.includes(stage)) useDemo.getState().advanceTo(stage);
    useDemo.getState().startStage(next.step);
    router.push(next.href);
  };

  const calendar = (
    <div className="flex items-center gap-1 overflow-x-auto" aria-label="Walkthrough calendar">
      <span className="mr-1 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-wide text-muted">Nov 2026</span>
      {CALENDAR.map((d) => {
        const isToday = prequel ? d.key === 'prequel' : d.key !== 'prequel' && state.clock.slice(0, 10) === d.clock.slice(0, 10);
        const past = !prequel && d.clock < state.clock && !isToday;
        return (
          <button
            key={d.key}
            title={`${d.day} ${d.month}: ${d.label}`}
            onClick={() => {
              if (d.step === 0) router.push(d.href);
              else if (d.step === 6) {
                if (state.contract) useDemo.getState().fastForwardInvoice();
                else useDemo.getState().previewStage(5);
                router.push(d.href);
              } else {
                useDemo.getState().startStage(d.step as 1 | 2 | 3 | 4 | 5, true);
                router.push(d.href);
              }
            }}
            className={[
              'flex min-w-[54px] flex-col items-center rounded-md px-1.5 py-0.5 leading-tight transition-colors',
              isToday ? 'bg-[#16A34A] text-white shadow-sm' : past ? 'bg-page text-muted hover:bg-line' : 'border border-line bg-white text-ink hover:bg-page',
            ].join(' ')}
          >
            <span className="text-[13px] font-semibold">{d.day}</span>
            <span className="whitespace-nowrap text-[9.5px]">{d.month === 'Nov' ? d.label : `${d.month} · ${d.label}`}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="ds-scope shrink-0 border-t border-line bg-white shadow-[0_-4px_16px_rgba(31,42,46,0.08)]">
      <div className="flex items-center gap-3 px-3 py-1.5">
        <span className="whitespace-nowrap text-[12px] font-semibold text-ink">
          {prequel ? 'Prequel · 1 Nov' : current ? `Step ${current.step} of 5 · ${current.title}` : 'Walkthrough'}
        </span>
        <span className="flex gap-1">
          {GUIDE_STAGES.map((g) => (
            <span
              key={g.step}
              className={`grid h-4 w-4 place-items-center rounded-full text-[9.5px] ${
                state.completedSteps.includes(g.step) ? 'bg-teal-900 text-white' : g.step === stage ? 'bg-[#16A34A] text-white' : 'bg-page text-muted'
              }`}
            >
              {state.completedSteps.includes(g.step) ? <Check size={9} /> : g.step}
            </span>
          ))}
        </span>
        <div className="min-w-0 flex-1">{open && calendar}</div>
        <button onClick={() => setOpen((v) => !v)} className="rounded p-1 text-muted hover:bg-page" aria-label={open ? 'Hide the script' : 'Show the script'}>
          {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line/70 px-3 py-2">
          {prequel && (
            <span className="text-[12px] text-ink">Press <strong>Got it</strong>, then <strong>Track negotiation</strong> in the Deal Ledger pane. It lands on 14 Nov.</span>
          )}
          {!prequel && !stage && (
            <>
              <span className="text-[12px] text-muted">Five steps, about three minutes. Every button to press lights up green.</span>
              <button
                data-tour="tour-start"
                onClick={() => {
                  useDemo.getState().startStage(1, true);
                  router.push('/outlook/ananya?msg=M8');
                }}
                className="tour-chip-current rounded-full bg-[#16A34A] px-3 py-1 text-[12px] font-semibold text-white"
              >
                ▶ Start step 1 · Review round
              </button>
              <button onClick={() => router.push('/today')} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-ink hover:bg-page">
                First: what Sirion has today
              </button>
            </>
          )}
          {stage && notYet && (
            <button
              data-tour="tour-goto"
              onClick={() => {
                useDemo.getState().startStage(stage, true);
                router.push(current!.href);
              }}
              className="tour-chip-current rounded-full bg-[#16A34A] px-3 py-1 text-[12px] font-semibold text-white"
            >
              ▶ Go to {current!.time.match(/\d+ Nov/)?.[0]} for this step
            </button>
          )}
          {stage &&
            !notYet &&
            actions.map((a, i) => {
              const done = doneFlags[i];
              const now = i === firstOpen;
              return (
                <button
                  key={a.id}
                  onClick={() => focus(a)}
                  className={[
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-colors',
                    done
                      ? 'bg-page text-muted line-through decoration-muted/60'
                      : now
                        ? 'tour-chip-current bg-[#16A34A] font-semibold text-white'
                        : 'border border-line bg-white text-ink',
                  ].join(' ')}
                >
                  {done ? <Check size={12} /> : now ? <MousePointerClick size={12} /> : <span className="text-[10.5px] text-muted">{i + 1}</span>}
                  {a.label}
                </button>
              );
            })}
          {stage === 5 && invoiceNext && firstOpen === 1 && (
            <button
              data-tour="tour-invoice"
              onClick={() => {
                useDemo.getState().fastForwardInvoice();
                router.push('/contracts/C-2026-0417?tab=invoices');
              }}
              className="rounded-md bg-teal-900 px-3 py-1 text-[12px] font-medium text-white"
            >
              Fast-forward to December 2027
            </button>
          )}
          <span className="flex-1" />
          {stage && next && (
            <button
              data-tour="tour-next"
              onClick={goNext}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-semibold ${
                stepDone ? 'bg-[#16A34A] text-white' : 'border border-line bg-white text-muted hover:text-ink'
              }`}
              title={stepDone ? undefined : 'Skips ahead using the saved results for this step'}
            >
              {stepDone ? `Next · ${next.title} →` : `Skip to · ${next.title}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
