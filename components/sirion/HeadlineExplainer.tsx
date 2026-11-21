'use client';

/**
 * "How ₹X is calculated": a breakdown table, one row per term (what is at
 * stake, the basis, the expected ₹ a year), a total that reconciles, the
 * working behind each row on demand, and the risks outside the figure.
 */
import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { COST_RULE, explainHeadline } from '@/lib/engines/explain';
import { formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import type { Deal, LedgerRow } from '@/lib/types';

function Working({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);
  if (lines.length < 2) return null;
  return (
    <div className="mt-1.5">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-[13px] font-medium text-teal-900 hover:underline" aria-expanded={open}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {open ? 'Hide working' : 'Show working'}
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1 border-l-2 border-line pl-3 text-[13.5px] leading-[20px] text-[#3F4E52]">
          {lines.slice(1).map((p) => <li key={p}>{p}</li>)}
        </ol>
      )}
    </div>
  );
}

export function HeadlineExplainer({ rows, deal, defaultOpen = false }: { rows: LedgerRow[]; deal: Deal; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [method, setMethod] = useState(false);
  const x = explainHeadline(rows, deal);
  return (
    <div className="rounded-xl border border-line bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-3.5 text-left text-[15px] font-semibold text-teal-900"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        How {formatLakh(x.totalLakh)} {HEADLINE_SUFFIX} is calculated, and the other risks
      </button>
      {open && (
        <div className="border-t border-line px-5 pb-5 pt-4">
          {x.lines.length === 0 ? (
            <p className="text-[15px] text-ink">{x.sumText}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">
                    <th className="py-2.5 pr-4 font-semibold">Term</th>
                    <th className="py-2.5 pr-4 font-semibold">What is at stake</th>
                    <th className="py-2.5 pr-4 font-semibold">Basis</th>
                    <th className="py-2.5 text-right font-semibold">Expected a year</th>
                  </tr>
                </thead>
                <tbody>
                  {x.lines.map((l) => (
                    <tr key={l.rowId} className="border-b border-line align-top">
                      <td className="w-[150px] py-3.5 pr-4 text-[15px] font-semibold text-ink">{l.label}</td>
                      <td className="py-3.5 pr-4 text-[14.5px] leading-[21px] text-ink">
                        {l.summary}
                        <span className="mt-0.5 block text-[13px] text-muted">Source: {l.source}</span>
                      </td>
                      <td className="w-[34%] py-3.5 pr-4 text-[14px] leading-[21px] text-[#3F4E52]">
                        {l.proof[0]}
                        <Working lines={l.proof} />
                      </td>
                      <td className="w-[150px] py-3.5 text-right">
                        <span className="text-[17px] font-semibold text-danger">{formatLakh(l.shareLakh)}</span>
                        {l.onceLakh !== undefined && (
                          <span className="mt-0.5 block text-[13px] text-muted">{formatLakh(l.onceLakh)} once per renewal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="align-top">
                    <td className="pt-3.5 text-[15px] font-semibold text-ink">Total</td>
                    <td colSpan={2} className="pt-3.5 text-[14px] leading-[21px] text-muted">
                      {x.sumText}. Averaged over the {deal.termYears}-year term.
                      {x.notPriced.length ? ` Not priced: ${x.notPriced.join(', ')}.` : ''}
                    </td>
                    <td className="pt-3.5 text-right">
                      <span className="text-[20px] font-semibold text-ink">{formatLakh(x.totalLakh)}</span>
                      <span className="block text-[13px] text-muted">a year (expected)</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {x.otherRisks.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">Other risks, not in the figure</p>
              <ul className="grid gap-2.5 md:grid-cols-2">
                {x.otherRisks.map((r, i) => (
                  <li key={i} className="flex gap-2.5 rounded-lg border border-line bg-page px-4 py-3">
                    <AlertTriangle size={16} className="mt-[3px] shrink-0 text-amber-fg" />
                    <span>
                      <span className="block text-[14.5px] font-semibold text-ink">{r.label}</span>
                      <span className="mt-0.5 block text-[14px] leading-[20px] text-[#3F4E52]">{r.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 border-t border-line pt-3">
            <button onClick={() => setMethod((v) => !v)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-teal-900 hover:underline" aria-expanded={method}>
              <Info size={15} /> How expected cost is calculated
            </button>
            {method && (
              <div className="mt-2 rounded-lg bg-page px-4 py-3 text-[14px] leading-[21px]">
                <p className="font-semibold text-ink">{COST_RULE[0]}</p>
                <p className="mt-1 text-[#3F4E52]">{COST_RULE[1]}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
