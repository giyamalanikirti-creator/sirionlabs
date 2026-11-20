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

/** The rule, in two lines. Shown at the top of every "How is this worked out?" and on the story page. */
export const COST_RULE = [
  'Expected cost = how often this kind of term has cost you before × the money it applies to, spread per year over the contract term.',
  'Base rates come from your own invoices, renewals and uptime records. The AI only reads which term changed; every ₹ figure is calculated by code.',
];

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
  /** One plain sentence: who wants what, e.g. "CloudDesk is still asking for yearly revision; you want fixed for 3 years." */
  summary: string;
}

export interface OtherRisk {
  label: string;
  text: string;
}

export interface HeadlineExplanation {
  totalLakh: number;
  lines: HeadlineLine[];
  sumText: string;
  /** "Total ₹4.4 lakh a year, averaged over the 3-year term." */
  totalText: string;
  /** Terms with no ₹ figure, e.g. "liability cap (Legal-owned)". */
  notPriced: string[];
  otherRisks: OtherRisk[];
}

function summaryFor(kind: string, deal: Deal, agreed: string, asked: string, versionId?: string): string {
  switch (kind) {
    case 'supplier_ask':
      return `${deal.supplier} is still asking for ${asked}; you want ${agreed}.`;
    case 'version_change':
      return `${versionId ?? 'A draft'} changed it to ${asked}; agreed ${agreed}.`;
    case 'new_ask':
      return `${deal.supplier} asked again for ${asked}; agreed ${agreed}.`;
    case 'side_offer':
      return `Our side offered ${asked} in a side thread; you want ${agreed}.`;
    case 'sent_concession':
      return `Our side conceded ${asked} by email; agreed ${agreed}.`;
    case 'signing_copy':
      return `The signing copy says ${asked}; agreed ${agreed}.`;
    default:
      return `Now ${asked}; agreed ${agreed}.`;
  }
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
      summary: summaryFor(threat.kind, deal, plainValue(row.position, deal.termYears).toLowerCase(), plainValue(threat.value, deal.termYears).toLowerCase(), threat.source.versionId),
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
  const notPriced = rows.filter((r) => r.owner === 'legal').map((r) => `${r.label.toLowerCase()} (Legal-owned)`);
  const totalText = lines.length
    ? `Total ${formatLakh(totalLakh)} a year, averaged over the ${deal.termYears}-year term.`
    : 'Nothing at risk: every term matches what was agreed.';
  const sumText = lines.length
    ? `${lines.map((l) => formatLakh(l.shareLakh)).join(' + ')} = ${formatLakh(totalLakh)} a year`
    : 'Nothing at risk: every term matches what was agreed.';
  return { totalLakh, lines, sumText, totalText, notPriced, otherRisks };
}
