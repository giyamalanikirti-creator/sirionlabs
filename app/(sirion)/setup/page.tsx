'use client';

/**
 * Org setup, once: Sirion admin with a Microsoft 365 admin. Nobody else is
 * onboarded. The checklist starts complete in the demo; "Reset setup" in the
 * demo strip replays it.
 */
import Link from 'next/link';
import { Check, ExternalLink } from 'lucide-react';
import { Button, PageHeader, SirionCard } from '@/components/sirion/ui';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { people } from '@/lib/data';
import { AUTO_TRACK_LAKH, CAPTURE_ADDRESS, CONNECTED_GROUP } from '@/lib/settings';
import { formatLakh } from '@/lib/format';
import { Tag } from '@/components/ui/Tag';

function Row({
  n,
  done,
  title,
  who,
  caption,
  tag,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  who: string;
  caption: string;
  tag: 'today' | 'new';
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 border-b border-line py-4 last:border-0">
      <span
        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${
          done ? 'bg-teal-900 text-white' : 'border border-line bg-white text-muted'
        }`}
      >
        {done ? <Check size={14} strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium text-ink">
          {title} <Tag kind={tag} />
        </p>
        <p className="mt-0.5 text-[12px] text-muted">
          {who} · {caption}
        </p>
        {children && <div className="mt-2.5 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </li>
  );
}

export default function SetupPage() {
  const hydrated = useHydrated();
  const setup = useDemo((s) => s.setup);
  const update = useDemo((s) => s.updateSetup);
  const resetSetup = useDemo((s) => s.resetSetup);
  const dealPeople = useDemo((s) => s.dealPeople);
  const toast = useDemo((s) => s.toast);
  if (!hydrated) return null;

  const defaults = people.filter((p) => p.org === 'meridian' && ['Procurement lead', 'Procurement', 'Legal counsel', 'CFO'].includes(p.role));
  const owners = [...new Set(Object.values(dealPeople).flat())].map((id) => people.find((p) => p.id === id)!).filter(Boolean);
  const allDone = setup.enabled && setup.consented && setup.group && setup.deployed;

  return (
    <>
      <PageHeader
        title="Microsoft 365 connection"
        caption="Set up once by a Sirion admin with a Microsoft 365 admin. Nobody else runs a setup wizard."
        right={
          <Button
            onClick={() => {
              resetSetup();
              toast('Setup reset. Work through the four steps again.');
            }}
          >
            Reset setup
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <SirionCard title="Checklist" caption={allDone ? 'All four steps are done. Deal Ledger is live for the connected mailboxes.' : 'Each row turns green when it is done.'}>
          <ol>
            <Row n={1} done={setup.enabled} title="Turn on Deal Ledger" who="Sirion admin" caption="Adds the ledger to Sirion's negotiation workspace" tag="new">
              {!setup.enabled && (
                <Button variant="primary" size="sm" onClick={() => update({ enabled: true })}>
                  Turn on
                </Button>
              )}
            </Row>
            <Row n={2} done={setup.consented} title="Connect Microsoft 365" who="Microsoft 365 admin" caption="An M365 admin must approve this" tag="new">
              {!setup.consented && (
                <Link href="/m365/consent">
                  <Button variant="primary" size="sm" disabled={!setup.enabled}>
                    Connect Microsoft 365 <ExternalLink size={12} />
                  </Button>
                </Link>
              )}
              {setup.consented && <span className="text-[12px] text-muted">Consented on behalf of Meridian Foods: read mail in connected mailboxes; sign users in.</span>}
            </Row>
            <Row n={3} done={setup.group} title="Choose connected mailboxes" who="Sirion admin" caption="Deal Ledger can only read mailboxes in this group" tag="new">
              <div className="w-full rounded-lg border border-line p-3 text-[12px]">
                <p className="font-medium text-ink">{CONNECTED_GROUP}</p>
                <p className="mt-1 text-muted">Default members (Procurement, Legal, Finance): {defaults.map((p) => p.name).join(', ')}</p>
                <p className="mt-0.5 text-muted">
                  Business owners, added per deal by the deal owner: {owners.length ? owners.map((p) => `${p.name} (CloudDesk)`).join(', ') : 'none yet'}
                </p>
              </div>
              {!setup.group && (
                <Button variant="primary" size="sm" disabled={!setup.consented} onClick={() => update({ group: true })}>
                  Create the group
                </Button>
              )}
            </Row>
            <Row n={4} done={setup.deployed} title="Deploy the add-ins" who="Microsoft 365 admin" caption="Required for the check at Send" tag="today">
              {!setup.deployed && (
                <Link href="/m365/integrated-apps">
                  <Button variant="primary" size="sm" disabled={!setup.group}>
                    Open Integrated apps <ExternalLink size={12} />
                  </Button>
                </Link>
              )}
              {setup.deployed && (
                <span className="text-[12px] text-muted">
                  Sirion for Outlook and Sirion for Word deployed to “{CONNECTED_GROUP}”: Fixed for Procurement and Legal, Available for everyone else.
                </span>
              )}
            </Row>
          </ol>
        </SirionCard>

        <div className="grid content-start gap-4">
          <SirionCard title="Rules" caption="The same rules as Privacy and admin">
            <ul className="space-y-2 text-[12.5px]">
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-900" /> Read only threads with a live deal&apos;s supplier domain.</li>
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-900" /> Never read internal-only email.</li>
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-teal-900" /> Read headers first; read the body only after a match.</li>
              <li className="flex items-center justify-between gap-3">
                <span>Auto-track deals above {formatLakh(AUTO_TRACK_LAKH)} a year (otherwise the owner is asked)</span>
                <button
                  role="switch"
                  aria-checked={setup.autoTrackAbove25}
                  aria-label="Auto-track large deals"
                  onClick={() => update({ autoTrackAbove25: !setup.autoTrackAbove25 })}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${setup.autoTrackAbove25 ? 'bg-teal-900' : 'bg-line'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${setup.autoTrackAbove25 ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </li>
            </ul>
            <p className="mt-3 text-[11.5px] text-muted">
              People without the add-in can copy <span className="font-medium text-ink">{CAPTURE_ADDRESS}</span> on a supplier thread to link it. Suppliers connect nothing.
            </p>
          </SirionCard>

          <SirionCard title="What happens next" caption="No onboarding: three prompts in the whole flow, each at a moment of intent">
            <ol className="list-decimal space-y-1.5 pl-5 text-[12.5px] text-ink">
              <li>The deal owner opens a supplier email: “Track this negotiation?”</li>
              <li>A weak thread match: “Link to this deal?”</li>
              <li>An unrecognised file in Word: “This looks like the CloudDesk MSA.”</li>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/outlook/ananya?msg=M1&prequel=1">
                <Button variant="primary" size="sm" disabled={!allDone}>See the first prompt in Outlook (1 Nov)</Button>
              </Link>
              <Link href="/story#how-it-connects">
                <Button size="sm">How it connects</Button>
              </Link>
            </div>
          </SirionCard>
        </div>
      </div>
    </>
  );
}
