'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NextStage } from '@/components/demo/NextStage';
import { ReaderPreview } from '@/components/outlook/ReaderPreview';
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
import { termEnd } from '@/lib/engines/handover';
import { priceChange } from '@/lib/engines/pricing';
import { matchThread, toHeader, SIGNAL_WEIGHTS } from '@/lib/engines/matcher';
import { messages as allMessages } from '@/lib/data';
import { RESTORE_NOTICE_DRAFT } from '@/lib/engines/wording';
import { formatLakh, formatDateLong, formatDateShort } from '@/lib/format';
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
  const roundReviewed = useDemo((state) => Boolean(state.readerRuns.M8));
  const sideDismissed = useDemo((st) => st.dismissedThreadIds.includes('T2'));
  const notices = useDemo((st) => st.notices).filter((n) => n.forPersonId === 'ananya');

  return (
    <div style={{ position: 'relative' }}>
      <div className={s.headline}>
        <span className={s.headlineLabel}>CloudDesk renewal 2026–29</span>
        <span>
          <span className={s.money}>{busy || openMessageId === 'M8' && !roundReviewed ? 'Updating…' : formatLakh(atRisk)}</span>{' '}
          <span className={s.moneySuffix}>a year at risk, averaged over the term</span>
        </span>
      </div>

      {notices.map((n, i) => (
        <MessageBar key={i} intent="warning" style={{ marginBottom: 10 }}>
          <MessageBarBody>
            <MessageBarTitle>CloudDesk term needs review</MessageBarTitle>
            {n.text}
            {n.rowId && <p><Link href={`/deals/D-CLOUDDESK?row=${n.rowId}#${n.rowId}`}>Open the term in the ledger</Link></p>}
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
      {!busy && openMessageId === 'M12' && <SideThreadFlow rows={rows} onDraftReply={onDraftReply} />}
      {!busy && openMessageId === 'M14' && <SigningCopyCard />}
      {!busy && openMessageId === 'M13' && <NewAskCard rows={rows} />}

      {!busy && openMessageId === 'M8' && <NextStage step={2} />}
      {!busy && openMessageId === 'M12' && (rows.some((row) => row.id === 'R-credit' && row.state === 'agreed') || sideDismissed) && <NextStage step={3} />}
      <ReaderPreview />

      <details className={s.card}>
        <summary>All {rows.length} terms on this deal</summary>
        <LedgerList rows={rows} />
      </details>

      <p className={s.note}>
        Estimates use invoice and renewal history.
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

  const [compare, setCompare] = useState(false);
  const end = termEnd(cloudDeskDeal);
  const beforeEnd = (days: number) =>
    formatDateLong(new Date(Date.parse(end) - days * 86_400_000).toISOString());
  const oldClause = versions.find((v) => v.id === 'v3')?.clauses.find((c) => c.no === '14.2');
  const newClause = versions.find((v) => v.id === 'v4')?.clauses.find((c) => c.no === '14.2');

  return (
    <div className={s.card}>
      <div className={s.cardTitle}>Round 4 · 14 Nov · {personName('rohan')}</div>
      <div className={s.cardMeta}>The email confirms one term. The attachment changes another.</div>

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
          <p>Agreed: 30 days’ notice. v4 asks for 90, so you must decide 60 days earlier.</p>
          <div style={{ marginTop: 8 }}>
            <span className={s.money}>{formatLakh(rowAtRisk(notice, cloudDeskDeal))}</span>{' '}
            <span className={s.moneySuffix}>expected at the next renewal</span>
            {noticeTag?.exposureLakh !== undefined && (
              <div className={s.grey}>
                Gross renewal exposure · {formatLakh(noticeTag.exposureLakh)}
              </div>
            )}
          </div>
          <div className={s.actions}>
            <Button size="small" appearance="primary" aria-expanded={compare} onClick={() => setCompare(!compare)}>
              Compare clause 14.2
            </Button>
            <Button size="small" onClick={() => onDraftReply(RESTORE_NOTICE_DRAFT)}>
              Draft a reply asking to restore
            </Button>
          </div>
          {compare && (
            <div className={s.quote}>
              <p>Agreed · {oldClause?.text.split('30').map((part, index) => index ? <span key={index}><mark>30</mark>{part}</span> : part)}</p>
              <p>v4 · {newClause?.text.split('90').map((part, index) => index ? <span key={index}><mark>90</mark>{part}</span> : part)}</p>
              <dl>
                <dt>Contract end</dt><dd>{beforeEnd(0)}</dd>
                <dt>Last day to give notice in v4</dt><dd>{beforeEnd(90)}</dd>
                <dt>Internal reminder in v4 · 45 days earlier</dt><dd>{beforeEnd(135)}</dd>
              </dl>
            </div>
          )}
          {noticeTag && <details><summary>How calculated</summary>{noticeTag.proof.map((line) => <p key={line}>{line}</p>)}</details>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Moment 2 — the side thread                                          */
/* ------------------------------------------------------------------ */

function SideThreadFlow({ rows, onDraftReply }: { rows: LedgerRow[]; onDraftReply: (body: string) => void }) {
  const linked = useDemo((st) => st.linkedThreadIds).includes('T2');
  const dismissed = useDemo((st) => st.dismissedThreadIds).includes('T2');
  const credit = rows.find((r) => r.id === 'R-credit');

  /*
   * The side thread comes first. Until it is linked we only know that an
   * ambiguous reply arrived and that Rohan named the business owner; we do not
   * yet know what the second offer was, so there is nothing to ask about.
   */
  if (!linked && !dismissed) return <WeakMatchCard />;

  if (credit?.state === 'needs_confirmation') return <ConfirmCreditCard row={credit} onDraftReply={onDraftReply} />;
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

        <p className={s.note}><strong>Possible match: same supplier, related subject.</strong> The message body stays unread until you link the thread.</p>
        <details>
          <summary>Match details</summary>
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
        <p className={s.note}>Match score {match.score.toFixed(1)}</p>
        </details>

        <div className={s.actions}>
          <Button
            size="small"
            appearance="primary"
            icon={<LinkRegular />}
            onClick={() => link('T2')}
          >
            Link to this deal as Ananya
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

function ConfirmCreditCard({ row, onDraftReply }: { row: LedgerRow; onDraftReply: (body: string) => void }) {
  const s = usePaneStyles();
  const confirmRow = useDemo((st) => st.confirmRow);
  const toast = useDemo((st) => st.toast);
  const [choice, setChoice] = useState('');
  const [note, setNote] = useState('');

  const ourOffer = messageById('M7')!;
  const vikramOffer = messageById('M10')!;
  const gap = priceChange(cloudDeskDeal, CREDIT_10, CREDIT_5);

  return (
    <div className={s.card}>
      <div className={s.termHead}>
        <span className={s.termName}>{row.label}</span>
        <StateBadge state="needs_confirmation" />
      </div>
      <p style={{ fontSize: 12.5, lineHeight: '18px', marginTop: 6 }}>
        Rohan wrote “{row.pendingConfirmation?.quote}”. Two offers were open:{' '}
        <strong>10%</strong> (you, {formatDateShort(ourOffer.sentAt)}) and{' '}
        <strong>5%</strong> ({personName('vikram')},{' '}
        {formatDateShort(vikramOffer.sentAt)}, side thread).
      </p>
      <p className={s.cardTitle}>Which offer did Rohan accept?</p>
      <p className={s.quote}>10% · “{ourOffer.body}”</p>
      <p className={s.quote}>5% · “{vikramOffer.body}”
      </p>

      <div style={{ marginTop: 10 }}>
        <RadioGroup value={choice} onChange={(_, d) => setChoice(d.value)}>
          <Radio value="10" label={`10% — Ananya, ${formatDateShort(ourOffer.sentAt)}`} />
          <Radio value="5" label={`5% — what Vikram offered on 15 Nov (${formatLakh(gap.costLakhPerYr)} a year less)`} />
        </RadioGroup>
      </div>

      <Field label="How did you confirm this?" style={{ marginTop: 10 }}>
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
          disabled={!choice || !note.trim()}
          onClick={() => {
            confirmRow('R-credit', choice === '10' ? CREDIT_10 : CREDIT_5, note.trim());
            toast('Service credit confirmed and written to the ledger.');
          }}
        >
          Confirm
        </Button>
        <Button size="small" appearance="primary" onClick={() => onDraftReply(
          'Hi Rohan, could you confirm whether you accepted the 10% or the 5% service credit for uptime below 99.5%? Thanks, Ananya',
        )}>
          Ask CloudDesk to clarify
        </Button>
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
        Confirmed by {personName(row.source.byPersonId)} on {formatDateShort(row.source.at)}.
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
