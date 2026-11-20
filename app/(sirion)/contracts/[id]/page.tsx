'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { ContractRecord } from '@/components/contract/ContractRecord';

function Inner() {
  const params = useSearchParams();
  return <ContractRecord key={params.get('tab')} initialTab={params.get('tab') ?? 'overview'} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
