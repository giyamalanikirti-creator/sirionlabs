'use client';

/** The pane shown on an earlier draft, e.g. /word/v4 — BUILD_SPEC §10.7. */
import { Badge, tokens } from '@fluentui/react-components';
import { EyeOffRegular } from '@fluentui/react-icons';
import { cloudDeskDeal } from '@/lib/data';
import { extractValue } from '@/lib/engines/diff';
import { priceChange } from '@/lib/engines/pricing';
import { ledgerAtStep } from '@/lib/demo/steps';
import { formatLakh } from '@/lib/format';
import { plainValue, TERM_LABELS } from '@/lib/plain';
import { usePaneStyles } from './paneStyles';
import type { ClauseChange, DocVersion } from '@/lib/types';

export function RoundDiffPane({
  version,
  changes,
}: {
  version: DocVersion;
  changes: ClauseChange[];
}) {
  const s = usePaneStyles();
  const rows = ledgerAtStep(0);

  const priced = changes
    .filter((c) => c.termKey)
    .map((c) => {
      const row = rows.find((r) => r.termKey === c.termKey);
      const value = extractValue({
        no: c.clauseNo,
        title: '',
        text: c.after,
        termKey: c.termKey,
      });
      const tag = row && value ? priceChange(cloudDeskDeal, row.position, value) : null;
      return { change: c, row, value, tag };
    });

  return (
    <div>
      <div className={s.headline}>
        <span className={s.headlineLabel}>What changed in {version.id}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {changes.length} clause{changes.length === 1 ? '' : 's'}
        </span>
      </div>

      {priced.length === 0 && (
        <p className={s.note} style={{ marginTop: 0 }}>
          Nothing in this draft moves a tracked term against the last version we sent.
        </p>
      )}

      {priced.map(({ change, row, value, tag }) => (
        <div key={change.clauseNo} className={s.card}>
          <div className={s.termHead}>
            <span className={s.termName}>
              {change.termKey ? TERM_LABELS[change.termKey] : `Clause ${change.clauseNo}`}
            </span>
            {change.hidden && (
              <Badge appearance="filled" color="severe" size="small" icon={<EyeOffRegular />}>
                Hidden edit
              </Badge>
            )}
          </div>
          {row && value && (
            <div className={s.termValue}>
              {plainValue(row.position)} → {plainValue(value)} in clause {change.clauseNo}
            </div>
          )}
          {tag?.costLakhPerYr !== null && tag !== null && (
            <div style={{ marginTop: 6 }}>
              <span className={s.money}>{formatLakh(tag.costLakhPerYr)}</span>{' '}
              <span className={s.moneySuffix}>{tag.basis === 'own_renewals' ? 'expected at the next renewal' : 'per year on average'}</span>
            </div>
          )}
          {change.hidden && (
            <p className={s.note}>
              This clause is not in the file's list of tracked changes, so nobody reviewing the
              markup would see it.
            </p>
          )}
        </div>
      ))}

      <p className={s.note} style={{ color: tokens.colorNeutralForeground3 }}>
        Compared against the last version our side sent, not against the supplier's own previous
        draft. That is the comparison that tells you what moved away from us.
      </p>
    </div>
  );
}
