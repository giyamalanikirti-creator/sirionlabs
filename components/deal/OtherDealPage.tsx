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
import { AlertTriangle, ArrowUpRight, Check, FileText, Mail } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import { internalConflicts, precedenceClause } from '@/lib/engines/conflicts';
import { Button, SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { MoneyPlain } from '@/components/sirion/MoneyFigure';
import { personName } from '@/lib/data';
import { formatDateLong, formatDateShort, formatInr, formatLakh, formatLakhPerYear, HEADLINE_SUFFIX } from '@/lib/format';
import { BRIGHTSTAFF, BRIGHTSTAFF_SIGNING_COPY, SCRIPTED_DEALS, scriptedAtRisk, type ScriptedDeal, type ScriptedRow } from '@/lib/demo/moreDeals';
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

      {deal.dealId === BRIGHTSTAFF.dealId && <BrightStaffConflict deal={deal} />}
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

/**
 * Review fix A2: the BrightStaff signing copy disagrees with itself. Before
 * signature it blocks Publish like any gap; after signature it goes to the
 * contract owner, because which rate applies is theirs to decide. No dispute.
 */
function BrightStaffConflict({ deal }: { deal: ScriptedDeal }) {
  const doc = BRIGHTSTAFF_SIGNING_COPY;
  const conflict = internalConflicts(doc.clauses)[0];
  const [fixed, setFixed] = useState(false);
  const [routed, setRouted] = useState(false);
  const [showBoth, setShowBoth] = useState(false);
  const toast = useDemo((s) => s.toast);
  const logEvent = useDemo((s) => s.logEvent);
  if (!conflict) return null;
  const [body, schedule] = conflict.clauses;
  const email = deal.emails.find((e) => e.id === 'B4')!;
  const agreed = `${body.value}${body.unit}`;
  const owner = personName(deal.ownerId);

  return (
    <>
      <SirionCard
        title={`Signing check · ${doc.fileName}`}
        caption="Before signature: the copy is checked against itself as well as against what was agreed"
        right={<Tag kind="new" />}
      >
        {fixed ? (
          <p className="flex items-center gap-2 text-[13.5px] text-ink">
            <Check size={15} className="text-[#107C10]" /> Schedule 2 corrected to {agreed} as a tracked change. Publish is unblocked once BrightStaff accepts it.
          </p>
        ) : (
          <div className="rounded-lg border border-danger/40 bg-[#FDF3F4] p-4">
            <p className="text-[15px] font-semibold text-ink">
              {body.ref} and {schedule.ref.split(',')[0]} disagree
            </p>
            <p className="mt-1 text-[13.5px] leading-[20px] text-ink">
              {body.ref}: <strong>{agreed}</strong> · {schedule.ref}: <strong>{schedule.value}{schedule.unit}</strong> · Agreed in email ({formatDateShort(email.at)}, {email.fromName}): <strong>{agreed}</strong>
            </p>
            <p className="mt-1 text-[13.5px] text-ink">Correct the rate card before signature.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setFixed(true);
                  logEvent(`${deal.supplier}: ${agreed} proposed in ${schedule.ref} as a tracked change (internal conflict with ${body.ref}).`);
                  toast(`${agreed} proposed in ${schedule.ref}, as a tracked change.`);
                }}
              >
                Insert {agreed} in Schedule 2
              </Button>
              <Link href={`/outlook/ananya?msg=B5`} className="text-[13px] font-medium text-teal-900 underline">View email</Link>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-white px-2.5 py-[3px] text-[12px] font-semibold text-danger">
                <AlertTriangle size={12} /> Publish blocked
              </span>
            </div>
          </div>
        )}
      </SirionCard>

      {deal.afterSigning && (
        <SirionCard title="After signing · if signed as is" caption="The January timesheet invoice, checked against the signed contract" right={<Tag kind="new" />}>
          <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-fg/30 bg-amber-bg px-3 py-2 text-[13px] text-ink">
            <AlertTriangle size={14} className="shrink-0 text-amber-fg" />
            Signed copy differs in Schedule 2. Review before activating the billing rule.
          </div>
          <p className="text-[15px] font-semibold text-ink">
            The invoice follows {schedule.ref.split(',')[0]} ({schedule.value}{schedule.unit}). {body.ref} states {agreed}.
          </p>
          <p className="mt-1 text-[13.5px] leading-[20px] text-ink">
            The signed contract is inconsistent, so which rate applies is for the contract owner to decide.
          </p>
          <dl className="mt-3 grid gap-1.5 text-[13px] leading-[19px]">
            <div><dt className="inline text-muted">Order of precedence · </dt><dd className="inline text-ink">{precedenceClause(doc)}</dd></div>
            <div><dt className="inline text-muted">Supporting evidence · </dt><dd className="inline text-ink">email of {formatDateShort(email.at)} from {email.fromName} agreeing {agreed}: “{deal.rows.find((r) => r.id === 'B-markup')?.sourceQuote}”</dd></div>
            <div><dt className="inline text-muted">Difference on this invoice · </dt><dd className="inline text-ink">{formatInr(deal.afterSigning.overbillInr)} on January&apos;s invoice <span className="text-muted">(invoice variance)</span></dd></div>
          </dl>
          {showBoth && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {conflict.clauses.map((c) => (
                <div key={c.ref} className="rounded-md border border-line bg-page p-3 text-[13px]">
                  <p className="font-semibold text-ink">{c.ref}</p>
                  <p className="text-ink">“{c.text}”</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              disabled={routed}
              onClick={() => {
                setRouted(true);
                logEvent(`${deal.supplier}: invoice INV-BS-0127 routed to ${owner} (contract owner): clause 6 and Schedule 2 disagree.`);
                toast(`Routed to ${owner}, the contract owner, with both clauses and the 7 Nov email.`);
              }}
            >
              {routed ? `Routed to ${owner}` : 'Route to contract owner'}
            </Button>
            <Button variant="outline" onClick={() => setShowBoth((v) => !v)}>
              {showBoth ? 'Hide both clauses' : 'View both clauses'}
            </Button>
          </div>
        </SirionCard>
      )}
    </>
  );
}
