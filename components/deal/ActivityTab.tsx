'use client';

import { EmptyState, SirionCard } from '@/components/sirion/ui';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { formatDateTime } from '@/lib/format';

export function ActivityTab() {
  const hydrated = useHydrated();
  const events = useDemo((s) => s.events);
  const list = hydrated ? [...events].reverse() : [];

  return (
    <SirionCard
      title="Activity"
      caption="Everything this deal's record has done, in the order it happened."
    >
      {list.length === 0 ? (
        <EmptyState title="Nothing has happened yet" />
      ) : (
        <ol className="space-y-3 border-l border-line pl-5">
          {list.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[22px] top-[6px] h-[7px] w-[7px] rounded-full bg-mint" />
              <p className="text-[12.5px] leading-[18px] text-ink">{e.text}</p>
              <p className="mt-0.5 text-[11px] text-muted">{formatDateTime(e.at)}</p>
            </li>
          ))}
        </ol>
      )}
    </SirionCard>
  );
}
