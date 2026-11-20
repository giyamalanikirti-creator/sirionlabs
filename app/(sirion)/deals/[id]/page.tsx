import { notFound } from 'next/navigation';
import { DealPage } from '@/components/deal/DealPage';

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ row?: string }>;
}) {
  const { id } = await params;
  const { row } = await searchParams;
  if (id !== 'D-CLOUDDESK') notFound();
  return <DealPage key={row} initialRow={row} />;
}
