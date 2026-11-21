/**
 * The one origin tag, used everywhere: in the Sirion app (Tailwind) and in the
 * add-in panes (Fluent). Inline styles, so it belongs to neither and looks the
 * same in both. 11 px, 600 weight, 2 × 8 px padding, full radius.
 */
export type TagKind = 'today' | 'new';

export const TAG_TEXT: Record<TagKind, string> = {
  today: 'Today in Sirion',
  new: 'New · Deal Ledger',
};

export function Tag({ kind }: { kind: TagKind }) {
  const today = kind === 'today';
  return (
    <span
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
