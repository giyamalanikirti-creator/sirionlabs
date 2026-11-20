/**
 * The Smart Alert message — BUILD_SPEC §9.2.
 * Microsoft caps errorMessage / errorMessageMarkdown at 500 characters, so the
 * length is part of the contract and is asserted in tests/golden.test.ts.
 */
import type { Deal, LedgerRow, SourceRef, TermKey, TermValue } from '@/lib/types';
import { priceChange } from './pricing';
import { rowForTerm } from './ledger';
import { changeSentence, plainSentence } from '@/lib/plain';
import { formatDateShort, formatLakh } from '@/lib/format';
import { personById } from '@/lib/data';
import { SMART_ALERT_MAX_CHARS } from '@/lib/settings';

/** Outlook's "Take Action" button carries our own label, ≤ 20 characters. */
export const TAKE_ACTION_LABEL = 'Loop in procurement';

/** Short labels for the dialog, where space is tight. */
const DIALOG_LABELS: Record<TermKey, string> = {
  term: 'The term',
  price: 'Price',
  payment: 'Payment',
  service_credit: 'Service credit',
  liability_cap: 'Liability cap',
  renewal_notice: 'Renewal notice',
  exit_support: 'Exit support',
};

export function sourcePlain(source: SourceRef): string {
  const person = source.byPersonId ? personById(source.byPersonId) : undefined;
  const theirs = person?.org === 'clouddesk';
  switch (source.kind) {
    case 'email':
      return `${theirs ? "CloudDesk's" : 'your'} email of ${formatDateShort(source.at)}`;
    case 'version':
      return `${source.versionId}, clause ${source.clauseNo}`;
    case 'call_note':
      return `a call note of ${formatDateShort(source.at)}`;
    default:
      return 'our own record';
  }
}

function basisPlain(termKey: TermKey, n?: number): string {
  switch (termKey) {
    case 'price':
      return `${n ?? 9} of your software contracts`;
    case 'renewal_notice':
      return `${n ?? 22} of your past renewals`;
    case 'payment':
      return "Finance's cost of money";
    case 'service_credit':
      return `${n ?? 12} months of uptime`;
    default:
      return 'your own records';
  }
}

/**
 * Whoever approved this term, directly or through a condition on another row.
 * The CFO approved the 3-year commitment "provided the price is fixed", so a
 * concession on price is a concession against her approval too.
 */
export function approverFor(rows: LedgerRow[], termKey: TermKey): string | undefined {
  const own = rowForTerm(rows, termKey);
  if (own?.approvedBy && own.approvedBy.personId !== 'ananya') {
    return personById(own.approvedBy.personId)?.name;
  }
  const KEYWORDS: Record<TermKey, RegExp> = {
    price: /\bprice|fees?\b/i,
    payment: /\bpayment|invoice\b/i,
    term: /\bterm\b/i,
    service_credit: /\bcredit\b/i,
    liability_cap: /\bliabilit/i,
    renewal_notice: /\bnotice|renew/i,
    exit_support: /\bexit\b/i,
  };
  for (const r of rows) {
    const cond = r.approvedBy?.condition;
    if (cond && KEYWORDS[termKey].test(cond)) {
      return personById(r.approvedBy!.personId)?.name;
    }
  }
  return undefined;
}

export interface SendDialog {
  title: string;
  markdown: string;
  plain: string;
  takeActionLabel: string;
}

/** Build the warning for a concession on `termKey` to `value`. */
export function buildDialog(
  rows: LedgerRow[],
  deal: Deal,
  termKey: TermKey,
  value: TermValue,
  leadName = 'Ananya Rao',
): SendDialog | null {
  const row = rowForTerm(rows, termKey);
  if (!row) return null;

  const tag = priceChange(deal, row.position, value);
  const approver = approverFor(rows, termKey);
  const sourceText = sourcePlain(row.source);
  const agreed = plainSentence(row.position, deal.termYears);
  const change = changeSentence(value);

  const costPhrase =
    tag.costLakhPerYr === null
      ? 'has no ₹ figure: this is a Legal-owned term'
      : `would cost about **${formatLakh(tag.costLakhPerYr)} ${termKey === 'renewal_notice' ? 'expected at the next renewal' : 'a year on average'}**${
          tag.overTermLakh ? ` (${formatLakh(tag.overTermLakh)} over the term)` : ''
        }, based on ${basisPlain(termKey, tag.n)}`;

  const title = termKey === 'price' ? 'This reply would reopen fixed pricing.' : `This reply would reopen ${row.label.toLowerCase()}.`;
  const head = termKey === 'price' && approver ? `**CFO approval from ${approver} depends on fixed pricing.**` : `**CloudDesk already agreed this term.**`;
  const body = `${DIALOG_LABELS[termKey]} is ${agreed} (${sourceText}${
    approver ? `, approved by ${approver}` : ''
  }). ${change} ${costPhrase}.`;
  const tail = `Loop in ${leadName} (Procurement) before you reply?`;

  let markdown = `${head}\n\n${body}\n\n${tail}`;

  // Trim the optional parts before the limit, never the figure itself.
  if (markdown.length > SMART_ALERT_MAX_CHARS) {
    const shortBody = `${DIALOG_LABELS[termKey]} is ${agreed} (${sourceText}). ${change} ${costPhrase}.`;
    markdown = `${head}\n\n${shortBody}\n\n${tail}`;
  }

  return {
    title,
    markdown,
    plain: markdown.replace(/\*\*/g, ''),
    takeActionLabel: TAKE_ACTION_LABEL,
  };
}

/** The message shown when the check itself could not run (§9.2). */
export const COULD_NOT_CHECK_DIALOG: SendDialog = {
  title: 'Deal Ledger',
  markdown:
    "Deal Ledger couldn't check this email against the CloudDesk ledger. Loop in procurement before you send?",
  plain:
    "Deal Ledger couldn't check this email against the CloudDesk ledger. Loop in procurement before you send?",
  takeActionLabel: TAKE_ACTION_LABEL,
};
