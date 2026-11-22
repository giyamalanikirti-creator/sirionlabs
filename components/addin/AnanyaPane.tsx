'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { CLARIFY_DRAFT } from '@/lib/engines/wording';
import { roundReply, roundSummary } from '@/lib/engines/replyCopy';
import { STEP_CLOCK } from '@/lib/demo/steps';
import { formatDay, renewalDates } from '@/lib/engines/dates';
import { BasisTag } from '@/components/ui/Tag';
import { termStatuses } from '@/lib/engines/termStatus';
import { asOfLine, copyReconciliation, dealReconciliation, headlineLabel, latestVersionId } from '@/lib/engines/headline';
import { signingCheck } from '@/lib/engines/signing';
import { rowHeadlineShare } from '@/lib/engines/playbook';
import { HEADLINE_SUFFIX } from '@/lib/format';
import { NotConnectedCard, TrackedBanner, ASK_COPY_DRAFT } from './ConnectPanes';
import { ActionRow, AiReviewBlock, AttachmentBlock, Block, BlockGroup, DealHeaderBlock, MoveBox, OriginTag, PaneHeadlineExplainer } from './SirionBlocks';
import { formatLakh, formatDateShort } from '@/lib/format';
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
  /** Shown above Send: what this version changes and what is still open (review fix A1). */
  summary?: { changes: string[]; stillOpen: string[] };
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
  const clock = useDemo((st) => st.clock);
  const synced = useDemo((st) => st.syncedVersionIds);
  const signedAt = useDemo((st) => st.signedAt);
  const latest = latestVersionId({ clock, syncedVersionIds: synced, signedAt });
  const recon = dealReconciliation(rows, cloudDeskDeal);
  const roundReviewed = useDemo((state) => Boolean(state.readerRuns.M8));
  const responded = useDemo((st) => st.respondedMessageIds.includes('M8'));
  const respond = useDemo((st) => st.respondToRound);
  const toast = useDemo((st) => st.toast);
  const notices = useDemo((st) => st.notices).filter((n) => n.forPersonId === 'ananya');
  const message = openMessageId ? messageById(openMessageId) : undefined;
  const versionId = message?.attachments.find((a) => a.versionId)?.versionId;

  const showRound = !busy && openMessageId === 'M8';
  const m8 = showRound && roundReviewed;
  const unchangedCount = termStatuses(rows, versionById('v4')!, cloudDeskDeal).filter((t) => t.matchesAgreed).length;

  const respondToRound = () => {
    respond('M8');
    const reply = roundReply({ rows, prev: versionById('v4')!, attached: versionById('v5')!, roundMessageId: 'M8', deal: cloudDeskDeal, greeting: 'Rohan', signOff: 'Ananya' });
    onDraftReply(reply.body, {
      kind: 'respond',
      attachVersionId: 'v5',
      summary: { changes: reply.changes.map((c) => `§${c.clauseNo} ${c.label.toLowerCase()}: ${c.from} → ${c.to}`), stillOpen: reply.stillOpen.map((o) => o.label.toLowerCase()) },
    });
    toast('Reply drafted, with v5 attached: clause 14.2 restored as a tracked change.');
  };

  return (
    <div style={{ position: 'relative' }}>
      <TrackedBanner />
      {/* The ready-to-sign email leads with its one action (review fix B3). */}
      {!busy && openMessageId === 'M14' && <SigningCopyCard rows={rows} />}
      {showRound && <RoundFourCard rows={rows} onRespond={respondToRound} responded={responded} />}
      {!busy && (openMessageId === 'M12' || openMessageId === 'M12R') && <SideThreadFlow rows={rows} onDraftReply={onDraftReply} />}
      {message && !m8 && <DealHeaderBlock message={message} />}

      <section className={s.card} style={{ borderColor: tokens.colorBrandStroke1, boxShadow: `inset 3px 0 0 ${tokens.colorBrandBackground}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span className={s.sectionLabel} style={{ margin: 0 }}>Across the deal</span>
          <OriginTag kind="new" />
        </div>
        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 28, lineHeight: '34px', fontWeight: 600, color: tokens.colorBrandForeground1 }}>
            {busy || openMessageId === 'M8' && !roundReviewed ? 'Updating…' : formatLakh(atRisk)}
          </span>{' '}
          <span className={s.moneySuffix}>a year (expected)</span>
        </div>
        {!(busy || openMessageId === 'M8' && !roundReviewed) && (
          <div style={{ fontSize: 12, lineHeight: '17px', color: tokens.colorNeutralForeground2 }}>
            <div>{headlineLabel('deal', atRisk, latest)}</div>
            <div style={{ color: tokens.colorNeutralForeground3 }}>{recon.text} · {asOfLine(clock, latest)}</div>
          </div>
        )}
        {!busy && <PaneHeadlineExplainer rows={rows} />}
      </section>

      {notices.map((n, i) => (
        <MessageBar key={i} intent="warning" style={{ marginBottom: 10 }}>
          <MessageBarBody>
            <MessageBarTitle>{n.title ?? "CloudDesk term needs review"}</MessageBarTitle>
            {n.text}
            {n.rowId && <p><Link href={`/deals/D-CLOUDDESK?row=${n.rowId}#${n.rowId}`}>Open the term in the ledger</Link></p>}
          </MessageBarBody>
        </MessageBar>
      ))}

      {message && !m8 && <AttachmentBlock message={message} />}
      {versionId && versionId !== 'v6' && !m8 && <AiReviewBlock versionId={versionId} />}
      {m8 && message && (
        <details className={s.card}>
          <summary style={{ fontSize: 12.5, cursor: 'pointer' }}>
            Filed to CloudDesk · v4 · {unchangedCount} terms unchanged
          </summary>
          <BlockGroup kind="today" title="Sirion for Outlook">
            <DealHeaderBlock message={message} />
            <AttachmentBlock message={message} />
            {versionId && <AiReviewBlock versionId={versionId} />}
          </BlockGroup>
        </details>
      )}

      {busy && (
        <div className={s.card} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Spinner size="tiny" />
          <span style={{ fontSize: 12.5 }}>Reading this round…</span>
        </div>
      )}

      {!busy && openMessageId === 'M13' && <NewAskCard rows={rows} />}

      {showRound && <ActionRow versionId="v4" />}

      <ReaderPreview />

      <details className={s.card}>
        <summary>All {rows.length} terms on this deal</summary>
        <LedgerList rows={rows} />
      </details>
      <p style={{ margin: '2px 2px 8px', fontSize: 12.5 }}>
        <Link href="/deals/D-CLOUDDESK" style={{ color: '#0C5E69', fontWeight: 600 }}>Negotiation so far →</Link>
      </p>

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

function RoundFourCard({ rows, onRespond, responded }: { rows: LedgerRow[]; onRespond: () => void; responded: boolean }) {
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
  const v4Notice = versionById('v4')?.clauses.find((c) => c.termKey === 'renewal_notice');
  const v4NoticeValue = v4Notice ? extractValue(v4Notice) : null;
  const v4Dates = renewalDates({ end: termEnd(cloudDeskDeal), noticeDays: v4NoticeValue?.kind === 'renewal_notice' ? v4NoticeValue.days : 30 });
  const summary = roundSummary({ rows, prev: versionById('v3')!, next: versionById('v4')!, roundMessageId: 'M8', from: personName('rohan').split(' ')[0], deal: cloudDeskDeal });
  const oldClause = versions.find((v) => v.id === 'v3')?.clauses.find((c) => c.no === '14.2');
  const newClause = versions.find((v) => v.id === 'v4')?.clauses.find((c) => c.no === '14.2');

  return (
    <Block title="What was agreed in email · round 4" kind="new" accent>
      <div className={s.cardMeta}>{formatDateShort(STEP_CLOCK[1])} · {personName('rohan')}</div>
      {/* Review fix C2: one sentence and one button first; the rest is disclosure. */}
      <p style={{ fontSize: 13.5, lineHeight: '19px', fontWeight: 600, margin: '4px 0 8px' }}>{summary.text}</p>
      <div className={s.actions} style={{ marginTop: 0 }}>
        {noticeThreat && (
          <Button size="small" data-tour="compare-14.2" data-ask-avoid aria-expanded={compare} onClick={() => setCompare(!compare)}>
            Compare §14.2
          </Button>
        )}
        <Button size="small" appearance="primary" data-tour="respond-round" data-ask-avoid onClick={onRespond}>
          {responded ? 'Reopen Sirion’s draft' : 'Respond to round'}
        </Button>
      </div>
      {responded && (
        <p className={s.note}>
          v5 is ready: clause 14.2 back to 30 days as a tracked change.{' '}
          <Link href="/word/v5">Open v5 in Word</Link>
        </p>
      )}
      {compare && noticeThreat && (
        <div className={s.quote}>
          <BasisTag basis="supplier" supplier={cloudDeskDeal.supplier} />
          <p>Agreed · {oldClause?.text.split('30').map((part, index) => index ? <span key={index}><mark>30</mark>{part}</span> : part)}</p>
          <p>v4 · {newClause?.text.split('90').map((part, index) => index ? <span key={index}><mark>90</mark>{part}</span> : part)}</p>
          <dl>
            <dt>Contract end</dt><dd>{formatDay(v4Dates.end)}</dd>
            <dt>Last day to give notice in v4</dt><dd>{formatDay(v4Dates.lastNoticeDay)}{v4Dates.deadlineFlag ? ` · ${v4Dates.deadlineFlag}` : ''}</dd>
            <dt>Internal reminder in v4 · 45 days earlier</dt><dd>{formatDay(v4Dates.reminder)}</dd>
          </dl>
        </div>
      )}

      <details style={{ marginTop: 6 }}>
        <summary style={{ fontSize: 12, cursor: 'pointer' }}>Term details{payment ? ` · payment ${paymentUnchanged ? 'unchanged' : `v4 says ${plainValue(v4PaymentValue)}`}` : ''}</summary>
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
          {noticeTag && <details><summary>How calculated</summary>{noticeTag.proof.map((line) => <p key={line}>{line}</p>)}</details>}
          <MoveBox row={notice} />
        </div>
      )}
      </details>
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
  const openSource = useSourceDrawer((st) => st.open);
  const confirmed = useDemo((st) => st.tourClicks.includes('confirm-link-T2'));
  const markTour = useDemo((st) => st.markTour);
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

  const evidence = messageById('M9');
  const quote = evidence?.body.split(/(?<=[.?!])\s/).find((x) => /credit|uptime|vikram/i.test(x)) ?? evidence?.body;

  if (confirmed) {
    return (
      <div className={s.card} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
        <LinkRegular fontSize={14} /> <span style={{ flex: 1 }}>{thread?.subject} · linked to CloudDesk MSA</span>
        <OriginTag kind="new" />
        <Button size="small" appearance="subtle" icon={<ArrowUndoRegular />} onClick={() => { undo('T2'); toast('Link undone. The side thread is treated as not this deal.'); }}>
          Undo
        </Button>
      </div>
    );
  }

  // Review fix C4: evidence and a question, not a match score.
  return (
    <Block title="Side thread" kind="new" accent>
      <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: '19px' }}>
        Rohan mentions Vikram. Is this uptime thread part of CloudDesk?
      </div>
      {evidence && (
        <p className={s.quote} style={{ marginTop: 6 }}>
          Rohan to Vikram, {formatDateShort(evidence.sentAt)}: “{quote}”{' '}
          <Button size="small" appearance="transparent" onClick={() => openSource({ kind: 'email', messageId: evidence.id, quote: quote ?? '', at: evidence.sentAt, byPersonId: 'rohan' }, true)}>
            Source
          </Button>
        </p>
      )}
      <details>
        <summary style={{ fontSize: 11.5 }}>Why it was suggested</summary>
        {SIGNALS.map((sig) => (
          <div key={sig.label} className={s.signal}>
            {sig.on ? (
              <CheckmarkCircleRegular fontSize={14} color={tokens.colorPaletteGreenForeground1} />
            ) : (
              <DismissRegular fontSize={14} color={tokens.colorNeutralForeground3} />
            )}
            <span style={{ color: sig.on ? undefined : tokens.colorNeutralForeground3 }}>{sig.label}</span>
          </div>
        ))}
      </details>
      <div className={s.actions}>
        <Button size="small" appearance="primary" onClick={() => { markTour('confirm-link-T2'); toast('Linked to CloudDesk MSA. Only this thread is read.'); }}>
          Link to CloudDesk MSA
        </Button>
        <Button size="small" appearance="outline" onClick={() => { undo('T2'); toast('Marked not related. Its body is not read.'); }}>
          Not related
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
        <div className={s.quote} style={{ margin: 0 }}>Ananya asked for <strong>10%</strong> ({formatDateShort(ourOffer.sentAt)})</div>
        <div className={s.quote} style={{ margin: 0 }}>Vikram offered <strong>5%</strong> ({formatDateShort(vikramOffer.sentAt)})</div>
      </div>
      <p style={{ fontSize: 12.5, lineHeight: '18px', marginTop: 6 }}>
        Rohan replied “{row.pendingConfirmation?.quote}” ({formatDateShort(row.pendingConfirmation?.messageId ? messageById(row.pendingConfirmation.messageId)?.sentAt ?? row.source.at : row.source.at)}). It isn&apos;t clear which offer he means.
      </p>
      <div className={s.actions}>
        <Button
          size="small"
          appearance="primary"
          data-tour="send-clarification"
          data-ask-avoid
          onClick={() => onDraftReply(CLARIFY_DRAFT, { kind: 'clarify' })}
        >
          Draft clarification
        </Button>
        <Button size="small" appearance="outline" onClick={() => setManual((v) => !v)}>
          I already confirmed it
        </Button>
      </div>
      <p className={s.grey}>Review the draft in the supplier thread before sending. Rohan’s answer becomes the source.</p>
      <p style={{ fontSize: 12.5, margin: '8px 0 0' }}>Status: <strong>Supplier response ambiguous</strong></p>
      <div style={{ marginTop: 8 }}>
        <span className={s.money}>{formatLakh(gap.costLakhPerYr)}</span>{' '}
        <span className={s.moneySuffix}>{HEADLINE_SUFFIX} if it is 5%</span>
      </div>
      <MoveBox row={row} />

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
          <div className={s.actions}>
            <Link href="/word/v6?from=sirion&clause=9.3" data-tour="quick-check" data-ask-avoid onClick={() => useDemo.getState().syncVersion('v6')}>
              <Button size="small" appearance="primary">Check signing copy in Word</Button>
            </Link>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className={s.money}>{formatLakh(copyReconciliation(gaps, cloudDeskDeal).totalLakh)}</span>{' '}
            <span className={s.moneySuffix}>a year (expected)</span>
          </div>
          <div className={s.grey}>
            {headlineLabel('draft', copyReconciliation(gaps, cloudDeskDeal).totalLakh, 'v6')} · {copyReconciliation(gaps, cloudDeskDeal).text}
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
          <span style={{ fontSize: 12, fontWeight: 500, color: '#5B6D71', letterSpacing: '0.04em' }}>
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
