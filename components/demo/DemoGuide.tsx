'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useDemo } from '@/lib/store';
import { GUIDE_STAGES } from '@/lib/demo/guide';

export function DemoGuide() {
  const router = useRouter();
  const open = useDemo((s) => s.guideOpen);
  const setOpen = useDemo((s) => s.setGuideOpen);

  if (!open) return null;

  return (
    <div className="ds-scope fixed inset-0 z-[150] flex justify-end">
      <button aria-label="Close the walkthrough" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/25" />
      <aside className="dl-slide-in relative flex h-full w-[460px] max-w-full flex-col bg-white shadow-drawer" aria-label="Walkthrough">
        <header className="flex justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-[17px] text-teal-title">Walkthrough</h2>
            <p className="mt-1 text-sm text-muted">Will CloudDesk’s signing copy contain the deal Ananya actually negotiated?</p>
          </div>
          <button aria-label="Close" onClick={() => setOpen(false)} className="self-start p-1.5 text-muted"><X size={16} /></button>
        </header>
        <ol className="thin-scroll flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
          {GUIDE_STAGES.map((stage) => (
            <li key={stage.step} className="rounded-xl border border-line p-4">
              <h3 className="text-sm font-semibold text-ink">{stage.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted">{stage.instruction}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button className="rounded-md bg-teal-900 px-3 py-1.5 text-white" onClick={() => {
                  useDemo.getState().startStage(stage.step, true);
                  setOpen(false);
                  router.push(stage.href);
                }}>Start this step</button>
                <button className="rounded-md border border-line px-3 py-1.5 text-teal-900" onClick={() => {
                  useDemo.getState().previewStage(stage.step);
                  setOpen(false);
                  router.push('result' in stage ? stage.result : stage.href);
                }}>Skip to result</button>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
