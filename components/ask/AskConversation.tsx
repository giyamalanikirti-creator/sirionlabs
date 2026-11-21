'use client';

/** The AskSirion conversation: empty state, turns and the input. Shared by the panel and /ask. */
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, FilePlus2, FileText, PencilLine, Upload } from 'lucide-react';
import { SirionMark } from '@/components/sirion/SirionMark';
import { useAsk } from '@/lib/ask/store';
import { suggestionsFor } from '@/lib/ask/scope';
import { useDemo } from '@/lib/store';
import type { AskScope, IntentId } from '@/lib/ask/types';
import { AskAnswerCard } from './AskAnswerCard';

export function AskConversation({ scope, step, onNavigate, large = false }: { scope: AskScope; step?: number; onNavigate?: () => void; large?: boolean }) {
  const turns = useAsk((s) => s.turns);
  const ask = useAsk((s) => s.ask);
  const toast = useDemo((s) => s.toast);
  const busy = turns.some((t) => t.pending);
  const [q, setQ] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const suggestions = suggestionsFor(scope, step);

  const lastPending = turns.at(-1)?.pending;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [turns.length, lastPending]);

  const send = (text: string, intent?: IntentId) => {
    if (!text.trim() || busy) return;
    void ask(text, scope, { step, intent });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`thin-scroll min-h-0 flex-1 overflow-y-auto ${large ? 'px-1 py-2' : 'px-4 py-4'}`}>
        {turns.length === 0 ? (
          <div className="pt-2">
            <p className={`${large ? 'text-[24px]' : 'text-[20px]'} font-semibold leading-tight text-ink`}>How can I help you today?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: 'Contract', icon: FilePlus2 },
                { label: 'Amend', icon: PencilLine },
                { label: 'Upload', icon: Upload },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => toast('Not part of this prototype.')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-page"
                >
                  <Icon size={14} className="text-teal-900" /> {label}
                </button>
              ))}
            </div>
            <p className="mb-2 mt-6 text-[13px] font-semibold text-muted">Here are a few suggestions</p>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s.prompt}
                  onClick={() => send(s.prompt, s.intent)}
                  className="flex w-full items-start gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-left text-[13.5px] leading-[19px] text-ink hover:border-teal-900/40 hover:bg-page"
                >
                  <FileText size={15} className="mt-[2px] shrink-0 text-[#1F8FE5]" />
                  {s.prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {turns.map((t) => (
              <div key={t.id} className="space-y-3">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-teal-900 px-3.5 py-2 text-[13.5px] leading-[19px] text-white">{t.question}</p>
                </div>
                {t.pending ? (
                  <div className="flex items-center gap-2 text-[13px] text-muted" role="status">
                    <SirionMark size={16} />
                    <span className="ask-dots" aria-hidden><span /><span /><span /></span>
                    Thinking…
                  </div>
                ) : t.answer ? (
                  <AskAnswerCard answer={t.answer} onAction={onNavigate} onFollowUp={(f) => send(f)} />
                ) : null}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(q);
          setQ('');
        }}
        className={`flex items-center gap-2 border-t border-line bg-white ${large ? 'px-1 py-3' : 'px-3 py-3'}`}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="AskSirion"
          aria-label="Ask a question"
          maxLength={500}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted focus:border-teal-900/60"
        />
        <button type="submit" disabled={busy || !q.trim()} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-900 text-white disabled:opacity-40">
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
}
