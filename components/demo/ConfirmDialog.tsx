'use client';

/** A small, honest confirm for destructive demo actions (reset, replay setup, jump). */
import { useEffect, useRef } from 'react';

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="ds-scope fixed inset-0 z-[300] flex items-center justify-center bg-ink/35 p-4" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <p className="text-[16px] font-semibold text-ink">{title}</p>
        {body && <p className="mt-1.5 text-[13px] leading-[19px] text-muted">{body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-page">
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="rounded-lg bg-guide-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-guide-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guide-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
