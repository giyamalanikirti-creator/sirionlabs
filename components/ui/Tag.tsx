/**
 * The one origin tag, used everywhere: in the Sirion platform (Tailwind) and in the
 * add-in panes (Fluent). Inline styles, so it belongs to neither and looks the
 * same in both. 11 px, 600 weight, 2 × 8 px padding, full radius.
 */
export type TagKind = 'today' | 'new';

export const TAG_TEXT: Record<TagKind, string> = {
  today: 'Today in Sirion',
  new: 'New · Deal Ledger',
};

/** Tooltips (review fix A6): say plainly what exists today and what is proposed. */
export const TAG_TIP: Record<TagKind, string> = {
  today: 'In Sirion today',
  new: 'Proposed: Deal Ledger, not in Sirion today',
};

export function Tag({ kind, title }: { kind: TagKind; title?: string }) {
  const today = kind === 'today';
  return (
    <span
      title={title ?? TAG_TIP[kind]}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        lineHeight: '14px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        color: today ? '#5F7377' : '#FFFFFF',
        background: today ? '#FFFFFF' : '#0C5E69',
        border: today ? '1px solid #C9D4D4' : '1px solid #0C5E69',
      }}
    >
      {TAG_TEXT[kind]}
    </span>
  );
}

/** A small grey number badge, e.g. the walkthrough step a feature appears in. */
export function StepBadge({ step }: { step: number }) {
  return (
    <span
      title={`Walkthrough step ${step}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 999,
        background: '#F1F4F4',
        color: '#5F7377',
        padding: '0 5px',
      }}
    >
      {step}
    </span>
  );
}

/** Which question a finding answers (review fix B1). Same size and shape as Tag. */
export type Basis = 'policy' | 'past' | 'supplier';

export function basisLabel(basis: Basis, supplier = 'the supplier'): string {
  return basis === 'policy' ? 'Company policy' : basis === 'past' ? 'Past agreements' : `Agreed with ${supplier}`;
}

const BASIS_TIP: Record<Basis, string> = {
  policy: 'Checked against the company playbook (Sirion IssueDetection, today)',
  past: 'Checked against what past contracts and history show',
  supplier: 'Checked against what this supplier accepted in email (Deal Ledger, proposed)',
};

export function BasisTag({ basis, supplier }: { basis: Basis; supplier?: string }) {
  const supplierBasis = basis === 'supplier';
  return (
    <span
      title={BASIS_TIP[basis]}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        lineHeight: '14px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        color: supplierBasis ? '#0C5E69' : '#3F4E52',
        background: supplierBasis ? '#E3F1EE' : '#F1F4F4',
        border: `1px solid ${supplierBasis ? '#9CCBC1' : '#D5DDDD'}`,
      }}
    >
      {basisLabel(basis, supplier)}
    </span>
  );
}
