'use client';

/**
 * The walkthrough, as a rail on the left of every screen. Demo chrome, not
 * product: neutral surface, ink text, and the guide accent only.
 *
 * Open and docked at every width (walkthrough brief A4):
 *  ≥ 1280 px   264 px
 *  < 1280 px   232 px (the "best viewed" notice is measured on the app frame)
 * It never closes on its own. « shrinks it to the 64 px strip of numbered
 * circles; clicking either reopens it docked. That choice lasts for this tab's
 * session only (lib/guideUi), and Reset demo reopens it.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Check, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Columns2, Eye, EyeOff, MoreHorizontal, PlugZap, Zap } from 'lucide-react';
import { OPENING_LINE, QUICK_ACTIONS } from '@/lib/demo/quickPath';
import { useDemo } from '@/lib/store';
import { useGuideUi } from '@/lib/guideUi';
import { SCRIPT } from '@/lib/demo/script';
import { GUIDE_STEPS, stepMeta, type GuideStep } from '@/lib/demo/guideState';
import { useGuide } from './useGuide';
import { StepCircle, StepItem, type StepStatus } from './StepItem';
import { AFTER_SIGNING, GUIDE_STAGES } from '@/lib/demo/guide';
import { ConfirmDialog } from './ConfirmDialog';
import { shiftText } from '@/lib/demo/timeShift';

const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guide-600';

function useWindowWidth() {
  const [w, setW] = useState(1440);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

/**
 * The Outlook and Word mocks need room (BUILD_SPEC §4F). When their frame is
 * under 1100 px, the rail points at its own « button instead of showing a
 * notice over the app: the one thing the viewer can do about it.
 */
function useNeedsRoom() {
  const pathname = usePathname();
  const mock = pathname.startsWith('/outlook') || pathname.startsWith('/word');
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const frame = document.getElementById('app-frame');
    if (!frame) return;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 1100));
    ro.observe(frame);
    return () => ro.disconnect();
  }, []);
  return mock && narrow;
}

const STORY_LINKS = [
  { label: 'Why negotiation', href: '/story#1-why-start-with-negotiation' },
  { label: 'Stakeholder map', href: '/story#2-who-needs-to-stay-aligned' },
  { label: 'The problem', href: '/story#3-where-terms-get-lost' },
  { label: 'Success metrics', href: '/story#5-how-we-ll-know-it-works' },
];

export function GuideRail() {
  const width = useWindowWidth();
  const collapsed = useGuideUi((s) => s.railCollapsed);
  const setCollapsed = useGuideUi((s) => s.setRailCollapsed);
  const load = useGuideUi((s) => s.load);
  useEffect(() => load(), [load]);
  const railWidth = width >= 1280 ? 264 : 232;
  const g = useGuide();

  /* Keyboard: ] next step, [ previous step, g then 1 to 6 to jump. */
  useEffect(() => {
    let pendingG = false;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey)) return;
      if (e.key === ']') {
        if (g.current <= 5) g.goNext(g.current as GuideStep);
        pendingG = false;
      } else if (e.key === '[') {
        const prev = Math.max(1, Math.min(6, g.current) - 1) as GuideStep;
        g.revisit(prev);
        pendingG = false;
      } else if (e.key === 'g') {
        pendingG = true;
      } else if (pendingG && /^[1-6]$/.test(e.key)) {
        g.jumpTo(Number(e.key) as GuideStep);
        pendingG = false;
      } else {
        pendingG = false;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g]);

  return (
    <div className="ds-scope relative z-30 flex shrink-0" style={{ width: collapsed ? 64 : railWidth, transition: 'width 180ms ease-out' }}>
      {collapsed ? <RailMini onExpand={() => setCollapsed(false)} /> : <RailFull width={railWidth} onCollapse={() => setCollapsed(true)} />}
    </div>
  );
}

function statusOf(step: GuideStep, g: ReturnType<typeof useGuide>): StepStatus {
  if (g.current === step) return 'current';
  if (step === 6 && !g.stepDone(5)) return 'locked';
  return g.stepDone(step) ? 'done' : 'upcoming';
}

function RailFull({ width, onCollapse }: { width: number; onCollapse: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const g = useGuide();
  const hintsHidden = useGuideUi((s) => s.hintsHidden);
  const setHintsHidden = useGuideUi((s) => s.setHintsHidden);
  const needsRoom = useNeedsRoom();
  const [startOpen, setStartOpen] = useState<boolean | null>(null);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'setup' | 'keys' | null>(null);
  const quickPath = useDemo((st) => st.quickPath) && g.hydrated;
  const startShown = startOpen ?? !g.started;
  const pct = (g.doneCount / 5) * 100;

  const nav = (href: string) => router.push(href);

  return (
    <aside aria-label="Walkthrough" className="flex h-full flex-col border-r border-line bg-white text-ink" style={{ width }}>
      {/* Header */}
      <div className="shrink-0 border-b border-line px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[16px] font-semibold leading-[22px]">Walkthrough</p>
            <p className="text-[12px] text-muted">5 steps · about 3 minutes</p>
          </div>
          <button
            onClick={onCollapse}
            aria-label="Hide walkthrough"
            title="Hide walkthrough"
            className={`rounded-md p-1 hover:bg-page hover:text-ink ${ring} ${needsRoom ? 'guide-pulse bg-guide-50 text-guide-700 outline outline-2 outline-offset-2 outline-[#127FA6]' : 'text-muted'}`}
          >
            <ChevronsLeft size={16} />
          </button>
        </div>
        {needsRoom && (
          <div className="relative mt-2.5 rounded-lg border border-guide-200 bg-guide-50 px-3 py-2 text-[12.5px] leading-[17px] text-ink">
            <span aria-hidden className="absolute -top-[6px] right-[7px] h-2.5 w-2.5 rotate-45 border-l border-t border-guide-200 bg-guide-50" />
            Short on room for {pathname.startsWith('/word') ? 'Word' : 'Outlook'}? Press{' '}
            <button onClick={onCollapse} aria-label="Hide walkthrough" className={`inline-flex translate-y-[2px] items-center rounded border border-guide-200 bg-white px-1 text-guide-700 hover:bg-guide-200/40 ${ring}`}>
              <ChevronsLeft size={13} />
            </button>{' '}
            above to hide the walkthrough. The steps stay as numbers on the left.
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-guide-200" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={g.doneCount}>
            <div className="h-full rounded-full bg-guide-600 transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-[12px] text-muted">{g.doneCount} of 5 done</span>
        </div>
        {hintsHidden ? (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
            <EyeOff size={13} /> Hints off ·{' '}
            <button onClick={() => setHintsHidden(false)} className={`inline-flex items-center gap-1 rounded-md font-semibold text-guide-700 hover:underline ${ring}`}>
              <Eye size={13} /> Turn on
            </button>
          </p>
        ) : (
          <button onClick={() => setHintsHidden(true)} className={`mt-2 inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold text-muted hover:text-ink ${ring}`}>
            <EyeOff size={13} /> Hide hints
          </button>
        )}
      </div>

      {/* Body */}
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {quickPath && <QuickLook g={g} onNav={() => undefined} />}
        <button onClick={() => setStartOpen(!startShown)} aria-expanded={startShown} className={`flex w-full items-center justify-between rounded-md text-[12px] font-semibold uppercase tracking-wide text-muted ${ring}`}>
          Start here {startShown ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {startShown && (
          <ul className="mb-3 mt-2 space-y-0.5">
            <li>
              <button onClick={() => g.startQuickPath()} className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] font-semibold text-guide-700 hover:bg-page ${ring}`}>
                <Zap size={15} className="shrink-0" /> Quick look · review the signing copy
              </button>
            </li>
            <li>
              <button onClick={() => nav('/today')} className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] hover:bg-page ${ring}`}>
                <Columns2 size={15} className="shrink-0 text-muted" /> Sirion today vs Deal Ledger
              </button>
            </li>
            <li>
              <button onClick={() => nav('/setup')} className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] hover:bg-page ${ring}`}>
                <PlugZap size={15} className="shrink-0 text-muted" /> How it was set up
              </button>
              <button onClick={() => nav('/outlook/ananya?msg=M1&prequel=1')} className={`ml-7 block rounded-md px-1.5 py-0.5 text-left text-[12px] text-muted hover:text-ink ${ring}`}>
                {shiftText('Then: the first prompt, 1 Nov')}
              </button>
            </li>
            <li>
              <button onClick={() => nav('/story')} className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] hover:bg-page ${ring}`}>
                <BookOpen size={15} className="shrink-0 text-muted" /> About the case
              </button>
              {STORY_LINKS.map((l) => (
                <button key={l.href} onClick={() => nav(l.href)} className={`ml-7 block rounded-md px-1.5 py-0.5 text-left text-[12px] text-muted hover:text-ink ${ring}`}>
                  {l.label}
                </button>
              ))}
            </li>
          </ul>
        )}

        <p className="mb-2 mt-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Steps</p>
        <ol>
          {GUIDE_STEPS.map((step) => {
            const m = stepMeta(step);
            const status = statusOf(step, g);
            const nextStep = step < 6 ? stepMeta((step + 1) as GuideStep) : undefined;
            return (
              <StepItem
                key={step}
                step={step}
                title={m.title}
                date={m.date}
                app={m.app}
                instruction={m.instruction}
                status={status}
                last={step === 6}
                small={step === 6}
                actions={SCRIPT[step].filter((_, i) => g.actionsShown(step)[i])}
                done={g.actionsDone(step).filter((_, i) => g.actionsShown(step)[i])}
                nextTitle={nextStep?.title}
                stepComplete={g.actionsDone(step).every(Boolean)}
                asks={(step === 6 ? AFTER_SIGNING : GUIDE_STAGES[step - 1]).ask?.slice(0, 1)}
                onAction={(a) => g.doAction(a)}
                onNext={() => g.goNext(step)}
                onJump={() => g.jumpTo(step)}
                onRevisit={() => nav(m.href)}
              />
            );
          })}
        </ol>
      </div>

      {/* Footer */}
      <div className="relative flex shrink-0 items-center gap-2 border-t border-line px-4 py-3">
        <button onClick={() => setConfirm('reset')} className={`flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink hover:bg-page ${ring}`}>
          Reset demo
        </button>
        <button onClick={() => setMenu((v) => !v)} aria-label="More" aria-expanded={menu} className={`rounded-lg border border-line p-2 text-muted hover:bg-page hover:text-ink ${ring}`}>
          <MoreHorizontal size={16} />
        </button>
        {menu && (
          <div role="menu" className="absolute bottom-[56px] right-4 z-20 w-56 rounded-lg border border-line bg-white py-1 shadow-pop">
            <button role="menuitem" onClick={() => { setMenu(false); setConfirm('setup'); }} className={`block w-full px-3 py-2 text-left text-[13px] hover:bg-page ${ring}`}>Replay setup</button>
            <button role="menuitem" onClick={() => { setMenu(false); setConfirm('keys'); }} className={`block w-full px-3 py-2 text-left text-[13px] hover:bg-page ${ring}`}>Keyboard shortcuts</button>
            <button role="menuitem" onClick={() => { setMenu(false); nav('/story'); }} className={`block w-full px-3 py-2 text-left text-[13px] hover:bg-page ${ring}`}>About this prototype</button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title={shiftText("Reset the walkthrough to 14 Nov?")}
        body="Your choices will be cleared."
        confirmLabel="Reset demo"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          useDemo.getState().reset();
          useGuideUi.getState().resetUi();
          useDemo.getState().toast(shiftText('Walkthrough reset to 14 Nov.'));
          nav('/');
        }}
      />
      <ConfirmDialog
        open={confirm === 'setup'}
        title="Replay the Microsoft 365 setup?"
        body="The setup checklist is cleared so you can walk through it again. The walkthrough is not affected."
        confirmLabel="Replay setup"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          useDemo.getState().resetSetup();
          nav('/setup');
        }}
      />
      <ConfirmDialog
        open={confirm === 'keys'}
        title="Keyboard shortcuts"
        body="]  next step   ·   [  previous step   ·   g then 1 to 6  jump to a step   ·   Esc  hide the hint label"
        confirmLabel="Got it"
        onCancel={() => setConfirm(null)}
        onConfirm={() => setConfirm(null)}
      />
    </aside>
  );
}

function RailMini({ onExpand }: { onExpand: () => void }) {
  const g = useGuide();
  const pct = g.doneCount / 5;
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <nav aria-label="Walkthrough (collapsed)" className="flex h-full w-16 flex-col items-center gap-3 border-r border-line bg-white py-3">
      <button onClick={onExpand} aria-label="Show walkthrough" className={`relative grid h-10 w-10 place-items-center rounded-full ${ring}`} title={`${g.doneCount} of 5 done`}>
        <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r={r} fill="none" stroke="#B3DFE3" strokeWidth="3" />
          <circle cx="18" cy="18" r={r} fill="none" stroke="#127FA6" strokeWidth="3" strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" transform="rotate(-90 18 18)" />
        </svg>
        <span className="absolute text-[11px] font-semibold text-ink">{g.doneCount}/5</span>
      </button>
      <ol className="flex flex-col items-center gap-2">
        {GUIDE_STEPS.map((step) => {
          const m = stepMeta(step);
          return (
            <li key={step} className="group relative">
              <button
                aria-label={`Step ${step}: ${m.title}, ${m.date}`}
                aria-current={g.current === step ? 'step' : undefined}
                onClick={onExpand}
                className={`rounded-full ${ring}`}
              >
                <StepCircle step={step} status={statusOf(step, g)} size={step === 6 ? 18 : 24} />
              </button>
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[12px] text-white group-hover:block">
                {m.title} · {m.date}
              </span>
            </li>
          );
        })}
      </ol>
      <span className="flex-1" />
      <button onClick={onExpand} aria-label="Show walkthrough" title="Show walkthrough" className={`rounded-md p-1.5 text-muted hover:bg-page hover:text-ink ${ring}`}>
        <ChevronsRight size={16} />
      </button>
    </nav>
  );
}

/** Quick look (review fix B3): three actions on the §9.3 hero, ending on the renewal line in the handover. */
function QuickLook({ g, onNav }: { g: ReturnType<typeof useGuide>; onNav: () => void }) {
  const state = useDemo() as unknown as Parameters<(typeof QUICK_ACTIONS)[number]['done']>[0];
  const done = QUICK_ACTIONS.map((a) => a.done(state));
  const next = done.findIndex((d) => !d);
  return (
    <div className="mb-4 rounded-xl border border-guide-600 bg-guide-50 p-3">
      <p className="text-[14px] font-semibold leading-[20px] text-ink">Quick look · 3 actions</p>
      <p className="mt-0.5 text-[12px] leading-[17px] text-muted">{OPENING_LINE}</p>
      <ol className="mt-2 space-y-1">
        {QUICK_ACTIONS.map((a, i) => (
          <li key={a.id}>
            <button
              onClick={() => {
                onNav();
                g.quickAction(i);
              }}
              className={`flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-[13px] leading-[18px] hover:bg-white ${ring} ${done[i] ? 'text-muted' : i === next ? 'font-semibold text-guide-700' : 'text-muted/80'}`}
            >
              <span className="mt-[1px] grid h-4 w-4 shrink-0 place-items-center">
                {done[i] ? <Check size={14} strokeWidth={2.5} className="text-guide-600" /> : <span className={`h-2 w-2 rounded-full ${i === next ? 'guide-solid' : 'bg-line'}`} />}
              </span>
              <span className="min-w-0 flex-1">
                {i + 1}. {a.label}
                {i === next && <span className="guide-solid ml-1.5 inline-block rounded-full px-1.5 py-[1px] align-[1px] text-[11px] font-semibold leading-[14px] text-white">Do this</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button
        onClick={() => {
          onNav();
          useDemo.getState().setQuickPath(false);
          g.jumpTo(1);
        }}
        className={`mt-2 w-full rounded-md px-2 py-1 text-left text-[12px] font-semibold text-muted hover:text-ink ${ring}`}
      >
        Want the full story? Start the walkthrough (5 steps)
      </button>
    </div>
  );
}
