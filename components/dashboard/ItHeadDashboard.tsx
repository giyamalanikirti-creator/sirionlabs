'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Check } from 'lucide-react';
import { PageHeader, SirionCard, SamplePill } from '@/components/sirion/ui';
import { useLedger } from '@/lib/useDeal';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { plainValue, TERM_LABELS } from '@/lib/plain';
import { formatDateTime, formatLakh } from '@/lib/format';
import { deals } from '@/lib/data';

const MY_SUPPLIERS = ['D-CLOUDDESK', 'D-CLOUDOPS', 'D-HELPHUB', 'D-DATAVAULT'];

export function ItHeadDashboard() {
  const { rows } = useLedger();
  const hydrated = useHydrated();
  const outcomes = useDemo((s) => s.sendOutcomes);
  const mine = hydrated ? outcomes.filter((o) => o.personId === 'vikram') : [];

  const cards = MY_SUPPLIERS.map((id) => deals.find((d) => d.id === id)!);

  return (
    <>
      <PageHeader
        title="My suppliers"
        caption="What procurement has agreed on your behalf, in plain words."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.map((deal) => {
          const isCloudDesk = deal.interactive;
          return (
            <SirionCard
              key={deal.id}
              title={deal.supplier}
              caption={`${formatLakh(deal.annualFeeInr / 1e5)} a year · ${deal.termYears}-year term`}
              sample={!isCloudDesk}
              right={
                isCloudDesk ? (
                  <Link
                    href="/deals/D-CLOUDDESK"
                    className="mr-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-teal-900 hover:underline"
                  >
                    Open ledger
                    <ArrowUpRight size={12} />
                  </Link>
                ) : undefined
              }
            >
              <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">What's agreed</p>
              {isCloudDesk ? (
                <ul className="space-y-1.5">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 text-[13px] leading-[19px]">
                      <Check size={13} className="mt-[3px] shrink-0 text-teal-900" strokeWidth={2.5} />
                      <span className="text-ink/85">
                        <span className="text-muted">{TERM_LABELS[r.termKey]}:</span>{' '}
                        {plainValue(r.position)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px] leading-[19px] text-muted">
                  {deal.display!.rows.agreed} terms agreed, {deal.display!.rows.open} still open.
                  Procurement is leading this one.
                </p>
              )}
            </SirionCard>
          );
        })}
      </div>

      <SirionCard
        title="Send warnings you've seen this quarter"
        caption="What Deal Ledger flagged before an email went to a supplier"
        className="mt-4"
      >
        {mine.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">
            No warnings yet. Reply to CloudDesk from{' '}
            <Link href="/outlook/vikram" className="text-teal-900 hover:underline">
              your Outlook
            </Link>{' '}
            to see one.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {[...mine].reverse().map((o, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-line p-3.5">
                <span
                  className={`mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    o.choice === 'send_anyway' ? 'bg-amber-bg text-amber-fg' : 'bg-mint text-teal-900'
                  }`}
                >
                  {o.choice === 'send_anyway' ? <AlertTriangle size={12} /> : <Check size={12} strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink">
                    {o.termKey ? TERM_LABELS[o.termKey] : 'A term'}:{' '}
                    {o.choice === 'loop_in'
                      ? 'you looped in procurement'
                      : o.choice === 'dont_send'
                        ? 'you went back to the draft'
                        : o.choice === 'send_anyway'
                          ? 'you sent it anyway, so the row was reopened'
                          : 'checked, nothing to flag'}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted">{formatDateTime(o.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SirionCard>

      <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
        <SamplePill /> marks illustrative data. The CloudDesk card is live from the ledger.
      </p>
    </>
  );
}
