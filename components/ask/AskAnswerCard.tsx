'use client';

/**
 * One AskSirion answer, in Sirion's Sources → Response layout. Used in the
 * floating panel and on /ask. Deal Ledger data carries its badge and an
 * "Open in Deal Ledger" action.
 */
import { useRouter } from 'next/navigation';
import { ArrowRight, Copy, FileText, Mail, Phone } from 'lucide-react';
import { SirionMark } from '@/components/sirion/SirionMark';
import { Mark } from '@/components/sirion/Mark';
import { Tag } from '@/components/ui/Tag';
import { useSourceDrawer } from '@/lib/drawer';
import { useDemo } from '@/lib/store';
import type { AskAction, AskAnswer, SourceChipSpec } from '@/lib/ask/types';

const CONFIDENCE: Record<string, string> = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence', formula: 'By formula' };

function SectionHead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
        <SirionMark size={14} />
        {children}
      </span>
      {right}
    </div>
  );
}

function Chip({ chip, onGo }: { chip: SourceChipSpec; onGo: (href: string) => void }) {
  const cls =
    chip.kind === 'count'
      ? 'border-[#8B8CF8] text-[#4F46B8] bg-white'
      : chip.kind === 'ledger'
        ? 'border-teal-900/30 bg-[#EAF4F2] text-teal-900'
        : 'border-line bg-page text-ink';
  const body = (
    <>
      {chip.kind === 'ledger' && <Mark size={12} tone="dark" />}
      <span className="truncate">{chip.label}</span>
    </>
  );
  return chip.href ? (
    <button onClick={() => onGo(chip.href!)} className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-[3px] text-[12px] font-medium hover:brightness-95 ${cls}`}>
      {body}
    </button>
  ) : (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-[3px] text-[12px] font-medium ${cls}`}>{body}</span>
  );
}

export function AskAnswerCard({ answer, onAction, onFollowUp }: { answer: AskAnswer; onAction?: () => void; onFollowUp: (q: string) => void }) {
  const router = useRouter();
  const openSource = useSourceDrawer((s) => s.open);
  const toast = useDemo((s) => s.toast);
  const go = (href: string) => {
    router.push(href);
    onAction?.();
  };
  const run = (a: AskAction) => {
    if (a.copy) {
      void navigator.clipboard?.writeText(a.copy).catch(() => {});
      toast('Note copied. Paste it into a new email to Ananya.');
      return;
    }
    if (a.toast) return toast(a.toast);
    if (a.href) go(a.href);
  };
  const filters = answer.sources.filter((c) => c.kind !== 'ledger');
  const ledgerChips = answer.sources.filter((c) => c.kind === 'ledger');
  const max = Math.max(...(answer.chart?.rows.map((r) => r.lakh) ?? [1]), 0.0001);

  return (
    <div className="space-y-3">
      {answer.sources.length > 0 && (
        <section className="rounded-xl border border-line bg-white p-3">
          <SectionHead right={answer.usesLedger ? <Tag kind="new" /> : <Tag kind="today" />}>Sources</SectionHead>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((c) => <Chip key={c.label} chip={c} onGo={go} />)}
            {ledgerChips.map((c) => <Chip key={c.label} chip={c} onGo={go} />)}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-line bg-white p-3">
        <SectionHead>Response</SectionHead>
        <div className="space-y-2 text-[14px] leading-[21px] text-ink">
          {answer.text.map((t) => <p key={t}>{t}</p>)}
        </div>

        {answer.figure && (
          <div className="mt-3 rounded-lg border border-teal-900/25 bg-[#F3F8F7] px-3 py-2.5">
            <p className="text-[20px] font-semibold leading-[26px] text-teal-900">{answer.figure.text}</p>
            {answer.figure.sub && <p className="text-[12.5px] text-muted">{answer.figure.sub}</p>}
            {(answer.figure.basis || answer.figure.confidence) && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                {answer.figure.basis}
                {answer.figure.confidence && <span className="rounded-full border border-line bg-white px-2 py-[1px] text-[11.5px] font-medium text-ink">{CONFIDENCE[answer.figure.confidence]}</span>}
              </p>
            )}
          </div>
        )}

        {answer.quotes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {answer.quotes.map((q) => {
              const Icon = q.source.kind === 'email' ? Mail : q.source.kind === 'version' ? FileText : Phone;
              return (
                <button
                  key={q.label + q.source.quote}
                  onClick={() => openSource(q.source)}
                  title={q.source.quote}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-[3px] text-[12px] text-muted hover:border-teal-900/40 hover:text-teal-900"
                >
                  <Icon size={12} className="shrink-0" />
                  <span className="truncate">“{q.source.quote.length > 60 ? `${q.source.quote.slice(0, 58)}…` : q.source.quote}” · {q.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {answer.conflict && (
          <div className="mt-3 rounded-lg border border-[#F2DF9C] bg-[#FFF8E5] px-3 py-2 text-[13px] leading-[19px] text-[#3D2E00]">
            <p className="mb-0.5 font-semibold">Sources disagree</p>
            {answer.conflict.map((c) => <p key={c}>{c}</p>)}
          </div>
        )}

        {answer.list && answer.list.length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {answer.list.map((item) => {
              const inner = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-[19px] text-ink">{item.label}</span>
                    {item.detail && <span className="block text-[12.5px] leading-[18px] text-muted">{item.detail}</span>}
                  </span>
                  {item.value && <span className="shrink-0 text-[13px] font-semibold text-ink">{item.value}</span>}
                </>
              );
              return (
                <li key={item.label + (item.detail ?? '')}>
                  {item.href ? (
                    <button onClick={() => go(item.href!)} className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-page">{inner}</button>
                  ) : (
                    <div className="flex items-start gap-3 px-3 py-2">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {answer.chart && (
          <div className="mt-3">
            <ul className="space-y-1.5" aria-label="Expected ₹ a year if signed today, by negotiation">
              {answer.chart.rows.map((r) => (
                <li key={r.label}>
                  <button onClick={() => r.href && go(r.href)} className="grid w-full grid-cols-[132px_1fr_60px] items-center gap-2 text-left text-[12.5px] hover:opacity-80">
                    <span className={`truncate ${r.highlight ? 'font-semibold text-teal-900' : 'text-ink'}`}>{r.label}</span>
                    <span className="h-3.5 rounded-sm bg-page">
                      <span className="block h-full rounded-sm" style={{ width: `${Math.max(2, (r.lakh / max) * 100)}%`, background: r.highlight ? '#0C5E69' : '#B8C4C6' }} />
                    </span>
                    <span className={`text-right ${r.highlight ? 'font-semibold text-teal-900' : 'text-ink'}`}>{r.valueText}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] font-semibold text-ink">{answer.chart.total}</p>
            {answer.chart.footnote && <p className="text-[12px] text-muted">{answer.chart.footnote}</p>}
          </div>
        )}

        {answer.wording && (
          <div className="mt-3 rounded-lg border border-line bg-page p-3">
            <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">Supplier-safe wording</p>
            <p className="text-[13px] leading-[19px] text-ink">{answer.wording}</p>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(answer.wording!).catch(() => {});
                toast('Wording copied.');
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-md border border-teal-900/45 bg-white px-2 py-0.5 text-[12px] font-semibold text-teal-900"
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        )}

        {answer.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {answer.actions.map((a) => (
              <button
                key={a.label}
                onClick={() => run(a)}
                className={
                  a.primary
                    ? 'inline-flex items-center gap-1.5 rounded-md bg-teal-900 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-teal-700'
                    : 'inline-flex items-center gap-1.5 rounded-md border border-teal-900/45 bg-white px-3 py-1.5 text-[13px] font-semibold text-teal-900 hover:bg-mint/40'
                }
              >
                {a.ledger && <Mark size={14} tone={a.primary ? 'light' : 'dark'} />}
                {a.label}
                {!a.ledger && a.href && <ArrowRight size={13} />}
              </button>
            ))}
          </div>
        )}
      </section>

      {answer.followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {answer.followUps.map((f) => (
            <button key={f} onClick={() => onFollowUp(f)} className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-ink hover:border-teal-900/40 hover:bg-page">
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
