/**
 * How a deal's headline (₹X a year if signed as is) is built, row by row,
 * and the risks that sit outside the figure. Pure: the same function feeds
 * the deal page, Home and the Outlook pane, so they always agree.
 */
import type { Deal, LedgerRow } from '@/lib/types';
import { dealAtRisk, worstThreat } from './atRisk';
import { priceChange, termCommitmentLakh } from './pricing';
import { approverFor, sourcePlain } from './sendDialog';
import { formatLakh } from '@/lib/format';
import { plainValue } from '@/lib/plain';

export const THREAT_LABELS: Record<string, string> = {
  supplier_ask: 'Supplier is asking for',
  version_change: 'A draft changed it to',
  side_offer: 'Offered in a side thread',
  new_ask: 'Reopened by a new ask',
  sent_concession: 'Our side conceded',
  signing_copy: 'The signing copy says',
};

export interface HeadlineLine {
  rowId: string;
  label: string;
  agreed: string;
  threat: string;
  source: string;
  /** This row's share of the headline, lakh a year. */
  shareLakh: number;
  /** For a renewal notice: the once-per-renewal figure before it is spread over the term. */
  onceLakh?: number;
  proof: string[];
}

export interface OtherRisk {
  label: string;
  text: string;
}

export interface HeadlineExplanation {
  totalLakh: number;
  lines: HeadlineLine[];
  sumText: string;
  otherRisks: OtherRisk[];
}

export function explainHeadline(rows: LedgerRow[], deal: Deal): HeadlineExplanation {
  const lines: HeadlineLine[] = [];
  const otherRisks: OtherRisk[] = [];

  for (const row of rows) {
    const threat = worstThreat(row, deal);
    if (!threat) continue;
    const tag = priceChange(deal, row.position, threat.value);
    const threatText = `${THREAT_LABELS[threat.kind] ?? 'Changed to'} ${plainValue(threat.value, deal.termYears).toLowerCase()}`;
    if (tag.costLakhPerYr === null) {
      otherRisks.push({
        label: row.label,
        text: `${threatText}. Not priced: ${tag.proof[0] ?? 'there is no comparable history'}.`,
      });
      continue;
    }
    const notice = row.termKey === 'renewal_notice';
    lines.push({
      rowId: row.id,
      label: row.label,
      agreed: plainValue(row.position, deal.termYears),
      threat: threatText,
      source: sourcePlain(threat.source),
      shareLakh: notice ? tag.costLakhPerYr / deal.termYears : tag.costLakhPerYr,
      onceLakh: notice ? tag.costLakhPerYr : undefined,
      proof: notice
        ? [...tag.proof, `Counted once per renewal, so it is spread over the ${deal.termYears}-year term: ${formatLakh(tag.costLakhPerYr)} ÷ ${deal.termYears} = ${formatLakh(tag.costLakhPerYr / deal.termYears)} a year.`]
        : tag.proof,
    });

    // What the figure leaves out, for this row.
    if (notice && tag.exposureLakh) {
      otherRisks.push({
        label: 'Renewal exposure',
        text: `If a renewal slips through unreviewed, a full extra year is committed: ${formatLakh(tag.exposureLakh)} gross. The figure above uses only the expected share.`,
      });
    }
    if (row.termKey === 'price') {
      const approver = approverFor(rows, 'price');
      if (approver) {
        otherRisks.push({
          label: 'Approval',
          text: `${approver}'s approval of the ${formatLakh(termCommitmentLakh(deal))} three-year commitment depends on fixed pricing. If price moves, the approval has to be taken again.`,
        });
      }
      if (tag.overTermLakh) {
        otherRisks.push({
          label: 'Over the term',
          text: `The price change costs ${formatLakh(tag.overTermLakh)} over ${deal.termYears} years, weighted to the later years; the headline is the yearly average.`,
        });
      }
    }
    if (row.state === 'needs_confirmation' || row.state === 'open') {
      otherRisks.push({
        label: `${row.label}: not settled`,
        text:
          row.state === 'needs_confirmation'
            ? 'An ambiguous reply could mean either offer. It is counted at the worse one until confirmed.'
            : 'Still open in the negotiation, so it can move either way.',
      });
    }
  }

  // Terms with no ₹ figure, owned by Legal, are listed so nobody reads "no ₹" as "no risk".
  for (const row of rows) {
    if (row.owner === 'legal' && row.threats.some((t) => t.active)) {
      otherRisks.push({ label: row.label, text: 'Legal-owned term with no ₹ figure; any change goes to Legal.' });
    }
  }

  const totalLakh = dealAtRisk(rows, deal);
  const sumText = lines.length
    ? `${lines.map((l) => formatLakh(l.shareLakh)).join(' + ')} = ${formatLakh(totalLakh)} a year`
    : 'Nothing at risk: every term matches what was agreed.';
  return { totalLakh, lines, sumText, otherRisks };
}
