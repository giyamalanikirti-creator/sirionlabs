import { notFound } from 'next/navigation';
import { DealPage } from '@/components/deal/DealPage';
import { OtherDealPage } from '@/components/deal/OtherDealPage';
import { dealById } from '@/lib/data';

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ row?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { row, tab } = await searchParams;
  if (id === 'D-CLOUDDESK') return <DealPage key={`${row}-${tab}`} initialRow={row} initialTab={tab} />;
  const deal = dealById(id);
  if (!deal) notFound();
  return <OtherDealPage deal={deal} />;
}
