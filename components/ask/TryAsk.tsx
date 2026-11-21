'use client';

/** "Try it" on /today: opens AskSirion with a question already asked. */
import { MessageCircleQuestion } from 'lucide-react';
import { useAsk } from '@/lib/ask/store';
import type { IntentId } from '@/lib/ask/types';

export function TryAsk({ prompt, intent, label }: { prompt: string; intent: IntentId; label: string }) {
  return (
    <button
      onClick={() => useAsk.getState().openWith(prompt, intent)}
      className="inline-flex items-center gap-1.5 rounded-md border border-teal-900/45 bg-white px-3 py-2 text-left text-[13.5px] font-semibold text-teal-900 hover:bg-mint/40"
    >
      <MessageCircleQuestion size={15} className="shrink-0" />
      <span>
        {label}: <span className="font-normal italic">“{prompt}”</span>
      </span>
    </button>
  );
}
