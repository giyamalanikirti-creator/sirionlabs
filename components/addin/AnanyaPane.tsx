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
  ArrowUndoRegular,
  CheckmarkCircleRegular,
  DismissRegular,
  EyeOffRegular,
  LinkRegular,
} from '@fluentui/react-icons';
import { useDemo } from '@/lib/store';
import { cloudDeskDeal, messageById, personName, versions, deals, threadById, versionById } from '@/lib/data';
import { rowAtRisk, rowPriceTag, dealAtRisk } from '@/lib/engines/atRisk';
import { termEnd } from '@/lib/engines/handover';
import { priceChange } from '@/lib/engines/pricing';
import { matchThread, toHeader, SIGNAL_WEIGHTS } from '@/lib/engines/matcher';
import { messages as allMessages } from '@/lib/data';
import { extractValue } from '@/lib/engines/diff';
import { CLARIFY_DRAFT, RESPOND_ROUND_DRAFT } from '@/lib/engines/wording';
import { signingCheck } from '@/lib/engines/signing';
import { rowHeadlineShare } from '@/lib/engines/playbook';
import { HEADLINE_SUFFIX } from '@/lib/format';
import { NotConnectedCard, TrackedBanner, ASK_COPY_DRAFT } from './ConnectPanes';
import { ActionRow, AiReviewBlock, AttachmentBlock, Block, DealHeaderBlock, MoveBox, OriginTag, PaneHeadlineExplainer } from './SirionBlocks';
import { formatLakh, formatDateLong, formatDateShort } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import { useSourceDrawer } from '@/lib/drawer';
import { SourceDrawerBody } from '@/components/sirion/SourceDrawer';
import { usePaneStyles } from './paneStyles';
import { LedgerList, StateBadge } from './LedgerList';
import type { LedgerRow, TermValue } from '@/lib/types';

const CREDIT_10: TermValue = { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 };
const CREDIT_5: TermValue = { kind: 'service_credit', pct: 5, uptimeTarget: 99.5 };

export interface DraftOptions {
  kind?: 'clarify' | 'respond';
  attachVersionId?: string;
  /** A new internal email rather than a reply (e.g. asking Vikram to copy deals@). */
  to?: string[];
  subject?: string;
}

export function AnanyaPane({
  rows,
  openMessageId,
  busy,
  onDraftReply,
}: {
  rows: LedgerRow[];
  openMessageId?: string;
  busy: boolean;
  onDraftReply: (body: string, opts?: DraftOptions) => void;
}) {
  const s = usePaneStyles();
  const atRisk = dealAtRisk(rows, cloudDeskDeal);
  const roundReviewed = useDemo((state) => Boolean(state.readerRuns.M8));
  const sideDismissed = useDemo((st) => st.dismissedThreadIds.includes('T2'));
  const responded = useDemo((st) => st.respondedMessageIds.includes('M8'));
  const respond = useDemo((st) => st.respondToRound);
  const toast = useDemo((st) => st.toast);
  const notices = useDemo((st) => st.notices).filter((n) => n.forPersonId === 'ananya');
  const message = openMessageId ? messageById(openMessageId) : undefined;
  const versionId = message?.attachments.find((a) => a.versionId)?.versionId;

  const respondToRound = () => {
    respond('M8');
    onDraftReply(RESPOND_ROUND_DRAFT, { kind: 'respond', attachVersionId: 'v5' });
    toast('Reply drafted, with v5 attached: clause 14.2 restored as a tracked change.');
  };

  return (
    <div style={{ position: 'relative' }}>
      <TrackedBanner />
      {message && <DealHeaderBlock message={message} />}

      <div className={s.headline}>
        <span className={s.headlineLabel}>
          <OriginTag kind="new" /> If CloudDesk’s current terms were signed as they stand
        </span>
        <span>
          <span className={s.money}>{busy || openMessageId === 'M8' && !roundReviewed ? 'Updating…' : formatLakh(atRisk)}</span>{' '}
          <span className={s.moneySuffix}>{HEADLINE_SUFFIX}</span>
        </span>
        {!busy && <PaneHeadlineExplainer rows={rows} />}
      </div>

      {notices.map((n, i) => (
        <MessageBar key={i} intent="warning" style={{ marginBottom: 10 }}>
          <MessageBarBody>
            <MessageBarTitle>{n.title ?? "CloudDesk term needs review"}</MessageBarTitle>
            {n.text}
            {n.rowId && <p><Link href={`/deals/D-CLOUDDESK?row=${n.rowId}#${n.rowId}`}>Open the term in the ledger</Link></p>}
          </MessageBarBody>
        </MessageBar>
      ))}

      {message && <AttachmentBlock message={message} />}
      {versionId && versionId !== 'v6' && <AiReviewBlock versionId={versionId} />}

      {busy && (
        <div className={s.card} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Spinner size="tiny" />
          <span style={{ fontSize: 12.5 }}>Reading this round…</span>
        </div>
      )}

      {!busy && openMessageId === 'M8' && <RoundFourCard rows={rows} />}
      {!busy && (openMessageId === 'M12' || openMessageId === 'M12R') && <SideThreadFlow rows={rows} onDraftReply={onDraftReply} />}
      {!busy && openMessageId === 'M14' && <SigningCopyCard rows={rows} />}
      {!busy && openMessageId === 'M13' && <NewAskCard rows={rows} />}

      {!busy && openMessageId === 'M8' && (
        <ActionRow versionId="v4" onRespond={respondToRound} responded={responded} />
      )}

      {!busy && openMessageId === 'M8' && <NextStage step={2} />}
      {!busy && (openMessageId === 'M12' || openMessageId === 'M12R') && (rows.some((row) => row.id === 'R-credit' && row.state === 'agreed') || sideDismissed) && <NextStage step={3} />}
      <ReaderPreview />

      <details className={s.card}>
        <summary>All {rows.length} terms on this deal</summary>
        <LedgerList rows={rows} />
      </details>

      <p className={s.note}>
        Estimates use invoice and renewal history. A renewal-notice cost is counted once per
        renewal, spread over the {cloudDeskDeal.termYears}-year term, so every figure adds up to
        the one above.
      </p>

      <InlinePaneDrawer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Moment 1 — round 4                                                  */
/* ------------------------------------------------------------------ */

function RoundFourCard({ rows }: { rows: LedgerRow[] }) {
  const s = usePaneStyles();
  const open = useSourceDrawer((st) => st.open);
  const price = rows.find((r) => r.id === 'R-price');
  const notice = rows.find((r) => r.id === 'R-notice');
  const payment = rows.find((r) => r.id === 'R-payment');
  const noticeTag = notice ? rowPriceTag(notice, cloudDeskDeal) : null;
  const noticeThreat = notice?.threats.find((t) => t.active && t.kind === 'version_change');
  const v4Payment = versionById('v4')?.clauses.find((c) => c.termKey === 'payment');
  const v4PaymentValue = v4Payment ? extractValue(v4Payment) : null;
  const paymentUnchanged = payment && v4PaymentValue && plainValue(v4PaymentValue) === plainValue(payment.position);

  const [compare, setCompare] = useState(false);
  const end = termEnd(cloudDeskDeal);
  const beforeEnd = (days: number) =>
    formatDateLong(new Date(Date.parse(end) - days * 86_400_000).toISOString());
  const oldClause = versions.find((v) => v.id === 'v3')?.clauses.find((c) => c.no === '14.2');
  const newClause = versions.find((v) => v.id === 'v4')?.clauses.find((c) => c.no === '14.2');

  return (
    <Block title="What was agreed in email · round 4" kind="new" accent>
      <div className={s.cardMeta}>14 Nov · {personName('rohan')}</div>
      <div className={s.quote} style={{ marginBottom: 8 }}>
        <div><strong>Email says:</strong> price fixed.</div>
        {noticeThreat && (
          <div><strong>File also changed:</strong> 14.2 now {plainValue(noticeThreat.value)} (not a tracked change).</div>
        )}
        {payment && (
          <div>
            <strong>Payment:</strong>{' '}
            {paymentUnchanged ? `unchanged (${plainValue(payment.position)})` : `v4 says ${plainValue(v4PaymentValue)}`}.
          </div>
        )}
      </div>

      {price && (
        <div className={s.termRow}>
          <div className={s.termHead}>
            <span className={s.termName}>{price.label}</span>
            <StateBadge state={price.state} />
          </div>
          <div className={s.termValue}>{plainValue(price.position)}</div>
          {price.source.kind === 'email' && <div className={s.quote}>“{price.source.quote}”</div>}
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
            {plainValue(notice.position)} → {plainValue(noticeThreat.value)} in v4, clause {noticeThreat.source.clauseNo}
          </div>
          <div className={s.tags}>
            <Badge appearance="outline" color="informative" size="small">
              Not mentioned in the email
            </Badge>
            <Badge appearance="filled" color="severe" size="small" icon={<EyeOffRegular />}>
              Not shown as a tracked change
            </Badge>
          </div>
          <RowMoney row={notice} />
          <div className={s.actions}>
            <Button size="small" data-tour="compare-14.2" aria-expanded={compare} onClick={() => setCompare(!compare)}>
              Compare clause 14.2
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
          <MoveBox row={notice} />
        </div>
      )}
    </Block>
  );
}

/** A row's share of the headline, with the once-per-renewal figure beside it when relevant. */
export function RowMoney({ row }: { row: LedgerRow }) {
  const s = usePaneStyles();
  const share = rowHeadlineShare(row, cloudDeskDeal);
  const gross = rowAtRisk(row, cloudDeskDeal);
  const tag = rowPriceTag(row, cloudDeskDeal);
  if (share === null) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <span className={s.money}>{formatLakh(share)}</span>{' '}
      <span className={s.moneySuffix}>{HEADLINE_SUFFIX}</span>
      {row.termKey === 'renewal_notice' && gross !== null && (
        <div className={s.grey}>
          {formatLakh(gross)} expected at the next renewal, spread over {cloudDeskDeal.termYears} years
          {tag?.exposureLakh !== undefined ? ` · gross exposure ${formatLakh(tag.exposureLakh)}` : ''}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Moment 2 — the side thread                                          */
/* ------------------------------------------------------------------ */

function SideThreadFlow({ rows, onDraftReply }: { rows: LedgerRow[]; onDraftReply: (body: string, opts?: DraftOptions) => void }) {
  const linked = useDemo((st) => st.linkedThreadIds).includes('T2');
  const dismissed = useDemo((st) => st.dismissedThreadIds).includes('T2');
  const vikramOff = useDemo((st) => st.settings.mailboxes.vikram === false);
  const credit = rows.find((r) => r.id === 'R-credit');

  return (
    <>
      {vikramOff && !linked && !dismissed && (
        <NotConnectedCard
          onAskCopy={() =>
            onDraftReply(ASK_COPY_DRAFT, {
              to: ['vikram.shah@meridian.example'],
              subject: 'CloudDesk: please copy deals@ on your uptime thread',
            })
          }
        />
      )}
      {(linked || dismissed) && <AutoLinkBar />}
      {credit?.state === 'needs_confirmation' && <ConfirmCreditCard row={credit} onDraftReply={onDraftReply} />}
      {credit?.state === 'agreed' && linked && <CreditConfirmedCard row={credit} />}
    </>
  );
}

/** The side thread is linked on its own (same supplier domain, Rohan named Vikram), with Undo. */
function AutoLinkBar() {
  const s = usePaneStyles();
  const linked = useDemo((st) => st.linkedThreadIds).includes('T2');
  const undo = useDemo((st) => st.undoLink);
  const toast = useDemo((st) => st.toast);
  const thread = threadById('T2');
  const t2Headers = allMessages.filter((m) => m.threadId === 'T2').map(toHeader);
  const match = matchThread(t2Headers, deals, versions);
  const SIGNALS: { label: string; on: boolean; weight: number }[] = [
    { label: 'Supplier domain on the thread', on: match.signals.supplierDomain, weight: SIGNAL_WEIGHTS.supplierDomain },
    { label: '“CloudDesk” in the subject', on: match.signals.subjectName, weight: SIGNAL_WEIGHTS.subjectName },
    { label: 'A known contract file attached', on: match.signals.fingerprint, weight: SIGNAL_WEIGHTS.fingerprint },
    { label: 'Deal ID inside an attachment', on: match.signals.dealIdTag, weight: SIGNAL_WEIGHTS.dealIdTag },
  ];

  if (!linked) {
    return (
      <MessageBar intent="info" style={{ marginBottom: 10 }}>
        <MessageBarBody>
          Side thread unlinked. Its body is not read, and nothing from it is in the ledger.
        </MessageBarBody>
      </MessageBar>
    );
  }

  return (
    <Block title="Side thread" kind="new">
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>
        <LinkRegular fontSize={14} /> Linked automatically: {thread?.subject}
      </div>
      <div className={s.cardMeta} style={{ marginBottom: 4 }}>
        {personName('vikram')} ↔ {personName('rohan')} · {formatDateShort('2026-11-15T09:40:00+05:30')} · same supplier domain, and Rohan names Vikram
      </div>
      <details>
        <summary style={{ fontSize: 11.5 }}>Match details · score {match.score.toFixed(1)}</summary>
        {SIGNALS.map((sig) => (
          <div key={sig.label} className={s.signal}>
            {sig.on ? (
              <CheckmarkCircleRegular fontSize={14} color={tokens.colorPaletteGreenForeground1} />
            ) : (
              <DismissRegular fontSize={14} color={tokens.colorNeutralForeground3} />
            )}
            <span style={{ color: sig.on ? undefined : tokens.colorNeutralForeground3 }}>{sig.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: tokens.colorNeutralForeground3 }}>
              {sig.on ? `+${sig.weight}` : '—'}
            </span>
          </div>
        ))}
      </details>
      <div className={s.actions}>
        <Button
          size="small"
          appearance="outline"
          icon={<ArrowUndoRegular />}
          onClick={() => {
            undo('T2');
            toast('Link undone. The side thread is treated as not this deal.');
          }}
        >
          Undo · not this deal
        </Button>
      </div>
    </Block>
  );
}

function ConfirmCreditCard({ row, onDraftReply }: { row: LedgerRow; onDraftReply: (body: string, opts?: DraftOptions) => void }) {
  const s = usePaneStyles();
  const confirmRow = useDemo((st) => st.confirmRow);
  const toast = useDemo((st) => st.toast);
  const [manual, setManual] = useState(false);
  const [choice, setChoice] = useState('');
  const [note, setNote] = useState('');

  const ourOffer = messageById('M7')!;
  const vikramOffer = messageById('M10')!;
  const gap = priceChange(cloudDeskDeal, CREDIT_10, CREDIT_5);

  return (
    <Block title="An ambiguous yes" kind="new" accent>
      <div className={s.termHead}>
        <span className={s.termName}>{row.label}</span>
        <StateBadge state="needs_confirmation" />
      </div>
      <p style={{ fontSize: 12.5, lineHeight: '18px', marginTop: 6 }}>
        Rohan wrote “{row.pendingConfirmation?.quote}”. Two offers were open:
      </p>
      <p className={s.quote}><strong>10%</strong> · you, {formatDateShort(ourOffer.sentAt)} · “{ourOffer.body}”</p>
      <p className={s.quote}><strong>5%</strong> · {personName('vikram')}, {formatDateShort(vikramOffer.sentAt)}, side thread · “{vikramOffer.body}”</p>
      <div style={{ marginTop: 8 }}>
        <span className={s.money}>{formatLakh(gap.costLakhPerYr)}</span>{' '}
        <span className={s.moneySuffix}>{HEADLINE_SUFFIX} if it is 5%</span>
      </div>
      <MoveBox row={row} />

      <div className={s.actions}>
        <Button
          size="small"
          appearance="primary"
          data-tour="send-clarification"
          onClick={() => onDraftReply(CLARIFY_DRAFT, { kind: 'clarify' })}
        >
          Send clarification
        </Button>
        <Button size="small" appearance="outline" onClick={() => setManual((v) => !v)}>
          I already confirmed it
        </Button>
      </div>
      <p className={s.grey}>The question goes in the supplier thread, so Rohan’s answer becomes the source.</p>

      {manual && (
        <div style={{ marginTop: 10 }}>
          <RadioGroup value={choice} onChange={(_, d) => setChoice(d.value)}>
            <Radio value="10" label={`10% (your offer, ${formatDateShort(ourOffer.sentAt)})`} />
            <Radio value="5" label={`5% (Vikram’s offer, ${formatLakh(gap.costLakhPerYr)} a year less)`} />
          </RadioGroup>
          <Field label="Note (optional)" style={{ marginTop: 6 }}>
            <Input size="small" value={note} placeholder="e.g. Confirmed with Rohan by phone" onChange={(_, d) => setNote(d.value)} />
          </Field>
          <div className={s.actions}>
            <Button
              size="small"
              appearance="primary"
              disabled={!choice}
              onClick={() => {
                confirmRow('R-credit', choice === '10' ? CREDIT_10 : CREDIT_5, note.trim() || undefined);
                toast('Service credit confirmed and written to the ledger.');
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </Block>
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
      <RowMoney row={price} />
      <MoveBox row={price} />
    </div>
  );
}

function SigningCopyCard({ rows }: { rows: LedgerRow[] }) {
  const s = usePaneStyles();
  const checkedAt = useDemo((st) => st.signing.checkedAt);
  const v6 = versionById('v6');
  if (!v6) return null;
  const result = signingCheck(rows, v6, cloudDeskDeal);
  const gaps = result.gaps.filter((g) => {
    const row = rows.find((r) => r.id === g.rowId);
    return row?.signing !== 'inserted' && row?.signing !== 'waived';
  });
  return (
    <Block title="Signing copy check" kind="new" accent>
      <div className={s.quote} style={{ marginBottom: 8 }}>
        <strong>Email says:</strong> “We&apos;ve accepted your changes.”
      </div>
      {checkedAt ? (
        <>
          <div style={{ fontSize: 12.5 }}>
            Checked on its own when the copy arrived: <strong>{gaps.length} gap{gaps.length === 1 ? '' : 's'}</strong>,{' '}
            {result.matches.length} terms match.
          </div>
          <div style={{ marginTop: 6 }}>
            <span className={s.money}>{formatLakh(dealAtRisk(rows, cloudDeskDeal))}</span>{' '}
            <span className={s.moneySuffix}>{HEADLINE_SUFFIX}</span>
          </div>
          {gaps.map((g) => (
            <div key={g.rowId} className={s.listRow}>
              <span className={s.listName}>
                <span style={{ display: 'block', fontWeight: 600 }}>{g.label}</span>
                <span className={s.listValue}>Agreed {g.agreedPlain} · copy says {g.docPlain}</span>
              </span>
            </div>
          ))}
          {gaps.some((g) => g.termKey === 'payment') && (
            <p className={s.grey}>v6 reverted payment terms to the 45 days of v3. v4 and v5 said 60.</p>
          )}
          <div className={s.actions}>
            <Link href="/word/v6?from=sirion" onClick={() => useDemo.getState().syncVersion('v6')}>
              <Button size="small" appearance="primary">Open signing check in Word</Button>
            </Link>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner size="tiny" /> <span style={{ fontSize: 12.5 }}>Checking the signing copy…</span>
        </div>
      )}
    </Block>
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
