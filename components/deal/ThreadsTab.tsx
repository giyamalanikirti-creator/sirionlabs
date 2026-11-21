'use client';

import { Check, X } from 'lucide-react';
import { SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { deals, messages, threadById, threads, versions } from '@/lib/data';
import { matchAllThreads, toHeader } from '@/lib/engines/matcher';
import { HEADERS_CHECKED } from '@/lib/settings';

const SHOWN = ['T1', 'T3', 'T4', 'T2', 'D3', 'D4', 'D1', 'D2'];

export function ThreadsTab() {
  const hydrated = useHydrated();
  const linked = useDemo((s) => s.linkedThreadIds);
  const dismissed = useDemo((s) => s.dismissedThreadIds);

  const headers = messages.map(toHeader);
  const matches = matchAllThreads(headers, deals, versions);

  const rows = SHOWN.map((id) => {
    const thread = threads.find((t) => t.id === id) ?? threadById(id);
    const m = matches[id];
    const isLinked = thread?.dealId === 'D-CLOUDDESK' || (hydrated && linked.includes(id));
    const isDismissed = hydrated && dismissed.includes(id);
    const forThisDeal = m?.dealId === 'D-CLOUDDESK';
    const bodyRead = isLinked && forThisDeal;
    return { id, thread, m, isLinked, isDismissed, forThisDeal, bodyRead };
  });

  const matched = rows.filter((r) => r.forThisDeal && r.m.strength !== 'none');
  const matchedMessages = messages.filter((msg) =>
    matched.some((r) => r.id === msg.threadId),
  ).length;

  return (
    <SirionCard
      title="Threads"
      caption="How each thread was matched to this deal, and whether anyone read a word of it."
      bodyClassName="px-0 pb-0 pt-0"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line px-6 pb-4 pt-1 text-[12.5px]">
        <Stat value={HEADERS_CHECKED} label="emails checked by sender and recipient only" />
        <Stat value={matchedMessages} label="matched to this deal" />
        <Stat value={0} label="personal or internal emails read" />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Thread</Th>
            <Th align="center">Supplier domain</Th>
            <Th align="center">Contract file</Th>
            <Th align="center">Deal ID</Th>
            <Th align="center">Subject</Th>
            <Th align="center">deals@</Th>
            <Th>Strength</Th>
            <Th>Status</Th>
            <Th>Body read?</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, thread, m, isLinked, isDismissed, forThisDeal, bodyRead }) => (
            <tr key={id} className="transition-colors hover:bg-page/60">
              <Td>
                <span className="block font-medium text-ink">{thread?.subject ?? id}</span>
                <span className="text-[11px] text-muted">{id}</span>
              </Td>
              <Signal on={m.signals.supplierDomain} />
              <Signal on={m.signals.fingerprint} />
              <Signal on={m.signals.dealIdTag} />
              <Signal on={m.signals.subjectName} />
              <Signal on={m.signals.captureAddress} />
              <Td>
                <StrengthPill strength={m.strength} />
              </Td>
              <Td className="text-[12px]">
                {isDismissed ? (
                  <span className="text-muted">Not this deal</span>
                ) : !forThisDeal ? (
                  <span className="text-muted">
                    {m.dealId ? `Matched to ${m.dealId.replace('D-', '')}` : 'Ignored'}
                  </span>
                ) : isLinked ? (
                  <span className="text-teal-900">Linked</span>
                ) : (
                  <span className="text-amber-fg">Waiting for you</span>
                )}
              </Td>
              <Td className="text-[12px]">
                {bodyRead ? (
                  <span className="text-ink">Yes</span>
                ) : (
                  <span className="text-muted">No, headers only</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <p className="px-6 py-4 text-[11.5px] leading-[17px] text-muted">
        Matching sees sender, recipients, subject and attachment fingerprints, never a body. A
        body is read only when the thread is a strong match, or after the lead links a weak one.
        That is why the offsite thread and the laptop quotes match nothing and are never opened.
      </p>
    </SirionCard>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <strong className="text-[15px] font-semibold text-teal-900">{value}</strong>
      <span className="text-muted">{label}</span>
    </span>
  );
}

function Signal({ on }: { on: boolean }) {
  return (
    <Td align="center">
      {on ? (
        <Check size={14} className="mx-auto text-teal-900" strokeWidth={2.6} />
      ) : (
        <X size={14} className="mx-auto text-muted/50" strokeWidth={2.2} />
      )}
    </Td>
  );
}

function StrengthPill({ strength }: { strength: 'strong' | 'weak' | 'none' }) {
  const map = {
    strong: 'bg-mint text-teal-900',
    weak: 'bg-lime text-ink',
    none: 'border border-line bg-white text-muted',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-medium ${map[strength]}`}>
      {strength === 'none' ? 'No match' : strength === 'weak' ? 'Weak' : 'Strong'}
    </span>
  );
}
