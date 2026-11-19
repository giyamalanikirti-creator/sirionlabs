'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Divider,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Radio,
  RadioGroup,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  DismissRegular,
  EyeOffRegular,
  LinkRegular,
} from '@fluentui/react-icons';
import { useDemo } from '@/lib/store';
import { cloudDeskDeal, messageById, personName, versions, deals, threadById } from '@/lib/data';
import { rowAtRisk, rowPriceTag, dealAtRisk } from '@/lib/engines/atRisk';
import { priceChange } from '@/lib/engines/pricing';
import { matchThread, toHeader, SIGNAL_WEIGHTS } from '@/lib/engines/matcher';
import { messages as allMessages } from '@/lib/data';
import { RESTORE_NOTICE_DRAFT } from '@/lib/engines/wording';
import { formatLakh, formatDateShort } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import { useSourceDrawer } from '@/lib/drawer';
import { SourceDrawerBody } from '@/components/sirion/SourceDrawer';
import { usePaneStyles } from './paneStyles';
import { LedgerList, StateBadge } from './LedgerList';
import type { LedgerRow, TermValue } from '@/lib/types';

const CREDIT_10: TermValue = { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 };
const CREDIT_5: TermValue = { kind: 'service_credit', pct: 5, uptimeTarget: 99.5 };

export function AnanyaPane({
  rows,
  openMessageId,
  busy,
  onDraftReply,
}: {
  rows: LedgerRow[];
  openMessageId?: string;
  busy: boolean;
  onDraftReply: (body: string) => void;
}) {
  const s = usePaneStyles();
  const atRisk = dealAtRisk(rows, cloudDeskDeal);
  const notices = useDemo((st) => st.notices).filter((n) => n.forPersonId === 'ananya');

  return (
    <div style={{ position: 'relative' }}>
      <div className={s.headline}>
        <span className={s.headlineLabel}>CloudDesk renewal 2026–29</span>
        <span>
          <span className={s.money}>{formatLakh(atRisk)}</span>{' '}
          <span className={s.moneySuffix}>a year at risk</span>
        </span>
      </div>

      {notices.map((n, i) => (
        <MessageBar key={i} intent="warning" style={{ marginBottom: 10 }}>
          <MessageBarBody>
            <MessageBarTitle>Someone conceded by email</MessageBarTitle>
            {n.text}
          </MessageBarBody>
        </MessageBar>
      ))}

      {busy && (
        <div className={s.card} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Spinner size="tiny" />
          <span style={{ fontSize: 12.5 }}>Reading this round…</span>
        </div>
      )}

      {!busy && openMessageId === 'M8' && <RoundFourCard rows={rows} onDraftReply={onDraftReply} />}
      {!busy && openMessageId === 'M12' && <SideThreadFlow rows={rows} />}
      {!busy && openMessageId === 'M14' && <SigningCopyCard />}
      {!busy && openMessageId === 'M13' && <NewAskCard rows={rows} />}

      <p className={s.sectionLabel}>All terms on this deal</p>
      <LedgerList rows={rows} />

      <p className={s.note}>
        Every row carries the email or clause it came from. Nothing here was summarised by a model:
        the quotes are exact, and the ₹ figures are computed from your own invoices and renewals.
      </p>

      <InlinePaneDrawer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Moment 1 — round 4                                                  */
/* ------------------------------------------------------------------ */

function RoundFourCard({
  rows,
  onDraftReply,
}: {
  rows: LedgerRow[];
  onDraftReply: (body: string) => void;
}) {
  const s = usePaneStyles();
  const open = useSourceDrawer((st) => st.open);
  const price = rows.find((r) => r.id === 'R-price');
  const notice = rows.find((r) => r.id === 'R-notice');
  const m8 = messageById('M8');
  const noticeTag = notice ? rowPriceTag(notice, cloudDeskDeal) : null;
  const noticeThreat = notice?.threats.find((t) => t.active && t.kind === 'version_change');

  const moved = [price, notice].filter(Boolean).length;

  return (
    <div className={s.card}>
      <div className={s.cardTitle}>Round 4 · 14 Nov · {personName('rohan')}</div>
      <div className={s.cardMeta}>
        {moved} terms moved · read from the email text and the attached v4
      </div>

      {price && (
        <div className={s.termRow}>
          <div className={s.termHead}>
            <span className={s.termName}>{price.label}</span>
            <StateBadge state={price.state} />
          </div>
          <div className={s.termValue}>{plainValue(price.position)}</div>
          {price.source.kind === 'email' && m8 && (
            <div className={s.quote}>“{price.source.quote}”</div>
          )}
          <div className={s.actions}>
            <Button size="small" appearance="secondary" onClick={() => open(price.source, true)}>
              See the email
            </Button>
          </div>
        </div>
      )}

      {notice && noticeThreat && (
        <div className={s.termRow}>
          <div className={s.termHead}>
            <span className={s.termName}>{notice.label}</span>
            <StateBadge state={notice.state} />
          </div>
          <div className={s.termValue}>
            {plainValue(notice.position)} → {plainValue(noticeThreat.value)} in v4, clause{' '}
            {noticeThreat.source.clauseNo}
          </div>
          <div className={s.tags}>
            <Badge appearance="outline" color="informative" size="small">
              Not mentioned in the email
            </Badge>
            <Badge
              appearance="filled"
              color="severe"
              size="small"
              icon={<EyeOffRegular />}
            >
              Not shown as a tracked change
            </Badge>
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={s.money}>{formatLakh(rowAtRisk(notice, cloudDeskDeal))}</span>{' '}
            <span className={s.moneySuffix}>a year</span>
            {noticeTag?.exposureLakh !== undefined && (
              <div className={s.grey}>
                Exposure if missed: one more year, {formatLakh(noticeTag.exposureLakh)}
              </div>
            )}
          </div>
          <div className={s.actions}>
            <Button size="small" appearance="primary" onClick={() => open(noticeThreat.source, true)}>
              See the change
            </Button>
            <Button size="small" onClick={() => onDraftReply(RESTORE_NOTICE_DRAFT)}>
              Draft a reply asking to restore
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Moment 2 — the side thread                                          */
/* ------------------------------------------------------------------ */

function SideThreadFlow({ rows }: { rows: LedgerRow[] }) {
  const linked = useDemo((st) => st.linkedThreadIds).includes('T2');
  const dismissed = useDemo((st) => st.dismissedThreadIds).includes('T2');
  const credit = rows.find((r) => r.id === 'R-credit');

  /*
   * The side thread comes first. Until it is linked we only know that an
   * ambiguous reply arrived and that Rohan named the business owner; we do not
   * yet know what the second offer was, so there is nothing to ask about.
   */
  if (!linked && !dismissed) return <WeakMatchCard />;

  if (credit?.state === 'needs_confirmation') return <ConfirmCreditCard row={credit} />;
  if (credit?.state === 'agreed' && linked) return <CreditConfirmedCard row={credit} />;
  return null;
}

function WeakMatchCard() {
  const s = usePaneStyles();
  const link = useDemo((st) => st.linkThread);
  const dismiss = useDemo((st) => st.dismissThread);
  const toast = useDemo((st) => st.toast);

  const t2Headers = allMessages.filter((m) => m.threadId === 'T2').map(toHeader);
  const match = matchThread(t2Headers, deals, versions);
  const thread = threadById('T2');

  const SIGNALS: { label: string; on: boolean; weight: number }[] = [
    { label: 'Supplier domain on the thread', on: match.signals.supplierDomain, weight: SIGNAL_WEIGHTS.supplierDomain },
    { label: '“CloudDesk” in the subject', on: match.signals.subjectName, weight: SIGNAL_WEIGHTS.subjectName },
    { label: 'A known contract file attached', on: match.signals.fingerprint, weight: SIGNAL_WEIGHTS.fingerprint },
    { label: 'Deal ID inside an attachment', on: match.signals.dealIdTag, weight: SIGNAL_WEIGHTS.dealIdTag },
  ];

  return (
    <>
      <MessageBar intent="info" style={{ marginBottom: 10 }}>
        <MessageBarBody>
          <MessageBarTitle>Rohan mentions {personName('vikram')}.</MessageBarTitle>
          1 thread may belong to this deal.
        </MessageBarBody>
      </MessageBar>

      <div className={s.card}>
        <div className={s.cardTitle}>{thread?.subject}</div>
        <div className={s.cardMeta}>
          {personName('vikram')} ↔ {personName('rohan')} · {formatDateShort('2026-11-15T09:40:00+05:30')}
        </div>

        {SIGNALS.map((sig) => (
          <div key={sig.label} className={s.signal}>
            {sig.on ? (
              <CheckmarkCircleRegular fontSize={14} color={tokens.colorPaletteGreenForeground1} />
            ) : (
              <DismissRegular fontSize={14} color={tokens.colorNeutralForeground3} />
            )}
            <span style={{ color: sig.on ? undefined : tokens.colorNeutralForeground3 }}>
              {sig.label}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: tokens.colorNeutralForeground3 }}>
              {sig.on ? `+${sig.weight}` : '—'}
            </span>
          </div>
        ))}

        <Divider style={{ marginTop: 8, marginBottom: 8 }} />
        <div style={{ fontSize: 12, fontWeight: 600 }}>
          Weak match ({match.score.toFixed(1)}). Body not read yet.
        </div>
        <p className={s.note} style={{ marginTop: 4 }}>
          We matched on sender and subject alone. Nobody has read a word of this thread, and nobody
          will until you say it belongs here.
        </p>

        <div className={s.actions}>
          <Button
            size="small"
            appearance="primary"
            icon={<LinkRegular />}
            onClick={() => link('T2')}
          >
            Link to this deal
          </Button>
          <Button
            size="small"
            onClick={() => {
              dismiss('T2');
              toast('Thread marked as not this deal. Its body is never read.');
            }}
          >
            Not this deal
          </Button>
        </div>
      </div>
    </>
  );
}

function ConfirmCreditCard({ row }: { row: LedgerRow }) {
  const s = usePaneStyles();
  const confirmRow = useDemo((st) => st.confirmRow);
  const toast = useDemo((st) => st.toast);
  const [choice, setChoice] = useState('10');
  const [note, setNote] = useState('');

  const alternatives = row.pendingConfirmation?.alternatives ?? [];
  const ours = alternatives.find((a) => a.value.kind === 'service_credit' && a.value.pct === 10);
  const theirs = alternatives.find((a) => a.value.kind === 'service_credit' && a.value.pct === 5);
  const gap = priceChange(cloudDeskDeal, CREDIT_10, CREDIT_5);

  return (
    <div className={s.card}>
      <div className={s.termHead}>
        <span className={s.termName}>{row.label}</span>
        <StateBadge state="needs_confirmation" />
      </div>
      <p style={{ fontSize: 12.5, lineHeight: '18px', marginTop: 6 }}>
        Rohan wrote “{row.pendingConfirmation?.quote}”. Two offers were open:{' '}
        <strong>10%</strong> (you, {ours ? formatDateShort(ours.source.at) : '13 Nov'}) and{' '}
        <strong>5%</strong> ({personName('vikram')},{' '}
        {theirs ? formatDateShort(theirs.source.at) : '15 Nov'}, side thread). Which did CloudDesk
        accept?
      </p>

      <div style={{ marginTop: 10 }}>
        <RadioGroup value={choice} onChange={(_, d) => setChoice(d.value)}>
          <Radio value="10" label="10% — what you asked for on 13 Nov" />
          <Radio value="5" label={`5% — what Vikram offered on 15 Nov (${formatLakh(gap.costLakhPerYr)} a year less)`} />
          <Radio value="unsure" label="Not sure, ask CloudDesk" />
        </RadioGroup>
      </div>

      <Field label="How do you know? (optional)" style={{ marginTop: 10 }}>
        <Input
          size="small"
          value={note}
          placeholder="Confirmed with Rohan by phone, 16 Nov"
          onChange={(_, d) => setNote(d.value)}
        />
      </Field>

      <div className={s.actions}>
        <Button
          size="small"
          appearance="primary"
          disabled={choice === 'unsure'}
          onClick={() => {
            confirmRow('R-credit', choice === '10' ? CREDIT_10 : CREDIT_5, note || undefined);
            toast('Service credit confirmed and written to the ledger.');
          }}
        >
          Confirm
        </Button>
        {choice === 'unsure' && (
          <span style={{ fontSize: 11, color: tokens.colorNeutralForeground3, alignSelf: 'center' }}>
            The row stays open until someone knows.
          </span>
        )}
      </div>
    </div>
  );
}

function CreditConfirmedCard({ row }: { row: LedgerRow }) {
  const s = usePaneStyles();
  const open = useSourceDrawer((st) => st.open);

  return (
    <div className={s.card}>
      <div className={s.termHead}>
        <span className={s.termName}>{row.label}</span>
        <StateBadge state={row.state} />
      </div>
      <div className={s.termValue}>{plainValue(row.position)}</div>
      <p className={s.note} style={{ marginTop: 0 }}>
        Confirmed by a person, with the call note kept beside the email.
      </p>
      <div className={s.actions}>
        <Button size="small" onClick={() => open(row.source, true)}>
          See the source
        </Button>
      </div>
      <Divider style={{ marginTop: 10, marginBottom: 8 }} />
      <p className={s.sectionLabel} style={{ marginTop: 0 }}>
        History
      </p>
      {row.history.slice(-3).map((h, i) => (
        <div key={i} style={{ fontSize: 11.5, lineHeight: '16px', marginBottom: 6 }}>
          <span style={{ color: tokens.colorNeutralForeground3 }}>{formatDateShort(h.at)}: </span>
          {h.text}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Later moments                                                       */
/* ------------------------------------------------------------------ */

function NewAskCard({ rows }: { rows: LedgerRow[] }) {
  const s = usePaneStyles();
  const price = rows.find((r) => r.id === 'R-price');
  const threat = price?.threats.find((t) => t.active && t.kind === 'new_ask');
  if (!price || !threat) return null;

  return (
    <div className={s.card}>
      <div className={s.termHead}>
        <span className={s.termName}>{price.label}</span>
        <Badge appearance="filled" color="warning" size="small">
          New ask
        </Badge>
      </div>
      <div className={s.termValue}>
        Still agreed at {plainValue(price.position)}, but CloudDesk has asked again in a side thread.
      </div>
      <div className={s.quote}>“{threat.source.quote}”</div>
      <div style={{ marginTop: 8 }}>
        <span className={s.money}>{formatLakh(rowAtRisk(price, cloudDeskDeal))}</span>{' '}
        <span className={s.moneySuffix}>a year if it moves</span>
      </div>
    </div>
  );
}

function SigningCopyCard() {
  return (
    <MessageBar intent="warning" style={{ marginBottom: 10 }}>
      <MessageBarBody>
        <MessageBarTitle>Email says: “We've accepted your changes.”</MessageBarTitle>
        Open the signing copy to check it against what was actually agreed.
      </MessageBarBody>
    </MessageBar>
  );
}

/* ------------------------------------------------------------------ */
/* The source drawer, shown inside the pane                            */
/* ------------------------------------------------------------------ */

export function InlinePaneDrawer() {
  const { source, inline, close } = useSourceDrawer();
  if (!source || !inline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={close}
        style={{ position: 'absolute', inset: 0, background: 'rgba(31,42,46,0.2)' }}
      />
      <div
        className="ds-scope thin-scroll dl-slide-in"
        style={{
          position: 'relative',
          width: 420,
          maxWidth: '100%',
          background: '#fff',
          overflowY: 'auto',
          boxShadow: '-8px 0 24px rgba(31,42,46,0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid #E6EBEB',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: '#7D9093', letterSpacing: '0.04em' }}>
            SOURCE
          </span>
          <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={close} />
        </div>
        <div style={{ padding: 20 }}>
          <SourceDrawerBody source={source} />
        </div>
      </div>
    </div>
  );
}
