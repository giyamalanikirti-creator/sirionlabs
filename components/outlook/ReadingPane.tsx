'use client';

import { useRouter } from 'next/navigation';
import {
  Avatar,
  Button,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowForwardRegular,
  ArrowReplyAllRegular,
  ArrowReplyRegular,
  ChevronRightRegular,
  DocumentRegular,
  MoreHorizontalRegular,
} from '@fluentui/react-icons';
import type { EmailMessage } from '@/lib/types';
import { personByEmail } from '@/lib/data';
import { formatDateTime } from '@/lib/format';

const useStyles = makeStyles({
  pane: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  inner: { ...shorthands.padding('20px'), maxWidth: '920px' },
  subjectRow: {
    flexWrap: 'wrap',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    columnGap: '16px',
  },
  subject: { fontSize: '20px', fontWeight: tokens.fontWeightSemibold, lineHeight: '26px' },
  actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '2px', flexShrink: 0 },
  senderBlock: { display: 'flex', columnGap: '12px', marginTop: '18px' },
  senderBody: { flexGrow: 1, minWidth: 0 },
  senderRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', columnGap: '12px' },
  senderName: { fontSize: '14px', fontWeight: tokens.fontWeightSemibold },
  senderEmail: { fontSize: '12.5px', color: tokens.colorNeutralForeground3, marginLeft: '6px' },
  date: { fontSize: '12px', color: tokens.colorNeutralForeground3, flexShrink: 0 },
  recipients: { fontSize: '12.5px', color: tokens.colorNeutralForeground3, marginTop: '2px' },
  attachments: { display: 'flex', flexWrap: 'wrap', columnGap: '10px', rowGap: '10px', marginTop: '16px' },
  attachment: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '10px',
    width: '240px',
    height: '56px',
    ...shorthands.padding('0', '10px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('4px'),
    cursor: 'pointer',
    backgroundColor: tokens.colorNeutralBackground1,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  attachmentBody: { minWidth: 0, flexGrow: 1 },
  attachmentName: {
    fontSize: '12.5px',
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    textOverflow: 'ellipsis',
  },
  attachmentSize: { fontSize: '11.5px', color: tokens.colorNeutralForeground3 },
  bodyText: {
    marginTop: '20px',
    fontSize: '14px',
    lineHeight: '20px',
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'pre-wrap',
  },
  empty: {
    display: 'flex',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
  },
});

export function ReadingPane({
  message,
  onReply,
  onReplyAll,
}: {
  message?: EmailMessage;
  onReply: () => void;
  onReplyAll: () => void;
}) {
  const s = useStyles();
  const router = useRouter();

  if (!message) {
    return (
      <section className={s.pane}>
        <div className={s.empty}>Select an item to read it.</div>
      </section>
    );
  }

  const from = personByEmail(message.from);

  return (
    <section className={s.pane}>
      <div className={s.inner}>
        <div className={s.subjectRow}>
          <h1 className={s.subject}>{message.subject}</h1>
          <div className={s.actions}>
            <Button appearance="subtle" size="small" icon={<ArrowReplyRegular />} onClick={onReply}>
              Reply
            </Button>
            <Button appearance="subtle" size="small" icon={<ArrowReplyAllRegular />} onClick={onReplyAll}>
              Reply all
            </Button>
            <Button appearance="subtle" size="small" icon={<ArrowForwardRegular />} disabled>
              Forward
            </Button>
            <Button appearance="subtle" size="small" icon={<MoreHorizontalRegular />} aria-label="More actions" disabled />
          </div>
        </div>

        <div className={s.senderBlock}>
          <Avatar name={from?.name ?? message.from} size={40} color="colorful" />
          <div className={s.senderBody}>
            <div className={s.senderRow}>
              <span>
                <span className={s.senderName}>{from?.name ?? message.from}</span>
                <span className={s.senderEmail}>&lt;{message.from}&gt;</span>
              </span>
              <span className={s.date}>{formatDateTime(message.sentAt)}</span>
            </div>
            <div className={s.recipients}>To: {message.to.join('; ')}</div>
            {message.cc.length > 0 && <div className={s.recipients}>Cc: {message.cc.join('; ')}</div>}
          </div>
        </div>

        {message.attachments.length > 0 && (
          <div className={s.attachments}>
            {message.attachments.map((a) => (
              <div
                key={a.fileName}
                className={s.attachment}
                onClick={() => {
                  if (a.versionId) router.push(`/word/${a.versionId}?from=attachment`);
                }}
                title={a.versionId ? 'Open in Word' : undefined}
              >
                <DocumentRegular fontSize={24} color={tokens.colorBrandForeground1} />
                <div className={s.attachmentBody}>
                  <div className={s.attachmentName}>{a.fileName}</div>
                  <div className={s.attachmentSize}>{a.sizeKb} KB</div>
                </div>
                <ChevronRightRegular fontSize={14} color={tokens.colorNeutralForeground3} />
              </div>
            ))}
          </div>
        )}

        <div className={s.bodyText}>{message.body}</div>

      </div>
    </section>
  );
}
