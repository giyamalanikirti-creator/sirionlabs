'use client';

import type { RowState } from '@/lib/types';
import { cn } from './ui';

const STYLES: Record<RowState, { label: string; className: string }> = {
  agreed: { label: 'Agreed', className: 'bg-mint text-teal-900' },
  open: { label: 'Open', className: 'border border-line bg-white text-muted' },
  changed: { label: 'Changed this round', className: 'bg-indigo text-white' },
  needs_confirmation: { label: 'Needs confirmation', className: 'bg-lime text-ink' },
  reopened: { label: 'Reopened', className: 'bg-amber-bg text-amber-fg' },
  missing_at_signing: { label: 'Missing at signing', className: 'bg-danger text-white' },
};

/** An agreement with a condition is never shown as plain "Agreed" (review fix B2). */
export function StatePill({ state, className, condition }: { state: RowState; className?: string; condition?: string }) {
  const s = STYLES[state];
  const conditional = state === 'agreed' && condition;
  return (
    <span
      title={conditional ? `Agreed ${condition}` : undefined}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-medium',
        s.className,
        className,
      )}
    >
      {conditional ? 'Agreed, conditional' : s.label}
    </span>
  );
}

export function NewAskBadge() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-bg px-2 py-[2px] text-[10.5px] font-semibold uppercase tracking-wide text-amber-fg">
      New ask
    </span>
  );
}

export function SigningBadge({ signing }: { signing?: string }) {
  if (!signing) return null;
  const map: Record<string, { label: string; className: string }> = {
    match: { label: 'Matches signing copy', className: 'bg-mint text-teal-900' },
    gap: { label: 'Gap in signing copy', className: 'bg-danger text-white' },
    inserted: { label: 'Awaiting supplier acceptance', className: 'bg-page text-muted border border-line' },
    waived: { label: 'Waived', className: 'bg-page text-muted border border-line' },
  };
  const s = map[signing];
  if (!s) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-[2px] text-[10.5px] font-medium',
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}
