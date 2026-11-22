'use client';

/**
 * The visual blocks of "About this case". They replace long paragraphs and
 * tables with one picture each. Every ₹ figure, count and percentage is read
 * from the same engines and seed data the screens use (CLAUDE.md rule 1), so
 * the case page cannot drift from the prototype.
 *
 * Series colours (validated with the dataviz palette checker, light mode):
 * price #008FA3 · renewal notice #D99A1E · payment #4364B2 · service credit #E06C4C.
 * Amber is below 3:1 on white, so every segment carries a visible text label.
 */
import Link from 'next/link';
import { ArrowRight, Check, CircleAlert, FileText, Mail, MessageSquareWarning, ShieldCheck, Split, X } from 'lucide-react';
import { cloudDeskDeal, deals, kpiHistory, versionById } from '@/lib/data';
import { signingCheck } from '@/lib/engines/signing';
import { copyReconciliation, dealReconciliation, type Part } from '@/lib/engines/headline';
import { termCommitmentLakh } from '@/lib/engines/pricing';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { initialLedger, ledgerAtStep } from '@/lib/demo/steps';
import { listedAtRisk } from '@/lib/demo/moreDeals';
import { GUIDE_STAGES, AFTER_SIGNING } from '@/lib/demo/guide';
import { shiftText } from '@/lib/demo/timeShift';
import { formatLakh, formatPct } from '@/lib/format';
import type { TermKey } from '@/lib/types';

const deal = cloudDeskDeal;
const v6 = signingCheck(ledgerAtStep(4), versionById('v6')!, deal);
const v6Copy = copyReconciliation(v6.gaps, deal);
const before = dealReconciliation(initialLedger(), deal);
const openDeals = deals.filter((d) => !d.interactive && d.stage !== 'signed');
const portfolioLakh = openDeals.reduce((s, d) => s + listedAtRisk(d), 0) + dealAtRisk(initialLedger(), deal);

const SERIES: Partial<Record<TermKey, { colour: string; name: string }>> = {
  price: { colour: '#008FA3', name: 'Price' },
  renewal_notice: { colour: '#D99A1E', name: 'Renewal notice' },
  payment: { colour: '#4364B2', name: 'Payment terms' },
  service_credit: { colour: '#E06C4C', name: 'Service credit' },
};

/* ───────────────────────── shared bits ───────────────────────── */

function Tile({ value, label, tone = 'plain' }: { value: string; label: string; tone?: 'plain' | 'teal' | 'risk' }) {
  const cls =
    tone === 'teal' ? 'border-teal-900 bg-teal-900 text-white' : tone === 'risk' ? 'border-danger/30 bg-[#FFF4EE]' : 'border-line bg-white';
  return (
    <div className={`rounded-xl border px-4 py-3 ${cls}`}>
      <div className={`text-[24px] font-light leading-[30px] ${tone === 'teal' ? 'text-white' : tone === 'risk' ? 'text-danger' : 'text-teal-title'}`}>{value}</div>
      <div className={`mt-0.5 text-[12px] leading-[16px] ${tone === 'teal' ? 'text-mint' : 'text-muted'}`}>{label}</div>
    </div>
  );
}

function Card({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
        {icon && <span className="text-teal-900">{icon}</span>}
        {title}
      </div>
      <div className="mt-1.5 text-[13px] leading-[19px] text-[#35454a]">{children}</div>
    </div>
  );
}

/* ───────────────────────── 0 · the case at a glance ───────────────────────── */

/** The whole problem in one picture: what was agreed against what the signing copy says, term by term. */
export function CaseAtAGlance() {
  const rows = [
    ...v6.gaps.map((g) => ({ label: g.label, agreed: g.agreedPlain, doc: g.docPlain, clause: g.clauseNo, ok: false, cost: g.costLakhPerYr, key: g.termKey })),
    ...v6.matches.map((m) => ({ label: m.label, agreed: m.agreedPlain, doc: m.agreedPlain, clause: m.clauseNo, ok: true, cost: null, key: m.termKey })),
  ];
  return (
    <figure className="my-6">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Tile value={formatLakh(termCommitmentLakh(deal))} label={`CloudDesk renewal · ${formatLakh(deal.annualFeeInr / 100000)} a year for ${deal.termYears} years`} />
        <Tile value={`${v6.gaps.length} of ${rows.length}`} label="agreed terms missing from the clean signing copy (v6)" tone="risk" />
        <Tile value={formatLakh(v6.totalAtRiskLakh)} label="expected a year if v6 is signed as is" tone="teal" />
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_104px] gap-x-3 bg-page px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
          <span>Term</span>
          <span className="flex items-center gap-1"><Mail size={12} /> Agreed in email</span>
          <span className="flex items-center gap-1"><FileText size={12} /> In signing copy</span>
          <span className="text-right">If signed</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.label}
            className={`grid grid-cols-[1.2fr_1fr_1fr_104px] items-center gap-x-3 border-t border-line px-4 py-2 text-[13px] ${r.ok ? 'bg-white' : 'bg-[#FFF8F4]'}`}
          >
            <span className="font-medium text-ink">{r.label}</span>
            <span className="text-[#35454a]">{r.agreed}</span>
            <span className={r.ok ? 'text-[#35454a]' : 'font-semibold text-danger'}>
              {r.doc} <span className="font-normal text-muted">§{r.clause}</span>
            </span>
            <span className="flex items-center justify-end gap-1 text-right text-[12px]">
              {r.ok ? (
                <><Check size={14} className="text-[#2E7D4F]" /> <span className="text-[#2E7D4F]">Matches</span></>
              ) : (
                <><X size={14} className="text-danger" /> <span className="font-semibold text-ink">{formatLakh(r.key === 'renewal_notice' ? (r.cost ?? 0) / deal.termYears : r.cost)}/yr</span></>
              )}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-[11.5px] leading-[17px] text-muted">
        Computed by the signing check on v6. §9.3 (45 days) passes the company playbook; only Rohan’s email shows that 60 days was agreed, on
        the condition of the 3-year term that §3.1 grants. <Link href="/word/v6" className="font-medium text-teal-900 underline">See it in Word →</Link>
      </figcaption>
    </figure>
  );
}

/* ───────────────────────── 1 · why negotiation ───────────────────────── */

const STAGES = [
  { name: 'Intake', fix: 'Routing problem, largely solved', on: false },
  { name: 'Negotiate', fix: 'Fix = one email or tracked change', on: true },
  { name: 'Sign', fix: 'Last free check of the exact copy', on: true },
  { name: 'Manage', fix: 'Fix = renegotiation, credit note or dispute', on: false },
];

export function WhyNegotiation() {
  return (
    <figure className="my-6">
      <div className="grid grid-cols-4 gap-1.5">
        {STAGES.map((s, i) => (
          <div key={s.name} className="relative">
            <div
              className={`flex h-10 items-center justify-center text-[13px] font-semibold ${s.on ? 'bg-teal-900 text-white' : 'bg-page text-muted'}`}
              style={{ clipPath: i === 0 ? 'polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%)' : 'polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%, 8% 50%)' }}
            >
              {s.name}
            </div>
            <div className={`mt-1.5 px-1 text-center text-[11.5px] leading-[15px] ${s.on ? 'font-medium text-teal-900' : 'text-muted'}`}>{s.fix}</div>
          </div>
        ))}
      </div>
      <div className="mx-[25%] mt-2 border-t-2 border-teal-900 pt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-teal-900">
        Deal Ledger works here
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <Card icon={<Split size={15} />} title="The loss is silent">
          A clause that drifts back to the supplier’s wording raises no error. It usually stays inside policy, so playbook review passes it.
        </Card>
        <Card icon={<ShieldCheck size={15} />} title="Why Procurement">
          It is accountable for the negotiated terms, even when IT, Finance and Legal each settle a piece. Renewals have concrete, priceable terms.
        </Card>
        <Card icon={<FileText size={15} />} title="Why Sirion">
          It already sits in Outlook and Word and checks invoices against signed terms, across 7 million+ contracts, so it can link a promise to
          what was billed. <a href="https://info.sirion.ai/hubfs/Brand_Assets/Press%20Kit.pdf" className="text-teal-900 underline">Press kit</a>
        </Card>
      </div>
    </figure>
  );
}

/** How much the product does: five rungs, and the line it never crosses. */
const RUNGS = [
  { n: 'Watch', d: 'Permitted supplier threads only' },
  { n: 'Record', d: 'Each term with its exact quote' },
  { n: 'Price', d: '₹ a year, computed in code' },
  { n: 'Prepare', d: 'Draft reply or tracked edit' },
  { n: 'Interrupt', d: 'Only at Send and at Publish' },
];

export function ProductScope() {
  return (
    <figure className="my-6 rounded-xl border border-line bg-page/60 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">How much Deal Ledger does</div>
      <div className="mt-3 flex items-stretch gap-1.5">
        {RUNGS.map((r, i) => (
          <div key={r.n} className="flex-1 self-start">
            <div className="flex h-[108px] items-end">
              <div
                className="flex w-full flex-col justify-end rounded-t-lg bg-teal-900 px-2 pb-2 text-white"
                style={{ height: 44 + i * 16, opacity: 0.55 + i * 0.11 }}
              >
                <span className="text-[10.5px] text-mint">{i + 1}</span>
                <span className="text-[13px] font-semibold leading-[16px]">{r.n}</span>
              </div>
            </div>
            <div className="mt-1.5 text-[11.5px] leading-[15px] text-[#35454a]">{r.d}</div>
          </div>
        ))}
        <div className="w-[22%] shrink-0 self-stretch rounded-lg border-2 border-dashed border-danger/40 bg-white p-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-danger">Only people</div>
          <ul className="mt-1 space-y-0.5 text-[12px] leading-[16px] text-ink" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ margin: 0, fontSize: 12, lineHeight: '17px' }}>Send replies</li>
            <li style={{ margin: 0, fontSize: 12, lineHeight: '17px' }}>Accept terms</li>
            <li style={{ margin: 0, fontSize: 12, lineHeight: '17px' }}>Approve exceptions</li>
            <li style={{ margin: 0, fontSize: 12, lineHeight: '17px' }}>Sign</li>
          </ul>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
        <span className="rounded-full border border-line bg-white px-2.5 py-1"><b className="text-ink">AI</b> reads the language: which term moved, and which way</span>
        <span className="rounded-full border border-line bg-white px-2.5 py-1"><b className="text-ink">Code</b> computes every ₹, date and count</span>
        <span className="rounded-full border border-line bg-white px-2.5 py-1"><b className="text-ink">Suppliers</b> install nothing</span>
      </div>
    </figure>
  );
}

/* ───────────────────────── 2 · stakeholders ───────────────────────── */

const PEOPLE = [
  { who: 'Ananya Rao', role: 'Procurement · deal owner', owns: 'The agreed position and the close', gets: 'One record of agreed terms and signing gaps', where: 'Outlook · Word · Sirion', lead: true },
  { who: 'Vikram Shah', role: 'IT · business owner', owns: 'Go-live and uptime', gets: 'One warning at Send if a reply gives a term away', where: 'Outlook' },
  { who: 'Neha Kapoor', role: 'Finance · CFO', owns: 'Spend approval and invoice accuracy', gets: 'Invoice variance traced to clause and email', where: 'Sirion' },
  { who: 'Arjun', role: 'Legal', owns: 'Clause wording and risk', gets: 'Deal-specific gaps beside playbook findings', where: 'Word' },
  { who: 'M365 and Sirion admins', role: 'IT admin', owns: 'Access and audit', gets: 'Scoped, header-first, auditable access', where: 'Setup, once' },
  { who: 'Rohan and Priya', role: 'CloudDesk · supplier', owns: 'Closing the renewal', gets: 'Ordinary emails and tracked changes, nothing to install', where: 'Their own tools', supplier: true },
];

export function StakeholderCards() {
  return (
    <div className="my-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {PEOPLE.map((p) => (
        <div
          key={p.who}
          className={`rounded-xl border p-3.5 ${p.lead ? 'border-teal-900 bg-[#F1F8F7]' : p.supplier ? 'border-amber-fg/40 bg-amber-bg/50' : 'border-line bg-white'}`}
        >
          <div className="text-[13.5px] font-semibold text-ink">{p.who}</div>
          <div className="text-[11.5px] text-muted">{p.role}</div>
          <div className="mt-2 grid grid-cols-[44px_1fr] gap-x-2 gap-y-1 text-[12px] leading-[16px]">
            <span className="text-muted">Owns</span>
            <span className="text-ink">{p.owns}</span>
            <span className="text-muted">Gets</span>
            <span className="text-ink">{p.gets}</span>
            <span className="text-muted">Where</span>
            <span className="font-medium text-teal-900">{p.where}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── 3 · where terms get lost ───────────────────────── */

const PATTERNS = [
  {
    icon: <Mail size={15} />,
    title: 'Email and attachment diverge',
    a: ['Email', 'Price fixed for 3 years'],
    b: ['Attachment', 'Yearly revision; notice 30 → 90 days'],
    fix: 'Checks the email and the file separately',
  },
  {
    icon: <MessageSquareWarning size={15} />,
    title: 'A side thread sounds agreed',
    a: ['Vikram ↔ Rohan', '10% or 5% service credit?'],
    b: ['Reply', '“Fine with that”, but which one?'],
    fix: 'Marks it Needs confirmation and drafts the question',
  },
  {
    icon: <CircleAlert size={15} />,
    title: 'The signed copy disagrees with itself',
    a: ['BrightStaff clause 6', '8% increase'],
    b: ['Schedule 2', '10%, and the invoice follows it'],
    fix: 'Shows Finance both clauses before a dispute',
  },
];

export function LossPatterns() {
  return (
    <div className="my-6 grid grid-cols-1 gap-2 md:grid-cols-3">
      {PATTERNS.map((p) => (
        <div key={p.title} className="flex flex-col rounded-xl border border-line bg-white p-3.5">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
            <span className="text-danger">{p.icon}</span>
            {p.title}
          </div>
          <div className="mt-2.5 space-y-1.5">
            {[p.a, p.b].map(([k, v], i) => (
              <div key={k} className={`rounded-md px-2.5 py-1.5 ${i === 0 ? 'bg-page' : 'bg-[#FFF4EE]'}`}>
                <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{k}</div>
                <div className="text-[12.5px] leading-[17px] text-ink">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-start gap-1.5 pt-2.5 text-[12px] leading-[16px] font-medium text-teal-900">
            <ArrowRight size={13} className="mt-[2px] shrink-0" /> {p.fix}
          </div>
        </div>
      ))}
    </div>
  );
}

function StackedBar({ title, sub, parts, max }: { title: string; sub: string; parts: Part[]; max: number }) {
  const total = parts.reduce((s, p) => s + p.lakh, 0);
  return (
    <div className="grid grid-cols-[150px_1fr_72px] items-center gap-3">
      <div>
        <div className="text-[12.5px] font-semibold text-ink">{title}</div>
        <div className="text-[11px] leading-[14px] text-muted">{sub}</div>
      </div>
      <div className="flex h-[30px] gap-[2px]" style={{ width: `${(total / max) * 100}%` }} role="img" aria-label={`${title}: ${parts.map((p) => `${SERIES[p.termKey!]?.name} ${formatLakh(p.lakh)}`).join(', ')}`}>
        {parts.map((p, i) => {
          const s = SERIES[p.termKey!];
          const pct = (p.lakh / total) * 100;
          return (
            <div
              key={p.label}
              title={`${s?.name ?? p.label}: ${formatLakh(p.lakh)} a year`}
              className="flex items-center overflow-hidden px-1.5 text-[11px] font-semibold"
              style={{
                /* Amber is too light for white text (dataviz contrast check), so it takes ink. */
                color: p.termKey === 'renewal_notice' ? '#1F2A2E' : '#FFFFFF',
                width: `${pct}%`,
                background: s?.colour ?? '#9AA8AB',
                borderRadius: `${i === 0 ? 4 : 0}px ${i === parts.length - 1 ? 4 : 0}px ${i === parts.length - 1 ? 4 : 0}px ${i === 0 ? 4 : 0}px`,
                minWidth: 4,
              }}
            >
              {pct > 14 && <span className="truncate">{formatLakh(p.lakh)}</span>}
            </div>
          );
        })}
      </div>
      <div className="text-right text-[15px] font-semibold text-ink">{formatLakh(total)}</div>
    </div>
  );
}

/** What the CloudDesk deal would cost a year, at two moments, split by term. */
export function ExposureChart() {
  const max = Math.max(before.totalLakh, v6Copy.totalLakh);
  const keys = Array.from(new Set([...v6Copy.parts, ...before.parts].map((p) => p.termKey!))).filter((k) => SERIES[k]);
  return (
    <figure className="my-6 rounded-xl border border-line bg-white p-4">
      <div className="text-[13.5px] font-semibold text-ink">Expected cost a year if signed as is, CloudDesk</div>
      <div className="mt-2 mb-3 flex flex-wrap gap-3 text-[11.5px] text-[#35454a]">
        {keys.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[k]!.colour }} />
            {SERIES[k]!.name}
          </span>
        ))}
      </div>
      <div className="space-y-2.5">
        <StackedBar title={shiftText('14 Nov · v4')} sub="Before Rohan’s pricing email" parts={before.parts} max={max} />
        <StackedBar title={shiftText('19 Nov · v6')} sub="The clean signing copy" parts={v6Copy.parts} max={max} />
      </div>
      <figcaption className="mt-3 text-[11.5px] leading-[17px] text-muted">
        {v6Copy.text}. Renewal notice is a one-time exposure spread over the term. Across all {openDeals.length + 1} open deals on{' '}
        <Link href="/#workspace" className="font-medium text-teal-900 underline">Home</Link>: {formatLakh(portfolioLakh)} a year. Estimates, not realised losses.
      </figcaption>
    </figure>
  );
}

/* ───────────────────────── 4 · the walkthrough ───────────────────────── */

const WHO = ['Ananya · Outlook', 'Ananya · Outlook', 'Vikram · Outlook', 'Ananya · Word', 'Sirion'];
const WHAT = [
  'Rohan’s v4 lands. The ledger splits what the email says from what the file changed.',
  'A side thread links itself, with Undo. The 10% vs 5% credit stays open until Rohan confirms.',
  'His reply would concede a term. One warning: edit, loop in Ananya, or send with a reason.',
  'Clean v6 checked against the ledger. Three gaps; insert the agreed wording as tracked edits.',
  'Signed terms become obligations, dates and invoice rules, each linked to its source.',
];
const DATES = ['14 Nov', '16 Nov', '18 Nov', '19 Nov', '21 Nov'];

export function JourneyTimeline() {
  return (
    <figure className="my-6">
      <ol className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {GUIDE_STAGES.map((s, i) => (
          <li key={s.step} className="flex flex-col rounded-xl border border-teal-900/30 bg-white p-3" style={{ margin: 0 }}>
            <div className="flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-teal-900 text-[10.5px] font-semibold text-white">{s.step}</span>
              <span className="text-[11px] font-semibold text-muted">{shiftText(DATES[i])}</span>
            </div>
            <div className="mt-1.5 text-[13px] font-semibold leading-[17px] text-ink">{s.title}</div>
            <div className="text-[11px] font-medium text-teal-900">{WHO[i]}</div>
            <div className="mt-1 text-[11.5px] leading-[15.5px] text-[#35454a]">{WHAT[i]}</div>
            <Link href={s.href} className="mt-auto pt-2 text-[11.5px] font-semibold text-teal-900 hover:underline">Open →</Link>
          </li>
        ))}
        <li className="flex flex-col rounded-xl border border-dashed border-line bg-page/60 p-3" style={{ margin: 0 }}>
          <div className="flex items-center gap-1.5">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[10.5px] font-semibold text-white">+</span>
            <span className="text-[11px] font-semibold text-muted">{AFTER_SIGNING.time.split('·')[0].trim()}</span>
          </div>
          <div className="mt-1.5 text-[13px] font-semibold leading-[17px] text-ink">Invoice variance</div>
          <div className="text-[11px] font-medium text-teal-900">Neha · Sirion</div>
          <div className="mt-1 text-[11.5px] leading-[15.5px] text-[#35454a]">December’s invoice is above the signed price; traced to §9.1 and Rohan’s email.</div>
          <Link href={AFTER_SIGNING.href} className="mt-auto pt-2 text-[11.5px] font-semibold text-teal-900 hover:underline">Open →</Link>
        </li>
      </ol>
    </figure>
  );
}

const HANDOFFS = [
  { from: 'Vikram', to: 'Ananya', carries: 'Quote + ambiguity flag' },
  { from: 'Outlook', to: 'Word', carries: 'Verified term + tracked edit' },
  { from: 'Word', to: 'Sirion', carries: 'Signed clauses + invoice rules' },
  { from: 'Sirion', to: 'Neha', carries: 'Variance + clause + email' },
];

export function HandoffChain() {
  return (
    <figure className="my-5 rounded-xl border border-line bg-page/60 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">How their experiences connect</div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {HANDOFFS.map((h) => (
          <div key={h.carries} className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-ink">
              <span className="rounded-md border border-line bg-white px-2 py-0.5">{h.from}</span>
              <ArrowRight size={14} className="text-teal-900" />
              <span className="rounded-md border border-line bg-white px-2 py-0.5">{h.to}</span>
            </div>
            <div className="mt-1.5 text-[11.5px] leading-[15px] text-[#35454a]">{h.carries}</div>
          </div>
        ))}
      </div>
    </figure>
  );
}

/* ───────────────────────── 5 · success measures ───────────────────────── */

const MEASURES = [
  ['Evidence coverage', 'Terms with a verified source, by channel'],
  ['Catches beyond playbook', 'Real gaps the normal review missed'],
  ['Wrong “Agreed” labels', 'Pilot target: under 2%'],
  ['Send warnings', 'Edited, routed, or sent with a reason'],
  ['Speed', 'Minutes added to review; invoice traced in a day'],
];

const TRIPWIRES = [
  ['Playbook already catches the same gaps', 'Fold the check into IssueDetection'],
  ['2% or more “Agreed” labels wrong', 'Pause automatic labelling'],
  ['Under half of mailboxes connect', 'Narrow to owner-picked threads + signing check'],
];

export function MetricsPanel() {
  const ns = kpiHistory.northStar;
  return (
    <figure className="my-6 space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-teal-900 bg-[#F1F8F7] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-teal-900">North star</div>
          <div className="mt-1 text-[14px] font-semibold leading-[20px] text-ink">
            Share of audited signed contracts that contain every term agreed in negotiation
          </div>
          <div className="mt-3 flex items-end gap-3" role="img" aria-label={ns.map((q) => `${q.quarter}: ${q.clean} of ${q.audited}`).join('; ')}>
            {ns.map((q) => {
              const share = q.clean / q.audited;
              return (
                <div key={q.quarter} className="flex-1 text-center" title={`${q.quarter}: ${q.clean} of ${q.audited} audited contracts`}>
                  <div className="text-[12px] font-semibold text-ink">{formatPct(share)}</div>
                  <div className="mx-auto mt-1 w-full max-w-[44px] rounded-t bg-teal-900" style={{ height: 70 * share }} />
                  <div className="mt-1 text-[10.5px] leading-[13px] text-muted">{q.quarter.replace(' 2026', '')}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-[11px] text-muted">Sample data. Auditors rebuild the agreement from the original email, then check the signed copy.</div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">The pilot</div>
          <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-[17px]">
            <div className="rounded-md bg-page px-3 py-2 text-center font-semibold text-ink">20 past supplier renewals</div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md border border-line px-2 py-1.5 text-center text-[#35454a]">Sirion review</div>
              <div className="rounded-md border border-teal-900 bg-[#F1F8F7] px-2 py-1.5 text-center font-medium text-teal-900">Sirion + Deal Ledger</div>
            </div>
            <div className="text-center text-muted">↓ an independent reviewer marks the real gaps ↓</div>
            <div className="rounded-md bg-teal-900 px-3 py-2 text-center font-semibold text-white">How many real gaps did the playbook miss?</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {MEASURES.map(([t, d]) => (
          <div key={t} className="rounded-lg border border-line bg-white px-3 py-2.5">
            <div className="text-[12.5px] font-semibold text-ink">{t}</div>
            <div className="mt-0.5 text-[11.5px] leading-[15px] text-muted">{d}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-danger/40 bg-white p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-danger">We rethink if</div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          {TRIPWIRES.map(([ifThis, then]) => (
            <div key={ifThis} className="text-[12px] leading-[16px]">
              <div className="font-semibold text-ink">{ifThis}</div>
              <div className="mt-0.5 flex items-start gap-1 text-[#35454a]"><ArrowRight size={12} className="mt-[2px] shrink-0" /> {then}</div>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}
