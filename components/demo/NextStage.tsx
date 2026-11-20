'use client';

import Link from 'next/link';
import { GUIDE_STAGES } from '@/lib/demo/guide';
import { useDemo } from '@/lib/store';

export function NextStage({ step }: { step: 2 | 3 | 4 | 5 }) {
  const stage = GUIDE_STAGES[step - 1];
  return (
    <Link
      className="ds-scope my-3 inline-block rounded-md bg-teal-900 px-3 py-2 text-xs font-medium text-white"
      href={stage.href}
      onClick={() => useDemo.getState().startStage(step)}
    >
      Next · {stage.title}
    </Link>
  );
}
