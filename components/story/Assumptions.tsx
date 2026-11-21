'use client';

/**
 * Every assumption the case and the prototype rest on, in one place. Values
 * are read from the same settings, seed data and engines the screens use, so
 * this list cannot drift from what the prototype actually does.
 */
import { cloudDeskDeal, personName } from '@/lib/data';
import { PLAYBOOK } from '@/lib/engines/playbook';
import { CFO_THRESHOLD_LAKH } from '@/lib/engines/approvals';
import { R_OPEN, R_OPEN_N, CAP_RATIO, UNUSED_SHARE, RENEWALS_N, RENEWAL_GROUPS, SERVICE_MONTHS_N, missedMonths, pSlip } from '@/lib/engines/stats';
import { PEER_MIN_COMPANIES, PEER_MIN_CONTRACTS } from '@/lib/engines/peers';
import { REMINDER_LEAD_DAYS, formatDay } from '@/lib/engines/dates';
import { termEnd, FAST_FORWARD_INVOICE } from '@/lib/engines/handover';
import { STEP_CLOCK } from '@/lib/demo/steps';
import { SHIFT_DAYS, STORY_ANCHOR } from '@/lib/demo/timeShift';
import { formatDateLong, formatDateShort, formatInr, formatLakh, formatPct } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import {
  AUTO_TRACK_LAKH,
  CAPTURE_ADDRESS,
  CONNECTED_GROUP,
  COST_OF_MONEY,
  DEAL_ID_TAG,
  HIGH_CONF_N,
  MIN_OWN_N,
  READER_CONFIDENCE_MIN,
  SEND_CONFIDENCE_MIN,
} from '@/lib/settings';
import kpiHistory from '@/data/kpi_history.json';
import termsFound from '@/data/terms_found.json';
import { deals } from '@/lib/data';
import { listedAtRisk } from '@/lib/demo/moreDeals';
import { dealAtRisk } from '@/lib/engines/atRisk';
import { initialLedger } from '@/lib/demo/steps';
import type { TermKey, TermValue } from '@/lib/types';

type Row = [string, React.ReactNode];

function Group({ title, rows, note }: { title: string; rows: Row[]; note?: string }) {
  return (
    <section className="mt-6">
      <h3>{title}</h3>
      {note && <p className="text-[14px] text-muted">{note}</p>}
      <table style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Assumption</th>
            <th>In the prototype</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, v]) => (
            <tr key={a}>
              <td className="font-medium">{a}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const ladder = (key: TermKey) => {
  const e = PLAYBOOK[key];
  if (!e) return '–';
  const parts = [`Preferred: ${plainValue(e.preferred).toLowerCase()}`];
  if (e.fallback) parts.push(`fallback: ${plainValue(e.fallback.value as TermValue).toLowerCase()}`);
  if (e.walkAway) parts.push(`walk-away: ${plainValue(e.walkAway.value as TermValue).toLowerCase()}`);
  return parts.join(' · ');
};

export function Assumptions() {
  const deal = cloudDeskDeal;
  const fee = deal.annualFeeInr;
  const seats = deal.seats ?? 500;
  const ns = kpiHistory.northStar;
  const latest = ns[ns.length - 1];
  const outside = termsFound.split.filter((s) => s.source !== 'Word versions').reduce((a, b) => a + b.pct, 0);
  const others = deals.filter((d) => !d.interactive && d.stage !== 'signed');
  const portfolio = others.reduce((s, d) => s + listedAtRisk(d), 0) + dealAtRisk(initialLedger(), deal);
  const short = RENEWAL_GROUPS.short;
  const long = RENEWAL_GROUPS.long;

  return (
    <div>
      <p>
        Everything below is an assumption of the case or a setting of the prototype, not an observed Meridian fact. Figures are read from the
        same settings, seed data and engines the screens use.
      </p>

      <Group
        title="The company"
        rows={[
          ['Who Meridian Foods is', 'An India-based company with 3,000 employees and about 2,500 suppliers.'],
          ['Tools', 'Microsoft 365 (Outlook and Word) for negotiations; Sirion is the CLM, with contract records, versions, approvals, obligations and invoice matching.'],
          ['History available', 'Connected invoice, renewal and uptime records from past contracts, used for every ₹ estimate.'],
          ['Money, time and working days', 'Indian rupees in Indian format; Asia/Kolkata time; working days are Monday to Friday, with no public holidays modelled.'],
          ['Suppliers', 'Not users. Nobody at a supplier installs or connects anything; they see ordinary emails, Word tracked changes and the Sirion portal.'],
        ]}
      />

      <Group
        title="People, roles and approvals"
        rows={[
          ['Deal owner', `${personName('ananya')}, procurement lead, owns the commercial position and decides what is tracked.`],
          ['Business owner', `${personName('vikram')}, head of IT, talks to the supplier directly but has no commercial mandate.`],
          ['Finance', `${personName('neha')}, CFO, approved the ₹1.8 crore three-year commitment on condition that the price is fixed for the term.`],
          ['Legal', `${personName('arjun')} owns the liability cap and approves any change to a Legal-owned term, whatever its ₹ estimate.`],
          ['Approval thresholds', `A concession or waiver expected to cost ${formatLakh(CFO_THRESHOLD_LAKH)} a year or more goes to the CFO; below that, the procurement lead approves.`],
          ['What is not approval', 'Copying the deal owner, an email already sent or a supplier’s reply is never treated as approval.'],
        ]}
      />

      <Group
        title="The CloudDesk deal"
        rows={[
          ['Value', `${formatInr(fee)} a year: ${seats} seats at ${formatInr(fee / seats)} a seat; ${deal.termYears} years from ${formatDay(deal.termStart)} to ${formatDay(termEnd(deal))}; a ₹1.8 crore commitment.`],
          ['Agreed positions', 'Price fixed for 3 years; payment in 60 days, conditional on a 3-year term; a 10% service credit for any month below 99.5% uptime; liability cap at 12 months’ fees; 30 days’ renewal notice; 30 days of exit support at no charge.'],
          ['Rounds', 'Six rounds from v1 to the v6 signing copy; Meridian’s v5 restores the renewal notice; CloudDesk returns v7 for signature.'],
          ['Ambiguity', '“Fine with that” in a side thread could mean 10% or 5%; it stays needs confirming until Rohan answers in the supplier thread.'],
        ]}
      />

      <Group
        title="Company playbook"
        note="Sirion’s playbook (Today in Sirion). A clause at the fallback or walk-away still passes policy."
        rows={(['price', 'payment', 'renewal_notice', 'service_credit', 'liability_cap', 'exit_support', 'term'] as TermKey[]).map((k) => [
          { price: 'Price', payment: 'Payment', renewal_notice: 'Renewal notice', service_credit: 'Service credit', liability_cap: 'Liability cap', exit_support: 'Exit support', term: 'Term' }[k],
          ladder(k),
        ])}
      />

      <Group
        title="Financial model"
        note="Expected annual averages to prioritise negotiation, not realised losses or legal entitlements."
        rows={[
          ['Price revision', `An open yearly revision is expected to raise prices ${formatPct(R_OPEN, 1)} a year, the average across ${R_OPEN_N} comparable contracts; a capped clause is expected to rise to ${formatPct(CAP_RATIO)} of its cap.`],
          ['Renewal notice', `A renewal slips through unreviewed in ${formatPct(pSlip(30) ?? 0)} of renewals with 30 days or less notice (${short.unreviewed} of ${short.total}) and ${formatPct(pSlip(90) ?? 0)} with 60 days or more (${long.unreviewed} of ${long.total}), from ${RENEWALS_N} past renewals; 31–59 days has no history and is not priced.`],
          ['Cost of a slipped renewal', `${formatPct(UNUSED_SHARE)} of seats are unused at an unreviewed renewal. The cost is counted once per renewal and spread over the term; the gross one-time exposure is shown beside it.`],
          ['Payment terms', `Paying earlier costs the cost of money, ${formatPct(COST_OF_MONEY)} a year, on the fee for the days brought forward.`],
          ['Service credits', `CloudDesk missed 99.5% uptime in ${missedMonths('C-017', 99.5)} of the last ${SERVICE_MONTHS_N} months; credits are a modelled difference, not money owed, until the signed SLA’s eligibility is checked.`],
          ['Enough history', `At least ${MIN_OWN_N} comparable records for a figure from Meridian’s own data; fewer gives a low-data warning or Not priced; ${HIGH_CONF_N} or more is high confidence.`],
          ['Not priced', 'Legal-owned terms (the liability cap) get no ₹ figure; they are listed so nobody reads “no ₹” as “no risk”.'],
          ['Headline and peers', 'Every headline uses Meridian’s own history only; peer outcomes are a reference band, never an input.'],
        ]}
      />

      <Group
        title="Access, privacy and automation"
        rows={[
          ['Deployment', `IT deploys the Outlook and Word add-ins to the “${CONNECTED_GROUP}” group; an admin consents once to read connected mailboxes only.`],
          ['What is read', 'Only supplier-domain threads on live deals in connected mailboxes, headers first; a thread’s body is read only after it is linked. Internal-only email is never read or checked.'],
          ['Tracking', `The deal owner opts each negotiation in, or selects threads, or copies ${CAPTURE_ADDRESS}. Auto-tracking deals of ${formatLakh(AUTO_TRACK_LAKH)} a year or more is an admin setting, off by default.`],
          ['Recognising a file', `A Word file carries the Sirion tag (${DEAL_ID_TAG}); otherwise clause text is compared with stored versions; otherwise the user chooses.`],
          ['Reading email', `A model reads text and returns typed terms; every quote must be an exact substring of the email. A term read with confidence below ${formatPct(READER_CONFIDENCE_MIN)} goes to needs confirming.`],
          ['Check at Send', `Deterministic rules in the prototype; a finding below ${formatPct(SEND_CONFIDENCE_MIN)} confidence is not raised. In production, Outlook Smart Alerts in prompt-user mode with a target of about 3 seconds; if it cannot finish, the email sends and says Not checked.`],
          ['Limits of automation', 'Deal Ledger may file a version, propose a term, suggest a tracked change and warn; it never sends, accepts, signs or approves for a person.'],
          ['Supplier-facing text', 'Never contains ₹ figures, lakh or crore, internal names, approvals, limits, peer data or leverage.'],
        ]}
      />

      <Group
        title="Dates and reminders"
        rows={[
          ['Notice deadline', 'Contract end less the notice period, in calendar days. A deadline on a weekend is flagged, never moved.'],
          ['Decision reminder', `${REMINDER_LEAD_DAYS} days before the notice deadline, moved back to the previous working day if it falls on a weekend.`],
          ['Emailed notice', 'If the notices clause treats email as received the next working day, a send-by date is shown for Legal to confirm, not as a decision.'],
          ['Personal reminder', 'A reminder in the user’s own Outlook calendar is separate from the contract deadline in Sirion; moving one never moves the other.'],
        ]}
      />

      <Group
        title="Demo data and the story clock"
        rows={[
          ['North star', `${ns.map((q) => `${Math.round((q.clean / q.audited) * 100)}%`).join(' → ')}; the latest is ${latest.clean} of ${latest.audited} audited contracts. Illustrative.`],
          ['Where agreement happens', `${outside}% of ${termsFound.totalTerms} negotiated terms were agreed outside the contract document. Illustrative.`],
          ['Portfolio', `${others.length + 1} open deals and ${formatLakh(portfolio)} a year at the start of the story; the other ${others.length} deals’ figures are seed values.`],
          ['Other deals', 'BrightStaff (clause 6 at 8% against a Schedule 2 rate card at 10%) and SwiftShip (a new deal from a PDF quote) are sample patterns.'],
          ['Peer benchmarks', `Sample data. Shown only with at least ${PEER_MIN_COMPANIES} companies and ${PEER_MIN_CONTRACTS} contracts, at least a quarter old, rounded to 0.5 points, at category level.`],
          [
            'The story clock',
            `The case is written around signing on ${formatDateLong(`${STORY_ANCHOR}T12:00:00+05:30`)}. Every story date moves by the same number of days so that signing is today${SHIFT_DAYS ? ` (${SHIFT_DAYS > 0 ? '+' : ''}${SHIFT_DAYS} days)` : ''}: round 4 on ${formatDateShort(STEP_CLOCK[1])}, the signing copy on ${formatDateShort(STEP_CLOCK[4])}, signing on ${formatDateShort(STEP_CLOCK[5])}, and the mismatched invoice in ${new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${FAST_FORWARD_INVOICE.month}-15T00:00:00Z`))}. Publication dates of sources do not move.`,
          ],
        ]}
      />

      <Group
        title="Success measures"
        rows={[
          ['First-week diagnostic', 'Audit 20 historical supplier contracts; the hypothesis is one to three omitted positions per contract. If the count is close to zero, the differentiation is weak.'],
          ['Pilot', 'Replay the same 20 signed deals through normal Sirion review and through Sirion with Deal Ledger, judged by a blind reviewer.'],
          ['False “agreed” labels', 'Below 2% of labelled terms; pause automation above that.'],
          ['Deployment coverage', 'If fewer than half of relevant supplier mailboxes can be connected, narrow the offer to owner-selected threads and the signing-copy check.'],
        ]}
      />
    </div>
  );
}
