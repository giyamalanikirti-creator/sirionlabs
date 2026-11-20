'use client';

/** Suggestion chips above the reply box, so a presenter can show every case of the check at Send. */
export interface TryChip {
  label: string;
  /** Replace the draft with this text. */
  text?: string;
  /** Or attach this version instead. */
  attachVersionId?: string;
}

export function TrySentence({ chips, onPick }: { chips: TryChip[]; onPick: (chip: TryChip) => void }) {
  return (
    <div className="ds-scope mb-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11.5px] font-medium text-muted">Try:</span>
      {chips.map((chip) => (
        <button
          key={chip.label}
          onClick={() => onPick(chip)}
          className="rounded-full border border-line bg-white px-2.5 py-[3px] text-[11.5px] text-ink transition-colors hover:border-teal-900/40 hover:bg-page"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
