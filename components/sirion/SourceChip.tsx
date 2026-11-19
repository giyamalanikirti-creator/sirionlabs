'use client';

import { FileText, Mail, Pencil, Phone } from 'lucide-react';
import type { SourceRef } from '@/lib/types';
import { formatDateShort } from '@/lib/format';
import { useSourceDrawer } from '@/lib/drawer';
import { cn } from './ui';

const ICONS = {
  email: Mail,
  version: FileText,
  call_note: Phone,
  manual: Pencil,
} as const;

export function sourceLabel(source: SourceRef): string {
  switch (source.kind) {
    case 'email':
      return `Email · ${formatDateShort(source.at)}`;
    case 'version':
      return `${source.versionId} · clause ${source.clauseNo}`;
    case 'call_note':
      return `Call note · ${formatDateShort(source.at)}`;
    default:
      return `Noted · ${formatDateShort(source.at)}`;
  }
}

export function SourceChip({
  source,
  label,
  inline = false,
  className,
}: {
  source: SourceRef;
  label?: string;
  inline?: boolean;
  className?: string;
}) {
  const open = useSourceDrawer((s) => s.open);
  const Icon = ICONS[source.kind];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        open(source, inline);
      }}
      title="Open the source"
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-[3px] text-[11px] text-muted transition-colors hover:border-teal-900/40 hover:text-teal-900',
        className,
      )}
    >
      <Icon size={11} strokeWidth={2} className="shrink-0" />
      <span className="truncate">{label ?? sourceLabel(source)}</span>
    </button>
  );
}
