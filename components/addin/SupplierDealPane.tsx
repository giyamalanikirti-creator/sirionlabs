'use client';

/** The pane for an email from any other listed supplier: its deal, and the rows this email is the source for. */
import Link from 'next/link';
import { Badge, tokens } from '@fluentui/react-components';
import { dealById } from '@/lib/data';
import { rowsForDeal, type SupplierRowView } from '@/lib/demo/supplierInbox';
import { listedAtRisk, SWIFTSHIP } from '@/lib/demo/moreDeals';
import { formatLakh, formatLakhPerYear, HEADLINE_SUFFIX } from '@/lib/format';
import { Block } from './SirionBlocks';
import { SwiftShipPane } from './SwiftShipPane';
import { usePaneStyles } from './paneStyles';

const BADGE: Record<SupplierRowView['state'], { label: string; color: 'success' | 'informative' | 'warning' | 'severe' | 'danger' }> = {
  agreed: { label: 'Agreed', color: 'success' },
  open: { label: 'Open', color: 'informative' },
  needs_confirmation: { label: 'Needs confirming', color: 'warning' },
  reopened: { label: 'Reopened', color: 'severe' },
  missing_at_signing: { label: 'Missing at signing', color: 'danger' },
};

export function SupplierDealPane({ dealId, messageId }: { dealId: string; messageId: string }) {
  const s = usePaneStyles();
  if (dealId === SWIFTSHIP.dealId) return <SwiftShipPane messageId={messageId} />;
  const deal = dealById(dealId);
  if (!deal) return null;
  const rows = rowsForDeal(dealId);
  const here = rows.filter((r) => r.emailId === messageId || r.outlookId === messageId);
  const others = rows.filter((r) => !here.includes(r));
  const risk = listedAtRisk(deal);

  return (
    <div>
      <Block title="Matched deal" kind="today">
        <div style={{ fontSize: 13, fontWeight: 600 }}>{deal.supplier}</div>
        <div className={s.cardMeta} style={{ marginBottom: 4 }}>
          {deal.id} · {deal.stage === 'signing' ? 'Signing' : 'Negotiating'} · {formatLakh(deal.annualFeeInr / 1e5)} a year
        </div>
        <div className={s.grey}>Matched by sender domain ({deal.supplierDomain})</div>
      </Block>

      <div className={s.headline}>
        <span className={s.money}>{formatLakh(risk)}</span> <span className={s.moneySuffix}>{HEADLINE_SUFFIX}</span>
      </div>

      <Block title={here.length ? 'What this email says' : 'Terms on this deal'} kind="new" accent={here.some((r) => r.state !== 'agreed')}>
        {(here.length ? here : others).map((r) => (
          <Row key={r.id} row={r} />
        ))}
      </Block>

      {here.length > 0 && others.length > 0 && (
        <details className={s.card}>
          <summary style={{ fontSize: 12 }}>Other {others.length} terms on this deal</summary>
          {others.map((r) => (
            <Row key={r.id} row={r} />
          ))}
        </details>
      )}

      <p className={s.note}>
        <Link href={`/deals/${deal.id}`}>Open the {deal.supplier} deal in Sirion ↗</Link>
      </p>
    </div>
  );
}

function Row({ row }: { row: SupplierRowView }) {
  const s = usePaneStyles();
  const b = BADGE[row.state];
  return (
    <div className={s.termRow}>
      <div className={s.termHead}>
        <span className={s.termName}>{row.label}</span>
        <Badge size="small" appearance="filled" color={b.color}>{b.label}</Badge>
      </div>
      <div className={s.termValue}>{row.agreed}</div>
      {row.note && <div style={{ fontSize: 11.5, color: tokens.colorPaletteDarkOrangeForeground1 }}>{row.note}</div>}
      {row.quote && <div className={s.quote}>“{row.quote}”</div>}
      {row.costLakhPerYr !== undefined && (
        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: tokens.colorBrandForeground1 }}>
          {formatLakhPerYear(row.costLakhPerYr)} if signed as is
        </div>
      )}
    </div>
  );
}
