'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import {
  PageHeader,
  SirionCard,
  Table,
  TableFooter,
  Td,
  Th,
} from '@/components/sirion/ui';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { pastContracts } from '@/lib/data';
import { formatDateLong, formatLakh } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = {
  software: 'Software',
  staffing: 'Staffing',
  logistics: 'Logistics',
  facilities: 'Facilities',
  consultants: 'Consultants',
  marketing: 'Marketing',
};

export default function ContractsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const contract = useDemo((s) => s.contract);
  const toast = useDemo((s) => s.toast);
  const [query, setQuery] = useState('');

  const rows = pastContracts.filter((c) =>
    `${c.name} ${c.supplier} ${c.id}`.toLowerCase().includes(query.toLowerCase()),
  );

  const showNew = hydrated && contract;

  return (
    <>
      <PageHeader
        title="Contracts"
        caption="Signed agreements, with the obligations and invoice rules created from them."
      />

      <SirionCard bodyClassName="px-0 pb-0 pt-0">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex w-full max-w-xs items-center gap-2 rounded-md border border-line bg-page px-3 py-[6px]">
            <Search size={13} className="shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contracts"
              className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-muted"
            />
          </div>
          <span className="whitespace-nowrap text-[11.5px] text-muted">
            {rows.length + (showNew ? 1 : 0)} contracts
          </span>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Contract</Th>
              <Th>ID</Th>
              <Th>Type</Th>
              <Th align="right">Value / yr</Th>
              <Th>Term</Th>
              <Th>Status</Th>
              <Th>Owner</Th>
            </tr>
          </thead>
          <tbody>
            {showNew && contract && (
              <tr
                onClick={() => router.push(`/contracts/${contract.id}`)}
                className="cursor-pointer bg-mint/20 transition-colors hover:bg-mint/30"
              >
                <Td>
                  <span className="flex items-center gap-2">
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-teal-900" title="New" />
                    <span className="font-medium text-ink">{contract.title}</span>
                  </span>
                </Td>
                <Td className="text-teal-900">{contract.id}</Td>
                <Td className="text-muted">Software</Td>
                <Td align="right">{formatLakh(contract.annualFeeInr / 1e5)}</Td>
                <Td className="text-muted">
                  {formatDateLong(contract.startDate)} – {formatDateLong(contract.endDate)}
                </Td>
                <Td>
                  <span className="rounded-full bg-mint px-2.5 py-[3px] text-[11px] font-medium text-teal-900">
                    Active
                  </span>
                </Td>
                <Td className="text-muted">Ananya Rao</Td>
              </tr>
            )}

            {rows.map((c) => (
              <tr
                key={c.id}
                onClick={() => toast('Demo: only the CloudDesk record is interactive')}
                className="cursor-pointer transition-colors hover:bg-page/60"
              >
                <Td className="font-medium">{c.name}</Td>
                <Td className="text-muted">{c.id}</Td>
                <Td className="text-muted">{TYPE_LABEL[c.type] ?? c.type}</Td>
                <Td align="right">{formatLakh(c.annualFeeInr / 1e5)}</Td>
                <Td className="text-muted">
                  {formatDateLong(c.startDate)} – {formatDateLong(c.endDate)}
                </Td>
                <Td>
                  <StatusChip status={c.status} />
                </Td>
                <Td className="text-muted">{c.owner}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <TableFooter total={rows.length + (showNew ? 1 : 0)} />
      </SirionCard>
    </>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-mint text-teal-900',
    expiring: 'bg-lime text-ink',
    expired: 'border border-line bg-white text-muted',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-medium ${map[status]}`}>
      {status === 'expiring' ? 'Expiring' : status === 'active' ? 'Active' : 'Expired'}
    </span>
  );
}
