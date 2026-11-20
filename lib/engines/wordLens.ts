/**
 * Deal Ledger inside Word, on top of Sirion's add-in.
 *
 * Sirion's add-in (today) knows the contract record, the clause library and
 * the playbook. It does not know what was agreed in email. These functions
 * add that: every clause compared with the ledger (lens), every edit checked
 * as it is typed (guard), and every round's changes tagged with whether the
 * email mentioned them (compare). Pure; ₹ from the pricing engine only.
 */
import type { Clause, Deal, DocVersion, LedgerRow, TermKey, TermValue } from '@/lib/types';
import { messages } from '@/lib/data';
import { diffVersions, extractValue } from './diff';
import { priceChange } from './pricing';
import { extractClaims } from './sendGuard';
import { sourceLine } from './ledgerView';
import { plainValue, sameValue } from '@/lib/plain';
import { formatLakh } from '@/lib/format';

export type LensStatus = 'matches' | 'differs' | 'pending' | 'unreadable';

export interface ClauseLens {
  clauseNo: string;
  termKey: TermKey;
  rowId: string;
  label: string;
  status: LensStatus;
  agreedPlain: string;
  docPlain: string;
  docValue: TermValue | null;
  source: string;
  /** Share of the headline, ₹ lakh a year, if this clause were signed as written. */
  costLakhPerYr: number | null;
  costNote?: string;
  proof: string[];
}

function share(row: LedgerRow, deal: Deal, value: TermValue) {
  const tag = priceChange(deal, row.position, value);
  const notice = row.termKey === 'renewal_notice';
  return {
    tag,
    share: tag.costLakhPerYr === null ? null : notice ? tag.costLakhPerYr / deal.termYears : tag.costLakhPerYr,
    note:
      tag.costLakhPerYr === null
        ? 'Not priced: not enough history for this value'
        : notice
          ? `${formatLakh(tag.costLakhPerYr)} at the next renewal, spread over ${deal.termYears} years`
          : undefined,
  };
}

/** Read a clause's value: the clause pattern first, then plain-language reading of what was typed. */
export function readClause(clause: Clause): TermValue | null {
  const exact = extractValue(clause);
  if (exact) return exact;
  if (!clause.termKey) return null;
  const claim = extractClaims(clause.text).find((c) => c.termKey === clause.termKey);
  return claim?.value ?? null;
}

export function lensForClause(clause: Clause, rows: LedgerRow[], deal: Deal): ClauseLens | null {
  if (!clause.termKey) return null;
  const row = rows.find((r) => r.termKey === clause.termKey);
  if (!row) return null;
  const docValue = readClause(clause);
  const base = {
    clauseNo: clause.no,
    termKey: row.termKey,
    rowId: row.id,
    label: row.label,
    agreedPlain: plainValue(row.position, deal.termYears),
    docPlain: docValue ? plainValue(docValue, deal.termYears) : 'Could not read',
    docValue,
    source: sourceLine(row.source),
  };
  if (!docValue) return { ...base, status: 'unreadable', costLakhPerYr: null, proof: [] };
  if (row.state === 'needs_confirmation') {
    return { ...base, status: 'pending', costLakhPerYr: null, proof: ['The ledger is still waiting for a person to confirm this term.'] };
  }
  if (sameValue(row.position, docValue)) return { ...base, status: 'matches', costLakhPerYr: 0, proof: [] };
  const { tag, share: s, note } = share(row, deal, docValue);
  // A clause that is better for us than agreed is not a risk.
  if (s !== null && s <= 0) return { ...base, status: 'matches', costLakhPerYr: 0, proof: [] };
  return { ...base, status: 'differs', costLakhPerYr: s, costNote: note, proof: tag.proof };
}

/** The ledger lens: every tracked clause in a version, compared with what was agreed. */
export function lensForVersion(version: DocVersion, rows: LedgerRow[], deal: Deal): ClauseLens[] {
  return version.clauses.map((c) => lensForClause(c, rows, deal)).filter((x): x is ClauseLens => Boolean(x));
}

/** The edit guard: what an edit typed in Word would do to an agreed term. */
export function guardClauseEdit(clause: Clause, newText: string, rows: LedgerRow[], deal: Deal): ClauseLens | null {
  return lensForClause({ ...clause, text: newText }, rows, deal);
}

/* ------------------------------------------------------------------ */
/* Compare two versions, with the email that came with the newer one   */
/* ------------------------------------------------------------------ */

const TERM_WORDS: Partial<Record<TermKey, RegExp>> = {
  price: /\b(price|pricing|fees?|seat)\b/i,
  payment: /\b(payment|pay|invoice)\b/i,
  renewal_notice: /\b(notice|renewal|renew)\b/i,
  service_credit: /\b(service credits?|credits?|uptime)\b/i,
  liability_cap: /\bliabilit/i,
  exit_support: /\bexit\b/i,
  term: /\b(term|years?)\b/i,
};

export interface RoundChange {
  clauseNo: string;
  termKey?: TermKey;
  label: string;
  beforePlain: string;
  afterPlain: string;
  hidden: boolean;
  email: { messageId: string; quote: string } | null;
  tag: 'discussed in email' | 'not mentioned in email' | 'no email with this file';
  vsLedger: LensStatus | null;
  costLakhPerYr: number | null;
}

export function compareWithEmail(prev: DocVersion, next: DocVersion, rows: LedgerRow[], deal: Deal): RoundChange[] {
  const carrier = messages.find((m) => m.attachments.some((a) => a.versionId === next.id));
  const sentences = carrier ? carrier.body.split(/(?<=[.!?])\s+/) : [];
  return diffVersions(prev, next).map((ch) => {
    const before = prev.clauses.find((c) => c.no === ch.clauseNo);
    const after = next.clauses.find((c) => c.no === ch.clauseNo);
    const re = ch.termKey ? TERM_WORDS[ch.termKey] : undefined;
    const said = re ? sentences.find((s) => re.test(s)) : undefined;
    const lens = after ? lensForClause(after, rows, deal) : null;
    const row = rows.find((r) => r.termKey === ch.termKey);
    return {
      clauseNo: ch.clauseNo,
      termKey: ch.termKey,
      label: row?.label ?? after?.title ?? before?.title ?? ch.clauseNo,
      beforePlain: before ? (readClause(before) ? plainValue(readClause(before)!, deal.termYears) : before.text.slice(0, 80)) : 'Not in this version',
      afterPlain: after ? (readClause(after) ? plainValue(readClause(after)!, deal.termYears) : after.text.slice(0, 80)) : 'Removed',
      hidden: ch.hidden,
      email: carrier && said ? { messageId: carrier.id, quote: said.trim() } : null,
      tag: !carrier ? 'no email with this file' : said ? 'discussed in email' : 'not mentioned in email',
      vsLedger: lens?.status ?? null,
      costLakhPerYr: lens?.status === 'differs' ? lens.costLakhPerYr : null,
    };
  });
}
