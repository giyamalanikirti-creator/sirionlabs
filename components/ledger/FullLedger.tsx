'use client';

/**
 * The full ledger for a deal: what Sirion would actually keep. Every term,
 * its status, the line it came from, who agreed it, which approval depends on
 * it, how sure the reader was, and every change since, with who made it.
 */
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Brain, Pencil, Phone } from 'lucide-react';
import { Button, SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { MoneyPlain } from '@/components/sirion/MoneyFigure';
import { SourceChip } from '@/components/sirion/SourceChip';
import { HeadlineExplainer } from '@/components/sirion/HeadlineExplainer';
import { useLedger } from '@/lib/useDeal';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { cloudDeskDeal, personName } from '@/lib/data';
import { rowHeadlineShare } from '@/lib/engines/playbook';
import { worstThreat } from '@/lib/engines/atRisk';
import {
  agreedBy,
  approvalDependsOn,
  confidenceOf,
  dealHistory,
  memoryPatterns,
  negotiationMemory,
  sourceKindLabel,
  sourceLine,
  statusOf,
  type LedgerStatus,
} from '@/lib/engines/ledgerView';
import { APPROVAL_KIND_LABEL } from '@/lib/engines/approvals';
import { outlookHrefForRow } from '@/lib/demo/rowEmail';
import { formatDateShort, formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import type { LedgerRow, TermKey, TermValue } from '@/lib/types';
import { ValueEditor } from './ValueEditor';
import { shiftText } from '@/lib/demo/timeShift';

const STATUS_STYLE: Record<LedgerStatus, string> = {
  Agreed: 'bg-mint text-teal-900',
  Open: 'border border-line bg-white text-muted',
  Reopened: 'bg-amber-bg text-amber-fg',
  Conceded: 'bg-danger text-white',
  'Needs confirming': 'bg-lime text-ink',
  'Missing at signing': 'bg-danger text-white',
};

export function FullLedger() {
  const hydrated = useHydrated();
  const { rows, atRisk, signed } = useLedger();
  const approvals = useDemo((s) => s.approvals);
  const decide = useDemo((s) => s.decideApproval);
  const requestAcceptTheirs = useDemo((s) => s.requestAcceptTheirs);
  const toast = useDemo((s) => s.toast);
  const [editing, setEditing] = useState<LedgerRow | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  const deal = cloudDeskDeal;
  const history = dealHistory(rows).filter((h) => historyFilter === 'all' || h.rowId === historyFilter);
  const memory = negotiationMemory(rows, deal);
  const patterns = memoryPatterns(memory, deal);
  const pending = hydrated ? approvals.filter((a) => a.status === 'pending') : [];
  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [statusOf(r)]: (acc[statusOf(r)] ?? 0) + 1 }), {});

  return (
    <>
      <SirionCard className="mb-4" bodyClassName="px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11.5px] text-muted">
              <Link href="/deals" className="hover:underline">Deals</Link> /{' '}
              <Link href="/deals/D-CLOUDDESK" className="hover:underline">CloudDesk renewal 2026-29</Link> / Ledger
            </p>
            <h1 className="mt-1 text-[20px] text-teal-title">CloudDesk ledger</h1>
            <p className="mt-1.5 max-w-2xl text-[12.5px] leading-[19px] text-muted">
              One source-linked record of what has been agreed with CloudDesk, across email, side threads, Word versions and calls.
              This is the record Sirion keeps; the Outlook and Word panes are views of it.
            </p>
            <p className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
              {Object.entries(counts).map(([k, n]) => (
                <span key={k} className={`rounded-full px-2.5 py-[3px] font-medium ${STATUS_STYLE[k as LedgerStatus]}`}>
                  {n} {k.toLowerCase()}
                </span>
              ))}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
            <div>
              <MoneyPlain lakh={signed ? 0 : atRisk} size="xl" suffix={null} tone={atRisk > 0 ? 'danger' : 'teal'} />
              <p className="mt-0.5 text-[12px] text-muted">{signed ? 'signed and enforced' : HEADLINE_SUFFIX}</p>
            </div>
            <Button variant="primary" onClick={() => setCallOpen(true)}>
              <Phone size={13} /> Add term agreed on a call
            </Button>
          </div>
        </div>
        {!signed && (
          <div className="mt-4">
            <HeadlineExplainer rows={rows} deal={deal} />
          </div>
        )}
      </SirionCard>

      {pending.length > 0 && (
        <SirionCard title="Waiting for approval" caption="Concessions are routed by value: CFO at ₹1 lakh a year or more, Legal for Legal-owned terms" className="mb-4">
          <ul className="space-y-2">
            {pending.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-fg/30 bg-amber-bg/40 px-4 py-3 text-[12.5px]">
                <span>
                  <strong className="font-semibold">{a.label}</strong> · {APPROVAL_KIND_LABEL[a.kind]}: {a.change}
                  <span className="block text-[11.5px] text-muted">
                    Asked by {personName(a.requestedById)} · {formatDateShort(a.at)} · 
                    {a.rule}
                    {a.reason ? ` · reason: ${a.reason}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">As {personName(a.approverId)}:</span>
                  <Button size="sm" variant="primary" onClick={() => { decide(a.id, true); toast(`${personName(a.approverId)} approved.`); }}>Approve</Button>
                  <Button size="sm" onClick={() => { decide(a.id, false); toast(`${personName(a.approverId)} rejected.`); }}>Reject</Button>
                </span>
              </li>
            ))}
          </ul>
        </SirionCard>
      )}

      <SirionCard title="Terms" caption="Click a source to open the exact email or clause. Any row can be corrected; every edit is logged." bodyClassName="px-0 pb-0 pt-0" className="mb-4">
        <Table>
          <thead>
            <tr>
              <Th>Term</Th>
              <Th>Status</Th>
              <Th>Agreed value</Th>
              <Th>Source</Th>
              <Th>Agreed by</Th>
              <Th>Approval that depends on it</Th>
              <Th>Confidence</Th>
              <Th align="right">₹ {HEADLINE_SUFFIX}</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = statusOf(row);
              const conf = confidenceOf(row);
              const share = signed ? null : rowHeadlineShare(row, deal);
              const threat = worstThreat(row, deal);
              const pendingHere = pending.find((a) => a.rowId === row.id);
              return (
                <tr key={row.id} id={row.id} className="align-top">
                  <Td className="font-medium">{row.label}</Td>
                  <Td>
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-medium ${STATUS_STYLE[status]}`}>{status}</span>
                    {threat && <span className="mt-1 block text-[11px] text-amber-fg">Asked: {plainValue(threat.value, deal.termYears).toLowerCase()}</span>}
                    {pendingHere && <span className="mt-1 block text-[11px] text-muted">Approval pending · {personName(pendingHere.approverId)}</span>}
                  </Td>
                  <Td>{plainValue(row.position, deal.termYears)}</Td>
                  <Td className="max-w-[300px] text-[11.5px] leading-[16px]">
                    <span className="mr-1 rounded bg-page px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide text-muted">{sourceKindLabel(row.source)}</span>
                    <span className="text-ink">{sourceLine(row.source)}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <SourceChip source={row.source} />
                      {(threat || row.pendingConfirmation) && (
                        <Link href={outlookHrefForRow(row, deal)} className="inline-flex items-center gap-0.5 text-[11px] font-medium text-teal-900 hover:underline">
                          Email at risk <ArrowUpRight size={11} />
                        </Link>
                      )}
                    </div>
                  </Td>
                  <Td className="text-[12px]">{agreedBy(row)}</Td>
                  <Td className="max-w-[220px] text-[12px] text-muted">{approvalDependsOn(row, rows) ?? 'None'}</Td>
                  <Td className="text-[11.5px]">
                    {conf.pct !== undefined && (
                      <span className={`mr-1 font-semibold ${conf.low ? 'text-amber-fg' : 'text-teal-900'}`}>{conf.pct}%</span>
                    )}
                    <span className={conf.low ? 'text-amber-fg' : 'text-muted'}>{conf.label}</span>
                  </Td>
                  <Td align="right">
                    {share !== null ? <span className="font-semibold text-danger">{formatLakh(share)}</span> : <span className="text-muted">None</span>}
                  </Td>
                  <Td align="right">
                    <div className="flex flex-col items-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>
                        <Pencil size={11} /> Edit
                      </Button>
                      {threat && !signed && !pendingHere && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            requestAcceptTheirs(row.id);
                            const last = useDemo.getState().approvals.at(-1);
                            toast(last?.status === 'approved' ? 'Within your limit: accepted and logged.' : `Approval requested from ${personName(last?.approverId ?? '')}.`);
                          }}
                        >
                          Accept theirs
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </SirionCard>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <SirionCard
          title="Change history"
          caption="Every change to every term, with who made it and where"
          right={
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="rounded-md border border-line bg-white px-2 py-1 text-[12px]"
              aria-label="Filter history by term"
            >
              <option value="all">All terms</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          }
        >
          <ol className="relative space-y-3 border-l border-line pl-4">
            {history.map((h, i) => (
              <li key={i} className="text-[12px] leading-[17px]">
                <span className="absolute -left-[4.5px] mt-1.5 h-2 w-2 rounded-full bg-teal-900" />
                <p className="text-muted">
                  {formatDateShort(h.at)} · <span className="font-medium text-ink">{h.label}</span> · {h.actor}
                </p>
                <p className="text-ink">{h.text}</p>
              </li>
            ))}
          </ol>
        </SirionCard>

        <SirionCard
          title="Negotiation memory"
          caption="Who asked, who gave in, and in which round"
          right={<span className="rounded-full bg-page px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-muted">Future</span>}
        >
          <ul className="space-y-2">
            {memory.map((m, i) => (
              <li key={i} className="rounded-md border border-line px-3 py-2 text-[12px] leading-[17px]">
                <p className="font-medium text-ink">
                  Round {m.round} · {m.label}: {m.asked.toLowerCase()}
                </p>
                <p className="text-muted">Asked by {m.askedBy} · {formatDateShort(m.at)} · <span className="text-ink">{m.outcome}</span></p>
              </li>
            ))}
          </ul>
          {patterns.length > 0 && (
            <div className="mt-3 rounded-lg bg-mint/40 p-3 text-[12px] leading-[17px]">
              <p className="mb-1 flex items-center gap-1 font-semibold text-teal-900"><Brain size={13} /> Patterns</p>
              {patterns.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] leading-[16px] text-muted">
            Over many deals this feeds Sirion&apos;s negotiation insights, e.g. “CloudDesk usually accepts 60 days&apos; notice if pushed once”.
            Other tools learn only from final contracts; this learns from the conversation in between.
          </p>
        </SirionCard>
      </div>

      {editing && <EditDialog row={editing} onClose={() => setEditing(null)} />}
      {callOpen && <CallTermDialog rows={rows} onClose={() => setCallOpen(false)} />}
    </>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function EditDialog({ row, onClose }: { row: LedgerRow; onClose: () => void }) {
  const editRow = useDemo((s) => s.editRow);
  const toast = useDemo((s) => s.toast);
  const [value, setValue] = useState<TermValue>(row.position);
  const [reason, setReason] = useState('');
  return (
    <Modal title={`Correct ${row.label.toLowerCase()}`} onClose={onClose}>
      <p className="mb-3 text-[12px] text-muted">
        Now: {plainValue(row.position)} · {sourceLine(row.source)}
      </p>
      <ValueEditor value={value} onChange={setValue} />
      <label className="mt-3 block text-[12px] font-medium text-ink">
        Why (kept in the history)
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. The reader misread the clause"
          className="mt-1 w-full rounded-md border border-line px-2.5 py-1.5 text-[12.5px] font-normal"
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!reason.trim()}
          onClick={() => {
            editRow(row.id, value, reason.trim());
            toast(`${row.label} corrected. The edit is in the history.`);
            onClose();
          }}
        >
          Save correction
        </Button>
      </div>
    </Modal>
  );
}

function CallTermDialog({ rows, onClose }: { rows: LedgerRow[]; onClose: () => void }) {
  const addCallTerm = useDemo((s) => s.addCallTerm);
  const toast = useDemo((s) => s.toast);
  const [termKey, setTermKey] = useState<TermKey>(rows.find((r) => r.state !== 'agreed')?.termKey ?? rows[0].termKey);
  const row = rows.find((r) => r.termKey === termKey)!;
  const [value, setValue] = useState<TermValue>(row.position);
  const [withPersonId, setWith] = useState('rohan');
  const [note, setNote] = useState('');
  return (
    <Modal title="Add term agreed on a call" onClose={onClose}>
      <label className="block text-[12px] font-medium text-ink">
        Term
        <select
          value={termKey}
          onChange={(e) => {
            const k = e.target.value as TermKey;
            setTermKey(k);
            setValue(rows.find((r) => r.termKey === k)!.position);
          }}
          className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-[12.5px] font-normal"
        >
          {rows.map((r) => (
            <option key={r.id} value={r.termKey}>{r.label}</option>
          ))}
        </select>
      </label>
      <div className="mt-3">
        <ValueEditor value={value} onChange={setValue} />
      </div>
      <label className="mt-3 block text-[12px] font-medium text-ink">
        On the call with
        <select value={withPersonId} onChange={(e) => setWith(e.target.value)} className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-[12.5px] font-normal">
          <option value="rohan">Rohan Iyer (CloudDesk)</option>
          <option value="priya">Priya Nair (CloudDesk)</option>
        </select>
      </label>
      <label className="mt-3 block text-[12px] font-medium text-ink">
        Note (optional)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={shiftText("e.g. Confirmed with Rohan by phone, 16 Nov")}
          className="mt-1 w-full rounded-md border border-line px-2.5 py-1.5 text-[12.5px] font-normal"
        />
      </label>
      <p className="mt-3 rounded-md bg-page p-2.5 text-[11.5px] leading-[16px] text-muted">
        The call note becomes the row&apos;s source. Next: read Teams meeting transcripts, so terms agreed in a meeting arrive
        with an exact quote, the same way email does.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={() => {
            addCallTerm(termKey, value, withPersonId, note.trim());
            toast(`${row.label} logged as agreed on a call.`);
            onClose();
          }}
        >
          Add to ledger
        </Button>
      </div>
    </Modal>
  );
}
