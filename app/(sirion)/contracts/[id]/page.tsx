'use client';

import { Suspense, use } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { ContractRecord } from '@/components/contract/ContractRecord';
import { PastContractView } from '@/components/contract/PastContractView';
import { pastContracts } from '@/lib/data';
import { CONTRACT_ID } from '@/lib/settings';

function Inner() {
  const params = useSearchParams();
  return <ContractRecord key={params.get('tab')} initialTab={params.get('tab') ?? 'overview'} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  if (id !== CONTRACT_ID) {
    const past = pastContracts.find((c) => c.id === id);
    if (!past) notFound();
    return <PastContractView contract={past} />;
  }
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
