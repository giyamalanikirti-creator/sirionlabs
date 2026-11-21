'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, useContext, useState } from 'react';
import { CLOUDDESK_AGREEMENTS, fileDecision } from '@/lib/engines/filing';

/**
 * The Outlook pane is built the way Sirion's own Outlook plugin is (match the
 * deal, file the attachment as a version, AI review, send for review or
 * approval, open in Word), with Deal Ledger's additions on top. Every block
 * says which of the two it is, so a viewer can see what is new.
 */
import Link from 'next/link';
import { Button, tokens } from '@fluentui/react-components';
import {
  ArrowUndoRegular,
  CheckmarkCircleFilled,
  DocumentRegular,
  WarningFilled,
} from '@fluentui/react-icons';
import { useDemo } from '@/lib/store';
import { Tag } from '@/components/ui/Tag';
import { cloudDeskDeal, personName, versionById, versions } from '@/lib/data';
import { playbookReview } from '@/lib/engines/playbook';
import { formatDateShort, formatLakh } from '@/lib/format';
import { COST_RULE, explainHeadline } from '@/lib/engines/explain';
import { CONTRACT_ID } from '@/lib/settings';
import type { EmailMessage, LedgerRow } from '@/lib/types';
import { recommendedMove } from '@/lib/engines/playbook';
import { usePaneStyles } from './paneStyles';
import { STEP_CLOCK } from '@/lib/demo/steps';

/** The shared origin tag (components/ui/Tag), so panes and the Sirion platform match. */
export function OriginTag({ kind }: { kind: 'today' | 'new' }) {
  return <Tag kind={kind} />;
}

/** Inside a BlockGroup the group carries the one origin tag, so cards do not repeat it (review fix C2). */
const GroupTagged = createContext(false);

export function BlockGroup({ kind, title, children }: { kind: 'today' | 'new'; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '6px 2px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colorNeutralForeground2 }}>{title}</span>
        <OriginTag kind={kind} />
      </div>
      <GroupTagged.Provider value>{children}</GroupTagged.Provider>
    </div>
  );
}

export function Block({
  title,
  kind,
  children,
  accent,
}: {
  title: string;
  kind: 'today' | 'new';
  children: React.ReactNode;
  accent?: boolean;
}) {
  const s = usePaneStyles();
  const grouped = useContext(GroupTagged);
  return (
    <section
      className={s.card}
      style={accent ? { borderColor: tokens.colorBrandStroke1, boxShadow: `inset 3px 0 0 ${tokens.colorBrandBackground}` } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span className={s.sectionLabel} style={{ margin: 0 }}>{title}</span>
        {!grouped && <OriginTag kind={kind} />}
      </div>
      {children}
    </section>
  );
}

/** Round number and whose turn, from the version history. */
export function roundOf(versionId: string): { round: number; turn: 'counterparty' | 'our' } {
  const ordered = [...versions].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const idx = ordered.findIndex((v) => v.id === versionId);
  const v = ordered[idx];
  return { round: idx + 1, turn: v?.author === 'supplier' ? 'counterparty' : 'our' };
}

/** 1 · Header: the matched deal and contract, and how the match was made. */
export function DealHeaderBlock({ message }: { message: EmailMessage }) {
  const s = usePaneStyles();
  const variant = useSearchParams().get('variant');
  const [chosen, setChosen] = useState<string>();
  const decision = fileDecision(message.from, variant === 'two-agreements' ? CLOUDDESK_AGREEMENTS : CLOUDDESK_AGREEMENTS.slice(0, 1));
  const synced = useDemo((st) => st.syncedVersionIds);
  const signedAt = useDemo((st) => st.signedAt);
  const current = [...versions]
    .filter((v) => synced.includes(v.id) || v.sentAt < STEP_CLOCK[0])
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
    .pop();
  const file = message.attachments.find((a) => a.dealIdTag);
  // Review fix C9: two open agreements on the same domain, and nothing in the file to tell them apart.
  if (decision.kind === 'choose' && !chosen) {
    return (
      <Block title="Matched deal" kind="new" accent>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Two open CloudDesk agreements. Choose one.</div>
        <div className={s.actions}>
          {decision.options.map((o) => (
            <Button key={o.contractId} size="small" appearance="outline" onClick={() => setChosen(o.contractId)}>
              {o.title} · {o.contractId}
            </Button>
          ))}
        </div>
        <div className={s.grey}>Matched by sender domain only, so nothing is filed until you choose.</div>
      </Block>
    );
  }
  return (
    <Block title="Matched deal" kind="today">
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        {cloudDeskDeal.supplier} renewal 2026-29
      </div>
      <div className={s.cardMeta} style={{ marginBottom: 4 }}>
        {cloudDeskDeal.dealIdTag} · {CONTRACT_ID} · {signedAt ? 'Signed' : cloudDeskDeal.stage === 'rounds' ? 'Negotiating' : 'Signing'} · current {current?.id ?? 'v1'}
      </div>
      <div className={s.grey}>
        Matched by sender domain ({cloudDeskDeal.supplierDomain})
        {file ? ' + Deal ID found in file' : ' + thread history'}
      </div>
    </Block>
  );
}

/** 2 · Attachment row: the supplier's file filed as the next version. Automatic, with Undo. Proposed: Sirion today offers Sync as a manual action (review fix A6). */
export function AttachmentBlock({ message }: { message: EmailMessage }) {
  const s = usePaneStyles();
  const synced = useDemo((st) => st.syncedVersionIds);
  const sync = useDemo((st) => st.syncVersion);
  const unsync = useDemo((st) => st.unsyncVersion);
  const files = message.attachments.filter((a) => a.versionId && versionById(a.versionId));
  if (!files.length) return null;
  return (
    <Block title="Attachment · filed on arrival" kind="new">
      {files.map((file) => {
        const versionId = file.versionId!;
        const { round, turn } = roundOf(versionId);
        const done = synced.includes(versionId);
        return (
          <div key={file.fileName}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
              <DocumentRegular fontSize={16} />
              <span style={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{file.fileName}</span>
            </div>
            <div className={s.grey} style={{ marginTop: 4 }}>
              {done ? (
                <>
                  <CheckmarkCircleFilled fontSize={12} color={tokens.colorPaletteGreenForeground1} /> Synced as {versionId} to {CONTRACT_ID}
                </>
              ) : (
                <>Not yet in Sirion</>
              )}{' '}
              · {turn === 'counterparty' ? 'counterparty turn' : 'our turn'} · round {round}
            </div>
            <div className={s.actions} style={{ marginTop: 6 }}>
              {done ? (
                <Button size="small" appearance="outline" icon={<ArrowUndoRegular />} onClick={() => unsync(versionId)}>
                  Undo
                </Button>
              ) : (
                <Button size="small" appearance="primary" onClick={() => sync(versionId)}>
                  Sync as {versionId}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </Block>
  );
}

/** 3 · AI review: IssueDetection's playbook summary of the attached draft. */
export function AiReviewBlock({ versionId }: { versionId: string }) {
  const s = usePaneStyles();
  const version = versionById(versionId);
  if (!version) return null;
  const lines = playbookReview(version);
  const out = lines.filter((l) => !l.within);
  return (
    <Block title="AI review · IssueDetection" kind="today">
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        {lines.length - out.length} of {lines.length} clauses within playbook
        {out.length ? ` · ${out.length} deviate${out.length === 1 ? 's' : ''}` : ''}
      </div>
      {lines.map((line) => (
        <div key={line.clauseNo} className={s.signal}>
          {line.within ? (
            <CheckmarkCircleFilled fontSize={13} color={tokens.colorPaletteGreenForeground1} />
          ) : (
            <WarningFilled fontSize={13} color={tokens.colorPaletteDarkOrangeForeground1} />
          )}
          <span style={{ fontSize: 11.5 }}>{line.text}</span>
        </div>
      ))}
      <p className={s.grey} style={{ marginTop: 6 }}>
        Checks the file against your playbook. It does not read the email.
      </p>
    </Block>
  );
}

/** 5 · Action row: Sirion's actions, plus Respond to round. */
export function ActionRow({
  versionId,
  onRespond,
  responded,
}: {
  versionId: string;
  onRespond?: () => void;
  responded?: boolean;
}) {
  const s = usePaneStyles();
  const requests = useDemo((st) => st.reviewRequests).filter((r) => r.versionId === versionId);
  const request = useDemo((st) => st.requestReview);
  const toast = useDemo((st) => st.toast);
  const sent = (kind: 'review' | 'approval') => requests.some((r) => r.kind === kind);
  return (
    <section className={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className={s.sectionLabel} style={{ margin: 0 }}>Actions</span>
      </div>
      <div className={s.actions} style={{ marginTop: 6 }}>
        <Button
          size="small"
          disabled={sent('review')}
          onClick={() => {
            request('review', versionId);
            toast(`${versionId} sent to ${personName('arjun')} (Legal) for review.`);
          }}
        >
          {sent('review') ? 'Sent for review' : 'Send for review'}
        </Button>
        <Button
          size="small"
          disabled={sent('approval')}
          onClick={() => {
            request('approval', versionId);
            toast(`${versionId} sent to ${personName('neha')} for approval.`);
          }}
        >
          {sent('approval') ? 'Sent for approval' : 'Send for approval'}
        </Button>
        <Link href={`/word/${versionId}?from=sirion`}>
          <Button size="small">Open in Word</Button>
        </Link>
      </div>
      <div className={s.grey} style={{ marginTop: 4 }}>
        <OriginTag kind="today" /> Review, approval and Word are in Sirion&apos;s plugin today.
      </div>
      {onRespond && (
        <div style={{ marginTop: 10 }}>
          <Button appearance="primary" data-tour="respond-round" style={{ width: '100%' }} onClick={onRespond}>
            {responded ? 'Reply drafted · open it again' : 'Respond to round'}
          </Button>
          <div className={s.grey} style={{ marginTop: 4 }}>
            <OriginTag kind="new" /> Drafts the reply and prepares the next version with tracked changes, in one step.
          </div>
          {responded && (
            <p className={s.note}>
              v5 is ready: clause 14.2 back to 30 days as a tracked change.{' '}
              <Link href="/word/v5">Open v5 in Word</Link>
            </p>
          )}
        </div>
      )}
      {requests.length > 0 && (
        <div className={s.grey} style={{ marginTop: 8 }}>
          {requests.map((r) => (
            <div key={r.kind}>
              {r.kind === 'review' ? 'Review' : 'Approval'} requested from {personName(r.personId)} · {formatDateShort(r.at)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Recommended move and the leverage behind it, for a flagged row. */
export function MoveBox({ row }: { row: LedgerRow }) {
  const move = recommendedMove(row, cloudDeskDeal);
  if (!move) return null;
  return (
    <div
      style={{
        marginTop: 8,
        padding: '8px 10px',
        borderRadius: 6,
        background: tokens.colorBrandBackground2,
        fontSize: 11.5,
        lineHeight: '16px',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>Recommended move</div>
      <div>{move.ask}</div>
      {move.fallback && (
        <div style={{ marginTop: 3 }}>
          <span style={{ color: tokens.colorNeutralForeground3 }}>Fallback · </span>
          {move.fallback}
        </div>
      )}
      {move.leverage && (
        <div style={{ marginTop: 3 }}>
          <span style={{ color: tokens.colorNeutralForeground3 }}>Leverage · </span>
          {move.leverage}
        </div>
      )}
    </div>
  );
}

/** The pane version of "How is this worked out?": the rule, each row in one sentence, the total and the risks outside it. */
export function PaneHeadlineExplainer({ rows, label = 'How is this worked out?' }: { rows: LedgerRow[]; label?: string }) {
  const s = usePaneStyles();
  const x = explainHeadline(rows, cloudDeskDeal);
  return (
    <details style={{ marginTop: 6 }}>
      <summary style={{ fontSize: 11.5, cursor: 'pointer', color: tokens.colorBrandForeground1 }}>{label}</summary>
      <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: '16px' }}>
        <div style={{ background: tokens.colorNeutralBackground3, borderRadius: 4, padding: '6px 8px', marginBottom: 6 }}>
          <div style={{ fontWeight: 600 }}>{COST_RULE[0]}</div>
          <div style={{ color: tokens.colorNeutralForeground3 }}>{COST_RULE[1]}</div>
        </div>
        <div style={{ fontWeight: 600 }}>{formatLakh(x.totalLakh)} a year if signed as is (expected)</div>
        {x.lines.map((l) => (
          <p key={l.rowId} style={{ margin: '4px 0' }}>
            <strong>{l.label}:</strong> {l.summary} {l.proof[0]} → <strong>{formatLakh(l.shareLakh)} a year</strong>.
          </p>
        ))}
        <p style={{ margin: '4px 0', color: tokens.colorNeutralForeground3 }}>
          {x.totalText}
          {x.notPriced.length ? ` Not priced: ${x.notPriced.join(', ')}.` : ''}
        </p>
        {x.otherRisks.length > 0 && (
          <>
            <p className={s.sectionLabel}>Other risks, not in the figure</p>
            {x.otherRisks.map((r, i) => (
              <p key={i} style={{ margin: '0 0 4px' }}>
                <strong>{r.label}.</strong> {r.text}
              </p>
            ))}
          </>
        )}
      </div>
    </details>
  );
}
