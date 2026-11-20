/**
 * Pricing for the two extra scripted deals (BrightStaff and SwiftShip).
 * Pure functions, in lakh, tested in tests/other-terms.test.ts.
 */
import { formatLakh } from '@/lib/format';

/**
 * Staffing: the supplier bills pass-through pay plus a markup. The annual
 * value is billed at the agreed markup, so the pass-through base is
 * value ÷ (1 + agreed). A higher markup in the rate card costs base × the gap.
 */
export function markupGap(annualValueInr: number, agreedPct: number, filePct: number) {
  const base = annualValueInr / (1 + agreedPct / 100);
  const perYearInr = base * ((filePct - agreedPct) / 100);
  return {
    baseLakh: base / 1e5,
    costLakhPerYr: perYearInr / 1e5,
    perMonthInr: Math.round(perYearInr / 12),
    proof: [
      `Pass-through pay is the annual value at the agreed ${agreedPct}% markup: ${formatLakh(annualValueInr / 1e5)} ÷ ${(1 + agreedPct / 100).toFixed(2)} ≈ ${formatLakh(base / 1e5)}.`,
      `The rate card bills ${filePct}% on that, ${filePct - agreedPct} points more than agreed, every month.`,
    ],
  };
}

/**
 * Logistics: a fuel surcharge of `pctPerRupee`% of freight for each ₹1 a litre
 * that diesel sits above a threshold, worked out month by month on a diesel
 * price series. The gap is the extra surcharge under the file's threshold.
 */
export function fuelSurchargeGap(
  annualFreightInr: number,
  pctPerRupee: number,
  agreedThreshold: number,
  fileThreshold: number,
  dieselByMonth: number[],
) {
  const monthlyFreight = annualFreightInr / 12;
  const surcharge = (threshold: number) =>
    dieselByMonth.reduce((sum, price) => sum + monthlyFreight * (Math.max(0, price - threshold) * pctPerRupee) / 100, 0) *
    (12 / dieselByMonth.length);
  const agreedInr = surcharge(agreedThreshold);
  const fileInr = surcharge(fileThreshold);
  const avgDiesel = dieselByMonth.reduce((a, b) => a + b, 0) / dieselByMonth.length;
  return {
    agreedLakhPerYr: agreedInr / 1e5,
    fileLakhPerYr: fileInr / 1e5,
    costLakhPerYr: (fileInr - agreedInr) / 1e5,
    avgDiesel,
    proof: [
      `Diesel averaged ₹${avgDiesel.toFixed(1)} a litre over the last ${dieselByMonth.length} months (demo data).`,
      `At ${pctPerRupee}% of freight per ₹1 above the threshold, a threshold of ₹${fileThreshold} instead of ₹${agreedThreshold} adds surcharge every month diesel is above ₹${fileThreshold}.`,
    ],
  };
}
