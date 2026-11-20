/**
 * Playbook positions and recommended moves.
 *
 * Sirion stores a preferred, fallback and walk-away position for each clause
 * (the Word add-in shows them; the IssueDetection agent scores drafts against
 * them). Deal Ledger reads those positions and adds two things on top: a ₹
 * figure for each one, and a recommended next move with the leverage behind it.
 *
 * Every ₹ figure here comes from the pricing engine. Nothing is typed in.
 */
import type { Deal, DocVersion, LedgerRow, TermKey, TermValue } from '@/lib/types';
import { priceChange } from './pricing';
import { rowAtRisk, worstThreat } from './atRisk';
import { extractValue } from './diff';
import { formatDateShort, formatLakh, formatLakhPerYear } from '@/lib/format';
import { plainValue } from '@/lib/plain';
import { personName } from '@/lib/data';
import { serviceEventsFor } from './stats';

export interface PlaybookPosition {
  value: TermValue;
  /** Plain words, shown next to the value, e.g. "only with a renewal price cap". */
  condition?: string;
}

export interface PlaybookEntry {
  termKey: TermKey;
  preferred: TermValue;
  fallback?: PlaybookPosition;
  walkAway?: PlaybookPosition;
}

/** Meridian's software playbook, as stored in Sirion's clause library. */
export const PLAYBOOK: Partial<Record<TermKey, PlaybookEntry>> = {
  price: {
    termKey: 'price',
    preferred: { kind: 'price', wording: 'fixed' },
    fallback: { value: { kind: 'price', wording: 'capped', capPct: 5, fromYear: 3 } },
    walkAway: { value: { kind: 'price', wording: 'capped', capPct: 3, fromYear: 2 } },
  },
  renewal_notice: {
    termKey: 'renewal_notice',
    preferred: { kind: 'renewal_notice', days: 30 },
    fallback: { value: { kind: 'renewal_notice', days: 45 } },
    walkAway: {
      value: { kind: 'renewal_notice', days: 60 },
      condition: 'only if the renewal price is capped',
    },
  },
  payment: {
    termKey: 'payment',
    preferred: { kind: 'payment', days: 60 },
    fallback: { value: { kind: 'payment', days: 50 } },
    walkAway: { value: { kind: 'payment', days: 45 } },
  },
  service_credit: {
    termKey: 'service_credit',
    preferred: { kind: 'service_credit', pct: 10, uptimeTarget: 99.5 },
    fallback: { value: { kind: 'service_credit', pct: 7.5, uptimeTarget: 99.5 } },
    walkAway: { value: { kind: 'service_credit', pct: 5, uptimeTarget: 99.5 } },
  },
  liability_cap: {
    termKey: 'liability_cap',
    preferred: { kind: 'liability_cap', months: 12 },
    walkAway: { value: { kind: 'liability_cap', months: 12 } },
  },
  exit_support: {
    termKey: 'exit_support',
    preferred: { kind: 'exit_support', days: 30, free: true },
  },
  term: {
    termKey: 'term',
    preferred: { kind: 'term', years: 3 },
  },
};

export type PlaybookStanding = 'preferred' | 'fallback' | 'walk_away' | 'outside';

/** "Fixed for 3 years" → "fixed for 3 years", for use mid-sentence. */
function mid(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function same(a: TermValue, b: TermValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Where a value sits against the playbook. */
export function standing(termKey: TermKey, value: TermValue): PlaybookStanding {
  const entry = PLAYBOOK[termKey];
  if (!entry) return 'preferred';
  if (same(entry.preferred, value)) return 'preferred';
  if (entry.fallback && same(entry.fallback.value, value)) return 'fallback';
  if (entry.walkAway && same(entry.walkAway.value, value)) return 'walk_away';
  return 'outside';
}

export interface PlaybookOption {
  kind: 'agreed' | 'fallback' | 'walk_away';
  label: string;
  value: TermValue;
  plain: string;
  condition?: string;
  /** Expected ₹ lakh a year against what was agreed. null when we cannot price it. */
  costLakhPerYr: number | null;
  costText: string;
}

/** The three options the Redline Agent offers on a gap, priced against the agreed value. */
export function playbookOptions(row: LedgerRow, deal: Deal): PlaybookOption[] {
  const entry = PLAYBOOK[row.termKey];
  const opts: PlaybookOption[] = [
    {
      kind: 'agreed',
      label: 'Agreed wording',
      value: row.position,
      plain: plainValue(row.position, deal.termYears),
      costLakhPerYr: 0,
      costText: 'No cost: this is what was agreed',
    },
  ];
  const add = (kind: 'fallback' | 'walk_away', label: string, pos?: PlaybookPosition) => {
    if (!pos || same(pos.value, row.position)) return;
    const tag = priceChange(deal, row.position, pos.value);
    opts.push({
      kind,
      label,
      value: pos.value,
      plain: plainValue(pos.value, deal.termYears),
      condition: pos.condition,
      costLakhPerYr: tag.costLakhPerYr,
      costText: costText(row.termKey, tag.costLakhPerYr),
    });
  };
  add('fallback', 'Fallback', entry?.fallback);
  add('walk_away', 'Walk-away', entry?.walkAway);
  return opts;
}

function costText(termKey: TermKey, lakh: number | null): string {
  if (lakh === null) return 'Not enough history to price';
  if (lakh <= 0) return 'No expected cost';
  if (termKey === 'renewal_notice') return `${formatLakh(lakh)} expected at the next renewal`;
  return formatLakhPerYear(lakh);
}

/* ------------------------------------------------------------------ */
/* IssueDetection-style review of a draft (what Sirion shows today)    */
/* ------------------------------------------------------------------ */

export interface ReviewLine {
  clauseNo: string;
  label: string;
  within: boolean;
  text: string;
}

const LABELS: Partial<Record<TermKey, string>> = {
  price: 'Price',
  payment: 'Payment',
  renewal_notice: 'Renewal notice',
  service_credit: 'Service credit',
  liability_cap: 'Liability cap',
  exit_support: 'Exit support',
  term: 'Term',
};

/** Score each clause of a draft against the playbook, as IssueDetection does. */
export function playbookReview(version: DocVersion): ReviewLine[] {
  const out: ReviewLine[] = [];
  for (const clause of version.clauses) {
    if (!clause.termKey) continue;
    const entry = PLAYBOOK[clause.termKey];
    const value = extractValue(clause);
    if (!entry || !value) continue;
    const st = standing(clause.termKey, value);
    const label = LABELS[clause.termKey] ?? clause.termKey;
    out.push({
      clauseNo: clause.no,
      label,
      within: st !== 'outside',
      text:
        st === 'preferred'
          ? `${label} within playbook`
          : st === 'outside'
            ? `${clause.no} deviates from preferred (${plainValue(entry.preferred)})`
            : `${label} at ${st === 'fallback' ? 'fallback' : 'walk-away'} position`,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Recommended move and leverage (new: Deal Ledger)                    */
/* ------------------------------------------------------------------ */

export interface RecommendedMove {
  ask: string;
  fallback?: string;
  leverage?: string;
}

/** Months of the last 12 the current CloudDesk contract missed 99.5% uptime. */
function serviceLeverage(deal: Deal): string | undefined {
  const events = serviceEventsFor('C-017');
  const misses = events.filter((e) => e.uptimePct < 99.5);
  if (!misses.length || deal.id !== 'D-CLOUDDESK') return undefined;
  const latest = misses[misses.length - 1];
  const month = new Date(`${latest.month}-01T00:00:00+05:30`).toLocaleString('en-IN', {
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });
  return `CloudDesk missed 99.5% uptime in ${misses.length} of the last ${events.length} months, most recently ${month} (${latest.uptimePct}%), so service credits are already owed.`;
}

function agreedWhere(row: LedgerRow): string {
  if (row.source.kind === 'version' && row.source.versionId) return `agreed in ${row.source.versionId}`;
  if (row.source.kind === 'email') return `agreed by email on ${formatDateShort(row.source.at)}`;
  return `agreed on ${formatDateShort(row.source.at)}`;
}

/**
 * What to do next on a flagged row. Returns null for rows with nothing at stake.
 * The ask restores what was agreed; the fallback comes from the playbook; the
 * leverage comes from the supplier's own service record or the written trail.
 */
export function recommendedMove(row: LedgerRow, deal: Deal): RecommendedMove | null {
  const flagged =
    row.state === 'needs_confirmation' ||
    row.state === 'reopened' ||
    row.state === 'missing_at_signing' ||
    row.threats.some((t) => t.active);
  if (!flagged) return null;

  const entry = PLAYBOOK[row.termKey];
  const threat = worstThreat(row, deal);
  const fb = entry?.fallback && !same(entry.fallback.value, row.position) ? entry.fallback : undefined;
  const fbTag = fb ? priceChange(deal, row.position, fb.value) : null;
  const leverage = serviceLeverage(deal);

  switch (row.termKey) {
    case 'renewal_notice':
      return {
        ask: `Ask to restore ${mid(plainValue(row.position))} (${agreedWhere(row)}).`,
        fallback: `Accept 60 days only if they add a cap on the renewal price.`,
        leverage,
      };
    case 'price': {
      const quoted =
        row.source.kind === 'email'
          ? `${personName(row.source.byPersonId)} confirmed it in writing on ${formatDateShort(row.source.at)}: “${row.source.quote}”`
          : undefined;
      return {
        ask: `Hold ${mid(plainValue(row.position, deal.termYears))}.`,
        fallback: fb
          ? `${plainValue(fb.value, deal.termYears)} (${costText('price', fbTag?.costLakhPerYr ?? null)}), already approved as the ceiling.`
          : undefined,
        leverage: quoted ?? leverage,
      };
    }
    case 'service_credit':
      return {
        ask:
          row.state === 'needs_confirmation'
            ? 'Ask Rohan, in the supplier thread, which offer he accepted.'
            : `Hold ${mid(plainValue(row.position))}.`,
        fallback: fb ? `${plainValue(fb.value)} (${costText('service_credit', fbTag?.costLakhPerYr ?? null)}).` : undefined,
        leverage: `10% was offered first, in writing. ${leverage ?? ''}`.trim(),
      };
    case 'payment':
      return {
        ask: `Restore ${mid(plainValue(row.position))} (${agreedWhere(row)}; v4 and v5 also said 60).`,
        fallback: fb ? `${plainValue(fb.value)} (${costText('payment', fbTag?.costLakhPerYr ?? null)}).` : undefined,
        leverage: 'The 45-day wording came back in the signing copy without a tracked change or an email.',
      };
    default:
      return {
        ask: threat ? `Restore ${mid(plainValue(row.position))}.` : `Confirm ${mid(plainValue(row.position))}.`,
        leverage,
      };
  }
}

/** Per-row share of the deal headline, in lakh a year (the notice cost is spread over the term). */
export function rowHeadlineShare(row: LedgerRow, deal: Deal): number | null {
  const cost = rowAtRisk(row, deal);
  if (cost === null) return null;
  return row.termKey === 'renewal_notice' ? cost / deal.termYears : cost;
}
