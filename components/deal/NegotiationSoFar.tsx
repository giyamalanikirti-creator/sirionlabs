'use client';

/**
 * "Negotiation so far" (walkthrough brief B2, B3): the whole negotiation in
 * one card, rendered from buildNegotiationSummary. The component only renders;
 * every line, count and date comes from the engine. No ₹ here: the figure
 * stays on the "If signed as is" headline next to it.
 *
 *  variant "card"     the deal page (collapses to one line, remembered per session)
 *  variant "compact"  inside an AskSirion answer
 *  mode "handover"    open items read "Unresolved at signature"; rounds folded
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { SourceChip } from '@/components/sirion/SourceChip';
import { Tag } from '@/components/ui/Tag';
import type { NegotiationSummary, SummaryGroup, SummaryTermLine } from '@/lib/engines/negotiationSummary';

const KEY = 'deal-ledger-negotiation-collapsed';

function readCollapsed(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
function writeCollapsed(v: boolean) {
  try {
    window.sessionStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* private window: the choice lasts until reload */
  }
}

const CONDITION: Record<'met' | 'not_met' | 'unknown', { text: string; cls: string }> = {
  met: { text: 'met', cls: 'bg-mint text-teal-900' },
  not_met: { text: 'not met', cls: 'bg-[#FDECEA] text-danger' },
  unknown: { text: 'not checked', cls: 'bg-page text-muted' },
};

function TermLine({ t, compact }: { t: SummaryTermLine; compact: boolean }) {
  return (
    <li className={compact ? 'flex flex-col gap-1 py-1.5' : 'flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 py-2'}>
      <div className="min-w-0 flex-1">
        <p className={`${compact ? 'text-[13px]' : 'text-[14px]'} leading-[20px] text-ink`}>
          <span className="font-medium">{t.text}</span>
          {t.draftText && <span className="text-danger"> · {t.draftText}</span>}
          {t.condition && (
            <span className={`${compact ? 'mt-0.5 block w-fit' : 'ml-2 inline-block'} rounded-full px-2 py-[1px] align-[1px] text-[11.5px] font-medium ${CONDITION[t.condition.state].cls}`}>
              {t.condition.text} · {CONDITION[t.condition.state].text}
            </span>
          )}
        </p>
        {t.sides && (
          <ul className="mt-1 space-y-1">
            {t.sides.map((s) => (
              <li key={s.text} className="flex flex-wrap items-center gap-2 text-[13px] text-[#3F4E52]">
                {s.text} <SourceChip source={s.source} inline />
              </li>
            ))}
          </ul>
        )}
        {t.status && <p className="mt-1 text-[12.5px] font-medium text-amber-fg">{t.status}</p>}
      </div>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'shrink-0'}`}>
        {!t.sides && <SourceChip source={t.source} />}
        {t.wordHref && (
          <Link href={t.wordHref} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-[3px] text-[12px] font-medium text-teal-900 hover:bg-page">
            <FileText size={12} /> Open §{t.clauseNo}
          </Link>
        )}
        {t.action && (
          <Link
            href={t.action.href}
            className={
              t.action.kind === 'draft_clarification'
                ? 'rounded-md bg-teal-900 px-2.5 py-[4px] text-[12px] font-semibold text-white hover:brightness-110'
                : 'rounded-md border border-line px-2.5 py-[3px] text-[12px] font-medium text-teal-900 hover:bg-page'
            }
          >
            {t.action.label}
          </Link>
        )}
      </div>
    </li>
  );
}

function Group({ g, compact, showUnchanged }: { g: SummaryGroup; compact: boolean; showUnchanged: boolean }) {
  const terms = g.terms.filter((t) => showUnchanged || !t.unchanged);
  if (!terms.length && !g.notes.length) return null;
  return (
    <section className={compact ? 'mt-2' : 'mt-3'}>
      <h3 className={`${compact ? 'text-[11.5px]' : 'text-[12px]'} font-semibold uppercase tracking-[0.05em] ${g.key === 'agreed_differs' || g.key === 'exceptions' ? 'text-danger' : g.key === 'open' ? 'text-amber-fg' : 'text-muted'}`}>
        {g.title}
      </h3>
      {terms.length > 0 && (
        <ul className="divide-y divide-line">
          {terms.map((t) => (
            <TermLine key={t.rowId} t={t} compact={compact} />
          ))}
        </ul>
      )}
      {g.notes.length > 0 && (
        <ul className="mt-1 space-y-1">
          {g.notes.map((n) => (
            <li key={n.text} className={`${compact ? 'text-[13px]' : 'text-[14px]'} leading-[20px] text-ink`}>
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Rounds({ summary, compact }: { summary: NegotiationSummary; compact: boolean }) {
  const [open, setOpen] = useState(summary.mode !== 'handover');
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 ${compact ? 'text-[12px]' : 'text-[12.5px]'}`}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink">
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Rounds{!open && ` (${summary.rounds.length})`}
      </button>
      {open &&
        summary.rounds.map((r, i) => (
          <span key={r.no} className="inline-flex items-center gap-2">
            {i > 0 && <span aria-hidden className="h-px w-3 bg-line" />}
            <Link
              href={r.href}
              title={r.summary}
              className={`rounded-full border px-2 py-[2px] font-medium hover:bg-page ${r.no === summary.round ? 'border-teal-900 text-teal-900' : 'border-line text-ink'}`}
            >
              R{r.no} · {r.date}
            </Link>
          </span>
        ))}
    </div>
  );
}

export function NegotiationSoFar({ summary, variant = 'card' }: { summary: NegotiationSummary; variant?: 'card' | 'compact' }) {
  const compact = variant === 'compact';
  const [collapsed, setCollapsed] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the session choice once, after mount
    if (!compact) setCollapsed(readCollapsed());
  }, [compact]);
  const toggle = () => {
    setCollapsed((v) => {
      writeCollapsed(!v);
      return !v;
    });
  };
  const unchanged = summary.unchangedTerms.length;

  if (collapsed && !compact) {
    return (
      <section data-negotiation-summary="collapsed" className="mb-4 rounded-card border border-line bg-card shadow-card">
        <button onClick={toggle} aria-expanded={false} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-6 py-3 text-left">
          <span className="text-[15px] font-semibold text-teal-title">Negotiation so far</span>
          <span className="text-[13.5px] text-ink">{summary.collapsedLine}</span>
          <ChevronDown size={16} className="ml-auto text-muted" />
        </button>
      </section>
    );
  }

  return (
    <section
      data-negotiation-summary={compact ? 'compact' : 'expanded'}
      className={compact ? 'rounded-lg border border-line bg-white p-3' : 'mb-4 rounded-card border border-line bg-card px-6 pb-4 pt-5 shadow-card'}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <h2 className={`${compact ? 'text-[14px]' : 'text-[16px]'} text-teal-title`}>{summary.title}</h2>
          <Tag kind="new" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-muted" suppressHydrationWarning>{summary.asOf}</span>
          {!compact && (
            <button onClick={toggle} aria-expanded className="rounded-md p-1 text-muted hover:bg-page hover:text-ink" aria-label="Collapse Negotiation so far">
              <ChevronDown size={16} className="rotate-180" />
            </button>
          )}
        </div>
      </header>
      <p className={`mt-1 ${compact ? 'text-[12.5px]' : 'text-[13.5px]'} text-ink`}>{summary.headline}</p>
      <p className={`${compact ? 'text-[12.5px]' : 'text-[13.5px]'} text-muted`}>{summary.countsLine}</p>

      <div className={compact ? 'mt-1' : 'mt-1 border-t border-line pt-1'}>
        {summary.groups.map((g) => (
          <Group key={g.key} g={g} compact={compact} showUnchanged={showUnchanged} />
        ))}
      </div>

      <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3`}>
        <Rounds summary={summary} compact={compact} />
        {unchanged > 0 && (
          <button onClick={() => setShowUnchanged((v) => !v)} aria-expanded={showUnchanged} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-teal-900 hover:underline">
            {showUnchanged ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {unchanged} other term{unchanged === 1 ? '' : 's'} unchanged
          </button>
        )}
      </div>
    </section>
  );
}
