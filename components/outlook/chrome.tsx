'use client';

/**
 * Outlook on the web chrome — BUILD_SPEC §4B.
 * Fluent UI v9 tokens only; no Microsoft logos or app icons. The product name
 * appears as plain text beside a "Mock" pill.
 */
import { useId, useState } from 'react';
import {
  Avatar,
  Button,
  Divider,
  makeStyles,
  shorthands,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import {
  AppsRegular,
  ArchiveRegular,
  ArrowForwardRegular,
  ArrowReplyAllRegular,
  ArrowReplyRegular,
  CalendarLtrRegular,
  ChevronDownRegular,
  DeleteRegular,
  FlagRegular,
  GridDotsRegular,
  MailRegular,
  MailUnreadRegular,
  NavigationRegular,
  PeopleRegular,
  QuestionCircleRegular,
  SearchRegular,
  SettingsRegular,
  FolderArrowRightRegular,
  AlertRegular,
} from '@fluentui/react-icons';
import { Mark } from '@/components/sirion/Mark';

export const useChromeStyles = makeStyles({
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground3,
    fontFamily: tokens.fontFamilyBase,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    height: '48px',
    flexShrink: 0,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.padding('0', '8px'),
    columnGap: '8px',
  },
  headerLeft: { display: 'flex', alignItems: 'center', columnGap: '10px', minWidth: '248px' },
  appName: { fontSize: '16px', fontWeight: tokens.fontWeightSemibold, letterSpacing: '-0.01em' },
  search: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '8px',
    height: '32px',
    flexGrow: 1,
    maxWidth: '720px',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('0', '10px'),
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '2px',
    minWidth: '200px',
    justifyContent: 'flex-end',
  },
  headerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    ...shorthands.borderRadius('4px'),
    color: tokens.colorNeutralForegroundOnBrand,
    cursor: 'pointer',
    ':hover': { backgroundColor: 'rgba(255,255,255,0.14)' },
  },
  body: { display: 'flex', flexGrow: 1, minHeight: 0 },
  rail: {
    width: '48px',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: '4px',
    paddingTop: '8px',
  },
  railItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    ...shorthands.borderRadius('4px'),
    color: tokens.colorNeutralForeground3,
    fontSize: '20px',
  },
  railActive: {
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  railIndicator: {
    position: 'absolute',
    left: '-6px',
    top: '8px',
    bottom: '8px',
    width: '3px',
    ...shorthands.borderRadius('2px'),
    backgroundColor: tokens.colorBrandBackground,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  ribbonTabs: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '36px',
    flexShrink: 0,
    ...shorthands.padding('0', '8px'),
    columnGap: '2px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  ribbonTab: {
    ...shorthands.padding('6px', '12px'),
    fontSize: '13px',
    color: tokens.colorNeutralForeground2,
    cursor: 'pointer',
    ...shorthands.borderRadius('4px', '4px', '0', '0'),
  },
  ribbonTabActive: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    boxShadow: `inset 0 -2px 0 0 ${tokens.colorBrandStroke1}`,
  },
  commandBar: {
    display: 'flex',
    alignItems: 'center',
    height: '40px',
    flexShrink: 0,
    columnGap: '2px',
    ...shorthands.padding('0', '8px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    overflowX: 'auto',
  },
  panes: { display: 'flex', flexGrow: 1, minHeight: 0 },
  folderPane: {
    width: '220px',
    flexShrink: 0,
    '@media (max-width: 1400px)': { width: '116px' },
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('10px', '8px'),
    overflowY: 'auto',
  },
  mailboxName: {
    fontSize: '12.5px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    ...shorthands.padding('4px', '8px', '8px'),
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    textOverflow: 'ellipsis',
  },
  folder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '30px',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    ...shorthands.padding('0', '8px'),
    ...shorthands.borderRadius('4px'),
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    ':enabled:hover': { backgroundColor: tokens.colorNeutralBackground1Hover, cursor: 'pointer' },
    ':disabled': { opacity: 0.55 },
  },
  folderActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    fontWeight: tokens.fontWeightSemibold,
  },
  folderCount: { fontSize: '12px', color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold },
});

export function OutlookHeader({ owner }: { owner: { name: string; email: string } }) {
  const s = useChromeStyles();
  return (
    <header className={s.header}>
      <div className={s.headerLeft}>
        <span className={s.headerIcon}>
          <GridDotsRegular fontSize={20} />
        </span>
        {/* Product name as plain text — no Microsoft logo or app icon. */}
        <span className={s.appName}>Outlook</span>
      </div>
      <div className={s.search}>
        <SearchRegular fontSize={16} />
        <span>Search</span>
      </div>
      <div className={s.headerRight}>
        <span className={s.headerIcon}>
          <AlertRegular fontSize={18} />
        </span>
        <span className={s.headerIcon}>
          <SettingsRegular fontSize={18} />
        </span>
        <span className={s.headerIcon}>
          <QuestionCircleRegular fontSize={18} />
        </span>
        <Tooltip content={owner.email} relationship="label">
          <Avatar name={owner.name} size={28} color="colorful" style={{ marginLeft: 6 }} />
        </Tooltip>
      </div>
    </header>
  );
}

export function OutlookRail() {
  const s = useChromeStyles();
  return (
    <nav className={s.rail}>
      <span className={`${s.railItem} ${s.railActive}`} style={{ position: 'relative' }}>
        <span className={s.railIndicator} style={{ left: -4 }} />
        <MailRegular fontSize={20} />
      </span>
      <span className={s.railItem}>
        <CalendarLtrRegular fontSize={20} />
      </span>
      <span className={s.railItem}>
        <PeopleRegular fontSize={20} />
      </span>
      <span className={s.railItem}>
        <AppsRegular fontSize={20} />
      </span>
    </nav>
  );
}

export function OutlookRibbon({
  onReply,
  onReplyAll,
  onApps,
  appsActive,
  replyDisabled,
}: {
  onReply: () => void;
  onReplyAll: () => void;
  onApps: () => void;
  appsActive: boolean;
  replyDisabled: boolean;
}) {
  const s = useChromeStyles();
  return (
    <>
      <div className={s.ribbonTabs}>
        <span className={`${s.ribbonTab} ${s.ribbonTabActive}`}>Home</span>
        <span className={s.ribbonTab}>View</span>
        <span className={s.ribbonTab}>Help</span>
      </div>
      <div className={s.commandBar}>
        <Button appearance="primary" size="small" icon={<ChevronDownRegular />} iconPosition="after" disabled>
          New mail
        </Button>
        <Button appearance="subtle" size="small" icon={<DeleteRegular />} disabled>
          Delete
        </Button>
        <Button appearance="subtle" size="small" icon={<ArchiveRegular />} disabled>
          Archive
        </Button>
        <Button appearance="subtle" size="small" icon={<FolderArrowRightRegular />} disabled>
          Move to
        </Button>
        <Button
          appearance="subtle"
          size="small"
          icon={<ArrowReplyRegular />}
          onClick={onReply}
          disabled={replyDisabled}
        >
          Reply
        </Button>
        <Button appearance="subtle" size="small" icon={<ArrowReplyAllRegular />} onClick={onReplyAll} disabled={replyDisabled}>
          Reply all
        </Button>
        <Button appearance="subtle" size="small" icon={<ArrowForwardRegular />} disabled>
          Forward
        </Button>
        <Button appearance="subtle" size="small" icon={<MailUnreadRegular />} disabled>
          Read / Unread
        </Button>
        <Button appearance="subtle" size="small" icon={<FlagRegular />} disabled>
          Flag
        </Button>
        <Divider vertical style={{ height: 20, flexGrow: 0 }} />
        <Button
          appearance={appsActive ? 'primary' : 'subtle'}
          size="small"
          icon={<Mark size={14} tone={appsActive ? 'light' : 'dark'} />}
          onClick={onApps}
        >
          Apps
        </Button>
      </div>
    </>
  );
}

export function FolderPane({
  owner,
  unread,
  active,
  onSelect,
}: {
  owner: { email: string };
  unread: number;
  active: 'inbox' | 'sent';
  onSelect: (f: 'inbox' | 'sent') => void;
}) {
  const s = useChromeStyles();
  const [expanded, setExpanded] = useState(false);
  const foldersId = useId();
  const folders = [
    { id: 'inbox', label: 'Inbox', count: unread },
    { id: 'drafts', label: 'Drafts' },
    { id: 'sent', label: 'Sent Items' },
    { id: 'deleted', label: 'Deleted Items' },
    { id: 'archive', label: 'Archive' },
    { id: 'junk', label: 'Junk Email' },
  ] as const;

  return (
    <aside aria-label="Mail folders" className={s.folderPane} style={expanded ? undefined : { width: 44, paddingInline: 5, boxSizing: 'border-box' }}>
      <Tooltip content={expanded ? 'Collapse mail folders' : 'Expand mail folders'} relationship="label">
        <Button
          size="small"
          appearance="subtle"
          icon={<NavigationRegular />}
          aria-expanded={expanded}
          aria-controls={foldersId}
          onClick={() => setExpanded((open) => !open)}
        />
      </Tooltip>
      <div id={foldersId} hidden={!expanded}>
        <div className={s.mailboxName} title={owner.email}>{owner.email}</div>
        {folders.map((f) => {
          const { id } = f;
          const live = id === 'inbox' || id === 'sent';
          return (
            <button
              key={id}
              type="button"
              className={`${s.folder} ${active === id ? s.folderActive : ''}`}
              aria-current={active === id || undefined}
              disabled={!live}
              onClick={live ? () => onSelect(id) : undefined}
            >
              <span style={{ fontWeight: id === 'inbox' && f.count ? 600 : undefined }}>{f.label}</span>
              {id === 'inbox' && f.count > 0 && <span className={s.folderCount}>{f.count}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
