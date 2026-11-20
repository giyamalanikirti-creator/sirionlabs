'use client';

/** A read-only record for the contracts already in Sirion, so every row on /contracts opens. */
import Link from 'next/link';
import { SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { invoices, serviceEvents } from '@/lib/engines/stats';
import { formatDateLong, formatInr, formatLakh } from '@/lib/format';
import type { PastContract } from '@/lib/types';

const PRICE: Record<string, string> = {
  fixed: 'Fixed for the term',
  capped_5: 'Yearly revision, capped at 5%',
  open_yearly: 'Yearly revision, no cap',
};

export function PastContractView({ contract }: { contract: PastContract }) {
  const rows = invoices.filter((i) => i.contractId === contract.id).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
  const uptime = serviceEvents.filter((e) => e.contractId === contract.id).slice(-6);
  return (
    <>
      <SirionCard className="mb-4" bodyClassName="px-6 py-5">
        <p className="text-[11.5px] text-muted">
          <Link href="/contracts" className="hover:underline">Contracts</Link> / {contract.id}
        </p>
        <h1 className="mt-1 text-[20px] text-teal-title">{contract.name}</h1>
        <p className="mt-1.5 text-[12.5px] text-muted">
          {contract.id} · {formatLakh(contract.annualFeeInr / 1e5)} a year · {formatDateLong(contract.startDate)} – {formatDateLong(contract.endDate)} · Owner {contract.owner}
        </p>
      </SirionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SirionCard title="Key terms" caption="Read-only in this demo. These contracts are the history the ₹ estimates are built from.">
          <dl className="space-y-2 text-[12.5px]">
            <Line label="Price">{contract.priceWording ? PRICE[contract.priceWording] : '—'}</Line>
            <Line label="Renewal notice">{contract.noticeDays ? `${contract.noticeDays} days` : '—'}</Line>
            <Line label="Auto-renews">{contract.autoRenew ? 'Yes' : 'No'}</Line>
            <Line label="Status">{contract.status === 'expiring' ? 'Expiring' : contract.status === 'active' ? 'Active' : 'Expired'}</Line>
          </dl>
        </SirionCard>
        <SirionCard title="Recent invoices" bodyClassName="px-0 pb-0 pt-0">
          {rows.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Month</Th>
                  <Th align="right">Unit price</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.month}>
                    <Td>{r.month}</Td>
                    <Td align="right">{formatInr(r.unitPriceInr)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="px-6 py-4 text-[12.5px] text-muted">No invoice history for this contract.</p>
          )}
          {uptime.length > 0 && (
            <p className="px-6 py-3 text-[11.5px] text-muted">
              Uptime, last {uptime.length} months: {uptime.map((u) => `${u.uptimePct}%`).join(' · ')}
            </p>
          )}
        </SirionCard>
      </div>
    </>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 pb-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
