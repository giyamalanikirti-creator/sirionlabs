'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import {
  Button,
  makeStyles,
  mergeClasses,
  Persona,
  shorthands,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import {
  ChevronDownRegular,
  DeleteRegular,
  TextBoldRegular,
  TextBulletListRegular,
  TextItalicRegular,
  TextUnderlineRegular,
  AttachRegular,
  EmojiRegular,
  SendRegular,
} from '@fluentui/react-icons';
import { personByEmail } from '@/lib/data';

const useStyles = makeStyles({
  pane: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' },
  top: {
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: '8px',
    rowGap: '6px',
    ...shorthands.padding('8px', '20px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  fields: { ...shorthands.padding('4px', '20px') },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '8px',
    minHeight: '36px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke3),
  },
  compactFieldRow: { minHeight: '30px' },
  fieldLabel: { width: '28px', fontSize: '12.5px', color: tokens.colorNeutralForeground3 },
  subject: { fontSize: '13px', flexGrow: 1 },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '2px',
    ...shorthands.padding('6px', '16px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke3),
    color: tokens.colorNeutralForeground3,
  },
  bodyWrap: { flexGrow: 1, minHeight: 0, overflowY: 'auto', ...shorthands.padding('10px', '20px', '20px') },
  draftLabel: { display: 'block', fontWeight: tokens.fontWeightSemibold, marginBottom: '4px' },
});

export function Compose({
  to,
  cc,
  subject,
  value,
  onChange,
  onSend,
  onDiscard,
  sending,
  suggestions,
  attachments = [],
  chips,
  onRemoveAttachment,
  summary,
  notice,
  draftedBySirion = false,
}: {
  to: string[];
  cc: string[];
  subject: string;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onDiscard: () => void;
  sending: boolean;
  suggestions?: ReactNode;
  attachments?: string[];
  chips?: ReactNode;
  onRemoveAttachment?: (name: string) => void;
  /** Pre-send summary: recipient, attachment version, changes, still open. */
  summary?: { changes: string[]; stillOpen: string[] };
  /** A thin bar under the toolbar: check unavailable, or the sentence to edit (review fix C5). */
  notice?: ReactNode;
  draftedBySirion?: boolean;
}) {
  const s = useStyles();
  const fieldRow = mergeClasses(s.fieldRow, draftedBySirion && s.compactFieldRow);
  const editorId = useId();
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (draftedBySirion) editor.current?.focus({ preventScroll: true });
  }, [draftedBySirion]);

  return (
    <section className={s.pane}>
      <div className={s.top}>
        <Button
          appearance="primary"
          icon={<SendRegular />}
          data-tour="compose-send"
          onClick={onSend}
          disabled={sending || !value.trim()}
        >
          Send
        </Button>
        <Button appearance="primary" icon={<ChevronDownRegular />} style={{ minWidth: 32, paddingLeft: 6, paddingRight: 6 }} />
        <Button appearance="subtle" icon={<DeleteRegular />} onClick={onDiscard}>
          Discard
        </Button>
      </div>

      <div className={s.fields}>
        <div className={fieldRow}>
          <span className={s.fieldLabel}>To</span>
          {to.map((address) => (
            <Persona
              key={address}
              size="extra-small"
              name={personByEmail(address)?.name ?? address}
              secondaryText={address}
              avatar={{ color: 'colorful' }}
            />
          ))}
        </div>
        {(!draftedBySirion || cc.length > 0) && (
          <div className={fieldRow}>
            <span className={s.fieldLabel}>Cc</span>
            {cc.length ? (
              cc.map((address) => (
                <Persona
                  key={address}
                  size="extra-small"
                  name={personByEmail(address)?.name ?? address}
                  secondaryText={address}
                  avatar={{ color: 'colorful' }}
                />
              ))
            ) : (
              <span style={{ fontSize: 12.5, color: tokens.colorNeutralForeground4 }}>None</span>
            )}
          </div>
        )}
        <div className={fieldRow}>
          <span className={s.subject}>{subject}</span>
        </div>
        {attachments.length > 0 && (
          <div className={fieldRow}>
            {attachments.map((name) => (
              <span
                key={name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  padding: '4px 8px',
                  border: `1px solid ${tokens.colorNeutralStroke2}`,
                  borderRadius: 4,
                }}
              >
                <AttachRegular fontSize={14} /> {name}
                {onRemoveAttachment && (
                  <button aria-label={`Remove ${name}`} onClick={() => onRemoveAttachment(name)} style={{ border: 0, background: 'none', cursor: 'pointer', color: tokens.colorNeutralForeground3 }}>
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {notice}
      {!draftedBySirion && (
        <div className={s.toolbar}>
          <TextBoldRegular fontSize={16} />
          <TextItalicRegular fontSize={16} />
          <TextUnderlineRegular fontSize={16} />
          <TextBulletListRegular fontSize={16} />
          <AttachRegular fontSize={16} />
          <EmojiRegular fontSize={16} />
        </div>
      )}

      <div className={s.bodyWrap}>
        {draftedBySirion && <label htmlFor={editorId} className={s.draftLabel}>Sirion’s draft</label>}
        <Textarea
          id={editorId}
          ref={editor}
          aria-label={draftedBySirion ? undefined : 'Reply'}
          value={value}
          onChange={(_, d) => onChange(d.value)}
          placeholder="Type your reply"
          resize="vertical"
          style={{ width: '100%' }}
          textarea={{ style: { fontSize: 14, lineHeight: '20px', minHeight: draftedBySirion ? 132 : 200, fieldSizing: draftedBySirion ? 'content' : undefined } }}
        />
        {summary && (
          <div
            role="note"
            aria-label="Before you send"
            style={{ marginTop: 10, padding: '10px 12px', border: `1px solid ${tokens.colorBrandStroke2}`, borderRadius: 6, background: tokens.colorBrandBackground2, fontSize: 13, lineHeight: '19px' }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Before you send</div>
            <div>
              <span style={{ color: tokens.colorNeutralForeground3 }}>To</span> {to.map((a) => personByEmail(a)?.name ?? a).join(', ')}
              {attachments.length > 0 && (
                <>
                  {' · '}
                  <span style={{ color: tokens.colorNeutralForeground3 }}>Attachment</span> {attachments.join(', ')}
                </>
              )}
            </div>
            {summary.changes.length > 0 && (
              <div>
                <span style={{ color: tokens.colorNeutralForeground3 }}>Changes in this version</span> {summary.changes.join(' · ')}
              </div>
            )}
            <div>
              <span style={{ color: tokens.colorNeutralForeground3 }}>Still open</span> {summary.stillOpen.length ? summary.stillOpen.join(', ') : 'nothing'}
            </div>
          </div>
        )}
        {chips && <div style={{ marginTop: 10 }}>{chips}</div>}
        {suggestions}
      </div>
    </section>
  );
}
