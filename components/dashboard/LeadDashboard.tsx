'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { KpiTile, SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { Donut, HBars } from '@/components/sirion/charts';
import { StatePill, NewAskBadge } from '@/components/sirion/StatePill';
import { MoneyPlain } from '@/components/sirion/MoneyFigure';
import { SourceChip } from '@/components/sirion/SourceChip';
import { useDemo } from '@/lib/store';
import { useLedger } from '@/lib/useDeal';
import { cloudDeskDeal, deals, kpiHistory, personName, termsFound } from '@/lib/data';
import { rowAtRisk } from '@/lib/engines/atRisk';
import { rowHeadlineShare } from '@/lib/engines/playbook';
import { outlookHrefForRow } from '@/lib/demo/rowEmail';
import { HeadlineExplainer } from '@/components/sirion/HeadlineExplainer';
import { formatLakh, formatPct } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import { OPENING_LINE, QUICK_INTRO } from '@/lib/demo/quickPath';
import { useGuide } from '@/components/demo/useGuide';

export function LeadDashboard() {
  const { rows, atRisk, allOpenAtRisk, counts, attention, signed, hydrated, reconciliation, asOf } = useLedger();

  const roundReviewed = useDemo((state) => state.completedSteps.includes(1));
  const notices = useDemo((state) => state.notices);
  const approvals = useDemo((state) => state.approvals);
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
      <HomeHero />

      <div id="workspace" className="mb-3 mt-10 flex items-baseline justify-between gap-3 scroll-mt-6">
        <h2 className="text-[17px] font-semibold text-ink">Workspace</h2>
        <p className="text-[13px] text-muted">Portfolio figures, exposure and the live CloudDesk ledger</p>
      </div>
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
          label="₹ a year if signed as is, across open deals"
          value={<span suppressHydrationWarning>{splitUnit(formatLakh(allOpenAtRisk))[0]}</span>}
          unit={<span suppressHydrationWarning>{splitUnit(formatLakh(allOpenAtRisk))[1]}</span>}
          caption={`${openDeals.length} open deals · ${needsConfirming} row${
            needsConfirming === 1 ? '' : 's'
          } need${needsConfirming === 1 ? 's' : ''} confirming`}
          foot={
            <>
              <dl className="space-y-1.5">
                <SplitRow label="CloudDesk (live)" value={formatLakh(signed ? 0 : atRisk)} />
                {!signed && <p className="text-[11.5px] leading-[16px] text-muted" suppressHydrationWarning>{reconciliation} · {asOf}</p>}
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
        <SirionCard title="Where agreed terms were found" className="lg:col-span-2" sample={`From ${termsFound.interviews} primary interviews`}>
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
        <SirionCard title="If signed as is, by open deal" caption="₹ lakh a year, top 8">
          <HBars data={atRiskByDeal} unit=" lakh/yr" height={262} />
        </SirionCard>
        {!signed && (
          <SirionCard title="CloudDesk, live" caption="The figure on this page, the Deals list and the Outlook pane, built row by row">
            <HeadlineExplainer rows={rows} deal={cloudDeskDeal} defaultOpen />
          </SirionCard>
        )}

      </div>

      <SirionCard
        title="Needs your attention"
        caption="Rows that are waiting on a person, have been reopened, or carry a new ask"
        className="mt-4"
        bodyClassName="px-0 pb-0 pt-0"
      >
        {hydrated && approvals.filter((x) => x.status === 'pending').map((x) => (
          <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-lime/30 px-6 py-4 text-sm">
            <span>
              <strong className="font-semibold">Approval with {personName(x.approverId)}</strong> · {x.label}: {x.change}
              <span className="block text-[11.5px] text-muted">{x.rule}</span>
            </span>
            <Link href={`/deals/D-CLOUDDESK/ledger#${x.rowId}`} className="font-medium text-teal-900 underline">Review</Link>
          </div>
        ))}
        {hydrated && notices.filter((n) => n.forPersonId === 'ananya' && n.draft).map((n, i) => (
          <div key={i} className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-amber-bg/40 px-6 py-4 text-sm">
            <span>
              <strong className="font-semibold">{n.title ?? 'A reply needs you'}</strong> · {n.text}
            </span>
            <Link href={n.href ?? '/outlook/ananya'} className="font-medium text-teal-900 underline">Open</Link>
          </div>
        ))}
        {!signed && !roundReviewed && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 text-sm">
            <span>CloudDesk · Supplier round 4 is ready for review.</span>
            <Link href="/outlook/ananya?msg=M8" className="font-medium text-teal-900 underline">Review round</Link>
          </div>
        )}
        {attention.length === 0 ? (signed || roundReviewed) && (
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
                  const risk = rowHeadlineShare(row, cloudDeskDeal);
                  const gross = rowAtRisk(row, cloudDeskDeal);
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
                          <StatePill state={row.state} condition={row.condition?.text} />
                          {newAsk && <NewAskBadge />}
                        </span>
                      </Td>
                      <Td align="right">
                        <MoneyPlain lakh={risk} size="sm" suffix="a year" tone={risk ? 'danger' : 'muted'} />
                        {row.termKey === 'renewal_notice' && gross !== null && (
                          <span className="block text-[10.5px] text-muted">{formatLakh(gross)} at the next renewal</span>
                        )}
                      </Td>
                      <Td>
                        <SourceChip source={row.source} />
                      </Td>
                      <Td align="right">
                        <Link
                          href={outlookHrefForRow(row, cloudDeskDeal)}
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


export { formatPct };

/** The collapsible reference sections on /story; a link opens the section. */
const MORE_LINKS = [
  { href: '/story#assumptions', label: 'Assumptions' },
  { href: '/story#how-this-works', label: 'How this works' },
  { href: '/story#architecture-privacy', label: 'Architecture & privacy' },
  { href: '/story#financial-methodology', label: 'Financial methodology' },
  { href: '/story#peer-benchmarks', label: 'Peer benchmarks' },
  { href: '/story#sources-and-scope-of-claims', label: 'Sources and scope of claims' },
];

/** "₹20.3 lakh" → ["₹20.3", "lakh"]; "₹50,000" → ["₹50,000", ""]. */
function splitUnit(text: string): [string, string] {
  const m = text.match(/^(.*?)\s+(lakh|crore)$/);
  return m ? [m[1], m[2]] : [text, ''];
}

const CASE_LINKS = [
  { href: '/story#1-why-negotiation', label: 'Why negotiation' },
  { href: '/story#2-stakeholder-map', label: 'Stakeholder map' },
  { href: '/story#3-the-problem', label: 'The problem' },
  { href: '/story#5-success-metrics', label: 'Success metrics' },
  { href: '/today', label: 'Sirion today vs Deal Ledger' },
];

/** Review fix B3/C1: one primary action, the rest as text links, the case one click away. */
function HomeHero() {
  const g = useGuide();
  return (
    <section className="rounded-2xl border border-line bg-white px-7 py-7 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-[760px]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-teal-900">Deal Ledger · prototype</p>
          <h1 className="mt-2 text-[26px] font-semibold leading-[34px] text-ink">{OPENING_LINE}</h1>
          <p className="mt-3 text-[15px] leading-[23px] text-[#3F4E52]">{QUICK_INTRO}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button onClick={g.startQuickPath} className="rounded-lg bg-teal-900 px-5 py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-teal-700">
              Review CloudDesk&apos;s signing copy
            </button>
            <button onClick={() => { useDemo.getState().setQuickPath(false); g.jumpTo(1); }} className="text-[14px] font-semibold text-teal-900 underline underline-offset-2">
              Start the full walkthrough
            </button>
            <a href="#workspace" className="text-[14px] font-semibold text-teal-900 underline underline-offset-2">
              Explore the workspace
            </a>
          </div>
        </div>
        <nav aria-label="About this case" className="min-w-[200px] rounded-xl border border-line bg-page px-4 py-3">
          <Link href="/story" className="text-[13px] font-semibold text-ink hover:underline">About this case</Link>
          <ul className="mt-1.5 space-y-1">
            {CASE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[13px] text-teal-900 hover:underline">{l.label}</Link>
              </li>
            ))}
          </ul>
          <details className="mt-2 border-t border-line pt-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink">More detail</summary>
            <ul className="mt-1.5 space-y-1">
              {MORE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] text-teal-900 hover:underline">{l.label}</Link>
                </li>
              ))}
            </ul>
          </details>
        </nav>
      </div>
    </section>
  );
}
