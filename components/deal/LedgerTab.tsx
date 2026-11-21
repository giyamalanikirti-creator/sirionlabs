'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { StatePill, NewAskBadge, SigningBadge } from '@/components/sirion/StatePill';
import { SourceChip } from '@/components/sirion/SourceChip';
import { MoneyFigure } from '@/components/sirion/MoneyFigure';
import { cloudDeskDeal, personName, versionById } from '@/lib/data';
import { rowPriceTag } from '@/lib/engines/atRisk';
import { recommendedMove } from '@/lib/engines/playbook';
import { outlookHrefForRow } from '@/lib/demo/rowEmail';
import { extractValue } from '@/lib/engines/diff';
import { priceChange } from '@/lib/engines/pricing';
import { useDemo } from '@/lib/store';
import { isSupplierSafe } from '@/lib/engines/wording';
import { formatDateShort, formatDateTime } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import type { LedgerRow } from '@/lib/types';

export function LedgerTab({ rows, initialRow }: { rows: LedgerRow[]; initialRow?: string }) {
  const [open, setOpen] = useState(initialRow ?? null);
  const clock = useDemo((state) => state.clock);
  const returned = useDemo((state) => state.signing.returnedCopy);
  const term = rows.find((row) => row.termKey === 'term');
  const payment = rows.find((row) => row.termKey === 'payment');
  const price = rows.find((row) => row.termKey === 'price');
  const cfoApproval = term?.approvedBy;
  const priceReopened = price?.threats.some((threat) => threat.active && threat.kind === 'sent_concession' && threat.value.kind === 'price' && threat.value.wording !== 'fixed');
  const termChanged = term && ((term.position.kind === 'term' && term.position.years !== 3) ||
    term.threats.some((threat) => threat.active && threat.value.kind === 'term' && threat.value.years !== 3));
  const document = returned ?? ['v6', 'v5', 'v4', 'v3'].map(versionById).find((version) => version && version.sentAt <= clock);

  return (
    <SirionCard
      title="Agreed terms"
      caption="Every row carries the email or clause it came from, and what it costs if it slips."
      bodyClassName="px-0 pb-0 pt-0"
    >
      <Table>
        <thead>
          <tr>
            <Th className="w-8" />
            <Th>Term</Th>
            <Th>Position</Th>
            <Th>State</Th>
            <Th align="right">Estimated impact</Th>
            <Th>Source</Th>
            <Th>Reason</Th>
            <Th>Approved by</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expanded = open === row.id;
            const tag = rowPriceTag(row, cloudDeskDeal);
            const clause = document?.clauses.find((item) => item.termKey === row.termKey);
            const documentValue = clause && extractValue(clause);
            const approval = row.termKey === 'price' ? cfoApproval : row.approvedBy;
            const newAsk = row.threats.some((t) => t.active && t.kind === 'new_ask');
            return (
              <Fragment key={row.id}>
                <tr
                  id={row.id}
                  onClick={() => setOpen(expanded ? null : row.id)}
                  className="cursor-pointer transition-colors hover:bg-page/60"
                >
                  <Td>
                    {expanded ? (
                      <ChevronDown size={14} className="text-muted" />
                    ) : (
                      <ChevronRight size={14} className="text-muted" />
                    )}
                  </Td>
                  <Td className="font-medium">{row.label}</Td>
                  <Td className="text-ink/85">{plainValue(row.position, cloudDeskDeal.termYears)}</Td>
                  <Td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <StatePill state={row.state} condition={row.condition?.text} />
                      {newAsk && <NewAskBadge />}
                      <SigningBadge signing={row.signing} />
                    </span>
                  </Td>
                  <Td align="right">
                    {tag ? <MoneyFigure tag={tag} size="sm" showExposure={false} /> : (
                      <span className="text-[12px] text-muted">No current discrepancy</span>
                    )}
                  </Td>
                  <Td>
                    <SourceChip source={row.source} />
                    {(row.threats.some((t) => t.active) || row.pendingConfirmation) && (
                      <Link
                        href={outlookHrefForRow(row, cloudDeskDeal)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 block whitespace-nowrap text-[11px] font-medium text-teal-900 hover:underline"
                      >
                        Open the email at risk ↗
                      </Link>
                    )}
                  </Td>
                  <Td className="max-w-[220px] text-[12px] text-muted">{row.reason ?? 'None'}</Td>
                  <Td className="text-[12px]">
                    {row.approvedBy ? (
                      <span className="text-ink">{personName(row.approvedBy.personId)}</span>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </Td>
                </tr>

                {expanded && (
                  <tr>
                    <Td colSpan={8} className="bg-page/50 px-6 py-5">
                      <dl className="mb-5 grid gap-4 rounded-lg border border-line bg-white p-4 text-sm lg:grid-cols-3">
                        <div>
                          <dt className="text-muted">Supplier position</dt>
                          <dd>{plainValue(row.position, cloudDeskDeal.termYears)} · {personName(row.source.byPersonId)}, {formatDateShort(row.source.at)}</dd>
                          <SourceChip source={row.source} />
                        </div>
                        <div>
                          <dt className="text-muted">Internal approval</dt>
                          <dd>{approval ? <>{personName(approval.personId)}, {formatDateShort(approval.source.at)}{approval.condition && ` · ${approval.condition}`}</> : 'No approval recorded'}</dd>
                          {approval && <SourceChip source={approval.source} />}
                        </div>
                        <div>
                          <dt className="text-muted">Current document</dt>
                          <dd>{documentValue && clause ? `${plainValue(documentValue, cloudDeskDeal.termYears)} · ${document?.id}, clause ${clause.no}` : 'Clause unavailable'}</dd>
                        </div>
                      </dl>
                      {row.termKey === 'price' && <p className="mb-3 text-sm">{priceReopened ? 'Fixed pricing reopened. CFO approval needs review.' : <>Impact if reopened · <MoneyFigure tag={priceChange(cloudDeskDeal, { kind: 'price', wording: 'fixed' }, { kind: 'price', wording: 'open_yearly', fromYear: 2 })} size="sm" /></>}</p>}
                      {(row.termKey === 'payment' || row.termKey === 'term') && <p className="mb-3 text-sm">
                        {termChanged ? 'Term changed. Reconfirm the payment concession with CloudDesk.' : 'CloudDesk agreed to 60-day payment if Meridian commits to three years.'}
                        {payment && <span className="ml-2"><SourceChip source={payment.source} /></span>}
                      </p>}
                      <div className="grid gap-6 lg:grid-cols-3">
                        <div>
                          <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                            How this term got here
                          </p>
                          <ol className="space-y-3 border-l border-line pl-4">
                            {row.history.map((h, i) => (
                              <li key={i} className="relative">
                                <span className="absolute -left-[21px] top-[5px] h-[7px] w-[7px] rounded-full bg-teal-900" />
                                <p className="text-[12.5px] leading-[18px] text-ink">{h.text}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[11px] text-muted">
                                    {formatDateTime(h.at)}
                                  </span>
                                  <SourceChip source={h.source} />
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div>
                          <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                            Live threats
                          </p>
                          {row.threats.filter((t) => t.active).length === 0 ? (
                            <p className="text-[12.5px] text-muted">
                              Nothing is pulling against this row.
                            </p>
                          ) : (
                            <ul className="space-y-2.5">
                              {row.threats
                                .filter((t) => t.active)
                                .map((t) => (
                                  <li key={t.id} className="rounded-lg border border-line bg-white p-3">
                                    <p className="text-[12.5px] text-ink">
                                      {THREAT_LABELS[t.kind]}:{' '}
                                      <strong className="font-medium">{plainValue(t.value)}</strong>
                                    </p>
                                    {t.hidden && (
                                      <p className="mt-1 inline-flex rounded bg-amber-bg px-1.5 py-[1px] text-[10.5px] font-medium text-amber-fg">
                                        Not shown as a tracked change
                                      </p>
                                    )}
                                    <div className="mt-1.5">
                                      <SourceChip source={t.source} />
                                    </div>
                                  </li>
                                ))}
                            </ul>
                          )}
                          <RecommendedMoveBox row={row} />
                          {tag && tag.costLakhPerYr !== null && (
                            <div className="mt-3 rounded-lg bg-white p-3">
                              {tag.proof.map((p, i) => (
                                <p key={i} className="mb-1.5 text-[11.5px] leading-[17px] text-muted">
                                  {p}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                            What the supplier sees
                          </p>
                          <div className="rounded-lg border border-line bg-white p-3.5">
                            <p className="text-[12.5px] leading-[18px] text-ink">
                              “{row.supplierNote}”
                            </p>
                            <p className="mt-2.5 border-t border-line pt-2 text-[11px] leading-[16px] text-muted">
                              {isSupplierSafe(row.supplierNote)
                                ? 'Checked: no ₹ figures, no internal names, no approvals, no limits.'
                                : 'This note would be blocked before it reached the supplier.'}
                            </p>
                          </div>
                          {row.approvedBy && (
                            <div className="mt-3 rounded-lg border border-line bg-white p-3.5">
                              <p className="text-[11px] uppercase tracking-wide text-muted">
                                Approved by
                              </p>
                              <p className="mt-1 text-[12.5px] text-ink">
                                {personName(row.approvedBy.personId)} ·{' '}
                                {formatDateShort(row.approvedBy.source.at)}
                              </p>
                              {row.approvedBy.condition && (
                                <p className="mt-1 text-[12px] italic text-muted">
                                  “{row.approvedBy.condition}”
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </Table>
      <p className="px-6 py-3 text-[11.5px] text-muted">
        {rows.length} terms · click a row to see its history, what is pulling against it, and the
        note the supplier would read.
      </p>
    </SirionCard>
  );
}

const THREAT_LABELS: Record<string, string> = {
  supplier_ask: 'Supplier is asking for',
  version_change: 'A draft changed it to',
  side_offer: 'Offered in a side thread',
  new_ask: 'Reopened by a new ask',
  sent_concession: 'Our side conceded',
  signing_copy: 'The signing copy says',
};

/** What to do next on a flagged row, and the leverage behind it (Ironclad-style renewal brief). */
function RecommendedMoveBox({ row }: { row: LedgerRow }) {
  const move = recommendedMove(row, cloudDeskDeal);
  if (!move) return null;
  return (
    <div className="mt-3 rounded-lg border border-teal-900/20 bg-mint/30 p-3 text-[11.5px] leading-[17px]">
      <p className="mb-1 font-semibold text-teal-900">Recommended move</p>
      <p className="text-ink">{move.ask}</p>
      {move.fallback && (
        <p className="mt-1 text-ink">
          <span className="text-muted">Fallback · </span>
          {move.fallback}
        </p>
      )}
      {move.leverage && (
        <p className="mt-1 text-ink">
          <span className="text-muted">Leverage · </span>
          {move.leverage}
        </p>
      )}
    </div>
  );
}
