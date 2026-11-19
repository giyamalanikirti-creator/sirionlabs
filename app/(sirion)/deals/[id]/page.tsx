'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { DealPage } from '@/components/deal/DealPage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  if (id !== 'D-CLOUDDESK') notFound();
  return <DealPage />;
}
