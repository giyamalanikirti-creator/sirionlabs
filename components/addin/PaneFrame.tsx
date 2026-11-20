'use client';

/** Our add-in pane, Sirion teal inside Microsoft chrome — BUILD_SPEC §4D. */
import {
  Badge,
  Button,
  FluentProvider,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import Link from 'next/link';
import { Mark } from '@/components/sirion/Mark';
import { dealLedgerTheme } from '@/lib/fluentTheme';
import type { AiSource, TermKey } from '@/lib/types';
import type { Viewer } from '@/lib/engines/advisor';
import { AskBox } from './AskBox';

const useStyles = makeStyles({
  pane: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    minHeight: 0,
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralStroke2),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '8px',
    height: '44px',
    flexShrink: 0,
    ...shorthands.padding('0', '10px', '0', '12px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  name: { fontSize: '13.5px', fontWeight: tokens.fontWeightSemibold, flexGrow: 1 },
  body: { flexGrow: 1, overflowY: 'auto', ...shorthands.padding('12px') },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: '8px',
    minHeight: '32px',
    flexShrink: 0,
    ...shorthands.padding('4px', '12px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  link: {
    fontSize: '11.5px',
    color: tokens.colorBrandForeground1,
    textDecorationLine: 'none',
    ':hover': { textDecorationLine: 'underline' },
  },
});

export const AI_BADGE_LABEL: Record<AiSource, string> = {
  live: 'AI: live',
  cached: 'Saved example',
  rules: 'Checked by rules',
};

export function AiBadge({ source }: { source: AiSource }) {
  return (
    <Badge
      appearance="outline"
      color="informative"
      size="small"
      title={
        source === 'live'
          ? 'This card was built from a live model call, validated against the email text.'
          : source === 'cached'
            ? 'This result comes from a saved example.'
            : 'The model was unavailable, so this was checked by rules instead.'
      }
    >
      {AI_BADGE_LABEL[source]}
    </Badge>
  );
}

export function PaneFrame({
  width = 320,
  source,
  onClose,
  children,
  footerHref = '/deals/D-CLOUDDESK/ledger',
  ask,
}: {
  width?: number;
  source?: AiSource;
  onClose?: () => void;
  children: React.ReactNode;
  footerHref?: string;
  /** Show "Ask Deal Ledger" at the bottom of the pane. */
  ask?: { viewer: Viewer; termKey?: TermKey };
}) {
  const s = useStyles();
  return (
    <FluentProvider theme={dealLedgerTheme} style={{ height: '100%', minHeight: 0 }}>
      <div className={s.pane} style={{ width }}>
        <header className={s.header}>
          <Mark size={20} tone="dark" />
          <span className={s.name}>Deal Ledger</span>
          {onClose && <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={onClose} aria-label="Close Deal Ledger" />}
        </header>
        <div className={s.body}>{children}</div>
        {ask && <AskBox viewer={ask.viewer} termKey={ask.termKey} />}
        <footer className={s.footer}>
          <Link href={footerHref} className={s.link}>
            {footerHref === '/deals' ? 'Browse deals ↗' : 'Open full ledger in Sirion ↗'}
          </Link>
          {source && <AiBadge source={source} />}
        </footer>
      </div>
    </FluentProvider>
  );
}
