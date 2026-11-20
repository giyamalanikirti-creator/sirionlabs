'use client';

import dynamic from 'next/dynamic';

const IntegratedAppsMock = dynamic(() => import('@/components/outlook/M365Mocks').then((m) => m.IntegratedAppsMock), { ssr: false });

export default function Page() {
  return <IntegratedAppsMock />;
}
