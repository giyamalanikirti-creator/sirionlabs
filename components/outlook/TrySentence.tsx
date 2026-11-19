'use client';

/**
 * The demo helper sits outside the mock chrome, clearly tagged, so the Outlook
 * screen itself stays faithful (§10.6).
 */
const SENTENCES = [
  'Yearly price revision is fine with us.',
  'Sure, we can pay in 45 days.',
  "90 days' notice for renewal works for us.",
  'A 5% service credit is fine.',
  "Let's discuss pricing when Ananya is back.",
];

export function TrySentence({ onPick }: { onPick: (sentence: string) => void }) {
  return (
    <div className="ds-scope fixed bottom-4 left-4 z-[90] w-[300px] rounded-xl border border-line bg-white p-4 shadow-pop">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-ink px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide text-white">
          Demo
        </span>
        <span className="text-[12.5px] font-medium text-ink">Try a sentence</span>
      </div>
      <p className="mb-3 text-[11.5px] leading-[16px] text-muted">
        Click one, or type your own in the reply and press Send.
      </p>
      <div className="space-y-1.5">
        {SENTENCES.map((sentence) => (
          <button
            key={sentence}
            onClick={() => onPick(sentence)}
            className="block w-full rounded-md border border-line px-2.5 py-1.5 text-left text-[11.5px] leading-[16px] text-ink transition-colors hover:border-teal-900/40 hover:bg-page"
          >
            {sentence}
          </button>
        ))}
      </div>
    </div>
  );
}
