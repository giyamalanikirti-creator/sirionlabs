/** Signing check — BUILD_SPEC §8.7. */
import type {
  Deal,
  DocVersion,
  LedgerRow,
  SigningGap,
  SigningResult,
  TermKey,
} from '@/lib/types';
import { extractValue } from './diff';
import { priceChange } from './pricing';
import { plainValue, sameValue } from '@/lib/plain';
import { formatDateShort } from '@/lib/format';

/**
 * Extra context a reader of the gap needs, beyond the two values.
 * These are facts about this deal's own history, not generated text.
 */
export const GAP_NOTES: Partial<Record<TermKey, string>> = {
  price: "Neha Kapoor's approval (12 Nov) depends on this",
  renewal_notice: 'Changed in v4, you put it back in v5, still 90 days here',
  payment: 'Traded for the 3-year term (10 Nov)',
};

function sourceChip(row: LedgerRow): string {
  const s = row.source;
  if (s.kind === 'email') return `Agreed in CloudDesk's email, ${formatDateShort(s.at)}`;
  if (s.kind === 'version') return `Agreed in ${s.versionId}, clause ${s.clauseNo}`;
  if (s.kind === 'call_note') return `Confirmed by call note, ${formatDateShort(s.at)}`;
  return 'Agreed on the record';
}

export function signingCheck(
  rows: LedgerRow[],
  version: DocVersion,
  deal: Deal,
): SigningResult {
  const gaps: SigningGap[] = [];
  const matches: SigningResult['matches'] = [];
  const needsConfirmation: SigningResult['needsConfirmation'] = [];

  for (const row of rows) {
    if (row.state === 'needs_confirmation') {
      needsConfirmation.push({ rowId: row.id, label: row.label });
    }

    const clause = version.clauses.find((c) => c.termKey === row.termKey);
    if (!clause) continue;
    const docValue = extractValue(clause);
    if (!docValue) continue;

    if (sameValue(docValue, row.position)) {
      matches.push({
        rowId: row.id,
        termKey: row.termKey,
        label: row.label,
        agreedPlain: plainValue(row.position, deal.termYears),
        clauseNo: clause.no,
        note:
          row.source.kind === 'call_note'
            ? `confirmed ${formatDateShort(row.source.at)}`
            : row.owner === 'legal'
              ? 'Legal'
              : undefined,
      });
      continue;
    }

    const tag = priceChange(deal, row.position, docValue);
    gaps.push({
      rowId: row.id,
      termKey: row.termKey,
      label: row.label,
      agreedPlain: plainValue(row.position, deal.termYears),
      docPlain: plainValue(docValue, deal.termYears),
      clauseNo: clause.no,
      clauseText: clause.text,
      costLakhPerYr: tag.costLakhPerYr,
      priceTag: tag,
      note: GAP_NOTES[row.termKey],
      sourceChip: sourceChip(row),
      source: row.source,
    });
  }

  // Largest ₹ first; terms with no ₹ figure go last.
  gaps.sort((a, b) => {
    if (a.costLakhPerYr === null && b.costLakhPerYr === null) return 0;
    if (a.costLakhPerYr === null) return 1;
    if (b.costLakhPerYr === null) return -1;
    return b.costLakhPerYr - a.costLakhPerYr;
  });

  const totalAtRiskLakh = gaps.reduce((s, g) => s + (g.costLakhPerYr ?? 0), 0);

  return {
    gaps,
    matches,
    needsConfirmation,
    totalAtRiskLakh,
    dealIdTag: version.dealIdTag,
  };
}

/** The clause values in a version, for the Word pane and the record page. */
export function versionValues(version: DocVersion) {
  return version.clauses
    .filter((c) => c.termKey)
    .map((c) => ({ clause: c, value: extractValue(c) }));
}
