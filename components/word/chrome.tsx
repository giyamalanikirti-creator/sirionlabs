'use client';

import { useEffect, useRef, useState } from 'react';
/**
 * Word for the web chrome, Review tab — BUILD_SPEC §4C.
 * No Microsoft logos or app icons; the product name is plain text beside a
 * "Mock" pill.
 */
import {
  Avatar,
  Button,
  Divider,
  makeStyles,
  shorthands,
  Switch,
  tokens,
} from '@fluentui/react-components';
import {
  ChevronDownRegular,
  CommentAddRegular,
  CommentMultipleRegular,
  CheckmarkRegular,
  DismissRegular,
  DocumentEditRegular,
  GridDotsRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  SearchRegular,
  ArrowSyncRegular,
  AppsAddInRegular,
} from '@fluentui/react-icons';
import { Mark } from '@/components/sirion/Mark';

const WORD_BLUE = '#185ABD';

export const useWordStyles = makeStyles({
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    backgroundColor: '#F3F3F3',
    fontFamily: tokens.fontFamilyBase,
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    height: '48px',
    flexShrink: 0,
    backgroundColor: WORD_BLUE,
    color: '#fff',
    ...shorthands.padding('0', '10px'),
    columnGap: '10px',
  },
  appName: { fontSize: '15px', fontWeight: tokens.fontWeightSemibold },
  fileName: { fontSize: '13px', marginLeft: '6px' },
  saved: { fontSize: '12px', color: 'rgba(255,255,255,0.75)' },
  search: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '8px',
    height: '28px',
    width: '300px',
    backgroundColor: 'rgba(255,255,255,0.16)',
    ...shorthands.borderRadius('14px'),
    ...shorthands.padding('0', '12px'),
    fontSize: '12.5px',
    color: 'rgba(255,255,255,0.9)',
  },
  titleRight: { display: 'flex', alignItems: 'center', columnGap: '8px', marginLeft: 'auto' },
  outlineBtn: {
    ...shorthands.border('1px', 'solid', 'rgba(255,255,255,0.7)'),
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('4px', '10px'),
    fontSize: '12.5px',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '6px',
    cursor: 'pointer',
  },
  shareBtn: {
    backgroundColor: '#fff',
    color: WORD_BLUE,
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('5px', '12px'),
    fontSize: '12.5px',
    fontWeight: tokens.fontWeightSemibold,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    alignItems: 'center',
    height: '36px',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('0', '10px'),
    columnGap: '2px',
    overflowX: 'auto',
  },
  tab: {
    ...shorthands.padding('8px', '10px'),
    fontSize: '12.5px',
    color: tokens.colorNeutralForeground2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: WORD_BLUE,
    fontWeight: tokens.fontWeightSemibold,
    boxShadow: `inset 0 -2px 0 0 ${WORD_BLUE}`,
  },
  commandBar: {
    display: 'flex',
    alignItems: 'center',
    height: '44px',
    flexShrink: 0,
    columnGap: '4px',
    ...shorthands.padding('0', '10px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    overflowX: 'auto',
  },
  markupPill: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '6px',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('4px', '8px'),
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  body: { display: 'flex', flexGrow: 1, minHeight: 0 },
  canvas: {
    flexGrow: 1,
    minWidth: 0,
    overflowY: 'auto',
    backgroundColor: '#F3F3F3',
    ...shorthands.padding('24px', '0', '40px'),
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '24px',
    flexShrink: 0,
    ...shorthands.padding('0', '14px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    fontSize: '11.5px',
    color: tokens.colorNeutralForeground3,
  },
});

const RIBBON_TABS = [
  'File', 'Home', 'Insert', 'Draw', 'Design', 'Layout', 'References', 'Review', 'View', 'Help',
];

export function WordTitleBar({ fileName }: { fileName: string }) {
  const s = useWordStyles();
  return (
    <header className={s.titleBar}>
      <GridDotsRegular fontSize={20} />
      {/* Plain text, no Microsoft app icon. */}
      <span className={s.appName}>Word</span>
      <span className={s.fileName}>{fileName}</span>
      <span className={s.saved}>· Saved</span>
      <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
        <span className={s.search}>
          <SearchRegular fontSize={14} />
          Search
        </span>
      </div>
      <div className={s.titleRight}>
        <span className={s.outlineBtn}>
          <CommentMultipleRegular fontSize={14} />
          Comments
        </span>
        <span className={s.outlineBtn}>
          <DocumentEditRegular fontSize={14} />
          Reviewing
          <ChevronDownRegular fontSize={12} />
        </span>
        <span className={s.shareBtn}>Share</span>
        <Avatar name="Ananya Rao" size={28} color="colorful" />
      </div>
    </header>
  );
}

const nowrap = { whiteSpace: 'nowrap' as const, flexShrink: 0 };

/** A secondary ribbon command: icon-only with a tooltip when the frame is narrow. */
function Cmd({ icon, label, compact }: { icon: React.ReactElement; label: string; compact: boolean }) {
  return (
    <Button appearance="subtle" size="small" icon={icon} title={compact ? label : undefined} aria-label={label} style={nowrap}>
      {compact ? null : label}
    </Button>
  );
}

export function WordRibbon({
  paneOpen,
  onTogglePane,
  trackChanges,
}: {
  paneOpen: boolean;
  onTogglePane: () => void;
  trackChanges: boolean;
}) {
  const s = useWordStyles();
  /* Below 1200 px of frame width, secondary commands go icon-only (with tooltips) so no label wraps. */
  const barRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 1200));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div className={s.tabs}>
        {RIBBON_TABS.map((t) => (
          <span key={t} className={`${s.tab} ${t === 'Review' ? s.tabActive : ''}`}>
            {t}
          </span>
        ))}
      </div>
      <div className={s.commandBar} ref={barRef} style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
        <Cmd icon={<DocumentEditRegular />} label="Editor" compact={compact} />
        <Switch checked={trackChanges} label="Track Changes" onChange={() => {}} style={nowrap} />
        <span className={s.markupPill} style={nowrap}>
          All Markup
          <ChevronDownRegular fontSize={12} />
        </span>
        <Cmd icon={<ChevronLeftRegular />} label="Previous" compact={compact} />
        <Cmd icon={<ChevronRightRegular />} label="Next" compact={compact} />
        <Button appearance="subtle" size="small" icon={<CheckmarkRegular />} iconPosition="before" style={nowrap}>
          Accept
        </Button>
        <Button appearance="subtle" size="small" icon={<DismissRegular />} style={nowrap}>
          Reject
        </Button>
        <Cmd icon={<CommentAddRegular />} label="New Comment" compact={compact} />
        <Cmd icon={<ArrowSyncRegular />} label="Compare" compact={compact} />
        <Divider vertical style={{ height: 22, flexGrow: 0 }} />
        <Cmd icon={<AppsAddInRegular />} label="Add-ins" compact={compact} />
        <Button
          appearance={paneOpen ? 'primary' : 'subtle'}
          size="small"
          icon={<Mark size={14} tone={paneOpen ? 'light' : 'dark'} />}
          onClick={onTogglePane}
          style={nowrap}
        >
          Deal Ledger
        </Button>
      </div>
    </>
  );
}

export function WordStatusBar({ pages, words }: { pages: number; words: number }) {
  const s = useWordStyles();
  return (
    <footer className={s.statusBar}>
      <span>
        Page 2 of {pages} · {words.toLocaleString('en-IN')} words · English (India) · Track Changes:
        On
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 90,
            height: 3,
            background: tokens.colorNeutralStroke2,
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: -3,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: tokens.colorNeutralForeground3,
            }}
          />
        </span>
        100%
      </span>
    </footer>
  );
}
