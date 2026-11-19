'use client';

import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { STEP_TITLES, type Step } from '@/lib/demo/steps';

const STEPS: {
  step: Step;
  surface: string;
  what: string;
  see: string;
  href: string;
}[] = [
  {
    step: 0,
    surface: 'Sirion app · lead',
    what: 'Glance at the dashboard, then open CloudDesk.',
    see: '12 open deals, ₹25.8 lakh a year at risk. 42% of agreed terms were settled outside the document.',
    href: '/',
  },
  {
    step: 1,
    surface: "Ananya's Outlook",
    what: "Open Rohan's email of 14 Nov.",
    see: 'Round 4: the price is agreed from the email text, and the renewal notice quietly moved 30 → 90 in v4. ₹3.4 lakh a year.',
    href: '/outlook/ananya?msg=M8',
  },
  {
    step: 2,
    surface: "Ananya's Outlook",
    what: 'Open the 16 Nov email, link the side thread, choose 10% and confirm.',
    see: 'A weak match whose body is not read until it is linked. "Fine with that" is ambiguous, so a person decides.',
    href: '/outlook/ananya?msg=M12',
  },
  {
    step: 3,
    surface: "Vikram's Outlook",
    what: 'Reply to Rohan, try a sentence, press Send.',
    see: 'Smart Alert: ₹3.9 lakh a year, approved by the CFO. Loop in procurement, then send a holding reply.',
    href: '/outlook/vikram?msg=M13',
  },
  {
    step: 4,
    surface: 'Word (signing copy)',
    what: 'Run the signing check, insert all three, send it back.',
    see: '"We\'ve accepted your changes" against 3 gaps worth ₹7.6 lakh a year.',
    href: '/word/v6',
  },
  {
    step: 5,
    surface: 'Sirion app',
    what: 'Fast-forward signing, save to Sirion, open the obligations.',
    see: 'A renewal reminder on 16 Sep 2029, four obligations and two invoice rules, each linked to a clause and a ledger row.',
    href: '/contracts/C-2026-0417',
  },
  {
    step: 6,
    surface: 'Sirion app',
    what: 'Fast-forward to Dec 2027 on the Invoices tab.',
    see: 'An invoice ₹32,000 above the agreed price, citing clause 9.1 with the 14 Nov email as its history.',
    href: '/contracts/C-2026-0417?tab=invoices',
  },
];

export function DemoGuide() {
  const router = useRouter();
  const hydrated = useHydrated();
  const open = useDemo((s) => s.guideOpen);
  const setOpen = useDemo((s) => s.setGuideOpen);
  const completed = useDemo((s) => s.completedSteps);
  const advanceTo = useDemo((s) => s.advanceTo);

  if (!open) return null;

  const go = (step: Step, href: string) => {
    advanceTo(step);
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="ds-scope fixed inset-0 z-[150] flex justify-end">
      <button
        aria-label="Close the demo guide"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-ink/25"
      />
      <aside className="dl-slide-in relative flex h-full w-[460px] max-w-full flex-col bg-white shadow-drawer">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-[17px] text-teal-title">Demo guide</h2>
            <p className="mt-1 text-[12.5px] leading-[18px] text-muted">
              Five moments, about three minutes. <strong className="font-medium text-ink">Go</strong>{' '}
              replays every earlier step from cached results, so you can start anywhere without an
              API key.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="-mr-1 rounded p-1.5 text-muted transition-colors hover:bg-page hover:text-ink"
          >
            <X size={16} />
          </button>
        </header>

        <div className="thin-scroll flex-1 overflow-y-auto px-6 py-4">
          <ol className="space-y-2.5">
            {STEPS.map((s) => {
              const done = hydrated && completed.includes(s.step);
              return (
                <li
                  key={s.step}
                  className="rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        'mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                        done ? 'bg-teal-900 text-white' : 'bg-page text-muted',
                      ].join(' ')}
                    >
                      {done ? <Check size={12} strokeWidth={3} /> : s.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-[13.5px] font-medium text-ink">
                          {STEP_TITLES[s.step]}
                        </h3>
                        <button
                          onClick={() => go(s.step, s.href)}
                          className="shrink-0 rounded-md border border-teal-900 px-2.5 py-[3px] text-[11.5px] font-medium text-teal-900 transition-colors hover:bg-teal-900 hover:text-white"
                        >
                          Go
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                        {s.surface}
                      </p>
                      <p className="mt-2 text-[12.5px] leading-[19px] text-ink/80">{s.what}</p>
                      <p className="mt-1.5 text-[12.5px] leading-[19px] text-muted">{s.see}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <footer className="border-t border-line bg-page px-6 py-4 text-[11.5px] leading-[17px] text-muted">
          Student prototype for the Sirion ISB assignment. Not a Sirion or Microsoft product. All
          names and data are fictional.
        </footer>
      </aside>
    </div>
  );
}
