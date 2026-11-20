/**
 * The check at Send — deterministic, no model.
 *
 * Runs when anyone at Meridian presses Send on an email to a supplier with a
 * live deal. It reads the draft sentence by sentence, turns each sentence that
 * states a term into a typed value, compares it with the ledger, and checks
 * the attachment against the current version in Sirion. Internal-only email
 * is never checked.
 *
 * Cases:
 *   1 reopen               the reply moves an agreed term
 *   2 give_away            the reply concedes an open or reopened term
 *   3 contradicts_pending  the reply settles a term still waiting for confirmation
 *   4 outdated_attachment  the attached file is older than the current version
 *   5 (no finding)         consistent with the ledger: sends, "Checked against ledger ✓"
 */
import type { Deal, LedgerRow, TermKey, TermValue } from '@/lib/types';
import { priceChange } from './pricing';
import { dealAtRisk } from './atRisk';
import { applySentConcession, rowForTerm } from './ledger';
import { approverFor } from './sendDialog';
import { recommendedMove } from './playbook';
import { formatDateShort, formatLakh } from '@/lib/format';
import { plainValue, sameValue } from '@/lib/plain';
import { personById } from '@/lib/data';

/* ------------------------------------------------------------------ */
/* Reading the draft                                                   */
/* ------------------------------------------------------------------ */

export interface DraftClaim {
  termKey: TermKey;
  value: TermValue;
  /** The sentence in the draft, an exact substring of it. */
  quote: string;
}

const DEFERRAL = /\b(discuss|check with|get back|come back|loop in|revert|hold off|let me|later|once .{1,20} is back|when .{1,20} is back)\b/i;
const NEGATION = /\b(not|no|cannot|never|unable)\b|n't\b/i;

const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/** Distance from a position to the nearest match of a keyword pattern, or Infinity. */
function distanceTo(text: string, at: number, keywords: RegExp): number {
  let best = Infinity;
  for (const m of text.matchAll(new RegExp(keywords.source, 'gi'))) {
    const d = Math.abs((m.index ?? 0) - at);
    if (d < best) best = d;
  }
  return best;
}

const PRICE_WORD = /\b(price|pricing|prices|fee|fees)\b/i;
const REOPEN_WORD = /\b(review|revision|revise|revisit|increase|hike|escalat\w*|index\w*)\b/i;
const YEARLY_WORD = /\b(yearly|annual|annually|each year|every year)\b/i;
const NOTICE_WORD = /\b(notice|renew|renewal|terminate|termination)\b/i;
const PAY_WORD = /\b(pay|paid|payment|invoice|invoices|net)\b/i;
const CREDIT_WORD = /\b(credit|credits|sla|service level)\b/i;
const EXIT_WORD = /\bexit\b/i;
const LIABILITY_WORD = /\bliabilit\w*/i;
const TERM_WORD = /\b(term|contract)\b/i;

function sentences(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function claimsInSentence(sentence: string, filter = true): DraftClaim[] {
  if (filter && (DEFERRAL.test(sentence) || NEGATION.test(sentence))) return [];
  const out: DraftClaim[] = [];
  const add = (termKey: TermKey, value: TermValue, lastWins = false) => {
    const i = out.findIndex((c) => c.termKey === termKey);
    if (i < 0) out.push({ termKey, value, quote: sentence });
    // "v4 now says 90 days, but we agreed 30 days": the last value is the one being stated.
    else if (lastWins) out[i] = { termKey, value, quote: sentence };
  };

  /* Price */
  const pct = sentence.match(/(\d+(?:\.\d+)?)\s*(?:%|per ?cent)/i);
  if (PRICE_WORD.test(sentence) && /\bfixed\b/i.test(sentence)) {
    add('price', { kind: 'price', wording: 'fixed' });
  } else if (
    (PRICE_WORD.test(sentence) && REOPEN_WORD.test(sentence)) ||
    (YEARLY_WORD.test(sentence) && /\b(review|revision|increase)\b/i.test(sentence))
  ) {
    if (pct && !CREDIT_WORD.test(sentence) && Number(pct[1]) < 50) {
      add('price', { kind: 'price', wording: 'capped', capPct: Number(pct[1]), fromYear: 2 });
    } else {
      add('price', { kind: 'price', wording: 'open_yearly', fromYear: 2 });
    }
  }

  /* Days: notice, payment or exit, whichever keyword is closest */
  const net = sentence.match(/\bnet[ -]?(\d+)\b/i);
  if (net) add('payment', { kind: 'payment', days: Number(net[1]) });
  for (const m of sentence.matchAll(/(\d+)\s*(?:\(\w+\)\s*)?days?'?/gi)) {
    const at = m.index ?? 0;
    const days = Number(m[1]);
    const dn = distanceTo(sentence, at, NOTICE_WORD);
    const dp = distanceTo(sentence, at, PAY_WORD);
    const de = distanceTo(sentence, at, EXIT_WORD);
    const best = Math.min(dn, dp, de);
    if (best === Infinity || best > 45) continue;
    if (best === dn) add('renewal_notice', { kind: 'renewal_notice', days }, true);
    else if (best === dp) add('payment', { kind: 'payment', days }, true);
    else add('exit_support', { kind: 'exit_support', days, free: !/\bcharge|rates?\b/i.test(sentence) }, true);
  }

  /* Service credit: a percentage near "credit", never the uptime target itself */
  for (const m of sentence.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|per ?cent)/gi)) {
    const n = Number(m[1]);
    if (n >= 50) continue;
    if (distanceTo(sentence, m.index ?? 0, CREDIT_WORD) <= 40) {
      const target = sentence.match(/(9\d(?:\.\d+)?)\s*%/);
      add('service_credit', { kind: 'service_credit', pct: n, uptimeTarget: target ? Number(target[1]) : 99.5 });
    }
  }

  /* Liability cap in months */
  const months = sentence.match(/(\d+)\s*months?/i);
  if (months && LIABILITY_WORD.test(sentence)) add('liability_cap', { kind: 'liability_cap', months: Number(months[1]) });

  /* Term in years */
  const years = sentence.match(/\b(\d+|one|two|three|four|five)[- ]years?\b/i);
  if (years && TERM_WORD.test(sentence) && !PRICE_WORD.test(sentence)) {
    const n = WORD_NUMBERS[years[1].toLowerCase()] ?? Number(years[1]);
    if (n) add('term', { kind: 'term', years: n });
  }

  return out;
}

/** Every term the draft states, sentence by sentence. Deferrals and refusals state nothing. */
export function extractClaims(body: string): DraftClaim[] {
  return sentences(body).flatMap((s) => claimsInSentence(s));
}

/** Sentence-level reading with no filtering, for the reader preview, which classifies refusals itself. */
export function readSentences(body: string): { sentence: string; claims: DraftClaim[]; deferral: boolean; negation: boolean }[] {
  return sentences(body).map((sentence) => ({
    sentence,
    claims: claimsInSentence(sentence, false),
    deferral: DEFERRAL.test(sentence),
    negation: NEGATION.test(sentence),
  }));
}

/* ------------------------------------------------------------------ */
/* Comparing with the ledger                                           */
/* ------------------------------------------------------------------ */

export type GuardCase = 'reopen' | 'give_away' | 'contradicts_pending' | 'outdated_attachment';

export interface GuardFinding {
  case: GuardCase;
  title: string;
  /** "Agreed: … Your reply: …" */
  agreedText?: string;
  replyText?: string;
  quote?: string;
  rowId?: string;
  termKey?: TermKey;
  value?: TermValue;
  /** This term's cost, in the same "₹X a year if signed as is" units as the pane and Deals. */
  costLakhPerYr: number | null;
  costNote?: string;
  /** The deal headline now, and if this reply were sent. */
  dealBeforeLakh?: number;
  dealAfterLakh?: number;
  proof: string[];
  affected?: string;
  fallback?: string;
  /** Supplier-safe sentence to put in place of the quote. */
  rewrite?: string;
  attachment?: { fileName: string; versionId: string; currentVersionId: string; currentFileName: string };
}

export interface GuardResult {
  checked: boolean;
  reason?: 'internal_only' | 'no_ledger';
  findings: GuardFinding[];
  consistent: DraftClaim[];
}

export interface GuardInput {
  to: string[];
  cc: string[];
  body: string;
  attachments: { fileName: string; versionId?: string }[];
  rows: LedgerRow[];
  deal: Deal;
  /** The version Sirion holds as current, e.g. "v5". */
  currentVersionId: string;
  /** Lower-case sender domains of every deal with a ledger. */
  dealDomains?: string[];
  at?: string;
}

const domainOf = (address: string) => address.split('@')[1]?.toLowerCase() ?? '';

function sourceText(row: LedgerRow): string {
  const src = row.source;
  const who = personById(src.byPersonId)?.name.split(' ')[0];
  if (src.kind === 'email') return `${who ? `${who}'s` : 'an'} email, ${formatDateShort(src.at)}`;
  if (src.kind === 'version') return `${src.versionId}, clause ${src.clauseNo}`;
  if (src.kind === 'call_note') return `call note, ${formatDateShort(src.at)}`;
  return 'the ledger';
}

/** Supplier-safe wording that restates what was agreed. Tested for supplier safety. */
export function rewriteFor(row: LedgerRow): string {
  const v = row.position;
  switch (v.kind) {
    case 'price':
      return v.wording === 'fixed'
        ? `Pricing is fixed for the term as agreed on ${formatDateShort(row.source.at)}. Happy to discuss hosting costs at renewal.`
        : `Pricing stays as agreed on ${formatDateShort(row.source.at)}.`;
    case 'renewal_notice':
      return `The renewal notice period stays at ${v.days} days, as agreed.`;
    case 'payment':
      return `Payment terms stay at ${v.days} days from receipt of invoice, as agreed.`;
    case 'service_credit':
      return `To confirm, the service credit is ${v.pct}% of the monthly fee for any month below ${v.uptimeTarget}% uptime.`;
    case 'liability_cap':
      return `The liability cap stays at ${v.months} months of fees, as agreed.`;
    case 'term':
      return `The term stays at ${v.years} years, as agreed.`;
    case 'exit_support':
      return `Exit support stays as agreed: ${v.days} days${v.free ? ' at no additional charge' : ''}.`;
  }
}

function affectedText(rows: LedgerRow[], row: LedgerRow): string | undefined {
  const name = approverFor(rows, row.termKey);
  if (!name) return undefined;
  const person = personById(rows.find((r) => r.approvedBy && personById(r.approvedBy.personId)?.name === name)?.approvedBy?.personId ?? '');
  const role = person?.role === 'CFO' ? 'CFO approval' : 'approval';
  return `${name}'s ${role} depends on this.`;
}

function titleFor(kind: GuardCase, row: LedgerRow, value: TermValue): string {
  if (kind === 'reopen') {
    return row.termKey === 'price' && row.position.kind === 'price' && row.position.wording === 'fixed'
      ? 'This reply would reopen fixed pricing.'
      : `This reply would reopen the agreed ${row.label.toLowerCase()}.`;
  }
  if (kind === 'give_away') return `This reply would give away ${row.label.toLowerCase()}: ${plainValue(value).toLowerCase()}.`;
  return `This reply settles ${row.label.toLowerCase()} before it is confirmed.`;
}

export function sendGuard(input: GuardInput): GuardResult {
  const { rows, deal } = input;
  const recipients = [...input.to, ...input.cc];
  const domains = input.dealDomains ?? [deal.supplierDomain.toLowerCase()];
  const external = recipients.filter((r) => !domainOf(r).startsWith('meridian'));
  if (!external.length) return { checked: false, reason: 'internal_only', findings: [], consistent: [] };
  if (!recipients.some((r) => domainOf(r) === deal.supplierDomain.toLowerCase())) {
    return { checked: false, reason: domains.some((d) => recipients.some((r) => domainOf(r) === d)) ? 'no_ledger' : 'internal_only', findings: [], consistent: [] };
  }

  const findings: GuardFinding[] = [];
  const consistent: DraftClaim[] = [];
  const before = dealAtRisk(rows, deal);

  for (const claim of extractClaims(input.body)) {
    const row = rowForTerm(rows, claim.termKey);
    if (!row) continue;
    if (sameValue(row.position, claim.value)) {
      consistent.push(claim);
      continue;
    }
    const tag = priceChange(deal, row.position, claim.value);
    // A reply that improves on what was agreed is not a risk.
    if (tag.costLakhPerYr !== null && tag.costLakhPerYr <= 0) {
      consistent.push(claim);
      continue;
    }
    const kind: GuardCase =
      row.state === 'needs_confirmation'
        ? 'contradicts_pending'
        : row.state === 'agreed'
          ? 'reopen'
          : 'give_away';
    const notice = row.termKey === 'renewal_notice';
    const share = tag.costLakhPerYr === null ? null : notice ? tag.costLakhPerYr / deal.termYears : tag.costLakhPerYr;
    const after = dealAtRisk(
      applySentConcession(rows, claim.termKey, claim.value, {
        kind: 'email',
        quote: claim.quote,
        at: input.at ?? '',
        byPersonId: 'ananya',
      }),
      deal,
    );
    const move = recommendedMove({ ...row, threats: [...row.threats, { id: 'x', kind: 'sent_concession', value: claim.value, source: row.source, active: true }] }, deal);
    findings.push({
      case: kind,
      title: titleFor(kind, row, claim.value),
      agreedText:
        kind === 'contradicts_pending'
          ? `${plainValue(row.position, deal.termYears)} asked by Ananya, not yet confirmed by the supplier`
          : `${plainValue(row.position, deal.termYears)} (${sourceText(row)})`,
      replyText: plainValue(claim.value, deal.termYears),
      quote: claim.quote,
      rowId: row.id,
      termKey: row.termKey,
      value: claim.value,
      costLakhPerYr: share,
      costNote:
        tag.costLakhPerYr === null
          ? 'Not priced: not enough history for this value'
          : notice
            ? `${formatLakh(tag.costLakhPerYr)} at the next renewal, spread over ${deal.termYears} years`
            : tag.overTermLakh
              ? `${formatLakh(tag.overTermLakh)} over the term`
              : undefined,
      dealBeforeLakh: before,
      dealAfterLakh: after,
      proof: tag.proof,
      affected: kind === 'contradicts_pending' ? 'Conflicts with Ananya’s ask, which the supplier has not confirmed.' : affectedText(rows, row),
      fallback: move?.fallback,
      rewrite: rewriteFor(row),
    });
  }

  for (const file of input.attachments) {
    if (!file.versionId || file.versionId === input.currentVersionId) continue;
    const n = (id: string) => Number(id.replace(/\D/g, '')) || 0;
    if (n(file.versionId) >= n(input.currentVersionId)) continue;
    findings.push({
      case: 'outdated_attachment',
      title: `This is ${file.versionId}. Current is ${input.currentVersionId} in Sirion.`,
      agreedText: `${input.currentVersionId} is the current version of the contract`,
      replyText: `${file.fileName} is attached`,
      costLakhPerYr: null,
      proof: [`Sending an older draft invites the supplier to work from terms that have since changed.`],
      attachment: {
        fileName: file.fileName,
        versionId: file.versionId,
        currentVersionId: input.currentVersionId,
        currentFileName: file.fileName.replace(file.versionId, input.currentVersionId),
      },
    });
  }

  // Most expensive first; an outdated file comes before unpriced findings.
  findings.sort((a, b) => (b.costLakhPerYr ?? -1) - (a.costLakhPerYr ?? -1));
  return { checked: true, findings, consistent };
}
