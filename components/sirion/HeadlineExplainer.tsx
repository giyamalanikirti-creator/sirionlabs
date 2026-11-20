'use client';

/** "How ₹X is calculated": each row's share of the headline, the sum, and the risks outside the figure. */
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { COST_RULE, explainHeadline } from '@/lib/engines/explain';
import { formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import type { Deal, LedgerRow } from '@/lib/types';

export function HeadlineExplainer({ rows, deal, defaultOpen = false }: { rows: LedgerRow[]; deal: Deal; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const x = explainHeadline(rows, deal);
  return (
    <div className="rounded-lg border border-line bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-4 py-2.5 text-left text-[12.5px] font-medium text-teal-900"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        How {formatLakh(x.totalLakh)} {HEADLINE_SUFFIX} is calculated, and the other risks
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3">
          <div className="mb-3 rounded-md bg-page px-3 py-2 text-[11.5px] leading-[17px] text-ink">
            <p className="font-semibold">{COST_RULE[0]}</p>
            <p className="text-muted">{COST_RULE[1]}</p>
          </div>
          {x.lines.length === 0 ? (
            <p className="text-[12.5px] text-muted">{x.sumText}</p>
          ) : (
            <>
              <ol className="space-y-3">
                {x.lines.map((l) => (
                  <li key={l.rowId} className="grid gap-2 text-[12px] leading-[17px] sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-medium text-ink">
                        {l.label}: <span className="font-normal">{l.summary}</span>
                        <span className="font-normal text-muted"> ({l.source})</span>
                      </p>
                      {l.proof.map((p) => (
                        <p key={p} className="mt-0.5 text-muted">{p}</p>
                      ))}
                    </div>
                    <p className="whitespace-nowrap text-right font-semibold text-danger">
                      {formatLakh(l.shareLakh)} a year
                      {l.onceLakh !== undefined && (
                        <span className="block text-[10.5px] font-normal text-muted">{formatLakh(l.onceLakh)} once per renewal</span>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 border-t border-line pt-2 text-right text-[12.5px] font-semibold text-ink">{x.sumText}</p>
              <p className="mt-1 text-right text-[11.5px] text-muted">
                {x.totalText}
                {x.notPriced.length ? ` Not priced: ${x.notPriced.join(', ')}.` : ''}
              </p>
            </>
          )}
          {x.otherRisks.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Other risks, not in the figure</p>
              <ul className="space-y-1.5">
                {x.otherRisks.map((r, i) => (
                  <li key={i} className="text-[12px] leading-[17px] text-ink">
                    <span className="font-medium">{r.label}.</span> <span className="text-muted">{r.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted">Every number is computed from your own invoices, renewals and uptime records. The model only reads text.</p>
        </div>
      )}
    </div>
  );
}
