'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { CheckmarkCircleFilled, DocumentRegular } from '@fluentui/react-icons';
import { useDemo } from '@/lib/store';
import { cloudDeskDeal } from '@/lib/data';
import { signingCheck } from '@/lib/engines/signing';
import { formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { playbookOptions } from '@/lib/engines/playbook';
import { MoveBox, OriginTag } from './SirionBlocks';
import type { TermValue } from '@/lib/types';
import { useSourceDrawer } from '@/lib/drawer';
import { InlinePaneDrawer } from './AnanyaPane';
import { usePaneStyles } from './paneStyles';
import type { DocVersion, LedgerRow } from '@/lib/types';

export function SigningPane({
  rows,
  version,
  onGoToClause,
  compact = false,
}: {
  rows: LedgerRow[];
  version: DocVersion;
  onGoToClause: (clauseNo: string) => void;
  /** Inside the Review tab: the issue cards above already show each gap. */
  compact?: boolean;
}) {
  const s = usePaneStyles();
  const open = useSourceDrawer((st) => st.open);
  const insertWording = useDemo((st) => st.insertWording);
  const insertAll = useDemo((st) => st.insertAll);
  const waiveGap = useDemo((st) => st.waiveGap);
  const applyPlaybook = useDemo((st) => st.applyPlaybookPosition);
  const sendBack = useDemo((st) => st.sendBack);
  const sentBackAt = useDemo((st) => st.signing.sentBackAt);
  const sentVia = useDemo((st) => st.sentVia);
  const signed = version.id === 'v7';
  const toast = useDemo((st) => st.toast);

  const [waiving, setWaiving] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const result = signingCheck(rows, version, cloudDeskDeal);
  const openGaps = result.gaps.filter((g) => {
    const row = rows.find((r) => r.id === g.rowId);
    return row?.signing !== 'inserted' && row?.signing !== 'waived';
  });
  const resolved = rows.filter((r) => result.gaps.some((gap) => gap.rowId === r.id) && (r.signing === 'inserted' || r.signing === 'waived'));
  const pending = resolved.filter((row) => row.signing === 'inserted').length;
  const waived = resolved.length - pending;
  const unresolved = openGaps.length + result.needsConfirmation.length;
  const readyToReturn = !signed && unresolved === 0 && result.gaps.length > 0;

  return (
    <div style={{ position: 'relative' }}>
      {!compact && <div className={s.headline}>
        <span className={s.headlineLabel}>Signing check · {version.fileName}{!signed ? ' · ran when the copy arrived' : ''}</span>
        {!signed && unresolved > 0 && (
          <span style={{ display: 'block' }}>
            <span className={s.money}>{formatLakh(dealAtRisk(rows, cloudDeskDeal))}</span>{' '}
            <span className={s.moneySuffix}>{HEADLINE_SUFFIX}</span>
          </span>
        )}
        {
          <span>{result.matches.length} matched · {pending} awaiting supplier acceptance · {unresolved} unresolved{waived ? ` · ${waived} waived` : ''}</span>
        }
      </div>}

      {result.needsConfirmation.length > 0 && (
        <MessageBar intent="warning" style={{ marginBottom: 10 }}>
          <MessageBarBody>
            <MessageBarTitle>
              {result.needsConfirmation.length} row still needs confirming
            </MessageBarTitle>
            {result.needsConfirmation.map((n) => n.label).join(', ')} · <Link href="/outlook/ananya?msg=M12">Resolve in Ananya’s Outlook</Link>
          </MessageBarBody>
        </MessageBar>
      )}

      {!compact && <div className={s.card}>
        <div className={s.cardTitle}>
          {signed ? 'Returned supplier copy verified' : readyToReturn ? 'Ready to return to CloudDesk' : 'Verify the supplier copy'}
        </div>
        <div className={s.cardMeta}>
          {result.matches.length} of {rows.length} rows match the signing copy
        </div>
        <div className={s.signal}>
          <DocumentRegular fontSize={14} />
          Deal ID found in this file: <strong>{result.dealIdTag ?? 'none'}</strong>
        </div>
        {readyToReturn && (
          <p className={s.note}>
            {resolved.filter((r) => r.signing === 'inserted').length} tracked changes for CloudDesk,
            each with a supplier-safe note.
          </p>
        )}
      </div>}

      {!compact && openGaps.map((gap) => (
        <div key={gap.rowId} className={s.card}>
          <div className={s.termHead}>
            <span className={s.termName}>{gap.label}</span>
            <Badge appearance="filled" color="danger" size="small">
              Missing at signing
            </Badge>
          </div>
          <div style={{ fontSize: 12.5, marginBottom: 6 }}>
            Agreed wording · <strong>{gap.agreedPlain}</strong>
          </div>
          <details className={s.quote}>
            <summary>Signing copy · clause {gap.clauseNo} · {gap.docPlain}</summary>
            <p>{gap.clauseText}</p>
          </details>
          {gap.costLakhPerYr !== null && (
            <div style={{ marginTop: 8 }}>
              <span className={s.money}>{formatLakh(gap.termKey === 'renewal_notice' ? gap.costLakhPerYr / cloudDeskDeal.termYears : gap.costLakhPerYr)}</span>{' '}
              <span className={s.moneySuffix}>{HEADLINE_SUFFIX}</span>
              {gap.termKey === 'renewal_notice' && <p className={s.grey}>{formatLakh(gap.costLakhPerYr)} expected at the next renewal, spread over {cloudDeskDeal.termYears} years{gap.priceTag.exposureLakh ? ` · gross exposure ${formatLakh(gap.priceTag.exposureLakh)}` : ''}</p>}
              <details><summary>How calculated</summary>{gap.priceTag.proof.map((line) => <p key={line}>{line}</p>)}</details>
            </div>
          )}
          <div className={s.tags}>
            <Badge
              appearance="outline"
              color="informative"
              size="small"
              style={{ cursor: 'pointer' }}
              onClick={() => open(gap.source, true)}
            >
              Source · {gap.sourceChip}
            </Badge>
          </div>
          {gap.note && <p className={s.note}>{gap.note}</p>}
          {gap.termKey === 'payment' && (
            <p className={s.grey}>v6 reverted payment terms to the 45 days of v3, with no tracked change. v4 and v5 said 60.</p>
          )}
          {(() => {
            const row = rows.find((r) => r.id === gap.rowId);
            return row ? <MoveBox row={row} /> : null;
          })()}
          <RedlineOptions
            row={rows.find((r) => r.id === gap.rowId)!}
            onInsert={() => {
              onGoToClause(gap.clauseNo);
              insertWording(gap.rowId);
              toast(`Agreed wording inserted in clause ${gap.clauseNo}.`);
            }}
            onPlaybook={(value, label) => {
              onGoToClause(gap.clauseNo);
              applyPlaybook(gap.rowId, value, label);
              toast(`Playbook ${label} inserted in clause ${gap.clauseNo}.`);
            }}
          />
          <div className={s.actions}>
            <Button size="small" onClick={() => onGoToClause(gap.clauseNo)}>
              Go to clause
            </Button>
            <Button size="small" appearance="outline" onClick={() => setWaiving(gap.rowId)}>
              Waive…
            </Button>
          </div>
        </div>
      ))}

      {resolved.map((row) => (
        <div key={row.id} className={s.card} style={{ opacity: 0.85 }}>
          <div className={s.termHead}>
            <span className={s.termName}>{row.label}</span>
            <Badge
              appearance="filled"
              color="informative"
              size="small"
            >
              {row.signing === 'inserted' ? (row.playbookPosition ? `Playbook ${row.playbookPosition} sent` : 'Awaiting supplier acceptance') : 'Waived'}
            </Badge>
          </div>
          <p className={s.note} style={{ marginTop: 2 }}>
            {row.signing === 'inserted'
              ? 'Fixed in your copy, waiting for CloudDesk to accept.'
              : `Waived: ${row.waiveReason}`}
          </p>
          {row.signing === 'inserted' && <p className={s.quote}>Supplier comment · {row.supplierNote}</p>}
        </div>
      ))}

      {openGaps.length > 1 && (
        <Button
          appearance="secondary"
          data-tour="insert-all"
          style={{ width: '100%', marginBottom: 10 }}
          onClick={() => {
            insertAll();
            toast(`Agreed wording inserted in ${openGaps.length} clauses.`);
          }}
        >
          Fix all {openGaps.length} with agreed wording
        </Button>
      )}

      {readyToReturn && !sentBackAt && (
        <div style={{ marginBottom: 10 }}>
          <Button
            appearance="primary"
            data-tour="send-back"
            style={{ width: '100%', marginBottom: 6 }}
            onClick={() => {
              sendBack('email');
              toast('Sent to Priya Nair as v7');
            }}
          >
            Send back to CloudDesk
          </Button>
          <Button
            appearance="secondary"
            style={{ width: '100%' }}
            onClick={() => {
              sendBack('portal');
              toast('Shared with CloudDesk in the Sirion counterparty portal as v7');
            }}
          >
            Share in Sirion counterparty portal
          </Button>
          <p className={s.grey} style={{ marginTop: 4 }}>
            <OriginTag kind="today" /> The portal is Sirion&apos;s own; the ledger checks what comes back either way.
          </p>
        </div>
      )}

      {sentBackAt && !signed && (
        <MessageBar intent="success" style={{ marginBottom: 10 }}>
          <MessageBarBody>
            {sentVia === 'portal' ? 'v7 shared with CloudDesk in the Sirion portal' : 'v7 sent to Priya Nair'} with the tracked changes and notes.
          </MessageBarBody>
        </MessageBar>
      )}


      <p className={s.sectionLabel}>Rows that already match</p>
      <Accordion collapsible>
        <AccordionItem value="matches">
          <AccordionHeader size="small">
            {result.matches.length} rows match this copy
          </AccordionHeader>
          <AccordionPanel>
            {result.matches.map((m) => (
              <div key={m.rowId} className={s.listRow}>
                <span className={s.listName}>
                  <span style={{ display: 'block', fontWeight: 600 }}>{m.label}</span>
                  <span className={s.listValue}>
                    {m.agreedPlain}
                    {m.note ? ` · ${m.note}` : ''}
                  </span>
                </span>
                <CheckmarkCircleFilled
                  fontSize={16}
                  color={tokens.colorPaletteGreenForeground1}
                />
              </div>
            ))}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <p className={s.note}>
        The email said every change was accepted. The check compares the file against what the
        ledger actually records, clause by clause, and prices each difference from your own data.
      </p>

      <Dialog open={Boolean(waiving)} onOpenChange={(_, d) => !d.open && setWaiving(null)}>
        <DialogSurface style={{ maxWidth: 420 }}>
          <DialogBody>
            <DialogTitle>Waive this gap</DialogTitle>
            <DialogContent>
              <p style={{ fontSize: 13, marginBottom: 10 }}>
                A waived gap stays on the record with your reason, so anyone reading the ledger
                later can see it was a decision rather than an oversight.
              </p>
              <Field label="Why is this acceptable?" required>
                <Textarea
                  value={reason}
                  onChange={(_, d) => setReason(d.value)}
                  placeholder="Finance is fine with 45 days this year"
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setWaiving(null)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                disabled={!reason.trim()}
                onClick={() => {
                  if (waiving) waiveGap(waiving, reason.trim());
                  setWaiving(null);
                  setReason('');
                  toast('Gap waived, with the reason on the record.');
                }}
              >
                Waive
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <InlinePaneDrawer />
    </div>
  );
}

/** Redline Agent suggestions: agreed wording, plus the playbook's fallback and walk-away, each priced. */
function RedlineOptions({
  row,
  onInsert,
  onPlaybook,
}: {
  row: LedgerRow;
  onInsert: () => void;
  onPlaybook: (value: TermValue, label: 'fallback' | 'walk-away') => void;
}) {
  const s = usePaneStyles();
  if (!row) return null;
  const options = playbookOptions(row, cloudDeskDeal);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
        <span className={s.sectionLabel} style={{ margin: 0 }}>Redline Agent suggestions</span>
        <OriginTag kind="today" />
      </div>
      {options.map((opt) => (
        <div key={opt.kind} className={s.listRow} style={{ alignItems: 'flex-start' }}>
          <span className={s.listName}>
            <span style={{ display: 'block', fontWeight: 600 }}>{opt.label}</span>
            <span className={s.listValue}>
              {opt.plain}
              {opt.condition ? `, ${opt.condition}` : ''} · {opt.costText}
            </span>
          </span>
          <Button
            size="small"
            appearance={opt.kind === 'agreed' ? 'primary' : 'secondary'}
            onClick={() => (opt.kind === 'agreed' ? onInsert() : onPlaybook(opt.value, opt.kind === 'fallback' ? 'fallback' : 'walk-away'))}
          >
            {opt.kind === 'agreed' ? 'Insert agreed wording' : opt.kind === 'fallback' ? 'Use fallback' : 'Walk-away'}
          </Button>
        </div>
      ))}
      <p className={s.grey} style={{ marginTop: 4 }}>
        <OriginTag kind="new" /> ₹ figures and the email source come from Deal Ledger.
      </p>
    </div>
  );
}
