'use client';

import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { PageHeader, SirionCard, Table, Td, Th } from '@/components/sirion/ui';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { deals, people } from '@/lib/data';
import { CFO_THRESHOLD_LAKH } from '@/lib/engines/approvals';
import { formatLakh } from '@/lib/format';

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-teal-900' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

/** Privacy and admin: what is read, what is kept, and who sees what. The toggles change the demo. */
export default function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useDemo((s) => s.settings);
  const update = useDemo((s) => s.updateSettings);
  const tracked = useDemo((s) => s.trackedDealIds).includes('D-CLOUDDESK');
  const linked = useDemo((s) => s.linkedThreadIds);
  const dealPeople = useDemo((s) => s.dealPeople);
  const stopTracking = useDemo((s) => s.stopTracking);
  const trackDeal = useDemo((s) => s.trackDeal);
  const undoLink = useDemo((s) => s.undoLink);
  const removePerson = useDemo((s) => s.removePersonFromDeal);
  const meridian = people.filter((p) => p.org === 'meridian');

  if (!hydrated) return null;

  return (
    <>
      <PageHeader title="Privacy and admin" caption="What Deal Ledger reads, what it keeps, and who can see what. Changes here apply to the demo straight away." />

      <div className="grid gap-4 lg:grid-cols-2">
        <SirionCard title="Connected mailboxes" caption="Only these mailboxes are read. Turn one off and its Outlook pane and Send check stop.">
          <ul className="divide-y divide-line">
            {meridian.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[12.5px]">
                <span>
                  <span className="font-medium text-ink">{p.name}</span> <span className="text-muted">· {p.role} · {p.email}</span>
                </span>
                <Toggle
                  label={`Read ${p.name}'s mailbox`}
                  on={Boolean(settings.mailboxes[p.id])}
                  onChange={(v) => update({ mailboxes: { ...settings.mailboxes, [p.id]: v } })}
                />
              </li>
            ))}
          </ul>
        </SirionCard>

        <SirionCard title="What is read" caption="Header first: a thread's body is read only once it is matched to a supplier with a live deal">
          <ul className="space-y-2 text-[12.5px] leading-[19px]">
            <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-900" /> Threads with a recipient or sender on a live deal&apos;s supplier domain</li>
            <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-900" /> Attachments that carry a known Deal ID or contract fingerprint</li>
            <li className="flex gap-2"><X size={14} className="mt-0.5 shrink-0 text-danger" /> Internal-only email is never read, and never checked at Send</li>
            <li className="flex gap-2"><X size={14} className="mt-0.5 shrink-0 text-danger" /> A weak match stays unread until someone links it; “Not this deal” means it is never read</li>
            <li className="flex gap-2"><X size={14} className="mt-0.5 shrink-0 text-danger" /> Instructions inside an email are never followed; the reader only returns typed terms with exact quotes</li>
          </ul>
          <p className="mb-1 mt-4 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Supplier domains read ({deals.length})</p>
          <p className="flex flex-wrap gap-1.5">
            {deals.map((d) => (
              <span key={d.id} className="rounded bg-page px-2 py-[2px] text-[11px] text-ink">{d.supplierDomain}</span>
            ))}
          </p>
        </SirionCard>

        <SirionCard title="Retention" caption="How long each thing is kept">
          <Table>
            <thead>
              <tr><Th>Data</Th><Th>Kept</Th></tr>
            </thead>
            <tbody>
              <tr><Td>Email bodies</Td><Td>Not stored. Read when needed; only the quoted line is kept.</Td></tr>
              <tr><Td>Quoted source lines and ledger history</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <select
                      value={settings.retentionYears}
                      onChange={(e) => update({ retentionYears: Number(e.target.value) })}
                      className="rounded-md border border-line px-2 py-1 text-[12px]"
                      aria-label="Retention in years"
                    >
                      {[3, 5, 7, 10].map((y) => <option key={y} value={y}>{y} years</option>)}
                    </select>
                    after the contract ends
                  </span>
                </Td>
              </tr>
              <tr><Td>Drafts checked at Send</Td><Td>Not stored. Checked in memory; only the outcome is logged.</Td></tr>
              <tr><Td>Links to threads marked “Not this deal”</Td><Td>The header match is deleted after 30 days.</Td></tr>
            </tbody>
          </Table>
        </SirionCard>

        <SirionCard title="Who sees what" caption="Procurement, Finance and Legal see everything. Business owners see what is agreed and the warning, not the internal workings.">
          <Table>
            <thead>
              <tr><Th>Role</Th><Th>Agreed terms</Th><Th>₹ figure</Th><Th>Cost workings</Th><Th>Fallbacks and limits</Th></tr>
            </thead>
            <tbody>
              <tr><Td>Procurement (Ananya)</Td><Td>Yes</Td><Td>Yes</Td><Td>Yes</Td><Td>Yes</Td></tr>
              <tr><Td>CFO (Neha)</Td><Td>Yes</Td><Td>Yes</Td><Td>Yes</Td><Td>Yes</Td></tr>
              <tr><Td>Legal (Arjun)</Td><Td>Yes</Td><Td>Yes</Td><Td>Yes</Td><Td>Legal terms</Td></tr>
              <tr>
                <Td>Business owners (Vikram)</Td><Td>Yes</Td><Td>In warnings</Td>
                <Td><Toggle label="Business owners see cost workings" on={settings.ownersSeeWorkings} onChange={(v) => update({ ownersSeeWorkings: v })} /></Td>
                <Td><Toggle label="Business owners see fallbacks" on={settings.ownersSeeFallbacks} onChange={(v) => update({ ownersSeeFallbacks: v })} /></Td>
              </tr>
              <tr><Td>The supplier</Td><Td>Only what is sent</Td><Td>Never</Td><Td>Never</Td><Td>Never</Td></tr>
            </tbody>
          </Table>
        </SirionCard>

        <SirionCard
          title="Tracked negotiations"
          caption="Off-ramps: stop tracking, unlink a thread, remove a person"
          className="lg:col-span-2"
          right={<Link href="/setup" className="text-[12px] font-medium text-teal-900 underline">Microsoft 365 connection ↗</Link>}
        >
          <div className="divide-y divide-line text-[12.5px]">
            <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span>
                <span className="font-medium text-ink">CloudDesk renewal 2026–29</span>{' '}
                <span className="text-muted">· clouddesk.example · {tracked ? 'email tracked' : 'not tracked'}</span>
              </span>
              {tracked ? (
                <button className="rounded-md border border-teal-900/45 bg-white font-semibold text-teal-900 shadow-sm transition-colors hover:border-teal-900 hover:bg-mint/40 px-2.5 py-1 text-[11.5px]" onClick={() => stopTracking('D-CLOUDDESK')}>
                  Stop tracking
                </button>
              ) : (
                <button className="rounded-md bg-teal-900 px-2.5 py-1 text-[11.5px] text-white" onClick={() => trackDeal('D-CLOUDDESK')}>
                  Track email
                </button>
              )}
            </div>
            <p className="py-2 text-[11.5px] text-muted">Stopping keeps the ledger and its sources; only future email stops being read.</p>
            {linked.includes('T2') && (
              <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>
                  Linked thread: <span className="font-medium text-ink">CloudDesk uptime in October</span>{' '}
                  <span className="text-muted">(Vikram Shah ↔ Rohan Iyer)</span>
                </span>
                <button className="rounded-md border border-teal-900/45 bg-white font-semibold text-teal-900 shadow-sm transition-colors hover:border-teal-900 hover:bg-mint/40 px-2.5 py-1 text-[11.5px]" onClick={() => undoLink('T2')}>
                  Unlink
                </button>
              </div>
            )}
            {(dealPeople['D-CLOUDDESK'] ?? []).map((id) => (
              <div key={id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>
                  On this deal: <span className="font-medium text-ink">{people.find((p) => p.id === id)?.name}</span>{' '}
                  <span className="text-muted">· only their clouddesk.example threads are read</span>
                </span>
                <button className="rounded-md border border-teal-900/45 bg-white font-semibold text-teal-900 shadow-sm transition-colors hover:border-teal-900 hover:bg-mint/40 px-2.5 py-1 text-[11.5px]" onClick={() => removePerson('D-CLOUDDESK', id)}>
                  Remove from deal
                </button>
              </div>
            ))}
          </div>
        </SirionCard>

        <SirionCard title="Approvals for concessions" caption="Accept theirs, Send anyway, a walk-away and a waived signing gap all raise a request" className="lg:col-span-2">
          <ul className="space-y-1.5 text-[12.5px]">
            <li>Below {formatLakh(CFO_THRESHOLD_LAKH)} a year: the procurement lead approves. If she raised it herself, it is logged as within her limit.</li>
            <li>{formatLakh(CFO_THRESHOLD_LAKH)} a year or more: the CFO approves.</li>
            <li>Legal-owned terms (liability): Legal approves any change, whatever the value.</li>
          </ul>
        </SirionCard>
      </div>
    </>
  );
}
