'use client';

/** "Ask Deal Ledger" in the Sirion app: a floating button and a chat drawer. */
import { useState } from 'react';
import { Copy, Send, Sparkles, X } from 'lucide-react';
import { useAsk, type AskTurn } from '@/lib/useAsk';
import { useGuideUi } from '@/lib/guideUi';
import { useDemo } from '@/lib/store';
import { TERM_LABELS } from '@/lib/plain';
import type { TermKey } from '@/lib/types';

const STARTERS = [
  'What should I put for renewal notice instead?',
  'What should I put for price instead?',
  'What’s at risk on CloudDesk?',
  'What should I do next?',
  'Draft wording I can send for payment terms',
];

export function AnswerView({ turn }: { turn: AskTurn }) {
  const toast = useDemo((s) => s.toast);
  if (turn.pending) return <p className="text-[12.5px] text-muted">Thinking…</p>;
  const a = turn.answer;
  if (!a) return null;
  return (
    <div className="space-y-2 text-[12.5px] leading-[19px] text-ink">
      <p className="font-semibold text-teal-900">{a.title}</p>
      {turn.text ? <p>{turn.text}</p> : a.lines.map((l) => <p key={l}>{l}</p>)}
      {a.options && a.options.length > 0 && (
        <table className="w-full text-[12px]">
          <tbody>
            {a.options.map((o) => (
              <tr key={o.label} className="border-t border-line align-top">
                <td className="py-1.5 pr-2 font-medium">{o.label}</td>
                <td className="py-1.5 pr-2">{o.value}</td>
                <td className="py-1.5 text-right text-muted">{o.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {a.wording && (
        <div className="rounded-lg border border-line bg-page p-2.5">
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Supplier-safe wording</p>
          <p className="text-[12px]">{a.wording}</p>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(a.wording!);
              toast('Wording copied.');
            }}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-teal-900/45 bg-white px-2 py-0.5 text-[11.5px] font-semibold text-teal-900"
          >
            <Copy size={11} /> Copy
          </button>
        </div>
      )}
      <p className="text-[10.5px] text-muted">
        {turn.source === 'live' ? 'Worded by AI from the facts below; every ₹ figure is from Deal Ledger’s engines.' : 'Answered from the ledger, the playbook and the pricing engines.'}
      </p>
    </div>
  );
}

export function AskPanel() {
  const open = useGuideUi((st) => st.askOpen);
  const setOpen = useGuideUi((st) => st.setAskOpen);
  const [termKey, setTermKey] = useState<TermKey | ''>('');
  const [q, setQ] = useState('');
  const { turns, ask, busy } = useAsk({ termKey: termKey || undefined });

  return (
    <>
      {open && (
        <aside className="absolute bottom-0 right-0 top-0 z-40 flex w-[400px] max-w-full flex-col border-l border-line bg-white shadow-drawer" aria-label="Ask Deal Ledger">
          <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <span className="flex items-center gap-2 text-[14px] font-semibold text-teal-900">
              <Sparkles size={15} /> Ask Deal Ledger
            </span>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-muted hover:bg-page" aria-label="Close">
              <X size={16} />
            </button>
          </header>
          <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[12px]">
            <span className="text-muted">About</span>
            <select value={termKey} onChange={(e) => setTermKey(e.target.value as TermKey | '')} className="rounded-md border border-line px-2 py-1">
              <option value="">CloudDesk, any term</option>
              {(Object.keys(TERM_LABELS) as TermKey[]).map((k) => (
                <option key={k} value={k}>{TERM_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <div>
                <p className="mb-2 text-[12.5px] text-muted">
                  Ask what to put for a term instead, what is at risk, or for wording you can send. Answers come from the ledger, the playbook and
                  the pricing engines, so the ₹ figures match every other screen.
                </p>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                <p className="ml-8 rounded-lg bg-mint/50 px-3 py-2 text-[12.5px] text-ink">{t.question}</p>
                <div className="rounded-lg border border-line px-3 py-2.5">
                  <AnswerView turn={t} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(turns.at(-1)?.answer?.followUps ?? STARTERS).slice(0, 4).map((s) => (
                <button key={s} disabled={busy} onClick={() => void ask(s)} className="rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] text-ink hover:bg-page">
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask(q);
                setQ('');
              }}
              className="flex gap-2"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. What should I put for payment instead?"
                className="min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-[12.5px]"
                maxLength={500}
              />
              <button type="submit" disabled={busy || !q.trim()} className="rounded-md bg-teal-900 px-3 text-white disabled:opacity-40" aria-label="Ask">
                <Send size={14} />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
