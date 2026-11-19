/** Agreed wording, supplier notes and the supplier-safe check — BUILD_SPEC §8.6. */
import type { LedgerRow, TermKey, TermValue } from '@/lib/types';
import { indianGroup, numberToWords } from '@/lib/format';

const SEATS = 500;
const UNIT_PRICE = 12000;
const ANNUAL = SEATS * UNIT_PRICE;

/** Fill the §5.4 clause pattern for a term we have agreed. */
export function agreedWording(termKey: TermKey, value: TermValue): string {
  switch (termKey) {
    case 'term': {
      const v = value as Extract<TermValue, { kind: 'term' }>;
      return `The Initial Term is ${v.years} (${numberToWords(
        v.years,
      )}) year(s) from 1 December 2026.`;
    }
    case 'price': {
      const v = value as Extract<TermValue, { kind: 'price' }>;
      const head = `The Fees are INR ${indianGroup(UNIT_PRICE)} per Seat per year for ${SEATS} Seats (INR ${indianGroup(
        ANNUAL,
      )} per year)`;
      if (v.wording === 'fixed') return `${head} and are fixed for the Initial Term.`;
      if (v.wording === 'open_yearly') {
        return `${head}. Supplier may revise the Fees once in each contract year by written notice.`;
      }
      return `${head}. Supplier may revise the Fees once in each contract year from the start of contract year ${v.fromYear} by no more than ${v.capPct} percent (${v.capPct}%).`;
    }
    case 'payment': {
      const v = value as Extract<TermValue, { kind: 'payment' }>;
      return `Customer shall pay each undisputed invoice within ${v.days} (${numberToWords(
        v.days,
      )}) days of receipt.`;
    }
    case 'service_credit': {
      const v = value as Extract<TermValue, { kind: 'service_credit' }>;
      return `If Availability in any month falls below ${v.uptimeTarget}%, Supplier shall credit ${v.pct} percent (${v.pct}%) of that month's Fees against the next invoice.`;
    }
    case 'liability_cap': {
      const v = value as Extract<TermValue, { kind: 'liability_cap' }>;
      return `Each party's total liability under this Agreement shall not exceed the Fees paid or payable in the ${v.months} (${numberToWords(
        v.months,
      )}) months before the claim.`;
    }
    case 'renewal_notice': {
      const v = value as Extract<TermValue, { kind: 'renewal_notice' }>;
      return `This Agreement renews for successive one (1) year terms unless either party gives ${v.days} (${numberToWords(
        v.days,
      )}) days' written notice before the end of the then-current term.`;
    }
    case 'exit_support': {
      const v = value as Extract<TermValue, { kind: 'exit_support' }>;
      const tail = v.free ? 'at no additional charge' : "at Supplier's then-current daily rates";
      return `On expiry or termination, Supplier shall provide up to ${numberToWords(
        v.days,
      )} (${v.days}) days of exit support, including data export, ${tail}.`;
    }
  }
}

/** The short, supplier-facing note that goes on a Word comment. */
export function supplierNote(row: LedgerRow): string {
  return row.supplierNote;
}

/**
 * Words and names that must never reach the supplier.
 *
 * Note on names: the spec's rule says "internal person names". The people the
 * supplier already corresponds with on this deal — the procurement lead and the
 * business owner — are not internal secrets; a holding reply that says who is
 * leading the commercials is explicitly supplier-safe in §10.6. What must not
 * leak is anyone the supplier cannot see: the CFO, Legal and other procurement
 * staff, because naming them exposes our approval chain.
 */
export const SUPPLIER_UNKNOWN_PEOPLE = [
  'Neha Kapoor', 'Neha',
  'Arjun Mehta', 'Arjun',
  'Karan Malhotra', 'Karan',
  'Meera Pillai', 'Meera',
];

const BANNED_WORDS = ['lakh', 'crore', 'approved', 'approval', 'internal'];

/** False when the text leaks money, names or our approval chain. */
export function isSupplierSafe(text: string): boolean {
  if (text.includes('₹')) return false;
  if (/\bRs\.?\b/i.test(text)) return false;
  for (const w of BANNED_WORDS) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(text)) return false;
  }
  // "limit" on its own, but not "unlimited" or "limitation of liability".
  if (/\blimits?\b/i.test(text)) return false;
  for (const name of SUPPLIER_UNKNOWN_PEOPLE) {
    if (new RegExp(`\\b${name}\\b`).test(text)) return false;
  }
  return true;
}

/** Why a piece of text failed, for test output and the UI. */
export function supplierSafetyReason(text: string): string | null {
  if (isSupplierSafe(text)) return null;
  if (text.includes('₹')) return 'contains ₹';
  if (/\bRs\.?\b/i.test(text)) return 'contains Rs';
  for (const w of BANNED_WORDS) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(text)) return `contains "${w}"`;
  }
  if (/\blimits?\b/i.test(text)) return 'contains "limit"';
  for (const name of SUPPLIER_UNKNOWN_PEOPLE) {
    if (new RegExp(`\\b${name}\\b`).test(text)) return `names ${name}`;
  }
  return 'not supplier-safe';
}

/** The holding reply offered in the Loop-in pane (§10.6). */
export const HOLDING_REPLY =
  "Thanks Rohan. Ananya is leading the commercials on the renewal, so I've looped her in on pricing.";

/** The draft the pane offers for restoring a quietly changed clause (§10.5). */
export const RESTORE_NOTICE_DRAFT =
  "Rohan, v4 changes the renewal notice in 14.2 to 90 days. We agreed 30, so I've put it back in the attached. Ananya";
