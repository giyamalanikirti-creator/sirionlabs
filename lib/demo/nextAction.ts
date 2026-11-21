/**
 * The next action for each live negotiation (review fix C12): generated from
 * the deal's top open item, so a ₹ figure always comes with what to do. Pure.
 */
import type { Deal, LedgerRow, TermKey } from '@/lib/types';
import { cloudDeskDeal, versionById } from '@/lib/data';
import { signingCheck } from '@/lib/engines/signing';
import { worstThreat } from '@/lib/engines/atRisk';
import { STEP_CLOCK } from './steps';
import { SCRIPTED_DEALS } from './moreDeals';

export interface NextAction {
  label: string;
  href: string;
}

export interface NextActionState {
  clock: string;
  ledger: LedgerRow[];
  signedAt?: string;
  signing: { inserted: TermKey[]; waived: { termKey: TermKey }[] };
}

const lower = (label: string) => (label === 'Annual price' ? 'price' : label.toLowerCase());

export function nextActionFor(deal: Deal, s: NextActionState): NextAction {
  if (deal.id === cloudDeskDeal.id) {
    if (s.signedAt) return { label: 'See handover', href: '/contracts/C-2026-0417?tab=obligations' };
    if (s.clock >= STEP_CLOCK[4]) {
      const fixed = (t: TermKey) => s.signing.inserted.includes(t) || s.signing.waived.some((w) => w.termKey === t);
      const gaps = signingCheck(s.ledger, versionById('v6')!, deal).gaps.filter((g) => !fixed(g.termKey));
      if (gaps.length) return { label: 'Review signing copy', href: `/word/v6?from=sirion&clause=${gaps.find((g) => g.termKey === 'payment')?.clauseNo ?? gaps[0].clauseNo}` };
    }
    const unsure = s.ledger.find((r) => r.state === 'needs_confirmation' || r.state === 'open');
    if (unsure) return { label: `Confirm ${lower(unsure.label)}`, href: `/deals/${deal.id}?row=${unsure.id}` };
    const threatened = s.ledger.find((r) => worstThreat(r, deal));
    if (threatened) return { label: `Restore ${lower(threatened.label)}`, href: `/deals/${deal.id}?row=${threatened.id}` };
    return { label: 'Open deal', href: `/deals/${deal.id}` };
  }
  if (deal.id === 'D-BRIGHTSTAFF') return { label: 'Resolve Schedule 2 conflict', href: '/deals/D-BRIGHTSTAFF' };
  const scripted = SCRIPTED_DEALS[deal.id];
  const open = scripted?.rows.find((r) => r.state !== 'agreed');
  if (open) return { label: `Confirm ${lower(open.label)}`, href: `/deals/${deal.id}` };
  const d = deal.display;
  if (d?.rows.needs) return { label: d.rows.needs === 1 ? 'Confirm 1 term' : `Confirm ${d.rows.needs} terms`, href: `/deals/${deal.id}` };
  if (d?.rows.reopened) return { label: 'Review reopened term', href: `/deals/${deal.id}` };
  if (deal.stage === 'signing') return { label: 'Review signing copy', href: `/deals/${deal.id}` };
  return { label: 'Open deal', href: `/deals/${deal.id}` };
}
