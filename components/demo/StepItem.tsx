'use client';

/** One step in the guide rail: a number circle on the connecting line, the title, the date and the app it happens in. */
import { useState } from 'react';
import { Check, MessageCircleQuestion } from 'lucide-react';
import { useAsk } from '@/lib/ask/store';
import type { GuideAsk } from '@/lib/demo/guide';
import type { ScriptAction } from '@/lib/demo/script';
import type { AppKey, GuideStep } from '@/lib/demo/guideState';
import { AppChip } from './apps';

export type StepStatus = 'done' | 'current' | 'upcoming' | 'locked';

const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guide-600';

export function StepCircle({ step, status, size = 24 }: { step: GuideStep; status: StepStatus; size?: number }) {
  const base = 'grid shrink-0 place-items-center rounded-full text-[12px] font-semibold';
  const style = { width: size, height: size };
  if (status === 'done') return <span className={`${base} bg-guide-600 text-white`} style={style}><Check size={13} strokeWidth={3} /></span>;
  if (status === 'current') return <span className={`${base} guide-pulse border-2 border-guide-600 bg-white text-guide-600`} style={style}>{step === 6 ? '•' : step}</span>;
  return <span className={`${base} border-2 border-line bg-white ${status === 'locked' ? 'text-muted/60' : 'text-muted'}`} style={style}>{step === 6 ? '•' : step}</span>;
}

export function StepItem({
  step,
  title,
  date,
  app,
  instruction,
  status,
  last,
  small,
  actions,
  done,
  nextTitle,
  stepComplete,
  asks,
  onAction,
  onNext,
  onJump,
  onRevisit,
}: {
  step: GuideStep;
  title: string;
  date: string;
  app: AppKey;
  instruction: string;
  status: StepStatus;
  last?: boolean;
  small?: boolean;
  actions: ScriptAction[];
  done: boolean[];
  nextTitle?: string;
  stepComplete: boolean;
  /** Optional AskSirion questions for this step: a quiet row, never a "Do this". */
  asks?: ReadonlyArray<GuideAsk>;
  onAction: (a: ScriptAction) => void;
  onNext: () => void;
  onJump: () => void;
  onRevisit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const nextIndex = done.findIndex((d) => !d);

  return (
    <li className="relative flex gap-3 pb-3" aria-current={status === 'current' ? 'step' : undefined}>
      {!last && <span aria-hidden className="absolute left-[11px] top-7 h-[calc(100%-20px)] w-[2px] bg-line" />}
      <span className="relative z-[1] mt-0.5">
        <StepCircle step={step} status={status} />
      </span>
      <div className="min-w-0 flex-1">
        {status === 'current' ? (
          <div className="rounded-xl border border-guide-600 bg-guide-50 p-3">
            <p className={`${small ? 'text-[13px]' : 'text-[14px]'} font-semibold leading-[20px] text-ink`}>{title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
              {date} <AppChip app={app} />
            </p>
            <p className="mt-2 text-[13px] leading-[19px] text-ink">{instruction}</p>
            <ul className="mt-2.5 space-y-1">
              {actions.map((a, i) => {
                const isDone = done[i];
                const isNext = i === nextIndex;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => onAction(a)}
                      className={`flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-[13px] leading-[18px] hover:bg-white ${ring} ${
                        isDone ? 'text-muted' : isNext ? 'font-semibold text-guide-700' : 'text-muted/80'
                      }`}
                    >
                      <span className="mt-[1px] grid h-4 w-4 shrink-0 place-items-center">
                        {isDone ? <Check size={14} strokeWidth={2.5} className="text-guide-600" /> : (
                          <span className={`h-2 w-2 rounded-full ${isNext ? 'guide-solid' : 'bg-line'}`} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        {a.label}
                        {isNext && <span className="guide-solid ml-1.5 inline-block rounded-full px-1.5 py-[1px] align-[1px] text-[11px] font-semibold leading-[14px] text-white">Do this</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {asks && asks.length > 0 && (
              <div className="mt-2 border-t border-guide-200 pt-2">
                {asks.map((q) => (
                  <button
                    key={q.prompt}
                    onClick={() => useAsk.getState().openWith(q.prompt, q.intent)}
                    title="Optional: opens AskSirion with this question"
                    className={`flex w-full items-start gap-1.5 rounded-md px-1.5 py-1 text-left text-[12px] leading-[17px] text-muted hover:bg-white hover:text-ink ${ring}`}
                  >
                    <MessageCircleQuestion size={13} className="mt-[2px] shrink-0" />
                    <span>
                      Try asking AskSirion: <span className="italic">“{q.prompt}”</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {nextTitle && (
              <div className="mt-3">
                {stepComplete ? (
                  <button onClick={onNext} data-tour="guide-next" className={`guide-solid guide-bob w-full rounded-lg px-3 py-2 text-[13px] font-semibold text-white ${ring}`}>
                    Next: {nextTitle} →
                  </button>
                ) : (
                  <button onClick={onNext} className={`w-full rounded-md px-2 py-1 text-[12px] font-semibold text-muted hover:text-ink ${ring}`}>
                    Skip to {nextTitle}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              disabled={status === 'locked'}
              onClick={() => (status === 'done' ? onRevisit() : setConfirming(true))}
              className={`w-full rounded-md px-1 py-0.5 text-left disabled:cursor-not-allowed ${ring} ${status === 'locked' ? 'opacity-60' : 'hover:bg-page'}`}
              title={status === 'done' ? 'Revisit this step' : status === 'locked' ? 'Unlocked when step 5 is done' : 'Jump to this step'}
            >
              <span className={`block ${small ? 'text-[13px]' : 'text-[14px]'} font-semibold leading-[20px] ${status === 'done' ? 'text-muted' : 'text-ink'}`}>{title}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                {date} {status !== 'done' && <AppChip app={app} />}
              </span>
            </button>
            {confirming && (
              <div role="dialog" aria-label={`Jump to step ${step}`} className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-line bg-white p-3 shadow-pop">
                <p className="text-[13px] font-semibold text-ink">Jump to {step === 6 ? 'after signing' : `step ${step}`}?</p>
                <p className="mt-0.5 text-[12px] leading-[17px] text-muted">Earlier steps will be completed for you.</p>
                <div className="mt-2.5 flex justify-end gap-2">
                  <button onClick={() => setConfirming(false)} className={`rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold text-ink ${ring}`}>Cancel</button>
                  <button
                    autoFocus
                    onClick={() => {
                      setConfirming(false);
                      onJump();
                    }}
                    className={`rounded-md bg-guide-600 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-guide-700 ${ring}`}
                  >
                    Jump
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
