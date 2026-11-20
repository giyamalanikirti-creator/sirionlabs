'use client';

import dynamic from 'next/dynamic';

const ConsentMock = dynamic(() => import('@/components/outlook/M365Mocks').then((m) => m.ConsentMock), { ssr: false });

export default function Page() {
  return <ConsentMock />;
}
