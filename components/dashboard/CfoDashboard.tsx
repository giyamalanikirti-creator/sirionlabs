'use client';

import { Check, X } from 'lucide-react';
import { KpiTile, PageHeader, SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { SourceChip } from '@/components/sirion/SourceChip';
import { StatePill } from '@/components/sirion/StatePill';
import { useLedger } from '@/lib/useDeal';
import { useDemo } from '@/lib/store';
import { plainValue } from '@/lib/plain';
import { formatLakh } from '@/lib/format';
import { personName } from '@/lib/data';
import { termCommitmentLakh } from '@/lib/engines/pricing';
import { cloudDeskDeal } from '@/lib/data';
import { shiftText } from '@/lib/demo/timeShift';

/** Illustrative approvals from other deals, so the page is not a single row. */
const OTHER_APPROVALS = [
  { deal: 'BrightStaff Services', term: 'Term', position: '2 years', amount: '₹1.7 crore', at: shiftText('28 Oct 2026') },
  { deal: 'CloudOps Suite', term: 'Term', position: '3 years', amount: '₹1.3 crore', at: shiftText('14 Oct 2026') },
];

export function CfoDashboard() {
  const { rows } = useLedger();
  const signing = useDemo((s) => s.signing);
  const signedAt = useDemo((s) => s.signedAt);

  const approvedByMe = rows.filter((r) => r.approvedBy?.personId === 'neha');
  const conditional = rows.find((r) => r.approvedBy?.condition);
  const priceRow = rows.find((r) => r.termKey === 'price');

  const priceAgreed = priceRow?.state === 'agreed' || priceRow?.state === 'missing_at_signing';
  const gapAtSigning = priceRow?.signing === 'gap' || priceRow?.signing === 'inserted';
  const fixedInSigned =
    priceRow?.signing === 'inserted' || Boolean(signedAt) || signing.inserted.includes('price');

  return (
    <>
      <PageHeader
        title="Approvals on record"
        caption="Every commitment you approved, with the email it was approved in."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiTile
          label="Commitments approved this quarter"
          value="₹4.6 crore"
          caption="Across 5 supplier deals · demo data"
        />

        <SirionCard title="Conditions to watch" className="lg:col-span-2">
          {conditional ? (
            <div className="rounded-lg border border-line p-4">
              <p className="text-[13px] text-ink">
                <strong className="font-semibold">CloudDesk</strong> ·{' '}
                <span className="italic text-ink/80">“{conditional.approvedBy!.condition}”</span>
              </p>
              <p className="mt-1 text-[11.5px] text-muted">
                You approved {formatLakh(termCommitmentLakh(cloudDeskDeal))} over{' '}
                {cloudDeskDeal.termYears} years on that condition.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Condition label="Price: agreed" ok={priceAgreed} />
                <Condition
                  label="No gap at signing"
                  ok={!gapAtSigning || fixedInSigned}
                  pending={!signing.checkedAt}
                />
                <Condition
                  label="Fixed in the signed copy"
                  ok={fixedInSigned}
                  pending={!signing.checkedAt}
                />
              </div>
              <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-[17px] text-muted">
                This updates as the deal moves. If the price ends up open to a yearly revision, the
                condition behind your approval has not been met.
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-muted">No conditional approvals on record.</p>
          )}
        </SirionCard>
      </div>

      <SirionCard title="Your approvals" className="mt-4" bodyClassName="px-0 pb-0 pt-0">
        <Table>
          <thead>
            <tr>
              <Th>Deal</Th>
              <Th>Term</Th>
              <Th>Position</Th>
              <Th>State</Th>
              <Th>Condition</Th>
              <Th>Approved in</Th>
            </tr>
          </thead>
          <tbody>
            {approvedByMe.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-page/60">
                <Td className="font-medium">CloudDesk</Td>
                <Td>{r.label}</Td>
                <Td className="text-ink/80">{plainValue(r.position)}</Td>
                <Td>
                  <StatePill state={r.state} condition={r.condition?.text} />
                </Td>
                <Td className="text-ink/80">{r.approvedBy?.condition ?? '–'}</Td>
                <Td>
                  <SourceChip source={r.approvedBy!.source} />
                </Td>
              </tr>
            ))}
            {OTHER_APPROVALS.map((a) => (
              <tr key={a.deal} className="text-muted">
                <Td className="font-medium">{a.deal}</Td>
                <Td>{a.term}</Td>
                <Td>{a.position}</Td>
                <Td>
                  <StatePill state="agreed" />
                </Td>
                <Td>–</Td>
                <Td className="text-[11.5px]">Email · {a.at} · demo data</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="px-6 py-3 text-[11.5px] text-muted">
          Approvals come from emails copied to {`deals@meridian.example`}. The approver's own words
          are stored, not a summary. Open a chip to read them.
        </p>
      </SirionCard>

      <p className="mt-4 text-[11px] text-muted">
        Showing the record as {personName('neha')}, CFO.
      </p>
    </>
  );
}

function Condition({ label, ok, pending }: { label: string; ok: boolean; pending?: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
        <span className="h-[14px] w-[14px] rounded-full border border-dashed border-muted" />
        {label}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12.5px] ${
        ok ? 'text-teal-900' : 'text-danger'
      }`}
    >
      {ok ? <Check size={14} strokeWidth={2.6} /> : <X size={14} strokeWidth={2.6} />}
      {label}
    </span>
  );
}
