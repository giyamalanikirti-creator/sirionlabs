'use client';

/** Shared state for "Ask Deal Ledger" in the Sirion app, the Outlook pane and the Word pane. */
import { useState } from 'react';
import { useDemo } from '@/lib/store';
import { cloudDeskDeal } from '@/lib/data';
import { answer, type AskAnswer, type Viewer } from '@/lib/engines/advisor';
import type { TermKey } from '@/lib/types';

export interface AskTurn {
  question: string;
  answer?: AskAnswer;
  text?: string;
  source?: 'live' | 'rules';
  pending?: boolean;
}

export function useAsk(opts: { termKey?: TermKey; viewer?: Viewer } = {}) {
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const busy = turns.some((t) => t.pending);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const state = useDemo.getState();
    const viewer = opts.viewer ?? 'lead';
    const showFallbacks = viewer === 'lead' || state.settings.ownersSeeFallbacks;
    setTurns((t) => [...t, { question: q, pending: true }]);
    let next: AskTurn;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, termKey: opts.termKey, viewer, showFallbacks, rows: state.ledger }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('ask failed');
      const data = (await res.json()) as { answer: AskAnswer; text?: string; source: 'live' | 'rules' };
      next = { question: q, answer: data.answer, text: data.text, source: data.source };
    } catch {
      // Never a dead end: answer from the rules in the browser.
      next = {
        question: q,
        answer: answer(q, { rows: state.ledger, deal: cloudDeskDeal, termKey: opts.termKey, viewer, showFallbacks }),
        source: 'rules',
      };
    }
    setTurns((t) => [...t.filter((x) => !x.pending), next]);
  };

  return { turns, ask, busy, clear: () => setTurns([]) };
}
