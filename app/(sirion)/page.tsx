'use client';

import { useDemo } from '@/lib/store';
import { LeadDashboard } from '@/components/dashboard/LeadDashboard';
import { ItHeadDashboard } from '@/components/dashboard/ItHeadDashboard';
import { CfoDashboard } from '@/components/dashboard/CfoDashboard';
import { LegalDashboard } from '@/components/dashboard/LegalDashboard';
import { useHydrated } from '@/lib/useHydrated';

export default function DashboardPage() {
  const hydrated = useHydrated();
  const role = useDemo((s) => s.sirionRole);
  const current = hydrated ? role : 'lead';

  if (current === 'it_head') return <ItHeadDashboard />;
  if (current === 'cfo') return <CfoDashboard />;
  if (current === 'legal') return <LegalDashboard />;
  return <LeadDashboard />;
}
