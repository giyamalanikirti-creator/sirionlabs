'use client';

/** AskSirion, full page: the same conversation as the floating panel, with more room. The launcher hides here. */
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SirionMark } from '@/components/sirion/SirionMark';
import { Tag } from '@/components/ui/Tag';
import { AskConversation } from '@/components/ask/AskConversation';
import { useAsk } from '@/lib/ask/store';
import { scopeFor, widen } from '@/lib/ask/scope';
import { useGuide } from '@/components/demo/useGuide';

function AskPage() {
  const params = useSearchParams();
  const turns = useAsk((s) => s.turns);
  const g = useGuide();
  // The scope the conversation was last asked in; all contracts if nothing was asked yet.
  const last = turns.at(-1)?.scope;
  const scope = last ? { ...last, surface: 'ask' as const } : widen(scopeFor('/ask', params.toString()));
  return (
    <div className="mx-auto flex h-[calc(100vh-200px)] min-h-[520px] max-w-[860px] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0C5E69]">
          <SirionMark size={22} colour="#FFFFFF" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-normal leading-[28px] text-teal-title">AskSirion</h1>
          <p className="text-[13.5px] text-muted">Ask about your contracts and live negotiations · scope: {scope.label}</p>
        </div>
        <span className="ml-auto">
          <Tag kind="today" />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white px-5 shadow-card">
        <AskConversation scope={scope} step={g.current === 7 ? undefined : g.current} large />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AskPage />
    </Suspense>
  );
}
