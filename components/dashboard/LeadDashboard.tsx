'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { KpiTile, PageHeader, SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { Donut, HBars } from '@/components/sirion/charts';
import { StatePill, NewAskBadge } from '@/components/sirion/StatePill';
import { MoneyPlain } from '@/components/sirion/MoneyFigure';
import { SourceChip } from '@/components/sirion/SourceChip';
import { useLedger } from '@/lib/useDeal';
import { cloudDeskDeal, deals, kpiHistory, termsFound } from '@/lib/data';
import { rowAtRisk } from '@/lib/engines/atRisk';
import { formatLakh, formatPct } from '@/lib/format';
import { plainValue } from '@/lib/plain';

export function LeadDashboard() {
  const { rows, atRisk, allOpenAtRisk, counts, attention, signed, hydrated } = useLedger();

  const ns = kpiHistory.northStar[kpiHistory.northStar.length - 1];
  const northStarPct = Math.round((ns.clean / ns.audited) * 100);
  const signedSince = kpiHistory.signedSinceLastAudit + (signed ? 1 : 0);

  const openDeals = deals.filter((d) => (d.id === cloudDeskDeal.id ? !signed : d.stage !== 'signed'));

  const atRiskByDeal = [
    ...(signed ? [] : [{ name: 'CloudDesk', value: round1(atRisk) }]),
    ...deals
      .filter((d) => !d.interactive)
      .map((d) => ({ name: d.supplier.split(' ')[0], value: d.display!.atRiskLakh })),
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const outsideDocument =
    termsFound.split.filter((s) => s.source !== 'Word versions').reduce((a, b) => a + b.pct, 0);

  const needsConfirming = counts.needs;

  return (
    <>
      <PageHeader
        title="Supplier negotiations"
        caption="Ananya negotiates supplier renewals across Outlook and Word. Deal Ledger ties what she agreed in email to the clauses her team is about to sign."
      />

      <SirionCard title={signed ? "CloudDesk renewal · Signed" : "CloudDesk renewal · New supplier draft"} className="mb-4">
        <p className="text-sm text-ink">{signed ? 'Review the handover and see how the signed price is checked against invoices.' : 'Rohan has confirmed fixed pricing. Review what changed in the attached contract.'}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href={signed ? "/contracts/C-2026-0417?tab=obligations" : "/outlook/ananya?msg=M8"} className="rounded-md bg-teal-900 px-4 py-2 text-sm font-medium text-white">{signed ? "See handover" : "Review supplier update"}</Link>
          <Link href="/deals" className="rounded-md border border-line px-4 py-2 text-sm text-teal-900">Explore portfolio</Link>
        </div>
      </SirionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Signed with no agreed term missing"
          value={`${northStarPct}%`}
          caption={`${ns.clean} of ${ns.audited} audited · ${ns.quarter} · ${signedSince} signed since, awaiting audit`}
          foot={
            <>
              <QuarterTrend />
              <p className="mt-2.5 text-[11px] leading-[16px] text-muted">
                North star. Measured by a sampled audit of the email trail, not by this tool.
              </p>
            </>
          }
        />
        <KpiTile
          label="₹ at risk in open deals"
          value={<span suppressHydrationWarning>{formatLakh(allOpenAtRisk)}</span>}
          caption={`${openDeals.length} open deals · ${needsConfirming} row${
            needsConfirming === 1 ? '' : 's'
          } need${needsConfirming === 1 ? 's' : ''} confirming`}
          foot={
            <>
              <dl className="space-y-1.5">
                <SplitRow label="CloudDesk (live)" value={formatLakh(signed ? 0 : atRisk)} />
                <SplitRow
                  label="11 other open deals"
                  value={formatLakh(allOpenAtRisk - (signed ? 0 : atRisk))}
                  muted
                />
              </dl>
              <p className="mt-2.5 text-[11px] leading-[16px] text-muted">
                Expected annual average. Next-renewal costs are spread across the contract term.
              </p>
            </>
          }
        />
        <SirionCard title="Where agreed terms were found" className="lg:col-span-2" sample>
          <Donut
            data={termsFound.split.map((s) => ({ name: s.source, value: s.pct }))}
            height={212}
          />
          <p className="-mt-2 text-center text-[12px] text-muted">
            <strong className="font-semibold text-ink">{outsideDocument}%</strong> were agreed
            outside the document, across {termsFound.totalTerms} terms in the last{' '}
            {termsFound.windowMonths} months.
          </p>
        </SirionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-1">
        <SirionCard title="At risk by open deal" caption="₹ lakh a year, top 8">
          <HBars data={atRiskByDeal} unit=" lakh/yr" height={262} />
        </SirionCard>

      </div>

      <SirionCard
        title="Needs your attention"
        caption="Rows that are waiting on a person, have been reopened, or carry a new ask"
        className="mt-4"
        bodyClassName="px-0 pb-0 pt-0"
      >
        {attention.length === 0 ? (
          <p className="px-6 py-8 text-center text-[13px] text-muted">
            Nothing is waiting on you. Every row is agreed and source-linked.
          </p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Deal</Th>
                  <Th>Term</Th>
                  <Th>Agreed position</Th>
                  <Th>State</Th>
                  <Th align="right">Estimated impact</Th>
                  <Th>Source</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {attention.map((row) => {
                  const risk = rowAtRisk(row, cloudDeskDeal);
                  const newAsk = row.threats.some((t) => t.active && t.kind === 'new_ask');
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-page/60">
                      <Td>
                        <Link
                          href="/deals/D-CLOUDDESK"
                          className="font-medium text-teal-900 hover:underline"
                        >
                          CloudDesk
                        </Link>
                      </Td>
                      <Td className="font-medium">{row.label}</Td>
                      <Td className="text-ink/80">{plainValue(row.position)}</Td>
                      <Td>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <StatePill state={row.state} />
                          {newAsk && <NewAskBadge />}
                        </span>
                      </Td>
                      <Td align="right">
                        <MoneyPlain lakh={risk} size="sm" suffix={row.termKey === 'renewal_notice' ? 'at next renewal' : 'per year on average'} tone={risk ? 'danger' : 'muted'} />
                      </Td>
                      <Td>
                        <SourceChip source={row.source} />
                      </Td>
                      <Td align="right">
                        <Link
                          href={outlookLinkFor(row.id)}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-medium text-teal-900 hover:underline"
                        >
                          Open in Outlook
                          <ArrowUpRight size={12} />
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <p className="px-6 py-3 text-[11.5px] text-muted">
              {hydrated ? rows.length : 7} terms tracked on CloudDesk. Every row carries the email or
              clause it came from.
            </p>
          </>
        )}
      </SirionCard>

    </>
  );
}

/** Three audited quarters, as a small inline trend. */
function QuarterTrend() {
  const points = kpiHistory.northStar.map((q) => ({
    label: q.quarter.split(' ')[0],
    pct: Math.round((q.clean / q.audited) * 100),
  }));
  const max = 100;
  return (
    <div className="flex items-end gap-3">
      {points.map((p, i) => (
        <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-muted">{p.pct}%</span>
          <span
            className={`w-full rounded-t-[2px] ${i === points.length - 1 ? 'bg-teal-900' : 'bg-mint'}`}
            style={{ height: Math.round((p.pct / max) * 34) }}
          />
          <span className="text-[9.5px] uppercase tracking-wide text-muted">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function SplitRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
      <dt className="text-muted">{label}</dt>
      <dd className={muted ? 'text-muted' : 'font-medium text-ink'} suppressHydrationWarning>
        {value}
      </dd>
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function outlookLinkFor(rowId: string): string {
  if (rowId === 'R-credit') return '/outlook/ananya?msg=M12';
  if (rowId === 'R-price') return '/outlook/ananya?msg=M8';
  if (rowId === 'R-notice') return '/outlook/ananya?msg=M8';
  return '/outlook/ananya';
}

export { formatPct };
