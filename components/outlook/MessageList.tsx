'use client';

import {
  Avatar,
  makeStyles,
  shorthands,
  TabList,
  Tab,
  tokens,
} from '@fluentui/react-components';
import { AttachRegular, FilterRegular } from '@fluentui/react-icons';
import type { EmailMessage } from '@/lib/types';
import { personByEmail } from '@/lib/data';
import { formatListTime } from '@/lib/format';

const useStyles = makeStyles({
  pane: {
    width: '360px',
    '@media (max-width: 1400px)': { width: '270px' },
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('8px', '12px', '0'),
  },
  title: { fontSize: '15px', fontWeight: tokens.fontWeightSemibold },
  tabs: {
    ...shorthands.padding('0', '6px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  list: { overflowY: 'auto', flexGrow: 1 },
  group: {
    fontSize: '12px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding('10px', '14px', '4px'),
  },
  item: {
    position: 'relative',
    display: 'flex',
    columnGap: '10px',
    minHeight: '72px',
    cursor: 'pointer',
    ...shorthands.padding('9px', '12px', '9px', '14px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke3),
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  itemSelected: { backgroundColor: tokens.colorBrandBackground2 },
  unreadBar: {
    position: 'absolute',
    left: '4px',
    top: '14px',
    bottom: '14px',
    width: '3px',
    ...shorthands.borderRadius('2px'),
    backgroundColor: tokens.colorBrandBackground,
  },
  body: { minWidth: 0, flexGrow: 1 },
  row1: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', columnGap: '8px' },
  sender: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    textOverflow: 'ellipsis',
  },
  time: { fontSize: '11.5px', color: tokens.colorNeutralForeground3, flexShrink: 0 },
  subject: {
    fontSize: '13px',
    marginTop: '1px',
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    textOverflow: 'ellipsis',
  },
  preview: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: { display: 'flex', alignItems: 'center', columnGap: '6px', marginTop: '3px' },
});

/** Outlook's date grouping, worked out against the demo clock. */
function groupFor(sentAt: string, nowIso: string): string {
  const day = 86400000;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = startOf(new Date(nowIso));
  const then = startOf(new Date(sentAt));
  const diff = Math.round((now - then) / day);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff <= 6) return 'Earlier this week';
  if (diff <= 13) return 'Last week';
  return 'Older';
}

export function MessageList({
  messages,
  selectedId,
  readIds,
  clock,
  folder,
  onSelect,
}: {
  messages: EmailMessage[];
  selectedId?: string;
  readIds: string[];
  clock: string;
  folder: 'inbox' | 'sent';
  onSelect: (id: string) => void;
}) {
  const s = useStyles();

  // Group headers are worked out up front, so nothing is reassigned mid-render.
  const withGroups = messages.map((m, i) => {
    const group = groupFor(m.sentAt, clock);
    const previous = i > 0 ? groupFor(messages[i - 1].sentAt, clock) : null;
    return { message: m, group, showGroup: group !== previous };
  });

  return (
    <section className={s.pane}>
      <div className={s.head}>
        <span className={s.title}>{folder === 'inbox' ? 'Inbox' : 'Sent Items'}</span>
        <FilterRegular fontSize={16} color={tokens.colorNeutralForeground3} />
      </div>
      <div className={s.tabs}>
        <TabList selectedValue="focused" size="small">
          <Tab value="focused">Focused</Tab>
          <Tab value="other">Other</Tab>
        </TabList>
      </div>

      <div className={s.list}>
        {withGroups.map(({ message: m, group, showGroup }) => {
          const person = personByEmail(folder === 'inbox' ? m.from : m.to[0]);
          const name = person?.name ?? (folder === 'inbox' ? m.from : m.to[0]);
          const unread = folder === 'inbox' && !readIds.includes(m.id);
          const selected = m.id === selectedId;

          return (
            <div key={m.id}>
              {showGroup && <div className={s.group}>{group}</div>}
              <div
                className={`${s.item} ${selected ? s.itemSelected : ''}`}
                role="button"
                tabIndex={0}
                aria-label={m.subject}
                aria-pressed={selected}
                onClick={() => onSelect(m.id)}
                data-tour={`msg-${m.id}`}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  onSelect(m.id);
                }}
              >
                {unread && <span className={s.unreadBar} />}
                <Avatar name={name} size={32} color="colorful" />
                <div className={s.body}>
                  <div className={s.row1}>
                    <span
                      className={s.sender}
                      style={{ fontWeight: unread ? 600 : 400 }}
                    >
                      {name}
                    </span>
                    <span className={s.time}>{formatListTime(m.sentAt, clock)}</span>
                  </div>
                  <div
                    className={s.subject}
                    style={{
                      color: unread ? tokens.colorBrandForeground1 : tokens.colorNeutralForeground1,
                      fontWeight: unread ? 600 : 400,
                    }}
                  >
                    {m.subject}
                  </div>
                  <div className={s.preview}>{m.body}</div>
                  {m.attachments.length > 0 && (
                    <div className={s.meta}>
                      <AttachRegular fontSize={13} color={tokens.colorNeutralForeground3} />
                      <span style={{ fontSize: 11.5, color: tokens.colorNeutralForeground3 }}>
                        {m.attachments[0].fileName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p style={{ padding: 24, fontSize: 13, color: tokens.colorNeutralForeground3 }}>
            Nothing here yet.
          </p>
        )}
      </div>
    </section>
  );
}
