'use client';

import { useState } from 'react';
import type { PriceTag } from '@/lib/types';
import { formatLakh } from '@/lib/format';
import { cn } from './ui';

const BASIS_LABEL: Record<PriceTag['basis'], string> = {
  own_invoices: 'our own invoices',
  own_renewals: 'our own past renewals',
  own_service_events: 'our own uptime records',
  formula: "Finance's cost of money",
  none: 'None',
};

const CONFIDENCE_LABEL: Record<PriceTag['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
  formula: 'Formula',
  none: 'No ₹ figure',
};

/**
 * A ₹ figure with the proof behind it one hover away.
 * Every number here came out of lib/engines, never out of the model.
 */
export function MoneyFigure({
  tag,
  size = 'md',
  suffix = 'per year on average',
  showExposure = true,
  className,
}: {
  tag: PriceTag | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  suffix?: string | null;
  showExposure?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!tag || tag.costLakhPerYr === null) {
    return (
      <span className={cn('text-[12.5px] text-muted', className)}>
        No ₹ figure
      </span>
    );
  }

  const sizes = {
    sm: 'text-[12.5px] font-medium',
    md: 'text-[14px] font-semibold',
    lg: 'text-[20px] font-semibold',
    xl: 'text-[30px] font-semibold',
  };

  return (
    <span
      className={cn('relative inline-flex flex-col items-start', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-baseline gap-1 text-left"
      >
        <span className={cn(sizes[size], 'text-teal-900 underline decoration-dotted decoration-teal-900/30 underline-offset-4')}>
          {formatLakh(tag.costLakhPerYr)}
        </span>
        {suffix && <span className="text-[11.5px] text-muted">{tag.basis === 'own_renewals' ? 'expected at the next renewal' : suffix}</span>}
      </button>

      {showExposure && tag.exposureLakh !== undefined && (
        <span className="mt-0.5 text-[11px] text-muted">
          Gross renewal exposure · {formatLakh(tag.exposureLakh)}
        </span>
      )}

      {open && (
        <span className="dl-fade-in absolute bottom-full left-0 z-[90] mb-2 block w-[340px] rounded-lg border border-line bg-white p-4 text-left shadow-pop">
          <span className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              How calculated
            </span>
            <span className="rounded-full bg-page px-2 py-[1px] text-[10px] text-muted">
              {CONFIDENCE_LABEL[tag.confidence]}
              {tag.n ? ` · n = ${tag.n}` : ''}
            </span>
          </span>
          {tag.proof.map((p, i) => (
            <span key={i} className="mb-2 block text-[12px] leading-[18px] text-ink">
              {p}
            </span>
          ))}
          {tag.formula && (
            <span className="mt-2 block border-t border-line pt-2 font-mono text-[11px] leading-[16px] text-muted">
              {tag.formula}
            </span>
          )}
          <span className="mt-2 block text-[10.5px] text-muted">
            Based on {BASIS_LABEL[tag.basis]}. No supplier claim is used.
          </span>
        </span>
      )}
    </span>
  );
}

/** A plain figure with no proof card, for totals built from many rows. */
export function MoneyPlain({
  lakh,
  size = 'md',
  suffix = 'per year on average',
  tone = 'teal',
}: {
  lakh: number | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  suffix?: string | null;
  tone?: 'teal' | 'danger' | 'muted';
}) {
  if (lakh === null) return <span className="text-[12.5px] text-muted">None</span>;
  const sizes = {
    sm: 'text-[12.5px] font-medium',
    md: 'text-[14px] font-semibold',
    lg: 'text-[20px] font-semibold',
    xl: 'text-[30px] font-semibold',
  };
  const tones = { teal: 'text-teal-900', danger: 'text-danger', muted: 'text-muted' };
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={cn(sizes[size], tones[tone])}>{formatLakh(lakh)}</span>
      {suffix && <span className="text-[11.5px] text-muted">{suffix}</span>}
    </span>
  );
}
