'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Search } from 'lucide-react';
import { Button, PageHeader, SirionCard, Table, TableFooter, Td, Th } from '@/components/sirion/ui';
import { MoneyPlain } from '@/components/sirion/MoneyFigure';
import { useLedger } from '@/lib/useDeal';
import { useDemo } from '@/lib/store';
import { deals, personName } from '@/lib/data';
import { formatLakh } from '@/lib/format';
import type { Deal } from '@/lib/types';
import { listedAtRisk } from '@/lib/demo/moreDeals';
import { nextActionFor } from '@/lib/demo/nextAction';

const VIEWS = [
  { id: 'mine', label: 'Waiting on me' },
  { id: 'open', label: 'All open' },
  { id: 'signing', label: 'In signing' },
  { id: 'signed', label: 'Signed' },
] as const;

const TYPE_LABEL: Record<Deal['supplierType'], string> = {
  software: 'Software',
  staffing: 'Staffing',
  logistics: 'Logistics',
  facilities: 'Facilities',
  consultants: 'Consultants',
  marketing: 'Marketing',
};

export default function DealsPage() {
  const router = useRouter();
  const [view, setView] = useState<string>('open');
  const [query, setQuery] = useState('');
  const { atRisk, counts, signed, rows } = useLedger();

  const rowsFor = (d: Deal) =>
    d.interactive ? counts : d.display!.rows;
  const demoClock = useDemo((st) => st.clock);
  const demoSignedAt = useDemo((st) => st.signedAt);
  const demoSigning = useDemo((st) => st.signing);
  const demo = { clock: demoClock, ledger: rows, signedAt: signed ? demoSignedAt : undefined, signing: demoSigning };
  const riskFor = (d: Deal) => (d.interactive ? (signed ? 0 : atRisk) : listedAtRisk(d));
  const stageFor = (d: Deal) => (d.interactive && signed ? 'signed' : d.stage);
  const roundFor = (d: Deal) => (d.interactive ? (signed ? 7 : 4) : d.display!.round);

  const list = deals
    .filter((d) => {
      const stage = stageFor(d);
      if (view === 'signed') return stage === 'signed';
      if (view === 'signing') return stage === 'signing';
      if (view === 'mine') {
        const r = rowsFor(d);
        return stage !== 'signed' && (r.needs > 0 || r.reopened > 0 || d.ownerId === 'ananya');
      }
      return stage !== 'signed';
    })
    .filter((d) => d.supplier.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.interactive) - Number(a.interactive) || riskFor(b) - riskFor(a));

  return (
    <>
      <PageHeader
        title="Deals"
        caption="Supplier negotiations in progress, with what each one is worth if it slips."
        right={
          <>
            <Button>
              <Filter size={13} /> Filters
            </Button>
            <Button variant="primary">New deal</Button>
          </>
        }
      />

      <div className="flex gap-5">
        <aside className="hidden w-52 shrink-0 lg:block">
          <p className="mb-2 px-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
            Saved views
          </p>
          <nav className="space-y-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={[
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[12.5px] transition-colors',
                  view === v.id
                    ? 'bg-white font-medium text-teal-900 shadow-card'
                    : 'text-ink/75 hover:bg-white/60',
                ].join(' ')}
              >
                {v.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <SirionCard bodyClassName="px-0 pb-0 pt-0">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex w-full max-w-xs items-center gap-2 rounded-md border border-line bg-page px-3 py-[6px]">
                <Search size={13} className="shrink-0 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search suppliers"
                  className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-muted"
                />
              </div>
              <span className="whitespace-nowrap text-[11.5px] text-muted">
                {list.length} deal{list.length === 1 ? '' : 's'}
              </span>
            </div>

            <Table>
              <thead>
                <tr>
                  <Th>Supplier</Th>
                  <Th>Type</Th>
                  <Th align="right">Value / yr</Th>
                  <Th align="center">Round</Th>
                  <Th align="center">Threads</Th>
                  <Th>Terms</Th>
                  <Th align="right">₹ a year if signed as is</Th>
                  <Th>Stage</Th>
                  <Th>Owner</Th>
                  <Th>Next action</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const r = rowsFor(d);
                  const risk = riskFor(d);
                  return (
                    <tr
                      key={d.id}
                      onClick={() => router.push(`/deals/${d.id}`)}
                      className="cursor-pointer transition-colors hover:bg-page/60"
                    >
                      <Td>
                        <span className="flex items-center gap-2">
                          {d.interactive && (
                            <span
                              className="h-[7px] w-[7px] shrink-0 rounded-full bg-teal-900"
                              title="New activity"
                            />
                          )}
                          <span className="font-medium text-ink">{d.supplier}</span>
                        </span>
                      </Td>
                      <Td className="text-muted">{TYPE_LABEL[d.supplierType]}</Td>
                      <Td align="right">{formatLakh(d.annualFeeInr / 1e5)}</Td>
                      <Td align="center" className="text-muted">
                        {roundFor(d)}
                      </Td>
                      <Td align="center" className="text-muted">
                        {d.interactive ? 4 : d.display!.threads}
                      </Td>
                      <Td>
                        <TermCounts r={r} />
                      </Td>
                      <Td align="right">
                        <MoneyPlain
                          lakh={risk || null}
                          size="sm"
                          suffix={null}
                          tone={risk > 3 ? 'danger' : 'teal'}
                        />
                      </Td>
                      <Td>
                        <StageChip stage={stageFor(d)} />
                      </Td>
                      <Td className="text-muted">{personName(d.ownerId)}</Td>
                      <Td>
                        {(() => {
                          const a = nextActionFor(d, demo);
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(a.href);
                              }}
                              className="whitespace-nowrap rounded-md border border-teal-900/45 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-teal-900 hover:bg-mint/40"
                            >
                              {a.label}
                            </button>
                          );
                        })()}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <TableFooter total={list.length} />
          </SirionCard>
        </div>
      </div>
    </>
  );
}

/** Term counts as words, so they never read as one run-together number. */
function TermCounts({ r }: { r: { agreed: number; open: number; needs: number; reopened: number } }) {
  const total = r.agreed + r.open + r.needs + r.reopened;
  const flags = [
    r.needs ? { n: r.needs, label: 'to confirm', className: 'bg-lime text-ink' } : null,
    r.reopened ? { n: r.reopened, label: 'reopened', className: 'bg-amber-bg text-amber-fg' } : null,
    r.open ? { n: r.open, label: 'open', className: 'border border-line bg-white text-muted' } : null,
  ].filter(Boolean) as { n: number; label: string; className: string }[];
  return (
    <span className="flex flex-wrap items-center gap-1 text-[11.5px]">
      <span className="whitespace-nowrap text-ink">
        {r.agreed} of {total} agreed
      </span>
      {flags.map((f) => (
        <span key={f.label} className={`whitespace-nowrap rounded px-1.5 py-[1px] text-[10.5px] font-medium ${f.className}`}>
          {f.n} {f.label}
        </span>
      ))}
    </span>
  );
}

function StageChip({ stage }: { stage: Deal['stage'] }) {
  const map = {
    rounds: { label: 'Rounds', className: 'bg-page text-muted border border-line' },
    signing: { label: 'Signing', className: 'bg-lime text-ink' },
    signed: { label: 'Signed', className: 'bg-mint text-teal-900' },
  };
  const s = map[stage];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
