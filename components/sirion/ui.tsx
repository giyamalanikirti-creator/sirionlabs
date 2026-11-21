'use client';

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function SirionCard({
  title,
  caption,
  right,
  children,
  className,
  bodyClassName,
  sample,
  noDivider,
}: {
  title?: string;
  caption?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** true shows 'Demo data'; a string names the source instead. */
  sample?: boolean | string;
  noDivider?: boolean;
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-card border border-line bg-card shadow-card',
        className,
      )}
    >
      {title && (
        <header className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[16px] text-teal-title">{title}</h2>
              {sample && <SamplePill label={typeof sample === 'string' ? sample : undefined} />}
            </div>
            {caption && <p className="mt-1 text-[12.5px] leading-[18px] text-muted">{caption}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {right}
            <button
              aria-label="Card options"
              className="rounded p-1 text-muted/70 transition-colors hover:bg-page hover:text-ink"
            >
              <MoreVertical size={15} strokeWidth={1.8} />
            </button>
          </div>
        </header>
      )}
      {title && !noDivider && <div className="mx-6 border-t border-line" />}
      <div className={cn('px-6 pb-5 pt-4', !title && 'pt-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function SamplePill({ label }: { label?: string }) {
  return (
    <span
      title={label ? undefined : 'Illustrative demo numbers for the pilot dashboards. CloudDesk figures are live from the ledger.'}
      className={cn(
        'shrink-0 rounded-full border border-line bg-page px-2 py-[1px] font-medium text-muted',
        label ? 'text-[11.5px]' : 'text-[10px] uppercase tracking-wide',
      )}
    >
      {label ?? 'Demo data'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* KPI tile                                                            */
/* ------------------------------------------------------------------ */

export function KpiTile({
  label,
  value,
  unit,
  caption,
  foot,
  tone = 'teal',
  empty = 'None yet',
}: {
  label: string;
  /** null shows `empty` in small text, so a tile with nothing to report keeps its layout. */
  value: React.ReactNode | null;
  empty?: string;
  /** A smaller unit after the figure ("lakh"), so every tile's figure is one size and one line. */
  unit?: React.ReactNode;
  caption?: string;
  foot?: React.ReactNode;
  tone?: 'teal' | 'danger';
}) {
  // "₹2.4 lakh" → a large "₹2.4" and a smaller "lakh", so the figure stays on one line.
  const split = typeof value === 'string' && unit === undefined ? value.match(/^(.*?)\s+(lakh|crore)$/) : null;
  const figure = split ? split[1] : value;
  const shownUnit = split ? split[2] : unit;
  return (
    <div className="flex h-full flex-col rounded-card border border-line bg-card px-6 py-5 shadow-card">
      <p className="text-[15px] font-medium leading-[21px] text-ink">{label}</p>
      {value === null ? (
        <p className="mt-3 text-[20px] leading-[28px] text-muted">{empty}</p>
      ) : (
        <p
          className={cn(
            'mt-2 whitespace-nowrap font-light leading-none tracking-tight',
            'text-[44px] xl:text-[52px]',
            tone === 'danger' ? 'text-danger' : 'text-teal-900',
          )}
        >
          {figure}
          {shownUnit && <span className="ml-1.5 text-[24px] font-normal tracking-normal xl:text-[26px]">{shownUnit}</span>}
        </p>
      )}
      {caption && <p className="mt-2.5 text-[12px] leading-[18px] text-muted">{caption}</p>}
      {foot && <div className="mt-3 flex flex-1 flex-col border-t border-line pt-2.5">{foot}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        'shadow-sm active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900',
        size === 'sm' ? 'px-2.5 py-[5px] text-[11.5px]' : 'px-3.5 py-[7px] text-[12.5px]',
        variant === 'primary' && 'bg-teal-900 text-white hover:bg-teal-700',
        // Outline buttons read as buttons: a teal border and text, not a hairline.
        variant === 'outline' && 'border border-teal-900/45 bg-white font-semibold text-teal-900 hover:border-teal-900 hover:bg-mint/40',
        variant === 'ghost' && 'border border-teal-900/20 bg-mint/40 font-semibold text-teal-900 shadow-none hover:bg-mint',
        variant === 'danger' && 'bg-danger text-white hover:opacity-90',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export function Tabs({
  tabs,
  active,
  onChange,
  right,
}: {
  tabs: { id: string; label: string; badge?: number }[];
  active: string;
  onChange: (id: string) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line">
      <div className="flex items-end gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'relative whitespace-nowrap px-3.5 pb-2.5 pt-2 text-[13px] transition-colors',
                on ? 'font-medium text-teal-900' : 'text-muted hover:text-ink',
              )}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="ml-1.5 rounded-full bg-teal-900 px-1.5 py-[1px] text-[10px] font-semibold text-white">
                  {t.badge}
                </span>
              )}
              {on && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-teal-900" />}
            </button>
          );
        })}
      </div>
      {right && <div className="shrink-0 pb-1.5">{right}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  caption,
  right,
}: {
  title: string;
  caption?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-[22px] font-normal leading-[28px] text-teal-title">{title}</h1>
        {caption && <div className="mt-1.5 max-w-[860px] text-[14px] leading-[21px] text-muted">{caption}</div>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = 'left',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-line bg-page px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = 'left',
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'border-b border-line/70 px-4 py-3 align-middle text-ink',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function TableFooter({ total, shown }: { total: number; shown?: number }) {
  return (
    <div className="flex items-center justify-end px-4 py-2.5 text-[11.5px] text-muted">
      <span>
        Showing {total === 0 ? 0 : 1} to {shown ?? total} of {total}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Divider({ className }: { className?: string }) {
  return <div className={cn('border-t border-line', className)} />;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[12.5px] leading-[19px] text-muted">{body}</p>}
    </div>
  );
}

/** A small label + value row, used on record pages. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

/** Collapsible section used for "Matches" and long histories. */
export function Collapse({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-page"
      >
        <span className="min-w-0 flex-1">{summary}</span>
        <span className="shrink-0 text-[11.5px] text-muted">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="dl-fade-in pt-1">{children}</div>}
    </div>
  );
}
