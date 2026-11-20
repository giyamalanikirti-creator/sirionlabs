'use client';

/** A supplier email with no deal behind it yet: start one, with the intake filled in (SwiftShip). */
import Link from 'next/link';
import { Button, MessageBar, MessageBarBody, tokens } from '@fluentui/react-components';
import { DocumentPdfRegular } from '@fluentui/react-icons';
import { useDemo } from '@/lib/store';
import { SWIFTSHIP, swiftShipGap } from '@/lib/demo/moreDeals';
import { formatLakhPerYear, HEADLINE_SUFFIX } from '@/lib/format';
import { Block } from './SirionBlocks';
import { usePaneStyles } from './paneStyles';

export function SwiftShipPane({ messageId }: { messageId: string }) {
  const s = usePaneStyles();
  const started = useDemo((st) => st.startedDealIds).includes(SWIFTSHIP.dealId);
  const start = useDemo((st) => st.startDeal);
  const toast = useDemo((st) => st.toast);
  const fuel = SWIFTSHIP.rows.find((r) => r.id === 'S-fuel')!;

  return (
    <div>
      <Block title="Matched deal" kind="today">
        <div style={{ fontSize: 12.5 }}>
          {started ? (
            <>
              <strong>SwiftShip Logistics</strong> · D-SWIFTSHIP · Negotiating
            </>
          ) : (
            <>No deal or contract in Sirion for swiftship.example yet.</>
          )}
        </div>
      </Block>

      {!started && (
        <Block title="Start deal from this email" kind="new" accent>
          <p className={s.grey} style={{ marginTop: 0, marginBottom: 6 }}>
            Filled in from the email{messageId === 'S2' ? ' and the PDF quote' : ''}. Check, then create.
          </p>
          {SWIFTSHIP.intake!.fields.map((f) => (
            <div key={f.label} className={s.listRow}>
              <span className={s.listName}>
                <span style={{ display: 'block', fontWeight: 600 }}>{f.label}</span>
                <span className={s.listValue}>{f.from}</span>
              </span>
              <span style={{ fontSize: 12, textAlign: 'right' }}>{f.value}</span>
            </div>
          ))}
          <div className={s.actions}>
            <Button
              size="small"
              appearance="primary"
              onClick={() => {
                start(SWIFTSHIP.dealId);
                toast('SwiftShip deal created in Sirion, with the agreed fuel surcharge as its first ledger row.');
              }}
            >
              Create deal
            </Button>
          </div>
        </Block>
      )}

      <Block title="Read from the PDF quote" kind="new">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginBottom: 6 }}>
          <DocumentPdfRegular fontSize={16} /> SwiftShip_Quote_Meridian.pdf
        </div>
        <div className={s.termHead}>
          <span className={s.termName}>{fuel.label}</span>
        </div>
        <div className={s.termValue}>Agreed: {fuel.agreed}</div>
        <div className={s.quote}>“{fuel.sourceQuote}”</div>
        <p style={{ fontSize: 12, marginTop: 6, color: tokens.colorPaletteDarkOrangeForeground1 }}>{fuel.fileSays}</p>
        <div style={{ marginTop: 6 }}>
          <span className={s.money}>{formatLakhPerYear(swiftShipGap.costLakhPerYr).replace(' a year', '')}</span>{' '}
          <span className={s.moneySuffix}>{HEADLINE_SUFFIX}</span>
        </div>
        {fuel.move && (
          <MessageBar intent="info" style={{ marginTop: 8 }}>
            <MessageBarBody>
              <strong>Recommended move.</strong> {fuel.move.ask} Fallback: {fuel.move.fallback}
            </MessageBarBody>
          </MessageBar>
        )}
      </Block>

      {started && (
        <p className={s.note}>
          <Link href="/deals/D-SWIFTSHIP">Open the SwiftShip deal in Sirion ↗</Link>
        </p>
      )}
    </div>
  );
}
