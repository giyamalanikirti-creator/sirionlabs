'use client';

import type { ReactNode } from 'react';
import {
  Button,
  makeStyles,
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
  pane: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 },
  top: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '8px',
    ...shorthands.padding('12px', '20px'),
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
  bodyWrap: { flexGrow: 1, minHeight: 0, overflowY: 'auto', ...shorthands.padding('12px', '20px', '20px') },
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
}) {
  const s = useStyles();

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
        <div className={s.fieldRow}>
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
        <div className={s.fieldRow}>
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
            <span style={{ fontSize: 12.5, color: tokens.colorNeutralForeground4 }}>—</span>
          )}
        </div>
        <div className={s.fieldRow}>
          <span className={s.subject}>{subject}</span>
        </div>
        {attachments.length > 0 && (
          <div className={s.fieldRow}>
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

      <div className={s.toolbar}>
        <TextBoldRegular fontSize={16} />
        <TextItalicRegular fontSize={16} />
        <TextUnderlineRegular fontSize={16} />
        <TextBulletListRegular fontSize={16} />
        <AttachRegular fontSize={16} />
        <EmojiRegular fontSize={16} />
      </div>

      <div className={s.bodyWrap}>
        {chips}
        <Textarea
          value={value}
          onChange={(_, d) => onChange(d.value)}
          placeholder="Type your reply"
          resize="vertical"
          style={{ width: '100%', minHeight: 220 }}
          textarea={{ style: { fontSize: 14, lineHeight: '20px', minHeight: 200 } }}
        />
        {suggestions}
      </div>
    </section>
  );
}
