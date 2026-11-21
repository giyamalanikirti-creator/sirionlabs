'use client';

/**
 * Three separate states per person (review fix C10), so "member" never reads
 * as "monitored":
 *  - Add-in available: IT deployed Sirion for Outlook and Word to them;
 *  - Mailbox connected: an admin approved background access for this mailbox;
 *  - Negotiation tracked: the deal owner chose to track a thread they are on.
 */
import { CheckCircle2, CircleDashed, Mail, PlugZap, Radar } from 'lucide-react';
import { people } from '@/lib/data';
import { useDemo } from '@/lib/store';
import { Table, Td, Th } from './ui';

function State({ on, icon: Icon, label }: { on: boolean; icon: typeof Mail; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] ${on ? 'text-ink' : 'text-muted'}`} title={label}>
      {on ? <CheckCircle2 size={14} className="text-[#107C10]" /> : <CircleDashed size={14} />}
      <Icon size={13} className="text-muted" aria-hidden />
      {on ? 'Yes' : 'No'}
    </span>
  );
}

export function AccessStates() {
  const setup = useDemo((s) => s.setup);
  const mailboxes = useDemo((s) => s.settings.mailboxes);
  const tracked = useDemo((s) => s.trackedDealIds).includes('D-CLOUDDESK');
  const dealPeople = useDemo((s) => s.dealPeople['D-CLOUDDESK'] ?? []);
  const linked = useDemo((s) => s.linkedThreadIds);
  const meridian = people.filter((p) => p.org === 'meridian');
  const deployed = setup.group && setup.deployed;
  const trackedFor = (id: string) => tracked && (id === 'ananya' || (dealPeople.includes(id) && (id !== 'vikram' || linked.includes('T2'))));
  return (
    <Table>
      <thead>
        <tr>
          <Th>Person</Th>
          <Th><span className="inline-flex items-center gap-1"><PlugZap size={13} /> Add-in available</span></Th>
          <Th><span className="inline-flex items-center gap-1"><Mail size={13} /> Mailbox connected</span></Th>
          <Th><span className="inline-flex items-center gap-1"><Radar size={13} /> Negotiation tracked</span></Th>
        </tr>
      </thead>
      <tbody>
        {meridian.map((p) => (
          <tr key={p.id}>
            <Td>
              <span className="block font-medium text-ink">{p.name}</span>
              <span className="block text-[12px] text-muted">{p.role}</span>
            </Td>
            <Td><State on={deployed} icon={PlugZap} label="IT deployed the add-in to this person" /></Td>
            <Td><State on={Boolean(mailboxes[p.id])} icon={Mail} label="An admin approved background access for this mailbox" /></Td>
            <Td><State on={trackedFor(p.id)} icon={Radar} label="The deal owner chose to track a CloudDesk thread this person is on" /></Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
