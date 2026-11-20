'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NextStage } from '@/components/demo/NextStage';
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
import { formatLakh } from '@/lib/format';
import { useSourceDrawer } from '@/lib/drawer';
import { InlinePaneDrawer } from './AnanyaPane';
import { usePaneStyles } from './paneStyles';
import type { DocVersion, LedgerRow } from '@/lib/types';

export function SigningPane({
  rows,
  version,
  onGoToClause,
}: {
  rows: LedgerRow[];
  version: DocVersion;
  onGoToClause: (clauseNo: string) => void;
}) {
  const s = usePaneStyles();
  const open = useSourceDrawer((st) => st.open);
  const insertWording = useDemo((st) => st.insertWording);
  const insertAll = useDemo((st) => st.insertAll);
  const waiveGap = useDemo((st) => st.waiveGap);
  const sendBack = useDemo((st) => st.sendBack);
  const sentBackAt = useDemo((st) => st.signing.sentBackAt);
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
      <div className={s.headline}>
        <span className={s.headlineLabel}>Signing check · {version.fileName}</span>
        {
          <span>{result.matches.length} matched · {pending} awaiting supplier acceptance · {unresolved} unresolved{waived ? ` · ${waived} waived` : ''}</span>
        }
      </div>

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

      <div className={s.card}>
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
      </div>

      {openGaps.map((gap) => (
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
          <div className={s.quote}>
            Signing copy · clause {gap.clauseNo} {gap.clauseText}
          </div>
          {gap.costLakhPerYr !== null && (
            <div style={{ marginTop: 8 }}>
              <span className={s.money}>{formatLakh(gap.costLakhPerYr)}</span>{' '}
              <span className={s.moneySuffix}>{gap.termKey === 'renewal_notice' ? 'expected at the next renewal' : 'per year on average'}</span>
              {gap.priceTag.exposureLakh && <p>Gross renewal exposure · {formatLakh(gap.priceTag.exposureLakh)}</p>}
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
          <div className={s.actions}>
            <Button
              size="small"
              appearance="primary"
              onClick={() => {
                onGoToClause(gap.clauseNo);
                insertWording(gap.rowId);
                toast(`Agreed wording inserted in clause ${gap.clauseNo}.`);
              }}
            >
              Insert agreed wording
            </Button>
            <Button size="small" onClick={() => onGoToClause(gap.clauseNo)}>
              Go to clause
            </Button>
            <Button size="small" appearance="subtle" onClick={() => setWaiving(gap.rowId)}>
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
              {row.signing === 'inserted' ? 'Awaiting supplier acceptance' : 'Waived'}
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
          style={{ width: '100%', marginBottom: 10 }}
          onClick={() => {
            insertAll();
            toast(`Agreed wording inserted in ${openGaps.length} clauses.`);
          }}
        >
          Insert all {openGaps.length}
        </Button>
      )}

      {readyToReturn && !sentBackAt && (
        <Button
          appearance="primary"
          style={{ width: '100%', marginBottom: 10 }}
          onClick={() => {
            sendBack();
            toast('Sent to Priya Nair as v7');
          }}
        >
          Send back to CloudDesk
        </Button>
      )}

      {sentBackAt && !signed && (
        <MessageBar intent="success" style={{ marginBottom: 10 }}>
          <MessageBarBody>
            v7 sent to Priya Nair with the tracked changes and notes.
          </MessageBarBody>
        </MessageBar>
      )}

      {sentBackAt && !signed && <NextStage step={5} />}

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
