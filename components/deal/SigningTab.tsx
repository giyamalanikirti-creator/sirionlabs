'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button, EmptyState, SirionCard } from '@/components/sirion/ui';
import { MoneyPlain } from '@/components/sirion/MoneyFigure';
import { SourceChip } from '@/components/sirion/SourceChip';
import { StatePill } from '@/components/sirion/StatePill';
import { useDemo } from '@/lib/store';
import { cloudDeskDeal, versionById } from '@/lib/data';
import { signingCheck } from '@/lib/engines/signing';
import { formatLakh } from '@/lib/format';
import type { LedgerRow } from '@/lib/types';

export function SigningTab({ rows }: { rows: LedgerRow[] }) {
  const checkedAt = useDemo((s) => s.signing.checkedAt);
  const sentBackAt = useDemo((s) => s.signing.sentBackAt);
  const v6 = versionById('v6')!;

  if (!checkedAt) {
    return (
      <SirionCard title="Signing check">
        <EmptyState
          title="The signing copy has not arrived yet"
          body="When CloudDesk sends the clean copy, every agreed term is checked against it clause by clause, and each difference is priced from our own data."
        />
      </SirionCard>
    );
  }

  const result = signingCheck(rows, v6, cloudDeskDeal);
  const open = result.gaps.filter((g) => {
    const row = rows.find((r) => r.id === g.rowId);
    return row?.signing !== 'inserted' && row?.signing !== 'waived';
  });
  const fixed = rows.filter((r) => r.signing === 'inserted');
  const waived = rows.filter((r) => r.signing === 'waived');
  const openTotal = open.reduce((s, g) => s + (g.costLakhPerYr ?? 0), 0);

  /** Gaps first, then the rows that already match, in one typed list. */
  const items: {
    rowId: string;
    label: string;
    agreedPlain: string;
    clauseNo: string;
    docPlain?: string;
    note?: string;
    cost: number | null;
    isMatch: boolean;
  }[] = [
    ...result.gaps.map((g) => ({
      rowId: g.rowId,
      label: g.label,
      agreedPlain: g.agreedPlain,
      clauseNo: g.clauseNo,
      docPlain: g.docPlain,
      note: g.note,
      cost: g.costLakhPerYr,
      isMatch: false,
    })),
    ...result.matches.map((m) => ({
      rowId: m.rowId,
      label: m.label,
      agreedPlain: m.agreedPlain,
      clauseNo: m.clauseNo,
      note: m.note,
      cost: null,
      isMatch: true,
    })),
  ];

  return (
    <div className="space-y-4">
      <SirionCard
        title="Signing check"
        caption={`${v6.fileName} · deal ID found in the file: ${result.dealIdTag}`}
      >
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <Figure
            label={open.length ? 'Still missing' : 'Nothing missing'}
            value={open.length ? formatLakh(openTotal) : '—'}
            caption={`${open.length} of ${rows.length} rows`}
            tone={open.length ? 'danger' : 'teal'}
          />
          <Figure label="Fixed in our copy" value={String(fixed.length)} caption="tracked changes" />
          <Figure label="Waived with a reason" value={String(waived.length)} caption="on the record" />
          <Figure
            label="Matched as sent"
            value={String(result.matches.length)}
            caption="no change needed"
          />
        </div>
        {sentBackAt && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-mint px-3 py-1.5 text-[12px] font-medium text-teal-900">
            <Check size={13} strokeWidth={3} />
            v7 sent back to CloudDesk with the tracked changes
          </p>
        )}
        <div className="mt-4">
          <Link href="/word/v6">
            <Button>Open the signing copy in Word</Button>
          </Link>
        </div>
      </SirionCard>

      <SirionCard title="Row by row" bodyClassName="px-0 pb-0 pt-0">
        <div className="divide-y divide-line">
          {items.map((item) => {
            const row = rows.find((r) => r.id === item.rowId);
            if (!row) return null;
            return (
              <div key={item.rowId} className="flex flex-wrap items-start gap-x-6 gap-y-2 px-6 py-4">
                <div className="w-40 shrink-0">
                  <p className="text-[13px] font-medium text-ink">{item.label}</p>
                  <div className="mt-1">
                    <StatePill state={row.state} />
                  </div>
                </div>
                <div className="min-w-[220px] flex-1">
                  <p className="text-[12.5px] text-ink">
                    Agreed: <strong className="font-medium">{item.agreedPlain}</strong>
                  </p>
                  {!item.isMatch && (
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      Clause {item.clauseNo} of the signing copy says{' '}
                      <strong className="font-medium text-danger">{item.docPlain}</strong>
                    </p>
                  )}
                  {item.note && <p className="mt-1 text-[11.5px] text-muted">{item.note}</p>}
                </div>
                <div className="w-32 shrink-0 text-right">
                  {item.isMatch ? (
                    <span className="inline-flex items-center gap-1 text-[12px] text-teal-900">
                      <Check size={13} strokeWidth={3} /> Matches
                    </span>
                  ) : (
                    <MoneyPlain lakh={item.cost} size="sm" suffix={null} tone="danger" />
                  )}
                </div>
                <div className="w-48 shrink-0">
                  <SourceChip source={row.source} />
                </div>
              </div>
            );
          })}
        </div>
      </SirionCard>
    </div>
  );
}

function Figure({
  label,
  value,
  caption,
  tone = 'teal',
}: {
  label: string;
  value: string;
  caption: string;
  tone?: 'teal' | 'danger';
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 text-[24px] font-semibold ${
          tone === 'danger' ? 'text-danger' : 'text-teal-900'
        }`}
      >
        {value}
      </p>
      <p className="text-[11.5px] text-muted">{caption}</p>
    </div>
  );
}
