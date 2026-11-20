'use client';

const SENTENCES = [
  'Yearly price revision is fine with us.',
  'Sure, we can pay in 45 days.',
  "90 days' notice for renewal works for us.",
  'A 5% service credit is fine.',
  "Let's discuss pricing when Ananya is back.",
];

export function TrySentence({ onPick }: { onPick: (sentence: string) => void }) {
  return (
    <details className="ds-scope mt-3 rounded-lg border border-line bg-white p-3">
      <summary className="cursor-pointer text-[12.5px] font-medium text-ink">Try a reply</summary>
      <div className="mt-2 space-y-1.5">
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
    </details>
  );
}
