'use client';

import { useState } from 'react';
/**
 * Deal pages for every deal other than CloudDesk.
 *
 * BrightStaff and SwiftShip are scripted: emails, a side thread, two
 * versions (turns) and one priced gap, each showing a different pattern.
 * Every other deal opens a simple read-only ledger, so no click leads nowhere.
 */
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, FileText, Mail } from 'lucide-react';
import { Button, SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { MoneyPlain } from '@/components/sirion/MoneyFigure';
import { personName } from '@/lib/data';
import { formatDateLong, formatDateShort, formatInr, formatLakh, formatLakhPerYear, HEADLINE_SUFFIX } from '@/lib/format';
import { SCRIPTED_DEALS, scriptedAtRisk, type ScriptedDeal, type ScriptedRow } from '@/lib/demo/moreDeals';
import { outlookHref, riskEmailForDeal, rowsForDeal } from '@/lib/demo/supplierInbox';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import type { Deal } from '@/lib/types';

const STATE: Record<ScriptedRow['state'], { label: string; className: string }> = {
  agreed: { label: 'Agreed', className: 'bg-mint text-teal-900' },
  open: { label: 'Open', className: 'border border-line bg-white text-muted' },
  needs_confirmation: { label: 'Needs confirming', className: 'bg-lime text-ink' },
  missing_at_signing: { label: 'Missing at signing', className: 'bg-amber-bg text-amber-fg' },
};

export function OtherDealPage({ deal }: { deal: Deal }) {
  const scripted = SCRIPTED_DEALS[deal.id];
  const risk = scripted ? scriptedAtRisk(scripted) : deal.display?.atRiskLakh ?? 0;

  return (
    <>
      <SirionCard className="mb-4" bodyClassName="px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">
              <Link href="/deals" className="hover:underline">Deals</Link> / {deal.supplier}
            </p>
            <h1 className="mt-1 text-[20px] text-teal-title">{deal.supplier}</h1>
            <p className="mt-1.5 text-[12.5px] text-muted">
              {formatLakh(deal.annualFeeInr / 1e5)} a year · {deal.termYears} years from {formatDateLong(deal.termStart)} ·{' '}
              {deal.stage === 'signing' ? 'Signing' : 'Rounds'} · Owner <span className="text-ink">{personName(deal.ownerId)}</span>
            </p>
            {scripted && (
              <p className="mt-3 inline-flex rounded-md bg-mint/50 px-2.5 py-1 text-[12px] font-medium text-teal-900">
                What this deal shows: {scripted.pattern}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
            <div>
              <MoneyPlain lakh={risk || null} size="xl" suffix={null} tone={risk > 0 ? 'danger' : 'teal'} />
              <p className="mt-0.5 text-[12px] text-muted">{HEADLINE_SUFFIX}</p>
            </div>
            {riskEmailForDeal(deal.id) && (
              <Link href={outlookHref(riskEmailForDeal(deal.id)!)}>
                <Button>
                  Open in Outlook <ArrowUpRight size={13} />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </SirionCard>

      {scripted ? <Scripted deal={scripted} /> : <ReadOnly deal={deal} />}
    </>
  );
}

function Scripted({ deal }: { deal: ScriptedDeal }) {
  const hydrated = useHydrated();
  const started = useDemo((s) => s.startedDealIds).includes(deal.dealId);
  const [disputed, setDisputed] = useState(false);
  const toast = useDemo((s) => s.toast);
  const logEvent = useDemo((s) => s.logEvent);
  const emailById = (id?: string) => deal.emails.find((e) => e.id === id);

  return (
    <div className="grid gap-4">
      <SirionCard title="Why this deal is here">
        <p className="text-[12.5px] leading-[19px] text-ink">{deal.patternDetail}</p>
        {deal.intake && (
          <div className="mt-3 rounded-lg border border-line p-3">
            <p className="mb-2 text-[11.5px] font-semibold text-ink">
              Intake, filled in from the email and the PDF quote
              {hydrated && started ? ' · deal created from the email' : ''}
            </p>
            <dl className="grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
              {deal.intake.fields.map((f) => (
                <div key={f.label} className="flex justify-between gap-3 border-b border-line/60 pb-1">
                  <dt className="text-muted">{f.label}</dt>
                  <dd className="text-right text-ink">
                    {f.value}
                    <span className="block text-[10.5px] text-muted">{f.from}</span>
                  </dd>
                </div>
              ))}
            </dl>
            {!(hydrated && started) && (
              <Link href="/outlook/ananya?msg=S2" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-teal-900 hover:underline">
                See “Start deal from this email” in Ananya’s Outlook <ArrowUpRight size={12} />
              </Link>
            )}
          </div>
        )}
      </SirionCard>

      <SirionCard title="Ledger" caption="What was agreed, where it was agreed, and what the latest file says" bodyClassName="px-0 pb-0 pt-0">
        <Table>
          <thead>
            <tr>
              <Th>Term</Th>
              <Th>Agreed</Th>
              <Th>State</Th>
              <Th>Source</Th>
              <Th align="right">₹ {HEADLINE_SUFFIX}</Th>
            </tr>
          </thead>
          <tbody>
            {deal.rows.map((row) => {
              const email = emailById(row.sourceEmailId);
              return (
                <tr key={row.id} className="align-top">
                  <Td className="font-medium">{row.label}</Td>
                  <Td>
                    {row.agreed}
                    {row.fileSays && (
                      <span className="mt-1 block text-[11.5px] text-amber-fg">
                        <AlertTriangle size={11} className="mr-1 inline" />
                        {row.fileSays}
                      </span>
                    )}
                    {row.move && (
                      <div className="mt-2 rounded-lg border border-teal-900/20 bg-mint/30 p-2.5 text-[11.5px] leading-[17px]">
                        <p className="font-semibold text-teal-900">Recommended move</p>
                        <p>{row.move.ask}</p>
                        {row.move.fallback && <p className="mt-1"><span className="text-muted">Fallback · </span>{row.move.fallback}</p>}
                        {row.move.leverage && <p className="mt-1"><span className="text-muted">Leverage · </span>{row.move.leverage}</p>}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-medium ${STATE[row.state].className}`}>
                      {STATE[row.state].label}
                    </span>
                  </Td>
                  <Td className="text-[11.5px] text-muted">
                    {email && (
                      <>
                        <span className="text-ink">{email.fromName}</span> · {formatDateShort(email.at)}
                        {email.side && <span className="ml-1 rounded bg-lime px-1 text-[10px] text-ink">side thread</span>}
                      </>
                    )}
                    {row.sourceQuote && <span className="mt-1 block italic">“{row.sourceQuote}”</span>}
                    {row.sourceNote && <span className="mt-1 block">{row.sourceNote}</span>}
                    <OutlookLink id={rowsForDeal(deal.dealId).find((r) => r.id === row.id)?.outlookId} />
                  </Td>
                  <Td align="right">
                    {row.costLakhPerYr !== undefined && row.state !== 'agreed' ? (
                      <>
                        <span className="font-semibold text-danger">{formatLakhPerYear(row.costLakhPerYr)}</span>
                        {row.proof?.map((p) => (
                          <span key={p} className="mt-1 block max-w-[260px] text-left text-[10.5px] leading-[15px] text-muted">{p}</span>
                        ))}
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </SirionCard>

      <SirionCard title="Rounds" caption="Each turn is their file plus their email, which is what the ledger reads">
          <ol className={`grid gap-3 ${deal.turns.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {deal.turns.map((t) => (
              <li key={t.round} className="flex gap-3 rounded-lg border border-line p-3">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${t.side === 'theirs' ? 'bg-amber-bg text-amber-fg' : 'bg-mint text-teal-900'}`}>
                  {t.round}
                </span>
                <div className="min-w-0 text-[12px] leading-[17px]">
                  <p className="font-medium text-ink">
                    {t.side === 'theirs' ? 'Their turn' : 'Our turn'} · {formatDateShort(t.at)}
                  </p>
                  <p className="text-muted">
                    <FileText size={11} className="mr-1 inline" />
                    {t.file} ({t.format})
                  </p>
                  <p className="mt-0.5 text-ink">{t.note}</p>
                </div>
              </li>
            ))}
          </ol>
      </SirionCard>

        <SirionCard title="Threads" caption={`${deal.emails.length} emails, including a side thread`}>
          <ul className="grid gap-2.5 md:grid-cols-2">
            {deal.emails.map((e) => (
              <li key={e.id} className="rounded-md border border-line px-3 py-2 text-[12px] leading-[17px]">
                <p className="flex flex-wrap items-center gap-1.5">
                  <Mail size={12} className="text-muted" />
                  <span className="font-medium text-ink">{e.fromName}</span>
                  <span className="text-muted">→ {e.to} · {formatDateShort(e.at)}</span>
                  {e.side && <span className="rounded bg-lime px-1 text-[10px] text-ink">side thread</span>}
                </p>
                <p className="mt-1 text-ink">{e.body}</p>
                {e.attachment && <p className="mt-1 text-[11px] text-muted">Attached: {e.attachment}</p>}
              </li>
            ))}
          </ul>
        </SirionCard>

      {deal.afterSigning && (
        <SirionCard title="After signing" caption="Sirion invoice reconciliation, against the ledger">
          <p className="text-[12.5px] font-medium text-ink">{deal.afterSigning.title}</p>
          {deal.afterSigning.lines.map((l) => (
            <p key={l} className="mt-1 text-[12.5px] leading-[19px] text-muted">{l}</p>
          ))}
          <p className="mt-2 text-[13px]">
            <span className="font-semibold text-danger">{formatInr(deal.afterSigning.overbillInr)}</span>{' '}
            <span className="text-muted">over the agreed markup, every month</span>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="danger"
              disabled={disputed}
              onClick={() => {
                setDisputed(true);
                logEvent(`${deal.supplier}: dispute raised on the January timesheet invoice, quoting the 8% markup agreed on 7 Nov.`);
                toast(`Dispute sent to ${deal.supplier}, quoting the 8% markup agreed by email on 7 Nov.`);
              }}
            >
              {disputed ? 'Dispute sent' : 'Raise a dispute'}
            </Button>
            {disputed && <span className="text-[12px] text-muted">Sent to Sunita Rao, quoting clause 6 and the HR head&apos;s email of 7 Nov.</span>}
          </div>
        </SirionCard>
      )}
    </div>
  );
}

const ROW_STATE: Record<string, { label: string; className: string }> = {
  ...STATE,
  reopened: { label: 'Reopened', className: 'bg-amber-bg text-amber-fg' },
};

function OutlookLink({ id }: { id?: string }) {
  if (!id) return null;
  return (
    <Link href={outlookHref(id)} className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-teal-900 hover:underline">
      Open in Outlook <ArrowUpRight size={11} />
    </Link>
  );
}

/** The ledger for a listed deal: each row with its source email and a link to it. */
function ReadOnly({ deal }: { deal: Deal }) {
  const rows = rowsForDeal(deal.id);
  const order = ['reopened', 'needs_confirmation', 'open', 'agreed'];
  const sorted = [...rows].sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));
  return (
    <SirionCard
      title="Ledger"
      caption={`Round ${deal.display!.round} · ${rows.length} terms, each linked to the email it came from. The ₹ figure is demo data; CloudDesk, BrightStaff and SwiftShip are priced by the engine.`}
      bodyClassName="px-0 pb-0 pt-0"
    >
      <Table>
        <thead>
          <tr>
            <Th>Term</Th>
            <Th>Agreed</Th>
            <Th>State</Th>
            <Th>Source</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="align-top">
              <Td className="font-medium">{r.label}</Td>
              <Td>
                {r.agreed}
                {r.note && <span className="mt-1 block text-[11.5px] text-amber-fg">{r.note}</span>}
              </Td>
              <Td>
                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-medium ${ROW_STATE[r.state].className}`}>
                  {ROW_STATE[r.state].label}
                </span>
              </Td>
              <Td className="text-[11.5px] text-muted">
                {r.quote && <span className="block italic">“{r.quote}”</span>}
                <OutlookLink id={r.outlookId} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </SirionCard>
  );
}
