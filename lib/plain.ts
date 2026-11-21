// Plain-English renderings of a TermValue. Used in panes, dialogs and notes.
import type { TermKey, TermValue } from '@/lib/types';

export const TERM_LABELS: Record<TermKey, string> = {
  term: 'Term',
  price: 'Annual price',
  payment: 'Payment terms',
  service_credit: 'Service credit',
  liability_cap: 'Liability cap',
  renewal_notice: 'Renewal notice',
  exit_support: 'Exit support',
};

/** Short form for a table cell: "Fixed for 3 years", "60 days". */
export function plainValue(v: TermValue | undefined | null, termYears = 3): string {
  if (!v) return 'Not set';
  switch (v.kind) {
    case 'term':
      return `${v.years} year${v.years === 1 ? '' : 's'}`;
    case 'price':
      if (v.wording === 'fixed') return `Fixed for ${termYears} years`;
      if (v.wording === 'open_yearly') return 'Yearly revision';
      return `Capped at ${v.capPct}% from year ${v.fromYear}`;
    case 'payment':
      return `${v.days} days`;
    case 'service_credit':
      return `${v.pct}% below ${v.uptimeTarget}%`;
    case 'liability_cap':
      return `${v.months} months' fees`;
    case 'renewal_notice':
      return `${v.days} days`;
    case 'exit_support':
      return `${v.days} days, ${v.free ? 'free' : 'paid'}`;
  }
}

/** Sentence form for dialogs: "Price is fixed for 3 years". */
export function plainSentence(v: TermValue | undefined | null, termYears = 3): string {
  if (!v) return 'Not set';
  switch (v.kind) {
    case 'term':
      return `a ${v.years}-year term`;
    case 'price':
      if (v.wording === 'fixed') return `fixed for ${termYears} years`;
      if (v.wording === 'open_yearly') return 'open to a yearly revision';
      return `capped at ${v.capPct}% from year ${v.fromYear}`;
    case 'payment':
      return `${v.days} days`;
    case 'service_credit':
      return `${v.pct}% of the monthly fee below ${v.uptimeTarget}% uptime`;
    case 'liability_cap':
      return `${v.months} months' fees`;
    case 'renewal_notice':
      return `${v.days} days`;
    case 'exit_support':
      return `${v.days} days${v.free ? ' at no charge' : ' at the supplier’s rates'}`;
  }
}

/** "A yearly price revision", for the "their change" half of a warning. */
export function changeSentence(v: TermValue | undefined | null): string {
  if (!v) return 'This change';
  switch (v.kind) {
    case 'price':
      if (v.wording === 'open_yearly') return 'A yearly price revision';
      if (v.wording === 'capped') return `A yearly rise capped at ${v.capPct}%`;
      return 'Fixing the price';
    case 'payment':
      return `Paying in ${v.days} days`;
    case 'renewal_notice':
      return `${v.days} days' notice`;
    case 'service_credit':
      return `A ${v.pct}% service credit`;
    case 'term':
      return `A ${v.years}-year term`;
    case 'liability_cap':
      return `A ${v.months}-month liability cap`;
    case 'exit_support':
      return `${v.days} days of ${v.free ? 'free' : 'paid'} exit support`;
  }
}

export function sameValue(a: TermValue | undefined, b: TermValue | undefined): boolean {
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}

function normalise(v: TermValue): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.keys(v)
    .sort()
    .forEach((k) => {
      out[k] = (v as unknown as Record<string, unknown>)[k];
    });
  return out;
}

export const STATE_LABELS: Record<string, string> = {
  agreed: 'Agreed',
  open: 'Open',
  changed: 'Changed this round',
  needs_confirmation: 'Needs confirmation',
  reopened: 'Reopened',
  missing_at_signing: 'Missing at signing',
};
