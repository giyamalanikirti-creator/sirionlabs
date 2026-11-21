/**
 * The reply that goes with our next version (Respond to round), built from
 * the ledger rather than a template sentence (review fix A1). Three parts,
 * each only if non-empty: what the supplier confirmed in this round, what our
 * attached version changes, and what is still open. "Everything else
 * matches" is said only when the engine shows it: every other tracked term
 * agreed and matching in the attached file. Supplier-safe: no ₹, no internal
 * names, no cost language.
 */
import type { Deal, DocVersion, LedgerRow, TermKey, TermValue } from '@/lib/types';
import { diffVersions, extractValue } from './diff';
import { plainValue, sameValue, TERM_LABELS } from '@/lib/plain';
import { numberToWords } from '@/lib/format';

export interface RoundReply {
  body: string;
  confirmed: string[];
  changes: { clauseNo: string; termKey?: TermKey; label: string; from: string; to: string; restored: boolean }[];
  stillOpen: { termKey: TermKey; label: string; ours: string }[];
  allElseMatches: boolean;
}

const words = (n: number) => numberToWords(n).toLowerCase();

/** A term in a supplier-facing sentence: "30 days' renewal notice", "fixed pricing for the three years". */
export function termPhrase(value: TermValue, termYears: number): string {
  switch (value.kind) {
    case 'price':
      return value.wording === 'fixed' ? `fixed pricing for the ${words(termYears)} years` : value.wording === 'capped' ? `a price cap of ${value.capPct}% from year ${value.fromYear}` : 'a yearly price revision';
    case 'renewal_notice':
      return `${value.days} days' renewal notice`;
    case 'payment':
      return `payment within ${value.days} days`;
    case 'service_credit':
      return `a ${value.pct}% service credit for any month below ${value.uptimeTarget}% uptime`;
    case 'term':
      return `a ${words(value.years)}-year term`;
    case 'liability_cap':
      return `a liability cap of ${value.months} months' fees`;
    case 'exit_support':
      return `${value.days} days of exit support${value.free ? ' at no charge' : ''}`;
  }
}

export function roundReply(opts: {
  rows: LedgerRow[];
  prev: DocVersion;
  attached: DocVersion;
  roundMessageId: string;
  deal: Deal;
  greeting: string;
  signOff: string;
}): RoundReply {
  const { rows, prev, attached, deal } = opts;
  const valueIn = (v: DocVersion, key: TermKey) => {
    const c = v.clauses.find((x) => x.termKey === key);
    return c ? extractValue(c) : null;
  };

  const confirmed = rows
    .filter((r) => r.state === 'agreed' && r.source.kind === 'email' && r.source.messageId === opts.roundMessageId)
    .map((r) => termPhrase(r.position, deal.termYears));

  const changes = diffVersions(prev, attached)
    .filter((c) => c.termKey)
    .map((c) => {
      const before = valueIn(prev, c.termKey!);
      const after = valueIn(attached, c.termKey!);
      const row = rows.find((r) => r.termKey === c.termKey);
      return {
        clauseNo: c.clauseNo,
        termKey: c.termKey,
        label: TERM_LABELS[c.termKey!],
        from: plainValue(before, deal.termYears),
        to: plainValue(after, deal.termYears),
        restored: Boolean(row && after && sameValue(after, row.position)),
        after,
      };
    });

  const stillOpen = rows
    .filter((r) => r.state === 'open' || r.state === 'needs_confirmation')
    .map((r) => ({ termKey: r.termKey, label: TERM_LABELS[r.termKey], ours: termPhrase(r.position, deal.termYears) }));

  const changed = new Set(changes.map((c) => c.termKey));
  const allElseMatches = rows
    .filter((r) => !changed.has(r.termKey))
    .every((r) => r.state === 'agreed' && (() => {
      const v = valueIn(attached, r.termKey);
      return !v || sameValue(v, r.position);
    })());

  const sentences: string[] = [];
  if (confirmed.length) sentences.push(`Thanks for confirming ${confirmed.join(' and ')}.`);
  for (const c of changes) {
    if (!c.after) continue;
    sentences.push(
      c.restored
        ? `I've restored ${termPhrase(c.after, deal.termYears)} in §${c.clauseNo} in the attached ${attached.id}, as agreed.`
        : `In the attached ${attached.id}, §${c.clauseNo} now reads ${c.to.toLowerCase()}.`,
    );
  }
  for (const o of stillOpen) {
    const name = o.termKey === 'service_credit' ? 'Service credits are' : `${o.label} is`;
    sentences.push(`${name} still open. We need ${o.ours}.`);
  }
  if (allElseMatches && !stillOpen.length) sentences.push(`Everything else in ${prev.id} matches what we agreed.`);

  const body = `Hi ${opts.greeting},\n\n${sentences.join(' ')}\n\nThanks,\n${opts.signOff}`;
  return { body, confirmed, changes: changes.map((c) => ({ clauseNo: c.clauseNo, termKey: c.termKey, label: c.label, from: c.from, to: c.to, restored: c.restored })), stillOpen, allElseMatches };
}

/**
 * One sentence for the top of the round card (review fix C2):
 * "Rohan confirmed fixed pricing. The attachment also changed renewal notice from 30 to 90 days."
 */
export function roundSummary(opts: { rows: LedgerRow[]; prev: DocVersion; next: DocVersion; roundMessageId: string; from: string; deal: Deal }): { text: string; changedClauses: string[] } {
  const { rows, prev, next, deal } = opts;
  const confirmed = rows
    .filter((r) => r.state === 'agreed' && r.source.kind === 'email' && r.source.messageId === opts.roundMessageId)
    .map((r) => (r.position.kind === 'price' && r.position.wording === 'fixed' ? 'fixed pricing' : `${TERM_LABELS[r.termKey].toLowerCase()} at ${plainValue(r.position, deal.termYears).toLowerCase()}`));
  const valueIn = (v: DocVersion, key: TermKey) => {
    const c = v.clauses.find((x) => x.termKey === key);
    return c ? extractValue(c) : null;
  };
  // Only changes that move away from what the ledger holds: an agreed change is already news in the email.
  const changes = diffVersions(prev, next)
    .filter((c) => c.termKey)
    .filter((c) => {
      const after = valueIn(next, c.termKey!);
      const row = rows.find((r) => r.termKey === c.termKey);
      return !row || !after || !sameValue(after, row.position);
    })
    .map((c) => ({ no: c.clauseNo, label: TERM_LABELS[c.termKey!].toLowerCase(), from: plainValue(valueIn(prev, c.termKey!), deal.termYears), to: plainValue(valueIn(next, c.termKey!), deal.termYears) }));
  const strip = (x: string) => x.replace(/ days$/, '');
  const parts: string[] = [];
  if (confirmed.length) parts.push(`${opts.from} confirmed ${confirmed.join(' and ')}.`);
  for (const c of changes) {
    const sameUnit = / days$/.test(c.from) && / days$/.test(c.to);
    parts.push(`The attachment ${confirmed.length ? 'also ' : ''}changed ${c.label} from ${sameUnit ? strip(c.from) : c.from.toLowerCase()} to ${c.to.toLowerCase()}.`);
  }
  return { text: parts.join(' ') || 'Nothing in this round moved an agreed term.', changedClauses: changes.map((c) => c.no) };
}
