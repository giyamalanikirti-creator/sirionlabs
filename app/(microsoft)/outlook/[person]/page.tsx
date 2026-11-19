'use client';

import { Suspense, use } from 'react';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

// Client-side only, so Griffel never runs through SSR (§3).
const OutlookApp = dynamic(
  () => import('@/components/outlook/OutlookApp').then((m) => m.OutlookApp),
  { ssr: false, loading: () => <div style={{ padding: 24, fontSize: 13 }}>Loading Outlook…</div> },
);

export default function OutlookPage({ params }: { params: Promise<{ person: string }> }) {
  const { person } = use(params);
  if (person !== 'ananya' && person !== 'vikram') notFound();

  return (
    <Suspense fallback={<div style={{ padding: 24, fontSize: 13 }}>Loading Outlook…</div>}>
      <OutlookApp person={person} />
    </Suspense>
  );
}
