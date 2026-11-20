'use client';

import { useEffect, useState } from 'react';
import { useDemo } from '@/lib/store';

export function Toasts() {
  const lastToast = useDemo((s) => s.lastToast);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const live = lastToast && lastToast.at !== dismissedAt ? lastToast : null;

  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setDismissedAt(live.at), 3600);
    return () => clearTimeout(t);
  }, [live]);

  if (!live) return null;

  return (
    <div className="ds-scope pointer-events-none fixed bottom-28 left-1/2 z-[200] -translate-x-1/2">
      <div className="dl-fade-in rounded-lg bg-ink px-4 py-2.5 text-[13px] text-white shadow-pop">
        {live.text}
      </div>
    </div>
  );
}
