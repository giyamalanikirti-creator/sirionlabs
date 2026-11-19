/**
 * Our own mark — a ledger glyph, two short rules in a rounded square.
 * Deliberately not Sirion's logo or wordmark.
 */
export function Mark({ size = 28, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const bg = tone === 'light' ? '#FFFFFF' : '#0C5E69';
  const fg = tone === 'light' ? '#0C5E69' : '#FFFFFF';
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill={bg} />
      <rect x="7" y="10" width="14" height="2.4" rx="1.2" fill={fg} />
      <rect x="7" y="15.6" width="9" height="2.4" rx="1.2" fill={fg} />
    </svg>
  );
}

export function MarkWithName({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark size={22} tone={tone === 'dark' ? 'dark' : 'light'} />
      <span
        className={`text-[14px] font-semibold tracking-tight ${
          tone === 'dark' ? 'text-teal-900' : 'text-white'
        }`}
      >
        Deal Ledger
      </span>
    </span>
  );
}
