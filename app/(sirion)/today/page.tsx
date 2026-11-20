import Link from 'next/link';
import { PageHeader, SirionCard } from '@/components/sirion/ui';
import { termsFound } from '@/lib/data';

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
  { title: 'What was agreed in email', body: 'Email says: price fixed (Rohan, 14 Nov, quoted). File also changed: 14.2 now 90 days, not a tracked change.', step: 1 },
  { title: '₹ on every gap', body: '₹1.6 lakh a year if signed as is, built row by row from your own invoices and renewals.', step: 1 },
  { title: 'Respond to round', body: 'One action drafts the reply and prepares v5 with tracked changes.', step: 1 },
  { title: 'Side threads', body: 'Vikram’s thread with Rohan linked automatically, with Undo. “Fine with that” sent back to be clarified.', step: 2 },
  { title: 'Check at Send', body: 'Anyone replying to CloudDesk is warned before conceding an agreed term, with the cost and the approval at risk.', step: 3 },
  { title: 'Signing check against email', body: 'The clean copy is compared with what was agreed in email, not only with the playbook.', step: 4 },
  { title: 'Handover with sources', body: 'Obligations and invoice rules each link back to the email line they came from.', step: 5 },
];

function Pane({ title, tone, children }: { title: string; tone: 'today' | 'new'; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className={`flex items-center justify-between px-4 py-2.5 text-[12.5px] font-semibold ${tone === 'today' ? 'bg-page text-ink' : 'bg-teal-900 text-white'}`}>
        <span>{title}</span>
        <span className="text-[10.5px] font-medium opacity-80">Outlook add-in pane</span>
      </div>
      <div className="space-y-2 p-3">{children}</div>
    </div>
  );
}

function Block({ title, body, kind, step }: { title: string; body: string; kind: 'today' | 'new' | 'dim'; step?: number }) {
  return (
    <div
      className={[
        'rounded-lg border px-3 py-2 text-[12px] leading-[17px]',
        kind === 'new' ? 'border-teal-900/40 bg-mint/40' : 'border-line',
        kind === 'dim' ? 'opacity-60' : '',
      ].join(' ')}
    >
      <p className="flex items-center justify-between gap-2 font-semibold text-ink">
        <span>{title}</span>
        <span
          className={`whitespace-nowrap rounded-full px-1.5 py-[1px] text-[9.5px] font-semibold ${
            kind === 'new' ? 'bg-teal-900 text-white' : 'border border-line bg-page text-muted'
          }`}
        >
          {kind === 'new' ? `New${step ? ` · step ${step}` : ''}` : 'Today in Sirion'}
        </span>
      </p>
      <p className="mt-0.5 text-muted">{body}</p>
    </div>
  );
}

export default function TodayPage() {
  return (
    <>
      <PageHeader
        title="Sirion today, and what Deal Ledger adds"
        caption="Start here. Left is Sirion's Outlook plugin as it works today. Right is the same plugin with Deal Ledger on top. New parts are marked."
        right={
          <Link href="/outlook/ananya?msg=M8" className="rounded-md bg-teal-900 px-4 py-2 text-[12.5px] font-medium text-white">
            Start the walkthrough
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Pane title="Sirion for Outlook · today" tone="today">
          {TODAY.map((b) => <Block key={b.title} {...b} kind="today" />)}
          <p className="px-1 pt-1 text-[11.5px] leading-[17px] text-muted">
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

      <SirionCard title="In Word" className="mt-4">
        <div className="grid gap-4 text-[12.5px] leading-[19px] md:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-ink">Sirion for Word · today</p>
            <ul className="list-disc space-y-0.5 pl-5 text-muted">
              <li>Insert approved clauses from the Content Library</li>
              <li>Track changes, compare versions, flag risk with AI</li>
              <li>Preferred, fallback and walk-away clauses (Redline Agent)</li>
              <li>Approve, reject or publish; changes saved back as a new version</li>
              <li>Share with the counterparty through the Sirion portal</li>
            </ul>
          </div>
          <div>
            <p className="mb-1 font-semibold text-teal-900">Added by Deal Ledger</p>
            <ul className="list-disc space-y-0.5 pl-5 text-ink">
              <li>Ledger lens: a marker beside every clause showing whether it matches what was agreed in email, with the source and ₹</li>
              <li>Edit guard: an edit typed in Word that moves an agreed term is flagged as you type, with the cost and the approval it would need</li>
              <li>Insert from ledger: the exact agreed wording, next to the Content Library, with a supplier-safe comment</li>
              <li>Compare with email: each change between rounds tagged “discussed in email”, “not mentioned in email” or “not a tracked change”</li>
              <li>The signing check runs when the clean copy arrives, against what was agreed in email</li>
              <li>Each gap shows the email line it came from and the approval that depends on it</li>
              <li>A ₹ figure on the agreed wording, the fallback and the walk-away</li>
              <li>Supplier-safe comments: no ₹, no internal names, no limits</li>
            </ul>
          </div>
        </div>
      </SirionCard>

      <SirionCard title="Why this gap exists" className="mt-4">
        <p className="text-[12.5px] leading-[19px] text-ink">
          {OUTSIDE}% of agreed terms in the last {termsFound.windowMonths} months were agreed outside the formal document: in supplier email text, side threads
          and calls (demo data). Sirion&apos;s plugins work on documents, so those terms only reach Sirion if someone retypes them.
          Deal Ledger reads them where they are agreed and keeps them in one record.
        </p>
      </SirionCard>
    </>
  );
}
