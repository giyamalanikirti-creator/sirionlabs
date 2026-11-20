import { notFound } from 'next/navigation';
import { FullLedger } from '@/components/ledger/FullLedger';
import { OtherDealPage } from '@/components/deal/OtherDealPage';
import { dealById } from '@/lib/data';

/** The full ledger for a deal: /deals/D-CLOUDDESK/ledger. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'D-CLOUDDESK') return <FullLedger />;
  const deal = dealById(id);
  if (!deal) notFound();
  return <OtherDealPage deal={deal} />;
}
