'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, Check, FileText, Repeat } from 'lucide-react';
import {
  Button,
  EmptyState,
  Field,
  SirionCard,
  Table,
  Tabs,
  Td,
  Th,
} from '@/components/sirion/ui';
import { SourceChip } from '@/components/sirion/SourceChip';
import { StatePill } from '@/components/sirion/StatePill';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { useLedger } from '@/lib/useDeal';
import { cloudDeskDeal, personName, versions } from '@/lib/data';
import { approverFor } from '@/lib/engines/sendDialog';
import { checkInvoice } from '@/lib/engines/invoices';
import { formatDateLong, formatInr, formatLakh } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import { CONTRACT_ID } from '@/lib/settings';

export function ContractRecord({ initialTab = 'overview' }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab);
  const top = useRef<HTMLDivElement>(null);
  const changeTab = (id: string) => {
    setTab(id);
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start' }));
  };
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const hydrated = useHydrated();
  const { rows } = useLedger();
  const contract = useDemo((s) => s.contract);
  const signedAt = useDemo((s) => s.signedAt);
  const signing = useDemo((s) => s.signing);
  const saveToSirion = useDemo((s) => s.saveToSirion);
  const sign = useDemo((s) => s.sign);
  const toast = useDemo((s) => s.toast);

  if (!hydrated) return null;

  if (!contract) {
    return (
      <SirionCard title="CloudDesk helpdesk subscription">
        <EmptyState
          title={signedAt ? 'Returned copy verified and signed' : signing.sentBackAt ? 'CloudDesk returned the corrected signing copy' : 'The signing copy is still under review'}
          body={signedAt ? 'The signed clauses have been checked against the ledger. Save the contract to create its obligations and invoice rules.' : signing.sentBackAt ? `CloudDesk accepted ${signing.inserted.length} submitted corrections. Verify the returned copy before signing.` : 'Resolve or record a waiver for each discrepancy in Word, then send the reviewed copy to CloudDesk.'}
        />
        <div className="mt-4 flex gap-2">
          {!signedAt && signing.sentBackAt && (
            <Button
              variant="primary"
              onClick={() => {
                sign();
                if (useDemo.getState().signedAt) toast('Returned v7 checked and signed.');
              }}
            >
              Verify returned copy and sign
            </Button>
          )}
          {signedAt && (
            <Button
              variant="primary"
              onClick={() => {
                saveToSirion();
                toast('Agreed terms handed over to Sirion.');
              }}
            >
              Save to Sirion
            </Button>
          )}
          <Link href={signing.sentBackAt ? '/deals/D-CLOUDDESK' : '/word/v6'}>
            <Button>{signing.sentBackAt ? 'Back to the deal' : 'Review signing copy in Word'}</Button>
          </Link>
        </div>
      </SirionCard>
    );
  }

  return (
    <>
      <div ref={top} />
      <SirionCard className="mb-4" bodyClassName="px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-[20px] text-teal-title">{contract.title}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
              <span className="font-medium text-ink">{contract.id}</span>
              <span>·</span>
              <span className="rounded-full bg-mint px-2.5 py-[2px] text-[11px] font-medium text-teal-900">
                Active
              </span>
              <span>·</span>
              <span>
                {formatDateLong(contract.startDate)} – {formatDateLong(contract.endDate)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted">Annual value</p>
            <p className="mt-0.5 text-[24px] font-semibold text-teal-900">
              {formatLakh(contract.annualFeeInr / 1e5)}
            </p>
          </div>
        </div>
      </SirionCard>

      <Tabs
        active={tab}
        onChange={changeTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'terms', label: 'Agreed terms' },
          { id: 'obligations', label: 'Obligations', badge: contract.obligations.length },
          { id: 'invoices', label: 'Invoices' },
          { id: 'documents', label: 'Documents' },
        ]}
      />

      <div className="mt-4">
        {tab === 'overview' && <Overview />}
        {tab === 'terms' && <AgreedTerms rows={rows} />}
        {tab === 'obligations' && <Obligations />}
        {tab === 'invoices' && <Invoices />}
        {tab === 'documents' && <Documents />}
      </div>
    </>
  );

  /* ---------------- tabs ---------------- */

  function Overview() {
    const sourceLinked = rows.filter((r) => r.source.kind !== 'manual').length;
    const fixed = signing.inserted.length;
    const waived = signing.waived.length;
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <SirionCard title="Key facts" className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
            <Field label="Supplier">{contract!.supplier}</Field>
            <Field label="Term">
              {cloudDeskDeal.termYears} years from {formatDateLong(contract!.startDate)}
            </Field>
            <Field label="Seats">{cloudDeskDeal.seats}</Field>
            <Field label="Owner">{personName('ananya')}</Field>
            <Field label="Business owner">{personName('vikram')}</Field>
            <Field label="Signed copy">v7 · {formatDateLong(signedAt ?? '2026-11-21')}</Field>
          </dl>
        </SirionCard>

        <SirionCard title="What came across from the ledger">
          <ul className="space-y-3">
            <Stat label="Agreed terms" value={rows.length} />
            <Stat label="Source-linked" value={`${sourceLinked} of ${rows.length}`} />
            <Stat label="Gaps at signing" value={`${fixed} fixed, ${waived} waived`} />
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-[17px] text-muted">
            From here Sirion enforces the signed clause. The email history behind each term stays
            attached, so a dispute can be settled from the source rather than from memory.
          </p>
        </SirionCard>
      </div>
    );
  }

  function AgreedTerms({ rows: list }: { rows: typeof rows }) {
    return (
      <SirionCard
        title="Agreed terms"
        caption="Read-only. Each row keeps the email or clause that settled it."
        bodyClassName="px-0 pb-0 pt-0"
      >
        <Table>
          <thead>
            <tr>
              <Th>Term</Th>
              <Th>Position</Th>
              <Th>Clause</Th>
              <Th>State</Th>
              <Th>Source</Th>
              <Th>Approved by</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-page/60">
                <Td className="font-medium">{r.label}</Td>
                <Td className="text-ink/85">{plainValue(r.position, cloudDeskDeal.termYears)}</Td>
                <Td className="text-muted">{CLAUSE_FOR[r.termKey] ?? '—'}</Td>
                <Td>
                  <StatePill state={r.state} />
                </Td>
                <Td>
                  <SourceChip source={r.source} />
                </Td>
                <Td className="text-[12px] text-muted">
                  {r.termKey === 'price' ? (approverFor(rows, r.termKey) ? `${approverFor(rows, r.termKey)} · if pricing stays fixed` : '—') : r.approvedBy ? personName(r.approvedBy.personId) : '—'}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </SirionCard>
    );
  }

  function Obligations() {
    return (
      <SirionCard
        title="Obligations"
        caption="Created by the Obligations agent from the agreed terms."
        bodyClassName="px-0 pb-0 pt-0"
      >
        <div className="divide-y divide-line">
          <div className="px-6 py-4 text-sm">Contract end · <strong>{formatDateLong(contract!.endDate)}</strong></div>
          {contract!.obligations.map((o) => (
            <div key={o.id} className="flex flex-wrap items-start gap-x-6 gap-y-3 px-6 py-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-page text-teal-900">
                {o.recurring ? <Repeat size={15} /> : <Bell size={15} />}
              </span>
              <div className="min-w-[260px] flex-1">
                <p className="text-[13.5px] font-medium text-ink">{o.title}</p>
                {o.detail && (
                  <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">{o.detail}</p>
                )}
                <p className="mt-1.5 text-[11px] text-muted">
                  Created by the Obligations agent from ledger row:{' '}
                  <Link
                    href="/deals/D-CLOUDDESK"
                    className="text-teal-900 underline-offset-2 hover:underline"
                  >
                    {o.ledgerRowId}
                  </Link>{' '}
                  · clause {o.clauseNo}
                </p>
              </div>
              <div className="w-44 shrink-0">
                {o.due && (
                  <p className="text-[12.5px] text-ink">
                    {o.reminder ? 'Last day to give notice' : 'Due'} <strong className="font-medium">{formatDateLong(o.due)}</strong>
                  </p>
                )}
                {o.reminder && (
                  <p className="mt-0.5 text-[12px] text-muted">
                    Internal reminder · {formatDateLong(o.reminder)} · 45 days before notice is due
                  </p>
                )}
                {o.recurring && <p className="text-[12.5px] capitalize text-ink">{o.recurring}</p>}
              </div>
              <div className="w-36 shrink-0 text-[12.5px] text-muted">{o.owner}</div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4">
          <Button variant="primary" onClick={() => { useDemo.getState().fastForwardInvoice(); changeTab('invoices'); }}>Next · See December invoice</Button>
        </div>
      </SirionCard>
    );
  }

  function Invoices() {
    const invoices = useDemo((s) => s.invoices);
    const fastForward = useDemo((s) => s.fastForwardInvoice);
    const isFastForwarded = useDemo((s) => s.invoiceFastForward);
    const disputeRaised = useDemo((s) => s.disputeRaised);
    const resolved = useDemo((s) => s.invoiceResolved);
    const raiseDispute = useDemo((s) => s.raiseDispute);
    const resolveInvoice = useDemo((s) => s.resolveInvoice);
    const exceptions = invoices.filter((invoice) => checkInvoice(invoice, contract!.rules).length > 0);

    return (
      <div className="space-y-4">
        {isFastForwarded && <InvoiceFlag {...{ disputeRaised, resolved, raiseDispute, resolveInvoice }} />}
        <SirionCard title="Invoice rules" caption="Built from the agreed terms at handover">
          <div className="space-y-3">
            {contract!.rules.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-line p-4"
              >
                <div className="min-w-[280px] flex-1">
                  <p className="text-[13px] text-ink">
                    {r.kind === 'fixed_monthly' ? (
                      <>
                        Fixed at{' '}
                        <strong className="font-semibold">{formatInr(r.amountInr!)} a month</strong>{' '}
                        until {formatDateLong(r.validTo)}
                      </>
                    ) : (
                      <>
                        A <strong className="font-semibold">{r.pct}% credit</strong> when uptime
                        falls below {r.uptimeTarget}%
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    Clause {r.clauseNo} · ledger row {r.ledgerRowId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SirionCard>

        <SirionCard
          title={showInvoiceHistory ? "Invoice history" : `Exceptions (${exceptions.length})`}
          caption="Checked against the signed invoice rules"
          bodyClassName="px-0 pb-0 pt-0"
          right={
            !isFastForwarded ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  fastForward();
                  toast('Fast-forwarded to December 2027.');
                }}
              >
                Fast-forward to Dec 2027
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowInvoiceHistory(!showInvoiceHistory)}>
                {showInvoiceHistory ? 'Show exceptions' : 'Expand invoice history'}
              </Button>
            )
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Month</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Uptime</Th>
                <Th>Check</Th>
              </tr>
            </thead>
            <tbody>
              {(showInvoiceHistory ? invoices : exceptions).map((inv) => {
                const flags = checkInvoice(inv, contract!.rules);
                const over = flags.find((f) => f.kind === 'over_agreed_price');
                return (
                  <tr key={inv.id} className={over ? 'bg-danger/[0.04]' : ''}>
                    <Td className="font-medium">{inv.id}</Td>
                    <Td className="text-muted">{inv.month}</Td>
                    <Td align="right">{formatInr(inv.amountInr)}</Td>
                    <Td align="right" className="text-muted">
                      {inv.uptime}%
                    </Td>
                    <Td>
                      {over ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-danger">
                          <AlertTriangle size={13} />
                          {formatInr(over.overInr!)} over
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-teal-900">
                          <Check size={13} strokeWidth={3} /> Matches the agreed price
                        </span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {exceptions.length === 0 && !showInvoiceHistory && <p className="p-5 text-sm text-muted">No invoice exceptions yet.</p>}
        </SirionCard>
      </div>
    );
  }

  function InvoiceFlag({
    disputeRaised,
    resolved,
    raiseDispute,
    resolveInvoice,
  }: {
    disputeRaised: boolean;
    resolved: boolean;
    raiseDispute: () => void;
    resolveInvoice: () => void;
  }) {
    const invoices = useDemo((s) => s.invoices);
    const inv = invoices.find((i) => i.id === 'INV-CD-2712');
    if (!inv) return null;
    const over = checkInvoice(inv, contract!.rules).find((f) => f.kind === 'over_agreed_price');
    if (!over) return null;
    const priceRow = rows.find((r) => r.id === 'R-price');

    return (
      <div className="m-5 rounded-xl border border-danger/30 bg-danger/[0.04] p-5">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-danger">
          <AlertTriangle size={16} />
          December invoice is {formatInr(over.overInr!)} above the signed price.
        </p>
        <p className="mt-2 text-sm font-medium">Billed {formatInr(inv.amountInr)} · Agreed {formatInr(over.expectedInr!)}</p>
        <p className="mt-2 max-w-3xl text-[13px] leading-[20px] text-ink">
          Clause {over.clauseNo} of the signed contract fixes the price at{' '}
          {formatInr(over.expectedInr!)} a month until {formatDateLong(contract!.endDate)}.
        </p>
        <p className="mt-2 max-w-3xl text-[12.5px] leading-[19px] text-muted">
          History: CloudDesk agreed to hold the price in its email of 14 Nov 2026.
        </p>
        {priceRow && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <SourceChip source={priceRow.source} />
            <Link
              href="/deals/D-CLOUDDESK"
              className="text-[11.5px] text-teal-900 underline-offset-2 hover:underline"
            >
              Open the ledger row
            </Link>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="danger" size="sm" onClick={raiseDispute} disabled={disputeRaised}>
            {disputeRaised ? 'Dispute raised' : 'Raise dispute'}
          </Button>
          <Button size="sm" onClick={resolveInvoice} disabled={resolved}>
            {resolved ? 'Resolved' : 'Mark resolved'}
          </Button>
        </div>
      </div>
    );
  }

  function Documents() {
    const list = [
      ...versions.map((v) => ({
        id: v.id,
        name: v.fileName,
        who: v.author === 'supplier' ? 'CloudDesk' : 'Meridian Foods',
        at: v.sentAt,
        signed: false,
      })),
      {
        id: 'v7',
        name: 'CloudDesk_MSA_v7.docx',
        who: 'CloudDesk',
        at: signedAt ?? '2026-11-21T12:00:00+05:30',
        signed: true,
      },
    ];
    return (
      <SirionCard title="Documents" bodyClassName="px-0 pb-0 pt-0">
        <Table>
          <thead>
            <tr>
              <Th>File</Th>
              <Th>Version</Th>
              <Th>From</Th>
              <Th>Date</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-page/60">
                <Td>
                  <span className="flex items-center gap-2">
                    <FileText size={14} className="shrink-0 text-muted" />
                    <Link href={`/word/${d.id}`} className="font-medium text-teal-900 hover:underline">{d.name}</Link>
                  </span>
                </Td>
                <Td className="text-muted">{d.id}</Td>
                <Td className="text-muted">{d.who}</Td>
                <Td className="text-muted">{formatDateLong(d.at)}</Td>
                <Td>
                  {d.signed && (
                    <span className="rounded-full bg-mint px-2.5 py-[3px] text-[11px] font-medium text-teal-900">
                      Signed copy
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </SirionCard>
    );
  }
}

const CLAUSE_FOR: Record<string, string> = {
  term: '3.1',
  price: '9.1',
  payment: '9.3',
  service_credit: '11.2',
  liability_cap: '12.1',
  renewal_notice: '14.2',
  exit_support: '15.1',
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-[14px] font-semibold text-teal-900">{value}</span>
    </li>
  );
}

export { CONTRACT_ID };
