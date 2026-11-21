import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { PageHeader, SirionCard } from '@/components/sirion/ui';
import { termsFound } from '@/lib/data';
import { StepBadge, Tag } from '@/components/ui/Tag';
import { TryAsk } from '@/components/ask/TryAsk';
import { shiftText } from '@/lib/demo/timeShift';

const OUTSIDE = termsFound.split.filter((x) => x.source !== 'Word versions').reduce((a, b) => a + b.pct, 0);

/** What Sirion's Outlook plugin and Word add-in do today, and what Deal Ledger adds. Shown before the walkthrough. */

const TODAY = [
  { title: 'Matched contract', body: 'CloudDesk MSA · C-2026-0417 · Negotiating · current v3' },
  { title: 'Attachment', body: 'CloudDesk_MSA_v4.docx → Sync as v4 (counterparty turn)' },
  { title: 'Find draft', body: 'Search drafts and contracts from the inbox' },
  { title: 'AI review · IssueDetection', body: '6 of 7 clauses within playbook · 14.2 deviates from preferred (30 days)' },
  { title: 'Redline Agent', body: 'Playbook redlines with preferred, fallback and walk-away clauses' },
  { title: 'Actions', body: 'Send for review · Send for approval · Open in Word' },
];

const NEW = [
  { title: 'What was agreed in email', body: shiftText('Email says: price fixed (Rohan, 14 Nov, quoted). File also changed: 14.2 now 90 days, not a tracked change.'), step: 1 },
  { title: '₹ on every gap', body: '₹1.6 lakh a year if signed as is, built row by row from your own invoices and renewals.', step: 1 },
  { title: 'Respond to round', body: 'One action drafts the reply and prepares v5 with tracked changes.', step: 1 },
  { title: 'Side threads', body: 'Vikram’s thread with Rohan linked automatically, with Undo. “Fine with that” sent back to be clarified.', step: 2 },
  { title: 'Check at Send', body: 'Anyone replying to CloudDesk is warned before conceding an agreed term, with the cost and the approval at risk.', step: 3 },
  { title: 'Signing check against email', body: 'The clean copy is compared with what was agreed in email, not only with the playbook.', step: 4 },
  { title: 'Handover with sources', body: 'Obligations and invoice rules each link back to the email line they came from.', step: 5 },
];

/** Review fix D3: descriptive only, no claims about how Sirion works internally. */
const EXISTING = [
  'Word add-in redlining',
  'Playbook review',
  'Version comparison',
  'Detecting untracked counterparty edits',
  'Outlook: send for review or approval',
  'Calendar and contract-linked reminders',
  'Invoice-to-contract matching',
];

const PROPOSED = [
  'Email evidence for each term',
  'Conditional agreements',
  'Filing on arrival',
  'Side-thread linking',
  'Send-time concession check',
  'Signing copy against agreed terms',
  'Signed copy against the reviewed version',
  'Traceability from an invoice line to the signed clause to the negotiation evidence',
  'Personal Outlook reminder',
];

const WORD_TODAY = [
  { title: 'Content Library', body: 'Insert approved clauses.' },
  { title: 'Review', body: 'Track changes, compare versions and flag risk with AI.' },
  { title: 'Redline Agent', body: 'Preferred, fallback and walk-away clauses.' },
  { title: 'Approve and publish', body: 'Changes are saved back as a new version.' },
  { title: 'Share', body: 'Send to the counterparty through the Sirion portal.' },
];

const WORD_NEW = [
  { title: 'Ledger lens', body: 'A marker beside every clause shows whether it matches what was agreed in email, with the source and the ₹ at stake.' },
  { title: 'Edit guard', body: 'An edit that moves an agreed term is flagged as you type, with the cost and the approval it would need.' },
  { title: 'Insert from ledger', body: 'The exact agreed wording, next to the Content Library, with a supplier-safe comment.' },
  { title: 'Compare with email', body: 'Each change between rounds is tagged “discussed in email”, “not mentioned in email” or “not a tracked change”.' },
  { title: 'Signing check', body: 'Runs when the clean copy arrives. Each gap shows the email line it came from and the approval that depends on it.' },
  { title: '₹ on each option', body: 'A figure on the agreed wording, the fallback and the walk-away.' },
  { title: 'Supplier-safe comments', body: 'No ₹ figures, internal names or limits in anything the supplier sees.' },
];

function Pane({ title, tone, children }: { title: string; tone: 'today' | 'new'; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className={`flex items-center justify-between px-5 py-3.5 ${tone === 'today' ? 'border-b border-line bg-page text-ink' : 'bg-teal-900 text-white'}`}>
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[12.5px] opacity-80">Outlook add-in pane</span>
      </div>
      <div className="space-y-2.5 p-4">{children}</div>
    </div>
  );
}

function Block({ title, body, kind, step }: { title: string; body: string; kind: 'today' | 'new' | 'dim'; step?: number }) {
  return (
    <div
      className={[
        'rounded-lg border px-4 py-3',
        kind === 'new' ? 'border-teal-900/30 bg-[#EAF4F2]' : 'border-line bg-white',
        kind === 'dim' ? 'opacity-55' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-semibold leading-[20px] text-ink">{title}</p>
        <span className="flex shrink-0 items-center gap-1.5 pt-[1px]">
          {kind === 'new' && step ? <StepBadge step={step} /> : null}
          <Tag kind={kind === 'dim' ? 'today' : kind} />
        </span>
      </div>
      <p className="mt-1 text-[13.5px] leading-[20px] text-[#3F4E52]">{body}</p>
    </div>
  );
}

function FeatureList({ items, tone }: { items: { title: string; body: string }[]; tone: 'today' | 'new' }) {
  const Icon = tone === 'new' ? Plus : Check;
  return (
    <ul className="divide-y divide-line">
      {items.map((f) => (
        <li key={f.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className={`mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-full ${
              tone === 'new' ? 'bg-teal-900 text-white' : 'border border-line bg-page text-muted'
            }`}
          >
            <Icon size={12} strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-[20px] text-ink">{f.title}</p>
            <p className="mt-0.5 text-[14px] leading-[21px] text-[#3F4E52]">{f.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TodayPage() {
  return (
    <>
      <PageHeader
        title="Sirion today, and what Deal Ledger adds"
        caption="Start here. Left is Sirion's Outlook plugin as it works today. Right is the same plugin with Deal Ledger on top. New parts are marked."
        right={
          <span className="flex flex-wrap items-center gap-3">
            <Link href="/setup" className="text-[14px] font-medium text-teal-900 underline underline-offset-2">
              See how this was set up ↗
            </Link>
            <Link href="/outlook/ananya?msg=M8" className="rounded-md bg-teal-900 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-teal-700">
              Start the walkthrough
            </Link>
          </span>
        }
      />

      <h2 className="mb-3 text-[17px] font-semibold text-ink">In Outlook</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <Pane title="Sirion for Outlook · today" tone="today">
          {TODAY.map((b) => <Block key={b.title} {...b} kind="today" />)}
          <p className="rounded-lg bg-page px-4 py-3 text-[14px] leading-[21px] text-ink">
            It files the file and reviews the file. It does not read what the email says, so a term agreed in the email body,
            a side thread or a reply that gives a term away is invisible to it.
          </p>
        </Pane>
        <Pane title="Sirion for Outlook · with Deal Ledger" tone="new">
          {TODAY.slice(0, 2).map((b) => <Block key={b.title} {...b} kind="dim" />)}
          {NEW.map((b) => <Block key={b.title} title={b.title} body={b.body} step={b.step} kind="new" />)}
          {TODAY.slice(3).map((b) => <Block key={b.title} {...b} kind="dim" />)}
        </Pane>
      </div>

      <h2 className="mb-3 mt-8 text-[17px] font-semibold text-ink">In Word</h2>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-ink">Sirion for Word · today</h3>
            <Tag kind="today" />
          </div>
          <FeatureList items={WORD_TODAY} tone="today" />
        </section>
        <section className="rounded-xl border border-teal-900/30 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-teal-900">Added by Deal Ledger</h3>
            <Tag kind="new" />
          </div>
          <FeatureList items={WORD_NEW} tone="new" />
        </section>
      </div>

      <h2 className="mb-3 mt-8 text-[17px] font-semibold text-ink">Existing and proposed, side by side</h2>
      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="grid md:grid-cols-2">
          <div className="border-b border-line p-5 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-ink">Sirion today</h3>
              <Tag kind="today" />
            </div>
            <ul className="space-y-2 text-[14px] leading-[20px] text-ink">
              {EXISTING.map((x) => (
                <li key={x} className="flex gap-2"><Check size={15} className="mt-[2px] shrink-0 text-muted" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-teal-900">Proposed by Deal Ledger</h3>
              <Tag kind="new" />
            </div>
            <ul className="space-y-2 text-[14px] leading-[20px] text-ink">
              {PROPOSED.map((x) => (
                <li key={x} className="flex gap-2"><Plus size={15} className="mt-[2px] shrink-0 text-teal-900" />{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <h2 className="mb-3 mt-8 text-[17px] font-semibold text-ink">AskSirion and Deal Ledger</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-ink">AskSirion</h3>
            <Tag kind="today" />
          </div>
          <p className="text-[14px] leading-[21px] text-[#3F4E52]">
            Sirion&apos;s assistant answers questions about <span className="font-semibold text-ink">what was signed</span>: contracts, clauses and renewals in
            the repository. You ask; it answers, with its sources. It is the round button in the bottom-right corner of every screen.
          </p>
          <div className="mt-4">
            <TryAsk label="Try it" prompt="Show software contracts renewing this quarter" intent="repo_search" />
          </div>
        </section>
        <section className="rounded-xl border border-teal-900/30 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-teal-900">Deal Ledger</h3>
            <Tag kind="new" />
          </div>
          <p className="text-[14px] leading-[21px] text-[#3F4E52]">
            Deal Ledger tracks <span className="font-semibold text-ink">what was agreed</span> while the deal is still being negotiated, and comes to you at
            the right moment: in the email, at Send, at signing. AskSirion can draw on it when you ask about a live negotiation, and always sends you
            back to it.
          </p>
          <div className="mt-4">
            <TryAsk label="Try it" prompt="What did CloudDesk agree on price?" intent="agreed_term" />
          </div>
        </section>
      </div>

      <SirionCard title="Why this gap exists" className="mt-8">
        <p className="max-w-[860px] text-[15px] leading-[24px] text-ink">
          In the example, <span className="font-semibold">{OUTSIDE}% of agreed terms</span> were agreed outside the formal
          document, in supplier email text, side threads and calls. Sirion&apos;s plugins work on documents, so those terms only reach
          Sirion if someone retypes them. Deal Ledger reads them where they are agreed and keeps them in one record.
        </p>
      </SirionCard>
    </>
  );
}
