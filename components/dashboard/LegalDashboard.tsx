'use client';

import { PageHeader, SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { SourceChip } from '@/components/sirion/SourceChip';
import { StatePill, SigningBadge } from '@/components/sirion/StatePill';
import { useLedger } from '@/lib/useDeal';
import { plainValue } from '@/lib/plain';

/** Illustrative Legal-owned rows on other deals. */
const OTHER_ROWS = [
  { deal: 'BrightStaff Services', term: 'Liability cap', position: "12 months' fees", signing: 'match' },
  { deal: 'Kaveri Consulting', term: 'Indemnity', position: 'Mutual, capped', signing: 'match' },
  { deal: 'DataVault', term: 'Data protection', position: 'Standard DPA', signing: undefined },
];

export function LegalDashboard() {
  const { rows } = useLedger();
  const legalRows = rows.filter((r) => r.owner === 'legal');

  return (
    <>
      <PageHeader
        title="Legal-owned terms"
        caption="The rows Legal signed off, and whether the signing copy still matches them."
      />

      <SirionCard title="Your rows across open deals" bodyClassName="px-0 pb-0 pt-0">
        <Table>
          <thead>
            <tr>
              <Th>Deal</Th>
              <Th>Term</Th>
              <Th>Position</Th>
              <Th>State</Th>
              <Th>At signing</Th>
              <Th>Approved in</Th>
            </tr>
          </thead>
          <tbody>
            {legalRows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-page/60">
                <Td className="font-medium">CloudDesk</Td>
                <Td>{r.label}</Td>
                <Td className="text-ink/80">{plainValue(r.position)}</Td>
                <Td>
                  <StatePill state={r.state} condition={r.condition?.text} />
                </Td>
                <Td>
                  {r.signing ? (
                    <SigningBadge signing={r.signing} />
                  ) : (
                    <span className="text-[11.5px] text-muted">Not checked yet</span>
                  )}
                </Td>
                <Td>{r.approvedBy ? <SourceChip source={r.approvedBy.source} /> : '–'}</Td>
              </tr>
            ))}
            {OTHER_ROWS.map((r) => (
              <tr key={r.deal} className="text-muted">
                <Td className="font-medium">{r.deal}</Td>
                <Td>{r.term}</Td>
                <Td>{r.position}</Td>
                <Td>
                  <StatePill state="agreed" />
                </Td>
                <Td>{r.signing ? <SigningBadge signing={r.signing} /> : <span className="text-[11.5px]">Not checked yet</span>}</Td>
                <Td className="text-[11.5px]">demo data</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="px-6 py-3 text-[11.5px] leading-[17px] text-muted">
          Legal-owned rows carry no ₹ figure. They are checked against the signing copy in exactly
          the same way as the money terms, so a quiet edit to clause 12.1 would surface here too.
        </p>
      </SirionCard>
    </>
  );
}
