'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { Button, SirionCard, Tabs } from '@/components/sirion/ui';
import { MoneyPlain } from '@/components/sirion/MoneyFigure';
import { useLedger } from '@/lib/useDeal';
import { useDemo } from '@/lib/store';
import { cloudDeskDeal, personName } from '@/lib/data';
import { formatLakh, formatDateLong } from '@/lib/format';
import { LedgerTab } from './LedgerTab';
import { RoundsTab } from './RoundsTab';
import { ThreadsTab } from './ThreadsTab';
import { SigningTab } from './SigningTab';
import { ActivityTab } from './ActivityTab';

const STAGES = ['Rounds', 'Signing', 'Signed', 'In Sirion'] as const;

export function DealPage() {
  const [tab, setTab] = useState('ledger');
  const { rows, atRisk, counts, signed } = useLedger();
  const contract = useDemo((s) => s.contract);
  const sentBackAt = useDemo((s) => s.signing.sentBackAt);
  const checkedAt = useDemo((s) => s.signing.checkedAt);

  const deal = cloudDeskDeal;
  const stageIndex = contract ? 3 : signed ? 2 : checkedAt || sentBackAt ? 1 : 0;

  return (
    <>
      <SirionCard className="mb-4" bodyClassName="px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[20px] text-teal-title">CloudDesk renewal 2026–29</h1>
            <p className="mt-1.5 text-[12.5px] text-muted">
              {formatLakh(deal.annualFeeInr / 1e5)} a year · {deal.seats} seats · {deal.termYears}{' '}
              years from {formatDateLong(deal.termStart)}
            </p>
            <p className="mt-1 text-[12.5px] text-muted">
              Owner <span className="text-ink">{personName(deal.ownerId)}</span> · Business owner{' '}
              <span className="text-ink">{personName(deal.businessOwnerId!)}</span>
            </p>

            <ol className="mt-4 flex flex-wrap items-center gap-1.5">
              {STAGES.map((s, i) => {
                const done = i < stageIndex;
                const now = i === stageIndex;
                return (
                  <li key={s} className="flex items-center gap-1.5">
                    <span
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-[4px] text-[11.5px] font-medium',
                        now
                          ? 'bg-teal-900 text-white'
                          : done
                            ? 'bg-mint text-teal-900'
                            : 'border border-line bg-white text-muted',
                      ].join(' ')}
                    >
                      {done && <Check size={11} strokeWidth={3} />}
                      {s}
                    </span>
                    {i < STAGES.length - 1 && <span className="text-muted/40">→</span>}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            <div className="text-right">
              <MoneyPlain lakh={signed ? 0 : atRisk} size="xl" suffix={null} tone={atRisk > 0 ? 'danger' : 'teal'} />
              <p className="mt-0.5 text-[12px] text-muted">
                {signed ? 'at risk — signed and enforced' : 'a year at risk right now'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/outlook/ananya">
                <Button>
                  Open in Outlook
                  <ArrowUpRight size={13} />
                </Button>
              </Link>
              {signed && !contract && <SaveToSirionButton />}
              {contract && (
                <Link href={`/contracts/${contract.id}`}>
                  <Button variant="primary">Open contract record</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </SirionCard>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'ledger', label: 'Ledger', badge: counts.needs + counts.reopened },
          { id: 'rounds', label: 'Rounds' },
          { id: 'threads', label: 'Threads' },
          { id: 'signing', label: 'Signing' },
          { id: 'activity', label: 'Activity' },
        ]}
      />

      <div className="mt-4">
        {tab === 'ledger' && <LedgerTab rows={rows} />}
        {tab === 'rounds' && <RoundsTab rows={rows} />}
        {tab === 'threads' && <ThreadsTab />}
        {tab === 'signing' && <SigningTab rows={rows} />}
        {tab === 'activity' && <ActivityTab />}
      </div>
    </>
  );
}

function SaveToSirionButton() {
  const saveToSirion = useDemo((s) => s.saveToSirion);
  const toast = useDemo((s) => s.toast);
  return (
    <Button
      variant="primary"
      onClick={() => {
        saveToSirion();
        toast('Agreed terms handed over to Sirion.');
      }}
    >
      Save to Sirion
    </Button>
  );
}
