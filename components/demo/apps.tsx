'use client';

/**
 * The four destinations of the demo, with their identity: colour, icon,
 * label, persona. Used by the app switcher and the rail's app chips, so the
 * two always match. Generic icons only (no Microsoft logos or app icons).
 */
import { FileText, Mail } from 'lucide-react';
import { SirionMark } from '@/components/sirion/SirionMark';
import type { AppKey } from '@/lib/demo/guideState';

export interface AppDef {
  key: AppKey;
  label: string;
  short: string;
  caption?: string;
  colour: string;
  persona?: string;
  href: string;
}

export const APPS: Record<AppKey, AppDef> = {
  sirion: { key: 'sirion', label: 'Sirion app', short: 'Sirion', colour: '#0C5E69', href: '/' },
  ananya: { key: 'ananya', label: 'Ananya · Outlook', short: 'Ananya · Outlook', caption: 'Procurement', colour: '#0F6CBD', persona: 'AR', href: '/outlook/ananya' },
  vikram: { key: 'vikram', label: 'Vikram · Outlook', short: 'Vikram · Outlook', caption: 'IT head', colour: '#0F6CBD', persona: 'VS', href: '/outlook/vikram' },
  word: { key: 'word', label: 'Word', short: 'Word', colour: '#185ABD', href: '/word/v6?from=sirion' },
};

export function AppIcon({ app, size = 14, light = false }: { app: AppKey; size?: number; light?: boolean }) {
  if (app === 'sirion') return <SirionMark size={size + 4} onDark={light} />;
  const Icon = app === 'word' ? FileText : Mail;
  return <Icon size={size} strokeWidth={2} color={light ? '#FFFFFF' : APPS[app].colour} />;
}

/** A small chip naming the app a step happens in, e.g. "✉ Ananya · Outlook". */
export function AppChip({ app }: { app: AppKey }) {
  const a = APPS[app];
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-[1px] text-[12px] font-semibold"
      style={{ borderColor: `${a.colour}40`, color: a.colour, background: `${a.colour}0D` }}
    >
      <AppIcon app={app} size={12} />
      {a.short}
    </span>
  );
}
