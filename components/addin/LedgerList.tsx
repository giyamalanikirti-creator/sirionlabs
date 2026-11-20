'use client';

import { Badge, tokens } from '@fluentui/react-components';
import type { LedgerRow, RowState } from '@/lib/types';
import { cloudDeskDeal, personName } from '@/lib/data';
import { rowHeadlineShare } from '@/lib/engines/playbook';
import { formatLakh } from '@/lib/format';
import { plainValue, STATE_LABELS } from '@/lib/plain';
import { usePaneStyles } from './paneStyles';

const BADGE: Record<RowState, { color: 'success' | 'informative' | 'brand' | 'warning' | 'severe' | 'danger'; appearance: 'filled' | 'outline' }> = {
  agreed: { color: 'success', appearance: 'filled' },
  open: { color: 'informative', appearance: 'outline' },
  changed: { color: 'brand', appearance: 'filled' },
  needs_confirmation: { color: 'warning', appearance: 'filled' },
  reopened: { color: 'severe', appearance: 'filled' },
  missing_at_signing: { color: 'danger', appearance: 'filled' },
};

export function StateBadge({ state }: { state: RowState }) {
  const b = BADGE[state];
  return (
    <Badge appearance={b.appearance} color={b.color} size="small">
      {STATE_LABELS[state]}
    </Badge>
  );
}

/** The compact seven-row ledger that sits under the round card (§10.5). */
export function LedgerList({ rows, compact = false }: { rows: LedgerRow[]; compact?: boolean }) {
  const s = usePaneStyles();
  return (
    <div>
      {rows.map((r) => {
        const risk = rowHeadlineShare(r, cloudDeskDeal);
        return (
          <div key={r.id} className={s.listRow}>
            <span className={s.listName}>
              <span style={{ display: 'block', fontWeight: 600 }}>{r.label}</span>
              <span className={s.listValue}>{plainValue(r.position)}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {compact ? <span className={s.listValue}>{r.owner === 'legal' ? 'Legal' : personName(cloudDeskDeal.ownerId)}</span> : risk ? (
                <span style={{ fontSize: 11.5, color: tokens.colorPaletteDarkOrangeForeground1 }}>
                  {formatLakh(risk)} a year
                </span>
              ) : null}
              <StateBadge state={r.state} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
