'use client';

import { Badge, Button, Divider, MessageBar, MessageBarBody, tokens } from '@fluentui/react-components';
import { cloudDeskDeal, personName } from '@/lib/data';
import { priceChange } from '@/lib/engines/pricing';
import { approverFor, sourcePlain } from '@/lib/engines/sendDialog';
import { HOLDING_REPLY } from '@/lib/engines/wording';
import { formatLakh, HEADLINE_SUFFIX } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import { useSourceDrawer } from '@/lib/drawer';
import { usePaneStyles } from './paneStyles';
import { LedgerList, StateBadge } from './LedgerList';
import { InlinePaneDrawer } from './AnanyaPane';
import type { LedgerRow, SendCheckResult, TermValue } from '@/lib/types';

/** Ananya's pre-approved fallback on price (§10.6). */
const FALLBACK: TermValue = { kind: 'price', wording: 'capped', capPct: 5, fromYear: 3 };

export function VikramPane({
  rows,
  loopIn,
  onAddCc,
  onHoldingReply,
  ccAdded,
}: {
  rows: LedgerRow[];
  loopIn?: SendCheckResult['match'];
  onAddCc: () => void;
  onHoldingReply: (body: string) => void;
  ccAdded: boolean;
}) {
  const s = usePaneStyles();
  const open = useSourceDrawer((st) => st.open);

  if (!loopIn) {
    return (
      <div style={{ position: 'relative' }}>
        <div className={s.headline}>
          <span className={s.headlineLabel}>CloudDesk renewal 2026–29</span>
        </div>
        <p className={s.note} style={{ marginTop: 0 }}>
          Procurement is leading the commercials. These are the terms already agreed, so you can see
          what a reply would be moving.
        </p>
        <p className={s.sectionLabel}>What's agreed</p>
        <LedgerList rows={rows.filter((row) => ['agreed', 'reopened', 'missing_at_signing'].includes(row.state))} compact />
        <InlinePaneDrawer />
      </div>
    );
  }

  const row = rows.find((r) => r.id === loopIn.rowId);
  if (!row) return null;

  const fallbackTag = row.termKey === 'price' ? priceChange(cloudDeskDeal, row.position, FALLBACK) : null;
  const approver = approverFor(rows, row.termKey);
  const cfoApproval = row.termKey === 'price' ? rows.find((r) => r.approvedBy?.condition)?.approvedBy : undefined;
  const approval = cfoApproval ?? row.approvedBy;

  return (
    <div style={{ position: 'relative' }}>
      <MessageBar intent="warning" style={{ marginBottom: 10 }}>
        <MessageBarBody>Your draft would move a term that is already agreed.</MessageBarBody>
      </MessageBar>

      <div className={s.card}>
        <div className={s.termHead}>
          <span className={s.termName}>{row.label}</span>
          <StateBadge state={row.state} />
        </div>
        <div className={s.termValue}>{plainValue(row.position, cloudDeskDeal.termYears)}</div>

        <div className={s.tags}>
          <Badge
            appearance="outline"
            color="informative"
            size="small"
            style={{ cursor: 'pointer' }}
            onClick={() => open(row.source, true)}
          >
            {sourcePlain(row.source)}
          </Badge>
          {approval && (
            <Badge
              appearance="outline"
              color="informative"
              size="small"
              style={{ cursor: 'pointer' }}
              onClick={() => open(approval.source, true)}
            >
              View approval
            </Badge>
          )}
        </div>

        {approver && (
          <p className={s.note}>
            {approver} approved {cfoApproval ? 'the three-year commitment' : 'this term'}{approval?.condition ? ` ${approval.condition}` : ''}.
          </p>
        )}

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />

        <div>
          <span className={s.money}>{formatLakh(loopIn.costLakhPerYr)}</span>{' '}
          <span className={s.moneySuffix}>{HEADLINE_SUFFIX}</span>
          {loopIn.overTermLakh !== undefined && (
            <div className={s.grey}>{formatLakh(loopIn.overTermLakh)} over the three-year term</div>
          )}
        </div>
      </div>

      {fallbackTag && <div className={s.card}>
        <div className={s.cardTitle}>{personName('ananya')}'s approved fallback</div>
        <div className={s.cardMeta}>If you have to give something on price</div>
        <div className={s.termValue}>{plainValue(FALLBACK, cloudDeskDeal.termYears)}</div>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: tokens.colorBrandForeground1 }}>
            about {formatLakh(fallbackTag.costLakhPerYr)}
          </span>{' '}
          <span className={s.moneySuffix}>a year</span>
        </div>
        <p className={s.note}>
          Still a cost, but about a quarter of an open yearly revision. Procurement set this ceiling
          before the round started.
        </p>
      </div>}

      <div className={s.actions}>
        <Button size="small" appearance="primary" onClick={onAddCc} disabled={ccAdded}>
          {ccAdded ? 'Ananya added to Cc' : `Add ${personName('ananya').split(' ')[0]} to Cc`}
        </Button>
        <Button size="small" onClick={() => onHoldingReply(HOLDING_REPLY)}>
          Use a holding reply
        </Button>
      </div>

      <p className={s.note}>
        The holding reply says nothing about money, nobody's approval, or our limits. It is safe to
        send to the supplier as it stands.
      </p>

      <InlinePaneDrawer />
    </div>
  );
}
