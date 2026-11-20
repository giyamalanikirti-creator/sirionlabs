'use client';

/**
 * Deal Ledger for Word, on top of Sirion's Word add-in.
 *
 *  Review and Approve live in WordReview.tsx.
 *  Draft    (new)    edit guard as you type, and insert the agreed wording
 *  Compare  (new)    round compare, each change tagged with what the email said
 */
import { useState } from 'react';
import { Badge, Button, Dropdown, Option, tokens } from '@fluentui/react-components';
import { CheckmarkCircleFilled, ErrorCircleFilled, QuestionCircleFilled, WarningFilled } from '@fluentui/react-icons';
import { cloudDeskDeal, messageById, personByEmail, personName, versions } from '@/lib/data';
import { compareWithEmail, guardClauseEdit, lensForVersion, type LensStatus } from '@/lib/engines/wordLens';
import { agreedWording } from '@/lib/engines/wording';
import { approvalRoute } from '@/lib/engines/approvals';
import { formatDateLong, formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import type { Clause, DocVersion, LedgerRow } from '@/lib/types';
import { OriginTag } from './SirionBlocks';
import { usePaneStyles } from './paneStyles';

export const STATUS_TEXT: Record<LensStatus, string> = {
  matches: 'Matches what was agreed',
  differs: 'Differs from what was agreed',
  pending: 'Agreed value not confirmed yet',
  unreadable: 'Could not read this clause',
};

export function StatusIcon({ status }: { status: LensStatus }) {
  if (status === 'matches') return <CheckmarkCircleFilled fontSize={14} color={tokens.colorPaletteGreenForeground1} />;
  if (status === 'differs') return <ErrorCircleFilled fontSize={14} color={tokens.colorPaletteRedForeground1} />;
  if (status === 'pending') return <WarningFilled fontSize={14} color={tokens.colorPaletteMarigoldForeground1} />;
  return <QuestionCircleFilled fontSize={14} color={tokens.colorNeutralForeground3} />;
}

/** Keep the rest of the clause when the operative sentence is replaced. */
export function withAgreedWording(clause: Clause, row: LedgerRow): string {
  const first = clause.text.indexOf('. ');
  const tail = first >= 0 ? clause.text.slice(first + 1) : '';
  return agreedWording(row.termKey, row.position) + tail;
}

/* ------------------------------------------------------------------ */
/* Draft: edit guard and insert from ledger                            */
/* ------------------------------------------------------------------ */

export function DraftTab({
  version,
  rows,
  localEdits,
  editing,
  editText,
  onStartEdit,
  onEditText,
  onCommit,
  onCancel,
  onRevert,
  onInsert,
  onGoTo,
}: {
  version: DocVersion;
  rows: LedgerRow[];
  localEdits: Record<string, string>;
  editing?: string;
  editText: string;
  onStartEdit: (no: string) => void;
  onEditText: (t: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onRevert: (no: string) => void;
  onInsert: (no: string, text: string, rowId: string) => void;
  onGoTo: (no: string) => void;
}) {
  const s = usePaneStyles();
  const clause = editing ? version.clauses.find((c) => c.no === editing) : undefined;
  const live = clause ? guardClauseEdit(clause, editText, rows, cloudDeskDeal) : null;
  const route = live?.status === 'differs' ? approvalRoute(rows.find((r) => r.id === live.rowId)!, live.costLakhPerYr) : null;
  const working = { ...version, clauses: version.clauses.map((c) => (localEdits[c.no] ? { ...c, text: localEdits[c.no] } : c)) };
  const lens = lensForVersion(working, rows, cloudDeskDeal);

  return (
    <div>
      <section className={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span className={s.sectionLabel} style={{ margin: 0 }}>Edit guard</span>
          <OriginTag kind="new" />
        </div>
        {!clause ? (
          <p className={s.note} style={{ marginTop: 6 }}>
            Click any clause in the document to edit it. Each edit is checked against what was agreed in email as you type, before
            the file goes to CloudDesk.
          </p>
        ) : (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Editing {clause.no} · {clause.title}</div>
            {live ? (
              <div
                style={{
                  marginTop: 6,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: live.status === 'differs' ? tokens.colorPaletteRedBackground1 : live.status === 'matches' ? tokens.colorPaletteGreenBackground1 : tokens.colorNeutralBackground3,
                  fontSize: 12,
                  lineHeight: '17px',
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}>
                  <StatusIcon status={live.status} /> {STATUS_TEXT[live.status]}
                </div>
                {live.status === 'differs' && (
                  <>
                    <div>Agreed {live.agreedPlain.toLowerCase()} · your edit says {live.docPlain.toLowerCase()}</div>
                    {live.costLakhPerYr !== null && (
                      <div>
                        <strong>{formatLakh(live.costLakhPerYr)}</strong> {HEADLINE_SUFFIX}
                        {live.costNote ? ` (${live.costNote})` : ''}
                      </div>
                    )}
                    <div style={{ color: tokens.colorNeutralForeground3 }}>Source: {live.source}</div>
                    {route && <div style={{ color: tokens.colorNeutralForeground3 }}>Sending this would need approval: {personName(route.approverId)} ({route.rule}).</div>}
                  </>
                )}
                {live.status === 'unreadable' && <div>Deal Ledger cannot read a value from this text; it will ask a person before the file goes out.</div>}
              </div>
            ) : (
              <p className={s.grey}>This clause is not a term the ledger tracks.</p>
            )}
            <div className={s.actions}>
              <Button size="small" appearance="primary" onClick={onCommit}>Keep as tracked change</Button>
              {live?.status === 'differs' && (
                <Button size="small" onClick={() => onEditText(withAgreedWording({ ...clause, text: clause.text }, rows.find((r) => r.id === live.rowId)!))}>
                  Use agreed wording
                </Button>
              )}
              <Button size="small" appearance="subtle" onClick={onCancel}>Cancel</Button>
            </div>
          </div>
        )}
        {Object.keys(localEdits).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p className={s.sectionLabel}>Your tracked changes in this file</p>
            {Object.keys(localEdits).map((no) => {
              const l = lens.find((x) => x.clauseNo === no);
              return (
                <div key={no} className={s.listRow}>
                  <span className={s.listName} onClick={() => onGoTo(no)} style={{ cursor: 'pointer' }}>
                    <span style={{ fontWeight: 600 }}>{no}</span> {l ? `· ${STATUS_TEXT[l.status].toLowerCase()}` : ''}
                  </span>
                  <Button size="small" appearance="subtle" onClick={() => onStartEdit(no)}>Edit</Button>
                  <Button size="small" appearance="subtle" onClick={() => onRevert(no)}>Revert</Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span className={s.sectionLabel} style={{ margin: 0 }}>Insert from ledger</span>
          <OriginTag kind="new" />
        </div>
        <p className={s.grey} style={{ marginTop: 4 }}>
          Next to Sirion&apos;s Content Library: the exact wording of what was agreed, with a supplier-safe comment.
        </p>
        {lens.map((l) => {
          const row = rows.find((r) => r.id === l.rowId)!;
          const c = working.clauses.find((x) => x.no === l.clauseNo)!;
          return (
            <div key={l.clauseNo} className={s.listRow} style={{ alignItems: 'flex-start' }}>
              <span style={{ marginTop: 2 }}><StatusIcon status={l.status} /></span>
              <span className={s.listName}>
                <span style={{ display: 'block', fontWeight: 600 }}>{row.label}: {plainValue(row.position, cloudDeskDeal.termYears)}</span>
                <span className={s.listValue}>{l.source}</span>
              </span>
              <Button size="small" disabled={l.status !== 'differs'} onClick={() => onInsert(c.no, withAgreedWording(c, row), row.id)}>
                {l.status === 'differs' ? 'Insert' : 'Matches'}
              </Button>
            </div>
          );
        })}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compare rounds, with the email                                      */
/* ------------------------------------------------------------------ */

export function CompareTab({ version, rows, onGoTo }: { version: DocVersion; rows: LedgerRow[]; onGoTo: (no: string) => void }) {
  const s = usePaneStyles();
  const earlier = versions.filter((v) => v.sentAt < version.sentAt).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const [prevId, setPrevId] = useState(earlier[0]?.id);
  const prev = earlier.find((v) => v.id === prevId);
  if (!prev) return <p className={s.note}>This is the first version; there is nothing to compare with.</p>;
  const changes = compareWithEmail(prev, version, rows, cloudDeskDeal);
  return (
    <div>
      <div className={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span className={s.sectionLabel} style={{ margin: 0 }}>Compare versions</span>
          <OriginTag kind="today" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12.5 }}>
          {version.id} against
          <Dropdown size="small" value={prev.id} selectedOptions={[prev.id]} onOptionSelect={(_, d) => d.optionValue && setPrevId(d.optionValue)} style={{ minWidth: 90 }}>
            {earlier.map((v) => (
              <Option key={v.id} value={v.id}>{v.id}</Option>
            ))}
          </Dropdown>
        </div>
        <p className={s.grey} style={{ marginTop: 6 }}>
          <OriginTag kind="new" /> Each change is tagged with what the email that came with {version.id} said, and checked against the ledger.
        </p>
      </div>
      {changes.length === 0 && <p className={s.note}>No clause changed between {prev.id} and {version.id}.</p>}
      {changes.map((c) => {
        const email = c.email ? messageById(c.email.messageId) : undefined;
        return (
          <div key={c.clauseNo} className={s.card} onClick={() => onGoTo(c.clauseNo)} style={{ cursor: 'pointer' }}>
            <div className={s.termHead}>
              <span className={s.termName}>{c.clauseNo} · {c.label}</span>
              {c.vsLedger && <StatusIcon status={c.vsLedger} />}
            </div>
            <div className={s.termValue}>{c.beforePlain} → {c.afterPlain}</div>
            <div className={s.tags}>
              <Badge size="small" appearance={c.tag === 'discussed in email' ? 'outline' : 'filled'} color={c.tag === 'discussed in email' ? 'informative' : 'warning'}>
                {c.tag}
              </Badge>
              {c.hidden && <Badge size="small" appearance="filled" color="severe">not a tracked change</Badge>}
            </div>
            {c.email && email && (
              <div className={s.quote}>
                {personByEmail(email.from)?.name ?? email.from}, {formatDateLong(email.sentAt)}: “{c.email.quote}”
              </div>
            )}
            {c.costLakhPerYr !== null && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <strong style={{ color: tokens.colorPaletteRedForeground1 }}>{formatLakh(c.costLakhPerYr)}</strong> {HEADLINE_SUFFIX}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
