/**
 * Pricing engine — BUILD_SPEC §8.1.
 *
 * priceChange(deal, from, to) gives the expected ₹ a year, averaged over the
 * term, of moving a row from `from` to `to`. A positive number is a cost to us.
 * Units are lakh throughout; formatting happens at the UI edge.
 */
import type { Deal, PriceTag, TermValue } from '@/lib/types';
import { COST_OF_MONEY, HIGH_CONF_N, MIN_OWN_N } from '@/lib/settings';
import { formatInr, formatLakh, formatPct } from '@/lib/format';
import {
  CAP_RATIO,
  R_OPEN,
  R_OPEN_N,
  RENEWALS_N,
  RENEWAL_GROUPS,
  SERVICE_MONTHS_N,
  UNUSED_SHARE,
  missedMonths,
  noticeGroup,
  pSlip,
} from './stats';

const NONE: PriceTag = {
  costLakhPerYr: null,
  confidence: 'none',
  basis: 'none',
  proof: [],
  formula: '',
};

/** The yearly rise we expect under a given price wording. */
export function expectedRise(v: TermValue): number {
  if (v.kind !== 'price') return 0;
  if (v.wording === 'fixed') return 0;
  if (v.wording === 'open_yearly') return R_OPEN;
  return Math.min(CAP_RATIO * (v.capPct / 100), R_OPEN);
}

function fromYearOf(v: TermValue): number {
  if (v.kind !== 'price' || v.wording === 'fixed') return Infinity;
  return v.fromYear;
}

/** Cost in each year of the term under one price wording, in lakh. */
function priceProfile(v: TermValue, feeLakh: number, termYears: number): number[] {
  const r = expectedRise(v);
  const fromYear = fromYearOf(v);
  const out: number[] = [];
  for (let k = 1; k <= termYears; k++) {
    out.push(k >= fromYear ? feeLakh * ((1 + r) ** (k - fromYear + 1) - 1) : 0);
  }
  return out;
}

function confidenceForN(n: number): PriceTag['confidence'] {
  if (n >= HIGH_CONF_N) return 'high';
  if (n >= MIN_OWN_N) return 'medium';
  return 'low';
}

export function priceChange(deal: Deal, from: TermValue, to: TermValue): PriceTag {
  const feeLakh = deal.annualFeeInr / 1e5;
  const T = deal.termYears;

  /* ---------------- Price ---------------- */
  if (from.kind === 'price' && to.kind === 'price') {
    const a = priceProfile(from, feeLakh, T);
    const b = priceProfile(to, feeLakh, T);
    const byYear = b.map((x, i) => x - a[i]);
    const overTerm = byYear.reduce((s, x) => s + x, 0);
    const perYear = overTerm / T;
    const r = expectedRise(to);

    const yearText = byYear
      .map((v, i) => (v !== 0 ? `${formatLakh(v)} in year ${i + 1}` : null))
      .filter(Boolean)
      .join(' and ');

    const proof: string[] = [];
    if (to.wording === 'open_yearly') {
      proof.push(
        `${R_OPEN_N} of your software contracts allow a yearly price revision. Their prices rose ${formatPct(
          R_OPEN,
          1,
        )} a year on average (invoices, 2024 to 2026).`,
      );
    } else if (to.wording === 'capped') {
      proof.push(
        `Capped at ${to.capPct}%, your suppliers have taken about ${formatPct(
          CAP_RATIO,
        )} of the cap (${formatPct(r, 1)} a year), based on your own invoices.`,
      );
    }
    if (yearText) {
      proof.push(
        `On ${formatLakh(feeLakh)}, that is ${yearText}: ${formatLakh(
          perYear,
        )} a year averaged over the ${T}-year term.`,
      );
    }

    return {
      costLakhPerYr: perYear,
      overTermLakh: overTerm,
      byYear,
      confidence: confidenceForN(R_OPEN_N),
      n: R_OPEN_N,
      basis: 'own_invoices',
      proof,
      formula: `fee × ((1 + ${r.toFixed(3)})^k − 1), summed over the term ÷ ${T}`,
    };
  }

  /* ---------------- Payment ---------------- */
  if (from.kind === 'payment' && to.kind === 'payment') {
    const daysSooner = from.days - to.days;
    const cost = (daysSooner / 365) * feeLakh * COST_OF_MONEY;
    return {
      costLakhPerYr: cost,
      confidence: 'formula',
      basis: 'formula',
      proof: [
        `Paying ${Math.abs(daysSooner)} days ${
          daysSooner >= 0 ? 'sooner' : 'later'
        } on ${formatLakh(feeLakh)} a year, at Finance's ${formatPct(
          COST_OF_MONEY,
        )} cost of money: ${Math.abs(daysSooner)} ÷ 365 × ${formatLakh(
          feeLakh,
        )} × ${formatPct(COST_OF_MONEY)} ≈ ${formatLakh(Math.abs(cost))} a year.`,
      ],
      formula: `(${from.days} − ${to.days}) ÷ 365 × fee × ${COST_OF_MONEY}`,
    };
  }

  /* ---------------- Renewal notice ---------------- */
  if (from.kind === 'renewal_notice' && to.kind === 'renewal_notice') {
    const pFrom = pSlip(from.days);
    const pTo = pSlip(to.days);
    if (pFrom === null || pTo === null) {
      return {
        ...NONE,
        exposureLakh: feeLakh,
        proof: ['Not enough history: we have no past renewals in that notice window.'],
      };
    }
    const cost = (pTo - pFrom) * UNUSED_SHARE * feeLakh;
    const gTo = RENEWAL_GROUPS[noticeGroup(to.days)];
    const gFrom = RENEWAL_GROUPS[noticeGroup(from.days)];
    return {
      costLakhPerYr: cost,
      exposureLakh: feeLakh,
      confidence: confidenceForN(RENEWALS_N),
      n: RENEWALS_N,
      basis: 'own_renewals',
      proof: [
        `With ${noticeGroup(to.days) === 'long' ? '60 to 90' : to.days} days' notice, ${
          gTo.unreviewed
        } of your ${gTo.total} past renewals went through without a review. With ${
          from.days
        } days, ${gFrom.unreviewed} of ${gFrom.total} did.`,
        `Unreviewed renewals carried ${formatPct(
          UNUSED_SHARE,
        )} unused seats on average. (${gTo.unreviewed}/${gTo.total} − ${gFrom.unreviewed}/${
          gFrom.total
        }) × ${formatPct(UNUSED_SHARE)} × ${formatLakh(feeLakh)} = ${formatLakh(cost)} expected at the next renewal.`,
      ],
      formula: `(pSlip(${to.days}) − pSlip(${from.days})) × ${UNUSED_SHARE} × fee`,
    };
  }

  /* ---------------- Service credit ---------------- */
  if (from.kind === 'service_credit' && to.kind === 'service_credit') {
    const missed = missedMonths('C-017', from.uptimeTarget);
    const monthlyFee = feeLakh / 12;
    const cost = ((from.pct - to.pct) / 100) * monthlyFee * missed;
    return {
      costLakhPerYr: cost,
      confidence: confidenceForN(SERVICE_MONTHS_N),
      n: SERVICE_MONTHS_N,
      basis: 'own_service_events',
      proof: [
        `${deal.supplier} missed ${from.uptimeTarget}% uptime in ${missed} of the last ${SERVICE_MONTHS_N} months.`,
        `The gap between a ${from.pct}% and a ${to.pct}% credit on a ${formatLakh(
          monthlyFee,
        )} monthly fee, ${missed === 2 ? 'twice' : `${missed} times`} a year, is ${formatLakh(
          cost,
        )} a year.`,
      ],
      formula: `(${from.pct}% − ${to.pct}%) × (fee ÷ 12) × ${missed} missed months`,
    };
  }

  /* ---------------- Terms we do not put a ₹ figure on ---------------- */
  if (from.kind === 'term' && to.kind === 'term') {
    return {
      ...NONE,
      proof: [
        `A ${to.years}-year commitment is ${formatLakh(
          feeLakh * to.years,
        )} of spend. We do not put a yearly ₹ figure on the length of the term itself.`,
      ],
    };
  }

  if (from.kind === 'liability_cap' || from.kind === 'exit_support') {
    return {
      ...NONE,
      proof: ['This is a Legal-owned term. We do not put a ₹ figure on it.'],
    };
  }

  return NONE;
}

/** Total commitment for the term, in lakh — shown instead of a ₹/yr figure. */
export function termCommitmentLakh(deal: Deal): number {
  return (deal.annualFeeInr / 1e5) * deal.termYears;
}

/** Used by the invoice check and the contract record. */
export function monthlyFeeInr(deal: Deal): number {
  return Math.round(deal.annualFeeInr / 12);
}

export { formatInr };
